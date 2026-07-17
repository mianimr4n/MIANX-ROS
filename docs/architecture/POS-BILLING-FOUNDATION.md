# POS Billing Foundation

**Status:** Design only — **not migrated**  
**Date:** 2026-07-18  
**Freeze class:** Mixed — see classification below  
**Constraint:** Avoid overbuilding; UI and full cashier workflows are **not** freeze blockers.

---

## 1. Purpose

Define the minimum schema so dine-in sessions can eventually settle a check without redesigning orders after freeze. Existing `payments` (order-scoped) remains; bill layer aggregates multi-order sessions.

## 2. Classification (owner-locked recommendation)

| Object | Before freeze? | Rationale |
|---|---|---|
| `pos_sessions` | **REQUIRED BEFORE FREEZE** | Cashier shift identity; bill FK target; audit who closed checks |
| `restaurant_bills` | **REQUIRED BEFORE FREEZE** | Session-level check header for multi-order dine-in |
| `restaurant_bill_orders` | **REQUIRED BEFORE FREEZE** | Join bill ↔ orders without mutating order PK model |
| `payment_splits` | **SAFE FOR POS FEATURE PHASE** | Split tender / multi-tender can wait; use single `payments` row per capture until then |
| Full POS offline sync tables | **SAFE FOR FEATURE PHASE** | Not needed for freeze |
| Cash drawer / till counts | **SAFE FOR FEATURE PHASE** | Ops polish |
| Receipt printer configs | **SAFE FOR FEATURE PHASE** | Device layer |

## 3. Minimum schemas

### `pos_sessions` (REQUIRED)

```text
pos_sessions
  id uuid PK
  branch_id uuid NOT NULL → branches
  opened_by_user_id uuid NOT NULL → users
  closed_by_user_id uuid → users
  status text NOT NULL                 -- open | closed | voided
  opened_at / closed_at
  opening_float numeric(12,2)
  notes text
  created_at / updated_at
```

One open session per cashier+branch is an API rule (optional unique partial index).

### `restaurant_bills` (REQUIRED)

```text
restaurant_bills
  id uuid PK
  branch_id uuid NOT NULL → branches
  dine_in_session_id uuid → dine_in_sessions   -- nullable for walk-up POS
  pos_session_id uuid → pos_sessions
  bill_number varchar(40) NOT NULL
  status text NOT NULL                         -- open | settled | voided | refunded
  subtotal / tax_amount / discount_amount / total_amount numeric(12,2)
  amount_paid numeric(12,2) NOT NULL default 0
  currency varchar(10) NOT NULL default 'PKR'
  table_display_snapshot varchar(120)
  opened_at / settled_at
  created_at / updated_at
  UNIQUE (branch_id, bill_number)
```

### `restaurant_bill_orders` (REQUIRED)

```text
restaurant_bill_orders
  id uuid PK
  restaurant_bill_id uuid NOT NULL → restaurant_bills
  order_id uuid NOT NULL → orders
  UNIQUE (order_id)                            -- an order on at most one open/settled bill
  UNIQUE (restaurant_bill_id, order_id)
```

### `payment_splits` (FEATURE PHASE)

Defer. Until then:

- Create `payments` rows keyed by `order_id` (existing), and/or
- Add nullable `restaurant_bill_id` on `payments` in POS feature phase when multi-order single tender is needed.

**Do not** require `payment_splits` before freeze.

## 4. Relationship to existing `payments`

| Today | After foundation |
|---|---|
| `payments.order_id` required | Keep; delivery/pickup unchanged |
| `orders.payment_status` summary | Keep as customer-safe summary |
| Dine-in multi-order check | Settle via `restaurant_bills`; mark member orders paid in API transaction |

## 5. Actors

| Actor | Bill powers |
|---|---|
| Cashier / POS staff | Open/close pos_session; create/settle bills |
| Branch manager | Void/refund with permission |
| QR guest | **No** bill settle |
| Kitchen | **No** payment mutation |

## 6. Backward compatibility

- Delivery/pickup: continue order-level `payments` only; bill tables unused.
- No mandatory bill for website delivery checkout.
- Dine-in without bill remains allowed until POS cutover (owner gate).

## 7. Non-goals before freeze

- Offline-first POS sync
- Multi-currency
- Tip pools / staff tips ledger
- Fiscal printer legal profiles
