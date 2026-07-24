# RC1 API Summary

Base prefix: `/api/v1`  
Meta: `GET /api/v1/meta/modules`  
Health: `GET /healthz`, `GET /readyz`

## Modules

| Module | Base path | Auth |
| --- | --- | --- |
| auth | `/api/v1/auth` | Mixed |
| me | `/api/v1/me` | Bearer |
| branches | `/api/v1/branches` | Public |
| menu | `/api/v1/menu` | Public |
| orders | `/api/v1/orders` | Public + optional Bearer |
| dine-in | `/api/v1/dine-in` | Public token |
| kitchen | `/api/v1/kitchen` | Bearer + kitchen actors |
| riders | `/api/v1/riders` | Bearer + permissions |
| admin | `/api/v1/admin` | Bearer + permissions / super-admin |

## Operational highlights

- **Kitchen:** `GET /kitchen/tickets`, `PATCH /kitchen/tickets/:id/status`
- **Admin orders:** list/detail + confirm/reject/preparing/ready/dispatch/complete/cancel
- **Delivery:** assignments, roster, assign, status
- **Dashboard:** `GET /admin/dashboard/operations`
- **Staff invites:** super-admin only
- **Menu:** `GET /menu/catalog` only

## Intentional stubs (501)

| Endpoint | Reason |
| --- | --- |
| `POST /auth/login`, `POST /auth/refresh` | Use Supabase Auth client |
| `POST /branches/resolve` | Not implemented |
| `GET /admin/controls` | Legacy scaffold |

## Not present in RC1 Express surface

Inventory, purchasing, finance ledger, HR payroll, CRM store, WhatsApp send, menu CRUD, AI agent APIs.
