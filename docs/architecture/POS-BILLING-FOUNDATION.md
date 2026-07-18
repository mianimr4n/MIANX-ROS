# POS Billing Foundation

**Status:** DB-R6 migration implemented (dine-in minimum)  
**Date:** 2026-07-18  
**Freeze class:** Mixed — see classification below  
**Constraint:** Avoid overbuilding; UI and full cashier workflows are **not** freeze blockers.

---

## 1. Purpose

Define the minimum schema so dine-in sessions can settle a check without redesigning orders after freeze. Existing `payments` (order-scoped) remains; bill layer aggregates multi-order sessions.

## 2. Owner overrides (DB-R6 this turn)

| Design doc | DB-R6 owner contract |
|---|---|
| `restaurant_bill_orders` | **`bill_orders`** (canonical table name; architecture alias documented here) |
| status includes `refunded` / `settled` | **`open \| billed \| paid \| voided`** (no `refunded`) |
| `pos_sessions` required | **Deferred** this turn — keep minimal; bill FK to `dine_in_sessions` only |
| `payment_splits` / payment_method | **Omitted** — COD / order-level payments unchanged |

## 3. Classification

| Object | Before freeze? | Rationale |
|---|---|---|
| `restaurant_bills` | **REQUIRED** | Session-level check header for multi-order dine-in |
| `bill_orders` | **REQUIRED** | Join bill ↔ orders (`restaurant_bill_orders` alias) |
| `pos_sessions` | Deferred (owner this turn) | Can land with fuller POS slice |
| `payment_splits` | Feature phase | Single tender via existing `payments` until then |

## 4. Minimum schemas (implemented)

### `restaurant_bills`

- FK `dine_in_session_id` → `dine_in_sessions` (NOT NULL for this dine-in foundation)
- FK `branch_id` → `branches` (must match session via trigger)
- `bill_number` UNIQUE per branch (`PREFIX-YYYYMMDD-####`)
- status: `open | billed | paid | voided`
- money: `subtotal`, `tax_amount`, `discount_amount`, `grand_total` `numeric(10,2)`
- `opened_by_user_id` / `closed_by_user_id` → `public.users`
- Immutability: `paid` / `voided` cannot be updated (trigger)

### `bill_orders` (alias: `restaurant_bill_orders`)

- `restaurant_bill_id` → `restaurant_bills`
- `order_id` UNIQUE → `orders` (one bill membership per order)
- UNIQUE `(restaurant_bill_id, order_id)`
- Insert only when bill status is `open` or `billed`

## 5. Auto-link (Option B — backend)

When a **dine-in** order becomes `confirmed` and has `dine_in_session_id`, attach to the session's open bill (create if none). Idempotent. **Must not run for delivery/pickup.** Coexists with DB-R5 kitchen ticket creation on the same confirm path.

## 6. RLS matrix

| Actor | Access |
|---|---|
| Super-admin | Full (via helper + service_role for writes) |
| branch-manager / cashier | SELECT/UPDATE own branch |
| Kitchen / rider / customer / anon | **No** access |
| Server writes (create/link) | `service_role` (R0 grant model) |

## 7. Minimal APIs

- `GET /api/v1/admin/bills?session_id=...`
- `POST /api/v1/admin/bills/:id/close` body `{ "status": "paid" | "voided" }`
  - Authz: cashier / branch-manager / super-admin + branch scope
  - Reject close when linked orders are not final (`completed` | `cancelled`)
  - Paid/voided bills are immutable

## 8. Backward compatibility

- Delivery/pickup: continue order-level `payments` only; bill tables unused.
- No mandatory bill for website delivery checkout.
- Dine-in without session remains allowed until POS cutover (legacy R4 path).

## 9. Non-goals (this slice)

- POS / Kitchen / Admin bill UI
- Offline sync, cash drawer, printer configs
- `payment_splits`, multi-tender, refunds status
- DB-R7 permission seed expansion beyond RLS helper roles
