# RC3 Change Inventory (release-level)

Sources: merged PRs #143–#148, slice evidence maps, migrations `20260730*`/`20260731*`, services under `backend/api/src/services/{finance,hr,loyalty,marketing,purchasing,supplier-portal}`, admin/supplier UI under `apps/website/client/src/pages`.

## Finance

| Component | Schema | Service | API | UI | Perms | Audit | Tests | Evidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cash reconciliation | `cash_reconciliations` + events | `finance/operations` | `/admin/finance/*` | AdminFinance | finance.manage | recon events | rc3-finance-* | rc3-finance-operations/ | — |
| Expenses | `expense_claims` | finance ops | admin finance | AdminFinance | finance.manage | claim events | same | same | — |
| AP / payments | invoices/payments + idempotency | purchasing + finance | purchasing/finance | Purchasing/Finance | purchasing/finance | payment/posting | purchasing + finance tests | same | mismatch blocks pay |
| Journals / TB / P&L | journal_* + report RPCs | finance management | finance reports | AdminFinance | finance | journal void/reverse | finance tests | same | — |
| Owner finance widgets | — | dashboard attention | `/admin/finance/attention` | Owner Command | admin.access | — | website contracts | same | unavailable ≠ zero |

## Workforce

| Component | Schema | Service | API | UI | Perms | Audit | Tests | Evidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Employee lifecycle | hr employee + events | `hr/employees` | `/admin/hr/*` | AdminHr | hr.* | employee events | hr-workforce-rc3 | rc3-workforce/ | — |
| Shifts | shift tables | `hr/scheduling` | admin hr | AdminHr | hr.* | shift events | same | same | overlap blocked |
| Attendance / leave | attendance/leave hardening | workforce services | admin hr | AdminHr | hr.* | correction/leave events | same | same | leave balance config |
| Payroll foundation | payroll tables | `hr/payroll` | admin hr | AdminHr | hr.* | payroll events | same | same | **no payment** |
| Owner workforce widgets | — | attention | admin | Owner Command | admin.access | — | website | same | labour cost may be unavailable |

## Loyalty

| Component | Schema | Service | API | UI | Perms | Audit | Tests | Evidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ledger earn/burn/adjust/expire/reverse | loyalty ledger complete | `loyalty/management` | admin + checkout paths | AdminLoyalty | loyalty.* | ledger txs | rc3-loyalty-* | rc3-loyalty-marketing/ | idempotent burns |
| Owner loyalty widgets | — | attention | admin | Owner Command | admin.access | — | website | same | — |

## Marketing

| Component | Schema | Service | API | UI | Perms | Audit | Tests | Evidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consent / suppression / campaigns | marketing campaigns consent | marketing services | admin marketing | AdminMarketing | marketing.* | campaign/consent events | admin-marketing-rc3 | rc3-loyalty-marketing/ | no fabricated delivered |
| Coupons + redemptions | coupons + `coupon_redemptions` | `marketing/coupons` | quote/create + admin | loyalty/marketing/checkout | marketing/orders | redemption rows | rc3-coupon-pricing | same | eligibility enforced |

## Supplier Portal

| Component | Schema | Service | API | UI | Perms | Audit | Tests | Evidence | Limitation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Identity / perms | `supplier_portal_users` | supplier-portal management | `/supplier-portal/*` | `/supplier/*` | supplier.* | portal events | rc3-supplier-portal* | rc3-supplier-portal/ | — |
| PO responses / docs / delivery | responses, documents, delivery refs | same | supplier-portal | supplier PO/docs | supplier.* | portal events | same | same | URL docs only; GRN staff SoT |
| Staff ops / Owner widgets | staff decisions | admin + owner builders | supplier-operations + attention | AdminSupplierOperations + Owner | staff perms | staff decisions | same | same | — |

## Cross-cutting reused modules

Orders, inventory/GRN atomics, purchasing loop, RBAC helpers, notifications outbox, Owner Command Center patterns.
