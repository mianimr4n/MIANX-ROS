# RC4 Migration alignment

**Remote migration tip:** `20260801180000`
**Local foundation:** Supabase migrations under `supabase/migrations/`
**Cutover:** 23/23 Production migrations applied (see `rc4-production-cutover/MIGRATION_*`)

## Alignment facts

| Item | Value |
| --- | --- |
| Tip migration | `20260801180000` |
| Drift closed (cutover) | `supplier_invoices.due_date`, `hr_employees.employee_number` |
| Analytics hotfix | **query-only** — no migration added |
| Ad-hoc Production SQL for hotfix | **none** |

## Rules observed

- No further Production migration in this certification evidence PR
- No SQL Editor mutation for Analytics hotfix
- Migration tip verification remains via Supabase CLI / ops runbooks (API `/readyz` reports migrations `unavailable` by design)
