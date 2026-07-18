# Sprint 4.6 — Restaurant Operations Foundation

**Status:** Implementation on branch `feature/sprint-4-6-restaurant-ops-foundation`  
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

Authz: Bearer + `AuthPrincipal` + `delivery.*` / `order.manage`. Legacy header `requireRole` 501 stubs removed.

Reuses Sprint 4.5 admin order transitions + DB-R5 kitchen ticket APIs.

### Frontend (website ops shell)

| Surface | Path |
|---|---|
| Staff login | `/staff/login` |
| Dashboard | `/ops` |
| Live orders | `/ops/orders` |
| Kitchen display | `/ops/kitchen` |
| Rider dispatch | `/ops/dispatch` |

Customers without staff roles/permissions are blocked from `/ops`.

Refresh strategy: polling (7–10s), not websockets.

### Database

No new migrations. Uses existing `orders`, `deliveries`, `riders`, `kitchen_tickets`, RLS helpers.

---

## Tests

- `orders-transitions.test.ts` — dispatch/complete rules
- `riders-auth.test.ts` — riders routes require auth (not 501)

---

## Known gaps / launch risks

- Staff accounts + rider roster rows must exist in production for end-to-end demos
- JazzCash/EasyPaisa still out of scope (COD/pay-on-collect only)
- Automated customer notifications still not wired
- Full-screen KDS is browser-based (no separate native app)
- Northern Bypass still `coming-soon` until activation sprint
