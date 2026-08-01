# Production Log Audit

Observed Production errors (operator report; not reproduced via Production SQL):

| # | Symptom | Root cause (repository truth) |
| --- | --- | --- |
| 1 | `42703` column `hr_employees.employee_number` does not exist | Migration `20260731050000_hr_employee_lifecycle.sql` adds the column — **pending on linked remote** |
| 2 | `42703` column `supplier_invoices.due_date` does not exist | Migration `20260731040000_finance_posting_and_ap_idempotency.sql` adds the column; re-asserted in `20260731150000_rc3_deployment_schema_compatibility.sql` — **both pending on linked remote** |
| 3 | Repeated `401` on `GET /auth/v1/health` | API `probeSupabaseConnectivity` called Supabase Auth health **without** `apikey` / Bearer anon headers; gateway returns 401; probe previously treated 401 as connectivity `ok`, creating log noise on every `/healthz`/`/readyz` |

## Compatibility migration note

`20260731150000` re-asserts `supplier_invoices.due_date` but does **not** re-assert `hr_employees.employee_number`.

## Actions in this certification branch

- Health probe fixed to send anon key headers (no secret logging).
- Schema drift documented; **no Production migration applied**.
