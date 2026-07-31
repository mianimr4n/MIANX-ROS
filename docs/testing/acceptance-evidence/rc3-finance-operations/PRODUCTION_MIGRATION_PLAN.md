# RC3 Finance Operations — Production migration plan (DO NOT APPLY YET)

## Migrations (forward-only, apply in order)

1. `20260731010000_finance_account_mappings.sql`
2. `20260731020000_cash_reconciliations.sql`
3. `20260731030000_expense_claims.sql`
4. `20260731040000_finance_posting_and_ap_idempotency.sql`

## Justification

Hard gaps vs existing models: no purpose→account mappings; `pos_z_report_events` cannot host draft/approve cash lifecycle; no expense claims; no source posting uniqueness / journal reverse / payment idempotency / match exception columns.

## Validation queries (post-apply on Staging only)

```sql
select to_regclass('public.finance_account_mappings');
select to_regclass('public.cash_reconciliations');
select to_regclass('public.expense_claims');
select to_regclass('public.finance_postings');
select proname from pg_proc where proname in (
  'compute_cash_reconciliation_totals',
  'reverse_journal_entry_atomic',
  'record_supplier_payment_atomic'
);
```

## Rollback / containment

- Forward-only: do not DROP in Production without Founder authorization.
- Containment: feature is gated by `finance.manage`; if issues arise, revoke role grants for `finance.manage` temporarily and stop using new endpoints.
- Data remains auditable; posted journals are not deleted — reverse via `reverse_journal_entry_atomic`.

## Compatibility

- CoA account types unchanged (ASSET|LIABILITY|EQUITY|REVENUE|EXPENSE).
- Existing 7-arg `record_supplier_payment_atomic` overload retained.
- No Production seed data.

## Explicit non-actions

- Do not apply these migrations to linked Production from this branch.
- Do not deploy Vercel/Render from this workstream.
