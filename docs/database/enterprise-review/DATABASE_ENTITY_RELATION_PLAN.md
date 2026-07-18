# Database Entity Relation Plan

**Date:** 2026-07-18  
**Mode:** Design / documentation only  
**Sources:** Live migrations on `main` · Architecture PR #64 · Designed SQL in PRs #69–#72

---

## 1. State layers

```text
LIVE (prod / main through DB-R2)
  identity, RBAC, branches, menu, modifiers, orders, payments skeleton,
  riders/deliveries skeleton, staff invites, status logs

DESIGNED (PRs #69–#72 — NOT LIVE)
  restaurant_tables → dine_in_sessions → kitchen_tickets(+items)
  → restaurant_bills ↔ bill_orders → orders

DEFERRED (feature / V2)
  pos_sessions (arch required; R6 omitted), kitchen_stations,
  payment_splits, waiter assignment, merge/move, inventory, loyalty, …
```

---

## 2. Live ER overview

```text
auth.users ──< public.users.auth_user_id
                ├──< user_roles >── roles ──< role_permissions >── permissions
                ├──< customers
                ├──< staff
                └──< riders

branches ──< user_roles / staff / riders / orders / deliveries / staff_invites
         ──< item_modifier_groups.branch_id (nullable)
         ──< branch_modifier_options

menu_categories ──< menu_items ──< menu_item_variants
                     │
                     ├──< item_modifier_groups >── modifier_groups ──< modifier_options
                     │         └── (optional) linked_menu_item_id → menu_items
                     └── branch_modifier_options >── modifier_options

orders ──< order_items ──< order_item_modifiers
     ├──< order_status_logs
     ├──< payments
     └── deliveries (1:1)

staff_invites ──< staff_invite_events
```

---

## 3. Designed restaurant ER (REQUIRED BEFORE V1 FREEZE)

```text
branches ──< restaurant_tables
              │  UNIQUE(branch_id, table_number)
              │  qr_token_hash UNIQUE (nullable until issued)
              │
              └──< dine_in_sessions
                     │  partial UNIQUE active (open|ordering) per table
                     │  public_token_hash UNIQUE
                     │
                     ├──< orders (nullable dine_in_session_id, restaurant_table_id,
                     │            table_display_snapshot)
                     │
                     └──< restaurant_bills
                            └──< bill_orders ──> orders (order_id UNIQUE)

orders ── 1:1 kitchen_tickets ──< kitchen_ticket_items ──> order_items
         (PR #71 grain; stations deferred)
```

### Cardinality rules (locked for freeze)

| Relation | Rule |
|---|---|
| Branch → tables | 1:N unlimited |
| Table → active session | 0..1 for statuses `open\|ordering` |
| Session → orders | 1:N |
| Order → kitchen ticket | 0..1 (idempotent on confirm) |
| Session → open bill | 0..1 (`status=open`) |
| Order → bill | 0..1 via `bill_orders.order_id` UNIQUE |
| Delivery/pickup ↔ session/table | Must be NULL (CHECK in R4 design) |

---

## 4. Order channel matrix

| `order_type` | Session / table | Kitchen ticket | Bill |
|---|---|---|---|
| `delivery` | NULL | Yes (when R5 live) | No |
| `pickup` | NULL | Yes | No |
| `dine-in` | NULL\|NULL (legacy) **or** both set (QR/POS) | Yes | Yes when session confirmed (R6) |

Phased CHECK (R4 design) keeps legacy website dine-in valid until owner cutover.

---

## 5. Modifier pricing integrity

```text
quote/create (service_role)
  → resolve live modifier_options (+ size tier)
  → persist order_item_modifiers snapshots (codes, names, unit/total)
  → never trust client unitPrice
```

Historical snapshots must not rewrite when catalog prices change.

---

## 6. Planned feature-phase relations (not freeze)

| Entity | Relates to | Purpose |
|---|---|---|
| `pos_sessions` | branch, users, bills | Cashier shift audit |
| `kitchen_stations` | branch, tickets | Multi-station routing |
| `menu_item_kitchen_stations` | menu_items, stations | Explicit routing map |
| `session_guests` / waiter FK | dine_in_sessions | Multi-customer + waiter |
| `table_merge_events` / move log | restaurant_tables, sessions | Merge/move audit |
| `payment_splits` | bills / payments | Split tender |
| `orders.scheduled_for` | orders | Scheduled fulfillment |

---

## 7. Integrity triggers (designed, not live)

| Trigger / function | Purpose |
|---|---|
| `enforce_dine_in_session_branch_match` | session.branch = table.branch |
| `enforce_kitchen_ticket_branch_match` | ticket.branch = order.branch |
| `enforce_restaurant_bill_branch_match` | bill.branch = session.branch |
| `enforce_restaurant_bill_immutability` | paid/voided immutable |
| `enforce_bill_orders_bill_open` | only open/billed accept links |
| `next_restaurant_bill_number` | branch-prefixed daily sequence |

---

## 8. Naming aliases (do not create duplicates)

| Informal / architecture name | Canonical |
|---|---|
| `menu_item_modifier_groups` | `item_modifier_groups` |
| `restaurant_bill_orders` | `bill_orders` (PR #72) |

---

## 9. Non-goals

- No per-branch physical schemas  
- No inventing LIVE status for DESIGNED tables  
- No migration SQL in this document  
