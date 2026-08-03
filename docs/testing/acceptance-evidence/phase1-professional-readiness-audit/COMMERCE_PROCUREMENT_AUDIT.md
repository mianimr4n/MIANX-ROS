# Phase 1.1 — Commerce & procurement audit

| Area | Route | Maturity | Notes |
| --- | --- | --- | --- |
| Menu | `/admin/menu` | PARTIAL_LIVE | Price/availability writes; modifier edit Phase 2 |
| Inventory | `/admin/inventory` | FOUNDATION | APIs LIVE in repo; Prod often empty stock |
| Purchasing | `/admin/purchasing` | FOUNDATION | PO/GRN/invoices; Prod-unverified |
| Marketing | `/admin/marketing` | PARTIAL_LIVE | Coupons; checkout redeem may lag |

## Empty-data vs defects

| Observation | Classification |
| --- | --- |
| Zero stock items / no movements | Configuration/onboarding gap (not code defect) |
| Sellable SKUs without recipes | Expected until recipes configured; surface as readiness |
| Empty suppliers | Onboarding gap |
| Low-stock “all clear” when **zero** stock items | **Code honesty defect** — `admin-inventory.ts` treats `lowStockCount===0` as healthy even if `stockItemCount===0` |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-COM-01 | P1 | Inventory insight claims every item above reorder when catalog empty (`admin-inventory.ts:187–192`) |
| P11-COM-02 | P1 | Procurement banner “ready” without Prod-unverified caveat |
| P11-COM-03 | P2 | Inventory banner tone stronger than peer PARTIAL modules |
| P11-COM-04 | P2 | Orphan `/admin/supplier-operations` route |

Do **not** call missing Production stock a product outage.
