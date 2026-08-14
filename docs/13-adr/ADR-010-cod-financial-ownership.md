# ADR-010: Cash on Delivery (COD) Financial Ownership

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260817000200_adr_010_cod_financial_ownership.sql`)

---

## Context

Telepizza accepts Cash on Delivery (COD) for many orders. The current flow
has a critical gap:

1. Rider collects cash at the door.
2. Rider returns to the branch.
3. Rider hands cash to the cashier.
4. Cashier adds it to the till.

Steps 2–4 are entirely manual. There is no system record of:
- How much cash the rider collected (vs. how much they hand in).
- When the rider collected it (vs. when they handed it in).
- Which order the cash was for.
- Whether the cash was ever reconciled against the order total.

This creates three failure modes:

- **Cash leakage** — Riders can pocket a portion of COD cash and claim
  the customer "didn't pay full" or "was short". With no per-order
  record, the discrepancy is invisible until end-of-shift reconciliation
  reveals a shortage.
- **No audit trail** — Financial reports cannot answer "how much COD
  cash did Branch X collect yesterday?" without manually counting the
  till.
- **No accounting posting** — COD collections are not posted to the
  general ledger, so the cash account balance drifts from reality over
  time.

Phase 2.4 + Phase 2.5 close this gap. ADR-010 defines the COD collection
record and its reconciliation flow. ADR-011 (Accounting Immutability)
provides the journal-entry infrastructure that ADR-010 uses.

## Decision

Implement COD financial ownership with these rules:

1. **One `cod_collections` row per delivery** — `delivery_id` is UNIQUE.
   A delivery can have at most one COD collection record. If the customer
   pays part-cash / part-card, only the cash portion is recorded here;
   the card portion goes through the regular payments flow.

2. **Collection happens at delivery time** — The rider app creates the
   `cod_collections` row when they mark the delivery `delivered`. The
   row records:
   - `amount` (the cash collected, in PKR — `numeric(14,2)`)
   - `currency` (always `PKR` for now; column reserved for multi-currency)
   - `collected_by_rider_id` (the rider who collected the cash)
   - `collected_at` (server-generated timestamp)
   - `customer_received_by` (recipient name, copied from POD)
   - `notes` (rider notes about the cash handover, if any)
   - `reconciliation_status` (`pending` initially)
   - `reconciled_at`, `reconciled_by` (NULL until reconciliation)
   - `journal_entry_id` (NULL until posted to GL)

3. **Reconciliation is a separate step** — End-of-shift (or end-of-day),
   the branch manager opens the COD reconciliation screen, sees all
   `pending` `cod_collections` for their branch, and marks each one as
   `reconciled` once the rider has handed in the cash. The
   `reconciliation_status` transitions are:
   - `pending` → `reconciled` (rider handed in correct amount)
   - `pending` → `shortage` (rider handed in less than `amount`)
   - `pending` → `overage` (rider handed in more than `amount`)
   - `shortage`/`overage` → `reconciled` (after investigation + write-off
     or top-up)

4. **Reconciliation triggers GL posting** — When a `cod_collections` row
   transitions to `reconciled`, a SQL trigger fires
   `create_journal_entry_atomic` to post the double-entry:
   - **Debit:** Cash account (asset)
   - **Credit:** Accounts Receivable (asset, contra) — because the
     order's revenue was already recognized at order placement, and COD
     collection converts the receivable to cash.

   The journal entry is linked back to the COD collection via
   `finance_postings` with `source_module='cod_collection'` and
   `source_id=cod_collections.id`. The unique constraint on
   `finance_postings(source_module, source_id)` makes this idempotent:
   if the trigger fires twice (e.g. due to a retry), the second posting
   is rejected by the constraint, not duplicated.

5. **Shortage/overage posting** — If reconciliation ends in `shortage`,
   the difference is posted as an expense (Debit: Cash Shortage Expense,
   Credit: Cash). If `overage`, the difference is posted as other income
   (Debit: Cash, Credit: Misc Income). This keeps the GL honest about
   the actual cash position.

6. **Branch-scoped access** — RLS policies:
   - The rider themselves can read their own COD collections.
   - Branch staff (branch-manager, cashier, super-admin) can read all
     COD collections for their branch.
   - Only branch-manager and super-admin can UPDATE
     `reconciliation_status`.
   - Riders can INSERT (when they mark delivered) but cannot UPDATE.

7. **COD is a delivery extension, not a payment method** — The existing
   `payments` table is for card/digital payments. COD cash is NOT a
   `payments` row; it is a `cod_collections` row. This separation is
   intentional: the reconciliation cadence is different (payments
   reconcile instantly via gateway; COD reconciles at shift-end via
   physical cash count). Mixing them would force the payments table to
   carry reconciliation state it doesn't need.

## Consequences

### Positive

- **Cash leakage is detectable.** End-of-shift reconciliation reveals
  shortages immediately, attributed to specific riders and orders.
- **GL is honest.** Cash account balance reflects actual physical cash
  collected, not just card settlement totals.
- **Audit trail is complete.** Every COD dollar is traceable from
  customer → rider → cashier → GL.
- **Idempotent posting.** The `finance_postings` unique constraint
  prevents double-posting even if triggers fire multiple times.

### Negative

- **Rider app must capture amount.** The rider must enter the cash
  amount they collected at the door. If they lie, the system trusts
  them until reconciliation. This is acceptable — the reconciliation
  step is the trust boundary, not the rider's word.
- **Branch manager must actually reconcile.** If the branch manager
  never runs reconciliation, `pending` rows accumulate and the GL
  doesn't reflect the cash. This is a operational discipline issue,
  not a technical one. The dashboard shows a "Pending COD
  reconciliation" badge with the count + total amount to nudge action.
- **Reversal is manual.** If a `reconciled` row was wrong (e.g. amount
  mistyped), the reversal requires calling
  `reverse_journal_entry_atomic` on the linked journal entry, then
  updating the COD row back to `pending`. This is intentional: forces
  super-admin intervention and preserves audit trail.

## Implementation references

- Migration: `supabase/migrations/20260817000200_adr_010_cod_financial_ownership.sql`
- TypeScript service: `backend/api/src/services/deliveries/cod-service.ts`
- Admin route: `backend/api/src/modules/admin/cod-reconciliation.ts`
- Tests: `backend/api/tests/cod-service.test.ts` (≥ 12 cases)

## Future work (out of scope for this ADR)

- **Auto-shortage detection** — If `amount` differs from the order total,
  flag at collection time (warning, not block). Out of scope; the rider
  may legitimately collect a tip or absorb a customer-claimed shortage.
- **Rider cash float** — Allowing riders to start shift with a small
  float for change-making. Out of scope; this requires a separate
  `rider_cash_float` table and reconciliation against `cod_collections`.
- **Bank deposit slip** — Generating a deposit slip when the cashier
  takes the reconciled cash to the bank. Out of scope; this is a
  Phase 2.5 (Finance) enhancement.
