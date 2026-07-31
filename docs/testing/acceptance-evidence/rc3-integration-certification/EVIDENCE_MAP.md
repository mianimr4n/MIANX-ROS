# RC3 Integration — Evidence Map

**Branch:** `feature/rc3-integration-certification`  
**Base:** `origin/main` @ `21635fb` (post Supplier Portal #148)

## Merged RC3 modules

| Module | Merge evidence | Slice evidence |
| --- | --- | --- |
| Finance Operations | PR #143 | `docs/testing/acceptance-evidence/rc3-finance-operations/` |
| Workforce | PR #144 | `docs/testing/acceptance-evidence/rc3-workforce/` |
| Loyalty + Marketing | PR #146 | `docs/testing/acceptance-evidence/rc3-loyalty-marketing/` |
| Supplier Portal | PR #147 + #148 | `docs/testing/acceptance-evidence/rc3-supplier-portal/` |

## Key APIs

| Area | Base path |
| --- | --- |
| Finance | `/api/v1/admin/finance/*` |
| Purchasing / AP | `/api/v1/admin/purchasing/*` |
| HR / workforce | `/api/v1/admin/hr/*` |
| Loyalty | `/api/v1/admin/loyalty/*` (+ customer loyalty where present) |
| Marketing / coupons | `/api/v1/admin/marketing/*`, coupon quote/create paths |
| Supplier portal | `/api/v1/supplier-portal/*` |
| Owner attention | `/api/v1/admin/finance/attention`, workforce/loyalty/marketing/supplier attention endpoints |

## Key tables (RC3-era)

Finance: `cash_reconciliations`, `expense_claims`, `finance_postings`, `finance_account_mappings`, `journal_entries`, `supplier_invoices`, `supplier_payments`  
Workforce: `hr_employees`, lifecycle/events, shifts, attendance, leave, payroll foundation  
Loyalty: ledger / balances / idempotency keys  
Marketing: consent, suppression, campaigns, coupon_redemptions  
Supplier: `supplier_portal_users`, PO lines/responses/docs/delivery refs, `supplier_portal_events`  
Procurement/inventory: POs, GRN/`goods_receiving`, stock RPCs

## RC3 migration files (20260731*)

See `MIGRATION_PLAN.md`. Foundations also include 20260730 finance/HR/loyalty/purchasing migrations already on main.

## Auth models

- Staff: Supabase Auth JWT + `AuthPrincipal` + permission checks (default-deny)
- Supplier: `user_type=supplier` + `supplier_portal_users` + server-derived supplier scope
- Customer: separate customer principal for loyalty/orders

## Authorization helpers

- `current_user_has_branch_access` / permission helpers in SQL + API middleware
- `current_user_supplier_ids()` (supplier portal)
- Service-role RPC boundaries for financial/inventory atomics

## Audit

- Finance: reconciliation/expense/posting events
- Workforce: employee/shift/attendance/leave/payroll events
- Loyalty: ledger transactions
- Marketing: consent/campaign state events
- Supplier: `supplier_portal_events`

## Owner widgets

`owner-command-builders.ts` — Finance / Workforce / Loyalty / Marketing / Supplier attention (honest unavailable vs zero)

## Critical cross-module dependencies

PO → supplier portal → GRN → inventory → invoice match → payment → journal  
Order → coupon → loyalty earn/burn  
Campaign → consent/suppression → provider submission states  
Employee → shift → attendance → labour metrics (payroll foundation, no payment)

## Deferred (carry into certification limitations)

- Supplier binary upload (URL only)
- Supplier GRN line qty (staff SoT)
- Pakistan payroll calculation / payment
- Leave balances unless configured
- Document expiry unless configured
- Labour cost unless compensation complete
- Marketing “delivered” without provider confirmation
