# RC3 Integration Inventory (release certification @ ea5e7f8)

Base: `origin/main` @ `ea5e7f8` (includes loyalty schema compatibility PR #150)

| Module | Routes / UI | Services | Migrations (key) | API | RBAC / RLS | Audit | Tests / Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Finance | `/admin/finance`, Owner attention | `services/finance/*` | `2026073026*`, `2026073101–04*` | `/api/v1/admin/finance/*` | `finance.manage` + RLS | recon/expense/posting events | `rc3-finance-*`, finance evidence |
| Workforce | `/admin/hr` | `services/hr/*` | `2026073013*`, `2026073029*`, `2026073105–08*` | `/api/v1/admin/hr/*` | hr perms + branch helpers | employee/shift/attendance/leave/payroll events | `hr-workforce-rc3`, workforce evidence |
| Loyalty | `/admin/loyalty` | `services/loyalty/management.ts` | `20260730240000`, `20260731090000`, **`20260731140000` compat** | `/api/v1/admin/loyalty/*` | `loyalty.manage` + RLS | ledger rows + actor_user_id | loyalty DB/API tests |
| Marketing | `/admin/marketing` | `services/marketing/*` | `20260730250000`, `2026073110–11*` | admin marketing + checkout coupon | marketing perms | consent/campaign/submission | marketing/coupon tests |
| Supplier Portal | `/supplier/*`, `/admin/supplier-operations` | `services/supplier-portal/*` | `2026073112–13*` | `/api/v1/supplier-portal/*` | supplier.* + server scope | `supplier_portal_events` | supplier isolation + QA |
| Procurement | `/admin/purchasing` | `services/purchasing/*` | purchasing/AP/matching migrations | admin purchasing | purchasing.manage | PO/invoice/payment audit | purchasing tests |
| Inventory / GRN | purchasing + inventory UIs | inventory + GRN atomics | `20260730220000` etc. | admin inventory/receiving | inventory perms | stock movements | GRN atomic tests |
| Owner Dashboard | `/admin/dashboard` | `owner-command-builders`, attention APIs | — | finance/hr/loyalty/marketing/supplier attention | admin.access | N/A (reads) | website contracts + QA screenshots |

## Loyalty compatibility (verified, not redesigned)

`20260731140000_loyalty_schema_compatibility.sql`:

- `begin` / `commit`
- `ADD COLUMN IF NOT EXISTS` only
- no `DROP TABLE` / `TRUNCATE` / `DISABLE RLS`
- recreates earn/burn/adjust/expire/reverse RPCs
- upgrades foundation schema safely when ledger columns lag deployed API
