# Sprint 4.6 — Restaurant Operations Foundation

**Status:** Remediation on branch `feature/sprint-4-6-restaurant-ops-foundation`
**Date:** 2026-07-19
**Scope:** Operational flow Customer → Restaurant → Kitchen → Rider → Completed
**Out of scope:** Loyalty, wallets, ERP, inventory, finance, multi-tenant SaaS

---

## Delivered

### Backend (API)

| Capability | Route / module |
|---|---|
| Order dispatch | `POST /api/v1/admin/orders/:id/dispatch` (`ready` → `dispatched`) |
| Order complete | `POST /api/v1/admin/orders/:id/complete` (`ready`\|`dispatched` → `completed`) |
| Delivery assignments | `GET /api/v1/riders/assignments` |
| Rider roster | `GET /api/v1/riders/roster` |
| Assign rider | `POST /api/v1/riders/deliveries/:id/assign` |
| Delivery status | `POST /api/v1/riders/deliveries/:id/status` (`picked-up` / `delivered`) |
| Order mirror | `picked-up` → order `dispatched`; `delivered` → order `completed` |

### Authorization (seed-aligned)

| Action | Required permission | Notes |
|---|---|---|
| List assignments / roster read | `delivery.read` | BM / rider / CS |
| Assign rider | `delivery.assign` | BM (route + service). No `order.manage` shortcut. |
| Delivery status picked-up / delivered | `delivery.update` | Rider lane. Kitchen/cashier/BM use admin `dispatch`/`complete` for order side. |
| Admin order transitions | `order.manage` | Includes dispatch/complete; syncs delivery lane with checked errors |

### Delivery ↔ order consistency

- **Delivery → order:** update delivery, then mirror order; on mirror failure, compensating rollback of the delivery row.
- **Order → delivery (admin dispatch/complete):** delivery patch errors are checked and surfaced as `DELIVERY_SYNC_FAILED`; idempotent replays also heal the delivery lane.
- **Formal acceptance:** true single-transaction RPC is deferred (no migration in 4.6). Compensating rollback + checked sync + heal-on-replay are the foundation integrity controls.

### Frontend (website ops shell)

| Surface | Path |
|---|---|
| Staff login | `/staff/login` |
| Dashboard | `/ops` |
| Live orders | `/ops/orders` |
| Kitchen display | `/ops/kitchen` |
| Rider dispatch | `/ops/dispatch` |

Customers without staff roles/permissions are blocked from `/ops`.

Refresh strategy: polling (7–10s), not websockets. Dispatch/kitchen actions use in-flight busy guards. Order print uses `@media print` ticket styles.

### Database

No new migrations. Uses existing `orders`, `deliveries`, `riders`, `kitchen_tickets`, RLS helpers.

---

## Tests

- `orders-transitions.test.ts` — dispatch/complete rules
- `orders-management.test.ts` — delivery sync checked + heal on idempotent dispatch
- `riders-auth.test.ts` — riders routes require auth (not 501)
- `riders-delivery.authz.test.ts` — BM / kitchen / cashier / rider / other-branch matrix
- `deliveries-operations.test.ts` — seed authz, mirror, compensating rollback, idempotent heal
- `tests/website/sprint-4-6-ops-foundation.test.mjs` — static wiring + busy/print markers

---

## Known gaps / launch risks

- Staff accounts + rider roster rows must exist in production for end-to-end demos
- JazzCash/EasyPaisa still out of scope (COD/pay-on-collect only)
- Automated customer notifications still not wired
- Full-screen KDS is browser-based (no separate native app)
- Northern Bypass still `coming-soon` until activation sprint
- Full DB transaction/RPC for delivery↔order still future work if ops volume requires it
