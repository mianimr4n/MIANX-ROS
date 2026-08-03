# Phase 1.1 — Form & mutation audit

**Constraint:** Local/deterministic only; **no Production mutations** in this audit.

| Mutation | Route | Role | Validation | Confirm | Error recovery | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| Menu price/availability | `/admin/menu` | menu.write | Client+API | Low | Toast/error | Med |
| Inventory adjust | `/admin/inventory` | inventory.manage | API | Should confirm | Partial | High |
| GRN receive | `/admin/purchasing` | purchasing | API atomic | Required | High | High |
| Order status | `/admin/orders` | order.manage | API | Soft | Med | Med |
| Delivery assign | `/admin/delivery` | delivery.* | API | Soft | Med | Med |
| POS sale | `/admin/pos` | cashier | API | Soft | Med | Med |
| HR deactivate | `/admin/hr` | staff.manage | API | Required | Med | High |
| Loyalty adjust | `/admin/loyalty` | loyalty.manage | API | Required | Med | High |
| Settings org/branch save | `/admin/settings` | admin.access | API | Soft | Med | Med |
| Public checkout create | `/checkout` | public | API | Soft | Med | Med |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-MUT-01 | P2 | Confirm patterns inconsistent for destructive HR/inventory |
| P11-MUT-02 | P2 | Double-submit guards uneven across drawers |
| P11-MUT-03 | P3 | Success feedback copy varies |

Follow-up slices must add matrix tests per mutation family without Prod writes.
