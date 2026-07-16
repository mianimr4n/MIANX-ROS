# Sprint 4.3 Phase B — Orders Hardening (Guest Cancel)

**Date:** 2026-07-16  
**Scope:** Backend guest cancel + shared phone-access helpers (start)  
**Architecture:** O1–O12 APPROVED / FROZEN · O5 customer cancel window locked (pending, 15 min)  
**Branch:** `cursor/sprint-4-3b-orders-hardening-bf31`  
**Base:** `main`

---

## Started in this turn

| Item | Status |
|---|---|
| `POST /api/v1/orders/:orderNumber/cancel` (guest phone proof) | ✅ implemented |
| Shared `contactPhoneMatchesOrder` for tracking + cancel | ✅ |
| Customer cancel rules (`pending` only, 15-minute window) | ✅ |
| Status log append on cancel | ✅ |
| Delivery row marked `cancelled` when present | ✅ |
| Unit + route tests | ✅ |

---

## API contract

### `POST /api/v1/orders/:orderNumber/cancel`

| Field | Rule |
|---|---|
| Body `contactPhone` | Required — must match order phone |
| Body `reasonCode` | Optional — default `customer_cancelled` |
| Body `note` | Optional free text |
| Allowed status | `pending` only |
| Window | 15 minutes from `created_at` (O5) |
| Effect | `orders.status → cancelled`, `cancel_reason_code`, `order_status_logs` row |

### Errors

| Code | HTTP |
|---|---|
| `ORDER_NOT_FOUND` | 404 |
| `ORDER_ACCESS_DENIED` | 403 |
| `ORDER_CANCEL_NOT_ALLOWED` | 409 |
| `ORDER_CANCEL_WINDOW_EXPIRED` | 409 |
| `ORDER_INVALID_TRANSITION` | 409 (race) |

---

## Still pending (Phase B continuation)

| Item | Notes |
|---|---|
| `GET /api/v1/orders/:idOrNumber` unified read | Architecture §7.3 |
| Rate limits on cancel/tracking | Architecture §7.8 |
| Website cancel UI hookup | After backend close |
| Production deploy / smoke | Owner gate |

---

**SPRINT 4.3 PHASE B STATUS: IN PROGRESS**
