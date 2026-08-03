# POLISH-01 — Role navigation matrix

| Role | Nav source | Notes |
| --- | --- | --- |
| super-admin | `filterVisibleAdminNav` full capability set | Owner modules when permitted |
| branch-manager | BM allowlist | No ownerOnly chrome |
| kitchen | kitchen-home only | Unchanged |
| cashier | pos/orders/floor | Unchanged |
| rider | delivery | Unchanged |
| host/waiter | floor modules | Unchanged |
| customer-support / general | available only | Unchanged |
| admin/config | settings/menu/floor-plan/staff | Unchanged |
| supplier | not AdminShell | Unchanged |

POLISH-01 does **not** broaden permissions. Direct URL gates (`useAdminAccessGate`) unchanged. Headed multi-role certification deferred to POLISH-QA.
