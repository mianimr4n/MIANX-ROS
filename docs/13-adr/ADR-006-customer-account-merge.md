# ADR-006: Customer Account Merge & Reversal Process

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260818000100_adr_006_customer_merge.sql`)

---

## Context

Even with ADR-005 (Canonical Customer Identity), duplicate customers
already exist in the database from the pre-ADR-005 era. A customer who:

1. Placed a guest order with phone `+923001234567` (creates `customers`
   row A with no `user_id`)
2. Later registered an account with the same phone (creates `customers`
   row B with `user_id` set, but a separate row from A)

…ends up with TWO customer records. Their order history is split, their
loyalty points are split, and customer support sees two separate profiles
when they call.

This is not a hypothetical — it is the current state of the production
database for any customer who registered after placing a guest order.

Phase 2.3 (CRM) closes this gap. ADR-006 defines the merge process:
consolidate two customer records into one, transfer all FK references,
and log the merge for a 30-day reversal window.

## Decision

Implement customer merge with these rules:

1. **Merge is super-admin only.** Only a principal with `super-admin`
   role OR the explicit `customer.merge` permission can execute a merge.
   Branch managers cannot merge customers — too high a privilege.

2. **Source → Target direction.** The merge call specifies:
   - `source_customer_id` — the customer to be merged away (will be
     marked `status='merged'`)
   - `target_customer_id` — the canonical customer that absorbs the
     source (remains active)

   The caller chooses the direction. Convention: the customer with the
   `auth.users.id` link is usually the target (because it has the login
   credential); the guest-only customer is the source.

3. **FK transfer is atomic.** A single SQL function
   `merge_customers_atomic(source_id, target_id, actor_user_id, reason)`
   performs the entire merge in one transaction:
   - Updates all FK references from source → target (orders, addresses,
     favorites, reviews, loyalty_ledger, customer_identities,
     whatsapp_conversations, cod_collections.customer_received_by, etc.)
   - Marks source customer `status='merged'`, sets `merged_into_id` to
     target
   - Inserts a row in `customer_merge_log` with source_id, target_id,
     actor, reason, merge_window_expires_at = now() + 30 days
   - Returns JSONB summary of transferred counts

4. **Idempotent re-merge.** If the source is already merged into the
   target (i.e. `source.merged_into_id = target.id`), the function is
   a no-op and returns the existing merge log row. This prevents
   accidental double-merge if the call is retried.

5. **30-day reversal window.** The merge can be reversed within 30 days
   of execution by calling `reverse_customer_merge(merge_log_id,
   actor_user_id, reason)`. After 30 days, the merge is permanent and
   reversal is rejected.

6. **Reversal transfers FKs back.** The reversal function:
   - Validates the merge log row exists and is within the reversal window
   - Transfers all FK references from target back to source
   - Sets source `status='active'`, clears `merged_into_id`
   - Marks the merge log row as `reversed_at`, `reversed_by`, `reversal_reason`
   - Returns JSONB summary of transferred-back counts

7. **Merge log is append-only.** The `customer_merge_log` table rejects
   UPDATE and DELETE via trigger (except for the `reversed_at`,
   `reversed_by`, `reversal_reason` columns which are updated by the
   reversal function — done via `app.bypass_merge_log_immutable='on'`
   session variable).

8. **Conflict resolution for customer_identities.** If both source and
   target have an identity of the same type+value (e.g. both have
   `phone_e164=+923001234567`), the merge keeps the target's identity
   row (which has higher trust — the target is the canonical record)
   and deletes the source's duplicate row. This is logged in the merge
   log's `metadata->'conflicts'` field.

9. **Loyalty points are summed.** If both customers have loyalty point
   balances, the merge sums them: `target.loyalty_points += source.
   loyalty_points`. The source's loyalty ledger entries are re-pointed
   to the target with a `metadata->'merged_from'` tag for audit.

## Consequences

### Positive

- **Duplicates are consolidated.** Customer support sees one profile per
  real-world person, with full order + loyalty history.
- **Reversible within 30 days.** If a merge was done in error (e.g.
  wrong source/target direction), it can be undone without data loss.
- **Full audit trail.** Every merge is logged with who/when/why, and
  every reversal is logged too. Compliance-friendly.
- **Atomic.** The merge either fully succeeds or fully rolls back — no
  partial state.

### Negative

- **FK transfer is expensive.** A customer with 1000 orders takes a few
  seconds to merge. The function uses `UPDATE ... WHERE customer_id =
   source_id` which is index-scanned, but the volume matters. Merge is
  not designed for high-frequency use — it's an occasional super-admin
  operation.
- **Reversal after 30 days is impossible.** If the business discovers a
  wrong merge after 30 days, the only path is a manual SQL intervention
  by a database admin. This is intentional — forces the business to
  review merges promptly.
- **Identity conflicts are silently resolved.** The merge keeps the
  target's identity and deletes the source's, but the conflict is
  only visible in the merge log's metadata. The admin UI must surface
  this to make conflicts visible to operators.

## Implementation references

- Migration: `supabase/migrations/20260818000100_adr_006_customer_merge.sql`
- TypeScript service: `backend/api/src/services/customers/merge-service.ts`
- Admin route: `backend/api/src/modules/admin/customers.ts` (POST /customers/merge, POST /customers/merge/:id/reverse)
- Tests: `backend/api/tests/customer-merge-service.test.ts`

## Future work (out of scope for this ADR)

- **Duplicate detection job.** A scheduled job that scans
  `customer_identities` for potential duplicates (same phone or email
  across multiple customers) and surfaces them in an admin inbox for
  manual merge review. Out of scope; the merge function exists, but
  detection is a separate concern.
- **Auto-merge on OTP verification.** When a customer verifies their
  phone via OTP, the system could automatically merge any duplicate
  customers with the same phone. Out of scope for ADR-006 — auto-merge
  is risky without human review.
