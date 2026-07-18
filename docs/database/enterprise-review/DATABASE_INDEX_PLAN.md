# Database Index Plan

**Date:** 2026-07-18  
**Mode:** Design only — no CREATE INDEX on production from this document

---

## 1. Live indexes (adequate for current volume)

Present on linked production (sampled via prior audits / migrations):

| Area | Indexes |
|---|---|
| Orders | `idx_orders_branch_status`, partial `auth_user_id`, `contact_phone_e164`, unique idempotency |
| Order items | `idx_order_items_order_id` |
| Status logs | `(order_id, created_at)` |
| Users | `auth_user_id`, phone E.164 unique (+ legacy unique) |
| Payments | `idx_payments_order_id` |
| Menu | slug uniques on categories/items; variant uniqueness |
| Modifiers | group/option codes; `item_modifier_groups` unique with `NULLS NOT DISTINCT` |
| Staff invites | invite token hash / status indexes per slice 2b |

**Class:** Keep. Duplicate phone uniqueness is **SAFE FOR FEATURE PHASE** cleanup (P3).

---

## 2. Designed indexes (REQUIRED with R3–R6 apply)

### DB-R3 — `restaurant_tables`

| Index | Purpose | Class |
|---|---|---|
| `UNIQUE (branch_id, table_number)` | Unlimited tables, unique numbers | REQUIRED BEFORE V1 FREEZE |
| `UNIQUE (qr_token_hash)` | Hash lookup / rotate | REQUIRED BEFORE V1 FREEZE |
| `idx_restaurant_tables_branch_id` | Staff lists | REQUIRED BEFORE V1 FREEZE |
| Partial `(branch_id, is_active) WHERE is_active` | Active floor plan | REQUIRED BEFORE V1 FREEZE |

### DB-R4 — `dine_in_sessions` + order FKs

| Index | Purpose | Class |
|---|---|---|
| Partial unique active session per table (`open\|ordering`) | One active visit | REQUIRED BEFORE V1 FREEZE |
| `UNIQUE (public_token_hash)` | Public resolve | REQUIRED BEFORE V1 FREEZE |
| `(branch_id)`, `(restaurant_table_id)`, `(branch_id, status)` | Ops lists | REQUIRED BEFORE V1 FREEZE |
| Partial `orders(dine_in_session_id)`, `orders(restaurant_table_id)` | Session order fan-out | REQUIRED BEFORE V1 FREEZE |

### DB-R5 — kitchen

| Index | Purpose | Class |
|---|---|---|
| `UNIQUE (order_id)` on tickets | Idempotent create | REQUIRED BEFORE V1 FREEZE |
| `(branch_id)`, `(branch_id, status)`, `(status)` | Queue screens | REQUIRED BEFORE V1 FREEZE |
| `(kitchen_ticket_id)` on items | Line fetch | REQUIRED BEFORE V1 FREEZE |
| `UNIQUE (kitchen_ticket_id, order_item_id)` | No dup lines | REQUIRED BEFORE V1 FREEZE |

### DB-R6 — bills

| Index | Purpose | Class |
|---|---|---|
| `UNIQUE (branch_id, bill_number)` | Human bill ids | REQUIRED BEFORE V1 FREEZE |
| Partial one open bill per session | Auto-link target | REQUIRED BEFORE V1 FREEZE |
| `(dine_in_session_id)`, `(branch_id, status)` | Cashier lists | REQUIRED BEFORE V1 FREEZE |
| `UNIQUE (order_id)` on `bill_orders` | One bill per order | REQUIRED BEFORE V1 FREEZE |

---

## 3. Recommended after freeze (feature volume)

| Index | When | Class |
|---|---|---|
| `orders (created_at DESC)` or `(branch_id, created_at DESC)` | Admin order volume | SAFE FOR FEATURE PHASE |
| `orders (status, created_at)` covering lists | Lifecycle dashboards | SAFE FOR FEATURE PHASE |
| `deliveries (branch_id, status)` | Rider dispatch volume | SAFE FOR FEATURE PHASE |
| `order_status_logs (created_at)` BRIN/time | Long retention scans | SAFE FOR FEATURE PHASE |
| Partial unique open `pos_sessions` per cashier | If `pos_sessions` added | SAFE FOR FEATURE PHASE |
| `(order_id, kitchen_station_id)` unique | If multi-station tickets return | SAFE FOR FEATURE PHASE |
| `orders (scheduled_for)` partial where not null | Scheduled orders | SAFE FOR FEATURE PHASE |

---

## 4. Anti-patterns

- Do not index `qr_token_hash` plaintext columns (there are none — hash only).  
- Do not expose hash columns to `authenticated` SELECT (column privilege revoke in R3/R4 designs).  
- Do not add speculative composite indexes before measuring — current prod volume is tiny.

---

## 5. Validation after future apply (not this PR)

```text
EXPLAIN (ANALYZE, BUFFERS) staff session list by branch+status
EXPLAIN hash resolve path on qr_token_hash / public_token_hash
EXPLAIN kitchen queue by branch+status
EXPLAIN open bill by session
```

No production index changes in this engagement.
