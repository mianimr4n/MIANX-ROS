# Defects

| ID | Severity | Area | Description | Status |
| --- | --- | --- | --- | --- |
| CUT-1 | — | Auth smoke | Authenticated Production smoke PASS (`post-migrate-smoke-auth.json`). | **CLOSED** |
| CUT-cutover-42703 | — | Schema drift | `employee_number` / `due_date` missing-column errors cleared on live HR/invoices reads. | **CLOSED** |
| CUT-2 | P2 | Observability | Health-probe anon headers PR **#162** open; not deployed on SHA `1d64895`. | OPEN — deploy only with explicit GO |
| CUT-4 | P3 | Analytics | `order_items.name` 42703 on product Analytics. | **CLOSED** — PR #163 merged+deployed at `2f0e432`; Production smoke `analytics-hotfix-prod-smoke.json` PASS (no `order_items.name` / 42703) |
