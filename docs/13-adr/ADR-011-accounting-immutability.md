# ADR-011: Accounting Immutability & Double-Entry Reversals

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.8.0` (migration `20260814180100_adr_011_accounting_immutability.sql`)

---

## Context

Phase 2.5 (Accounting Depth) requires that posted journal entries be
immutable. The existing schema already had:

- `journal_entries` with `status` in `('draft', 'posted', 'voided')`
- `journal_entry_lines` (one debit OR credit per line, balanced totals)
- An existing `reverse_journal_entry_atomic()` RPC (migration `20260731040000`)
  that creates an equal-and-opposite posted entry, marks the original as
  `voided`, and links them via `reversed_by_journal_id` / `reverses_journal_id`

However, nothing prevented direct `UPDATE` or `DELETE` on posted entries
outside of this RPC. A buggy migration, a manual `psql` session, or a future
admin script could silently corrupt accounting history.

ADR-011 closes this gap by adding database-layer immutability triggers that
permit ONLY the documented reversal flow.

## Decision

Enforce immutability at the database layer with two triggers:

### 1. `trg_journal_entry_immutability` (on `journal_entries`)

**Blocks** all `UPDATE` and `DELETE` on rows with `status = 'posted'`,
**except** for the documented reversal flow:

- `status` change from `posted` → `voided` ✅ (used by `reverse_journal_entry_atomic`)
- Setting `reversed_by_journal_id` (linkage update) ✅
- Setting `reverses_journal_id` (linkage on new reversal entry) ✅

All other field changes (`entry_date`, `description`, `reference_type`,
`reference_id`, `branch_id`, `created_by`) on posted entries are rejected
with a clear error message directing callers to use
`reverse_journal_entry_atomic()`.

`DELETE` of posted entries is always rejected.

### 2. `trg_journal_entry_line_immutability` (on `journal_entry_lines`)

**Blocks** all `UPDATE` and `DELETE` on lines belonging to entries with
`status` in `('posted', 'voided')`. Lines of `draft` entries can be edited
freely (before posting).

### 3. Bypass hook for trusted RPCs

A session variable `app.bypass_immutability = 'on'` allows trusted
`SECURITY DEFINER` functions to skip the trigger. Reserved for future
maintenance procedures (e.g., year-end archival). Not used by the
application today. The existing `reverse_journal_entry_atomic` RPC does NOT
need this bypass — its operations are explicitly permitted by the trigger
rules.

## Consequences

### Positive

- **Posted entries are tamper-evident.** Any direct write attempt is rejected
  at the DB layer with an informative error.
- **Existing reversal flow preserved.** The `reverse_journal_entry_atomic`
  RPC continues to work unchanged (its operations are explicitly permitted).
- **Audit-grade integrity.** Combined with `delivery_state_transitions`
  (ADR-007), the platform now has DB-enforced immutability for both delivery
  and accounting state.
- **No application changes required.** Backend code that already uses the
  reversal RPC needs no modifications.

### Negative

- **No in-place correction of posted entries.** Typos in descriptions cannot
  be edited; the only path is reversal + re-entry. This is intentional —
  accounting integrity > convenience.
- **Migration order matters.** Future migrations that need to modify posted
  entries (rare) must set `app.bypass_immutability = 'on'` explicitly,
  making the operation visible in logs.

## Implementation references

- Migration: `supabase/migrations/20260814180100_adr_011_accounting_immutability.sql`
- Existing reversal RPC: `supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql`
- Tests: `backend/api/tests/accounting-immutability.test.ts`
- Backend service (uses existing RPC): `backend/api/src/services/finance/operations.ts` → `reverseJournal()`

## Future work (out of scope for this ADR)

- **ADR-012** — Domain Event & Shared Audit Architecture (event sourcing for
  cross-module audit)
- Full Phase 2.5 accounting depth (periods, CoGS, payroll posting) remains
  a separate workstream.
