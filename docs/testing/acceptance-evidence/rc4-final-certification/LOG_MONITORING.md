# RC4 Log monitoring

**Live SHA:** `2f0e432`
**Scope:** Production health + authenticated smoke error signatures (no secrets)

## Observed

| Signal | Result |
| --- | --- |
| `/healthz` | PASS |
| `/readyz` | PASS, empty `issues` |
| Authenticated cutover probes | no 42703 / 42P01 |
| Analytics hotfix probes | no `order_items.name`, no 42703/42P01, no Analytics 5xx |
| DOM schema-error surfaces on `/admin/reports` | none |

## Platform log export

Render/API log bulk export was not available without platform credentials in-session. Operational evidence uses authenticated HTTP probe bodies and UI scans (redacted JSON under cutover pack).

## Watchlist (post-rotation / ongoing)

- `order_items.name does not exist`
- PostgreSQL `42703` / `42P01`
- Analytics API 5xx
- PostgREST schema-cache errors
- `due_date` / `employee_number` regressions
