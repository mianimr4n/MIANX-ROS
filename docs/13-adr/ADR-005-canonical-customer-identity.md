# ADR-005: Canonical Customer Identity Strategy

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260818000000_adr_005_canonical_customer_identity.sql`)

---

## Context

Telepizza's customer data is fragmented across multiple sources:

1. **Supabase Auth `auth.users`** — registered customers with email/password
   or OAuth. Primary key is a UUID `id`.
2. **`public.customers`** — application-level customer profile. Has `user_id`
   FK back to `auth.users.id`, plus `phone`, `email`, `full_name`.
3. **`public.orders`** — every order has a `customer_id` FK to
   `public.customers.id`. Guest checkout creates a `customers` row without
   a linked `auth.users.id`.
4. **WhatsApp conversations** — inbound messages from a phone number; the
   customer may or may not have an existing `customers` row.

The current model has three failure modes:

- **Duplicate customers per phone.** A customer who places a guest order
  with phone `+923001234567` and later registers an account with the same
  phone ends up with TWO `customers` rows — one with `user_id` set, one
  without. There is no canonical way to know they are the same person.
- **No identity lookup by phone.** The customer support workflow is:
  "customer calls from +923001234567, what's their order history?"
  Without a canonical identity table, support must manually grep orders
  by phone, which is slow and error-prone.
- **No support for multiple identity types.** A customer may have a phone,
  an email, a WhatsApp number, and an auth user ID — all pointing to the
  same canonical customer. Today these are scattered across columns and
  tables.

Phase 2.3 (CRM) closes this gap. ADR-005 establishes `customers.id` as
the canonical UUID, backed by a normalized `customer_identities` table
that maps every identity type to a single customer.

## Decision

Implement canonical customer identity with these rules:

1. **`customers.id` is canonical.** Every customer-facing record (orders,
   addresses, favorites, reviews, loyalty, WhatsApp conversations)
   references `customers.id`. There is exactly one `customers` row per
   real-world person.

2. **`customer_identities` table maps identity → customer.** Each row
   represents one identity assertion: "this phone belongs to this
   customer", "this email belongs to this customer", "this auth user
   ID belongs to this customer". A customer can have multiple identities
   (e.g. phone + email + auth_user_id), and identities are unique per
   type+value (UNIQUE constraint).

3. **Identity types** (enumerated in `identity_type` CHECK constraint):
   - `phone_e164` — E.164 normalized phone (`+923XXXXXXXXX`)
   - `email` — lowercase normalized email
   - `auth_user_id` — UUID reference to `auth.users.id`
   - `whatsapp_phone` — E.164 phone used for WhatsApp (may differ from
     `phone_e164` if customer uses a different number for WhatsApp)

4. **Identity verification status.** Each identity has a `verified_at`
   timestamp (NULL = unverified). Phone identities verified via OTP get
   `verified_at` set. Unverified identities can be created (e.g. from
   guest checkout) but the system flags them in the admin UI.

5. **Automatic identity creation on customer insert.** A SQL trigger
   fires on `customers` INSERT: if the new row has a phone or email, the
   corresponding `customer_identities` rows are inserted automatically.
   This ensures the identity table is always in sync with the customer
   record — no application code required.

6. **Phone normalization.** A SQL function `normalize_phone_e164(input)`
   converts Pakistani phone numbers to E.164 format:
   - `03001234567` → `+923001234567`
   - `923001234567` → `+923001234567`
   - `+923001234567` → `+923001234567` (no-op)
   - Invalid format → returns NULL, caller must handle

7. **Identity lookup RPC.** A SQL function `resolve_customer_by_identity(
   p_identity_type, p_value)` returns the `customers.id` for a given
   identity, or NULL if not found. This is the canonical lookup used by
   the WhatsApp inbound worker, the customer support search, and the
   checkout flow.

8. **Backfill existing customers.** The migration includes a one-time
   backfill that:
   - For every existing `customers` row, inserts a `customer_identities`
     row for the phone (if present and normalizable) and email (if
     present).
   - For every existing `customers.user_id` (non-null), inserts a
     `customer_identities` row with `identity_type='auth_user_id'`.

## Consequences

### Positive

- **One canonical customer per real-world person.** No more duplicates
  per phone — the UNIQUE constraint on `customer_identities(type, value)`
  prevents it.
- **Fast identity lookup.** Customer support can resolve a customer by
  phone, email, or auth user ID in a single indexed query.
- **Future-proof for new identity types.** Adding a new identity type
  (e.g. Apple ID, Google ID) is a CHECK constraint extension + new rows;
  no schema change needed.
- **Decouples auth from customer record.** A customer can exist without
  an `auth.users.id` (guest checkout), and an `auth.users.id` can be
  linked to a customer later — both are just rows in
  `customer_identities`.

### Negative

- **Two tables to keep in sync.** The `customers` table and
  `customer_identities` table must agree. The INSERT trigger handles
  this for new rows; ADR-006 (Customer Account Merge) handles dedup
  for existing duplicate rows.
- **Phone normalization is Pakistani-only.** The `normalize_phone_e164`
  function only handles Pakistani numbers. International customers
  require a more robust library (e.g. libphonenumber). Out of scope for
  ADR-005 — Telepizza's market is Pakistan-only for now.
- **Backfill may create conflicts.** If two existing customers share
  the same phone (the duplicate problem ADR-005 solves), the backfill
  will fail on the UNIQUE constraint. The migration handles this by
  logging conflicts to a `customer_identity_backfill_conflicts` table
  for manual review by a super-admin (who then triggers ADR-006 merge).

## Implementation references

- Migration: `supabase/migrations/20260818000000_adr_005_canonical_customer_identity.sql`
- TypeScript service: `backend/api/src/services/customers/identity-service.ts`
- Admin route: `backend/api/src/modules/admin/customers.ts`
- Tests: `backend/api/tests/customer-identity-service.test.ts`

## Future work (out of scope for this ADR)

- **ADR-006** — Customer Account Merge & Reversal (uses
  `customer_identities` to detect duplicates and merge them)
- **OTP verification flow** — Phase 3 sets `verified_at` on phone
  identities after successful OTP
- **International phone support** — Requires libphonenumber-equivalent
  in the database (PL/pgSQL port or external service call)
