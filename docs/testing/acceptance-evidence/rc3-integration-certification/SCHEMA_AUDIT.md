# RC3 Deployment Schema Audit

**Base:** `origin/main` @ `ea5e7f8` (+ this audit branch)  
**Verdict:** `RC3_SCHEMA_CERTIFIED`

Local validation: migration `20260731150000` applied; object spot-checks PASS; `migration up` repeatability no-op PASS; `pnpm check` / `pnpm test` / `pnpm rc1:gate` PASS.

## Remaining blockers

None for repository schema certification.

**Production ops still required:** apply pending migrations through `20260731150000` on the live database via the normal release path (no manual SQL). Until that apply completes, runtime “relation/column does not exist” errors can persist on the lagging environment.

## Root cause of UI runtime errors

Deployed API/UI references RC3 tables/columns that already exist in repository migrations, but Production (or a lagging environment) has not applied the full RC3 migration chain. That is **deployment schema drift**, not missing product design.

## Object → covering migration map

| Object | Status in repo | Covering migration(s) |
| --- | --- | --- |
| `cash_reconciliations` (+ events) | Implemented | `20260731020000_cash_reconciliations.sql` |
| `expense_claims` | Implemented | `20260731030000_expense_claims.sql` |
| `supplier_invoices.due_date` | Implemented | `20260731040000_finance_posting_and_ap_idempotency.sql` |
| `hr_shift_templates` / `hr_scheduled_shifts` | Implemented | `20260731060000_hr_shift_scheduling.sql` |
| `hr_attendance.scheduled_shift_id` | Implemented | `20260731070000_hr_attendance_leave_hardening.sql` |
| `hr_attendance_corrections` (+ `rejection_reason`) | Implemented | `20260731070000_hr_attendance_leave_hardening.sql` |
| `hr_leave_requests.rejection_reason` | Implemented | `20260731070000_hr_attendance_leave_hardening.sql` |
| `hr_compensation_profiles` / payroll foundation | Implemented | `20260731080000_hr_payroll_foundation.sql` |
| `loyalty_transactions.actor_user_id` + reverse/expiry/idempotency | Implemented | `20260731090000` + `20260731140000` |
| Supplier portal tables/RLS | Implemented | `20260731120000` + `20260731130000` |

## Compatibility migration added

`20260731150000_rc3_deployment_schema_compatibility.sql`

- Forward-only, single transaction (`begin`/`commit`)
- Idempotent (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`)
- Non-destructive (no DROP TABLE/COLUMN, no TRUNCATE)
- Re-asserts Finance/HR critical objects + loyalty columns + supplier column drift
- Does **not** stub-create full supplier portal tables (owned by 3112/3113)

## Reports

Reports service reads `orders` only for sales — no additional RC3 schema objects required beyond existing order schema.

## Ops requirement

Production must apply pending migrations through `20260731150000` (and prior RC3 files) via the normal migration path. No manual Production SQL.
