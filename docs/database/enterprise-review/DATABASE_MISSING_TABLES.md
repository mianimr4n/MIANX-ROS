# Database Missing Tables Plan

**Date:** 2026-07-18  
**Constraint:** Documentation only — do **not** create migration files from this list without a separate owner-approved implementation PR.

Classification: `REQUIRED BEFORE V1 FREEZE` · `SAFE FOR FEATURE PHASE` · `V2 / NOT REQUIRED FOR V1`

---

## A — Designed but not live (freeze blockers)

These exist as SQL on open PR branches only. **Absent from `main` and linked production.**

| Table / object | PR | Purpose | Class |
|---|---|---|---|
| `restaurant_tables` | #69 | Per-branch tables + `qr_token_hash` / `qr_version` | REQUIRED BEFORE V1 FREEZE |
| `dine_in_sessions` | #70 | Table visit / multi-order container | REQUIRED BEFORE V1 FREEZE |
| `orders.dine_in_session_id` | #70 | Nullable FK | REQUIRED BEFORE V1 FREEZE |
| `orders.restaurant_table_id` | #70 | Nullable FK | REQUIRED BEFORE V1 FREEZE |
| `orders.table_display_snapshot` | #70 | Immutable label | REQUIRED BEFORE V1 FREEZE |
| `kitchen_tickets` | #71 | One ticket per order (PR grain) | REQUIRED BEFORE V1 FREEZE |
| `kitchen_ticket_items` | #71 | Line snapshots for KOT | REQUIRED BEFORE V1 FREEZE |
| `restaurant_bills` | #72 | Dine-in check header | REQUIRED BEFORE V1 FREEZE |
| `bill_orders` | #72 | Bill ↔ order membership | REQUIRED BEFORE V1 FREEZE |

### Helper functions (travel with above)

`enforce_dine_in_session_branch_match`, `enforce_kitchen_ticket_branch_match`, `current_user_can_access_kitchen_tickets`, `enforce_restaurant_bill_branch_match`, `enforce_restaurant_bill_immutability`, `enforce_bill_orders_bill_open`, `next_restaurant_bill_number`, `current_user_can_access_restaurant_bills`

---

## B — Architecture REQUIRED but deferred in implementation PRs

| Table | Architecture (PR #64) | Implementation | Recommendation | Class |
|---|---|---|---|---|
| `kitchen_stations` | Required with tickets | Deferred in #71 | Accept one-ticket-per-order for V1 **or** add before freeze | SAFE FOR FEATURE PHASE *(if owner accepts)* / else REQUIRED |
| `pos_sessions` | Required with bills | Omitted in #72 | Owner gate: accept cashier identity via `opened_by_user_id` on bills **or** add before freeze | SAFE FOR FEATURE PHASE *(if owner accepts)* / else REQUIRED |

---

## C — Special dine-in capabilities not yet tabulated

| Capability | Suggested entity (design sketch only) | Class |
|---|---|---|
| Waiter assignment | `dine_in_sessions.waiter_user_id` or `table_assignments` | SAFE FOR FEATURE PHASE |
| Multi-customer identities at table | `dine_in_session_participants` | SAFE FOR FEATURE PHASE |
| QR TTL / expiration | `qr_expires_at` on tables or token issue log | SAFE FOR FEATURE PHASE |
| Merge tables | `table_merge_groups` + event log | SAFE FOR FEATURE PHASE |
| Move table / transfer session | `dine_in_session_transfers` | SAFE FOR FEATURE PHASE |
| Bill split / multi-tender | `payment_splits` | SAFE FOR FEATURE PHASE |
| Multi-station kitchen | `kitchen_stations` + order×station tickets | SAFE FOR FEATURE PHASE |
| Item→station map | `menu_item_kitchen_stations` | SAFE FOR FEATURE PHASE |

---

## D — Channel / commerce (not freeze)

| Table / columns | Purpose | Class |
|---|---|---|
| `orders.scheduled_for` (+ status for hold) | Scheduled delivery/pickup/dine-in | SAFE FOR FEATURE PHASE |
| `orders.promised_ready_at` | SLA / kitchen fire time | SAFE FOR FEATURE PHASE |
| Coupon / promotion tables | Marketing | V2 / NOT REQUIRED FOR V1 |
| Loyalty / wallet | Retention | V2 / NOT REQUIRED FOR V1 |

---

## E — Ops / finance / inventory (V2)

Do **not** invent freeze blockers here:

`inventory_items`, `stock_levels`, `stock_movements`, `purchase_orders`, `vendors`, `recipe_ingredients` / BOM, `tax_rates`, `service_charge_rules`, `notification_outbox`, `device_tokens`, `reviews`, `feedback`, `analytics_events`, global `audit_events`, `branch_settings`

Class for all: **V2 / NOT REQUIRED FOR V1** (or SAFE FOR FEATURE PHASE where thin config is enough).

---

## F — Explicitly do not create

| Anti-pattern | Why |
|---|---|
| Second modifier junction named `menu_item_modifier_groups` | Alias of `item_modifier_groups` |
| Parallel `profiles` table | Retired by DB-R1 |
| Per-branch physical SQL schemas | Owner lock: logical multi-tenant via `branch_id` |
| Executable snapshot / foundation re-run | Causes `42P07`; violates workflow |

---

## G — Apply order (when owner authorizes — not this PR)

```text
Clean #71 → merge #69 → apply R3
→ merge #70 → apply R4
→ merge clean #71 → apply R5
→ merge #72 → apply R6
→ permission seed / RLS verify (R7)
→ freeze re-declaration
```

This file is **not** authorization to apply.
