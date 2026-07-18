# Database Gap Analysis — 50 Domains

**Date:** 2026-07-18  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Baseline:** `main` @ `9c1d21c` + designed PRs #69–#72  
**Mode:** Analysis only — no schema changes

### State keys

| Key | Meaning |
|---|---|
| **LIVE** | Present on linked production (R0–R2 era) |
| **DESIGNED** | In open PR / architecture docs — **not** production |
| **ABSENT** | No production table and no freeze-ready design |

### Gap class

`REQUIRED BEFORE V1 FREEZE` · `SAFE FOR FEATURE PHASE` · `V2 / NOT REQUIRED FOR V1`

---

## Executive gap picture

| Slice | Live? | Designed? | Freeze impact |
|---|---|---|---|
| DB-R0 grants | Yes | — | Cleared |
| DB-R1 profiles | Yes | — | Cleared |
| DB-R2 modifiers | Yes | — | Cleared (catalog count drift = P2) |
| DB-R3 tables/QR | **No** | PR #69 | **Blocks freeze** |
| DB-R4 sessions | **No** | PR #70 | **Blocks freeze** |
| DB-R5 kitchen | **No** | PR #71 (polluted) | **Blocks freeze** |
| DB-R6 bills | **No** | PR #72 | **Blocks freeze** |
| DB-R7 re-declare | Blocked | PR #73 docs | Cannot PASS until R3–R6 live |

Honest rule: **designed ≠ applied**. War Room correctly blocks merge/apply of polluted #71.

---

## Domain audit (1–50)

| # | Domain | Live foundation | Gap | Class |
|---|---|---|---|---|
| 1 | Customer | LIVE `customers` + `users` | CRM fields thin; addresses not first-class | SAFE FOR FEATURE PHASE |
| 2 | Authentication | LIVE Auth + `users` bootstrap, Google/email, phone E.164 | OTP/WABA ops pending (app), not DB freeze | SAFE FOR FEATURE PHASE |
| 3 | Branches | LIVE (2) | Hours JSON OK; capacity/zones optional | SAFE FOR FEATURE PHASE |
| 4 | Menu | LIVE `menu_items` | Branch-level item hide incomplete beyond modifiers | SAFE FOR FEATURE PHASE |
| 5 | Menu Categories | LIVE | Count vs board 13 vs live 15 | SAFE FOR FEATURE PHASE |
| 6 | Menu Variants | LIVE `menu_item_variants` | — | — (adequate for V1) |
| 7 | Extra Toppings | LIVE topping SKUs + modifier options | Dual model until topping SKU retirement | SAFE FOR FEATURE PHASE |
| 8 | Crust Types | LIVE via `modifier_groups` / options | — | — |
| 9 | Add-ons | LIVE modifier groups (sides/drinks/extras) | — | — |
| 10 | Drinks | LIVE `product_type=drink` + add-drinks group | — | — |
| 11 | Deals | LIVE `product_type=deal` SKUs | No deal-composition / bundle engine | V2 / NOT REQUIRED FOR V1 |
| 12 | Coupons | ABSENT | Coupon codes, redemptions | V2 / NOT REQUIRED FOR V1 |
| 13 | Loyalty | ABSENT | Points, tiers | V2 / NOT REQUIRED FOR V1 |
| 14 | Wallet | ABSENT | Stored value | V2 / NOT REQUIRED FOR V1 |
| 15 | Orders | LIVE quote/create/snapshots/idempotency | No `scheduled_for`; dine-in FKs DESIGNED only | REQUIRED BEFORE V1 FREEZE (dine-in FKs); scheduled = SAFE FOR FEATURE PHASE |
| 16 | Order Items | LIVE + `order_item_modifiers` | — | — |
| 17 | Kitchen | DESIGNED tickets (PR #71) | Not live; stations deferred vs arch | REQUIRED BEFORE V1 FREEZE (tickets); stations SAFE FOR FEATURE PHASE |
| 18 | Kitchen Queue | DESIGNED as ticket status indexes | No separate queue table | SAFE FOR FEATURE PHASE |
| 19 | Riders | LIVE skeleton | Ops assignment UI/APIs incomplete | SAFE FOR FEATURE PHASE |
| 20 | Delivery | LIVE `deliveries` | Tracking/dispatch polish | SAFE FOR FEATURE PHASE |
| 21 | Driver Assignment | LIVE nullable `rider_id` | No assignment events / ETA engine | SAFE FOR FEATURE PHASE |
| 22 | Staff | LIVE `staff` + invites | Waiter/cashier as roles exist; floor assignment thin | SAFE FOR FEATURE PHASE |
| 23 | Roles | LIVE | Extend codes for table/kitchen/POS as R3–R6 land | REQUIRED BEFORE V1 FREEZE (with foundations) |
| 24 | Permissions | LIVE | Seed `table.*` / `kitchen.*` / `pos.*` | REQUIRED BEFORE V1 FREEZE (with foundations) |
| 25 | Cashier | DESIGNED bills (PR #72); `pos_sessions` omitted | Settlement foundation missing live | REQUIRED BEFORE V1 FREEZE (bills); shifts owner-gate |
| 26 | Waiter | ABSENT assignment model | No `waiter_user_id` on session/table | SAFE FOR FEATURE PHASE |
| 27 | Restaurant Tables | DESIGNED PR #69 | Not live | REQUIRED BEFORE V1 FREEZE |
| 28 | QR Tables | DESIGNED hash-only + version | No expiration TTL column | REQUIRED BEFORE V1 FREEZE (hash model); TTL SAFE FOR FEATURE PHASE |
| 29 | Dine-in Sessions | DESIGNED PR #70 | Not live; multi-guest identity thin | REQUIRED BEFORE V1 FREEZE |
| 30 | Bills | DESIGNED `restaurant_bills` + `bill_orders` | Not live | REQUIRED BEFORE V1 FREEZE |
| 31 | Payments | LIVE skeleton | Provider capture | SAFE FOR FEATURE PHASE |
| 32 | Refunds | LIVE status enums only | No refund ledger / partial refunds | SAFE FOR FEATURE PHASE |
| 33 | Inventory | ABSENT | Stock ledgers | V2 / NOT REQUIRED FOR V1 |
| 34 | Stock | ABSENT | | V2 / NOT REQUIRED FOR V1 |
| 35 | Purchase | ABSENT | POs | V2 / NOT REQUIRED FOR V1 |
| 36 | Vendors | ABSENT | Suppliers | V2 / NOT REQUIRED FOR V1 |
| 37 | Recipe Ingredients | ABSENT | BOM | V2 / NOT REQUIRED FOR V1 |
| 38 | Analytics | ABSENT | Fact tables / warehouses | V2 / NOT REQUIRED FOR V1 |
| 39 | Notifications | ABSENT | Outbox / templates | V2 / NOT REQUIRED FOR V1 |
| 40 | Audit Logs | LIVE `order_status_logs`, `staff_invite_events` | No global `audit_events` | SAFE FOR FEATURE PHASE |
| 41 | Activity Logs | ABSENT generic | | SAFE FOR FEATURE PHASE |
| 42 | Settings | ABSENT | Key-value / branch settings | SAFE FOR FEATURE PHASE |
| 43 | Business Configuration | Partial (branch hours JSON) | Central config service | SAFE FOR FEATURE PHASE |
| 44 | Tax | LIVE `tax_amount` fields | No tax rate catalog / jurisdiction | SAFE FOR FEATURE PHASE |
| 45 | Service Charges | ABSENT dedicated | May fold into fees | SAFE FOR FEATURE PHASE |
| 46 | Discounts | LIVE `discount_amount` on orders | No rule engine | SAFE FOR FEATURE PHASE |
| 47 | Promotions | ABSENT | Campaigns | V2 / NOT REQUIRED FOR V1 |
| 48 | Reviews | ABSENT | | V2 / NOT REQUIRED FOR V1 |
| 49 | Feedback | ABSENT | | V2 / NOT REQUIRED FOR V1 |
| 50 | API Integration Readiness | Partial REST modules | Idempotency on orders yes; webhooks/outbox no | SAFE FOR FEATURE PHASE |

---

## Special dine-in requirements vs design

| Owner requirement | Coverage | Class |
|---|---|---|
| Unlimited tables per branch | DESIGNED (no hard cap; UNIQUE number) | REQUIRED BEFORE V1 FREEZE |
| Unique table number | DESIGNED `UNIQUE(branch_id, table_number)` | REQUIRED BEFORE V1 FREEZE |
| Secure QR + token (hash only) | DESIGNED | REQUIRED BEFORE V1 FREEZE |
| QR expiration support | Not in R3 (rotation/`qr_version` only) | SAFE FOR FEATURE PHASE |
| Waiter assignment | Not modeled | SAFE FOR FEATURE PHASE |
| Active session | DESIGNED | REQUIRED BEFORE V1 FREEZE |
| Customer order without waiter | Compatible with session + API | REQUIRED BEFORE V1 FREEZE (session) |
| Multiple customers one table | Multi-order/session yes; per-guest accounts no | SAFE FOR FEATURE PHASE |
| Bill split | Explicitly deferred (`payment_splits`) | SAFE FOR FEATURE PHASE |
| Merge tables | Not designed | SAFE FOR FEATURE PHASE |
| Move table | Not designed | SAFE FOR FEATURE PHASE |
| Occupied / free status | DESIGNED on `restaurant_tables.status` | REQUIRED BEFORE V1 FREEZE |
| Kitchen routing | Tickets DESIGNED; stations deferred in PR #71 | REQUIRED BEFORE V1 FREEZE (tickets); multi-station SAFE FOR FEATURE PHASE |
| Cashier settlement | Bills DESIGNED; `pos_sessions` omitted in PR #72 | REQUIRED BEFORE V1 FREEZE (bills) |

---

## Menu / channel gaps

| Need | Status | Class |
|---|---|---|
| Full modifiers (cheese/meat/chicken/crust/sauces/drinks/sides) | LIVE R2 | — |
| Variant + modifier pricing server-side | LIVE | — |
| Delivery / pickup / dine-in `order_type` | LIVE enum | — |
| Scheduled orders | ABSENT column/workflow | SAFE FOR FEATURE PHASE |
| Dine-in QR/POS binding | DESIGNED R4 | REQUIRED BEFORE V1 FREEZE |

---

## Architecture vs PR divergence (must resolve before apply)

| Topic | Architecture (PR #64) | Implementation PR | Risk |
|---|---|---|---|
| Kitchen grain | One ticket per **order × station** | PR #71: one ticket per **order**; stations deferred | Acceptable if owner signs deferral |
| POS shifts | `pos_sessions` REQUIRED | PR #72: **omitted** | Owner gate before freeze PASS |
| Bill junction name | `restaurant_bill_orders` | `bill_orders` | Naming only — document alias |
| Bill statuses | settled/refunded variants | `open\|billed\|paid\|voided` | Owner-locked OK |
| PR #71 contents | Kitchen only | Extra commit: AI team governance | **Pollution — do not merge as-is** |

---

## Critical missing items (freeze blockers)

1. Merge-clean + apply **DB-R3** (`restaurant_tables` + QR hash) — PR #69  
2. Merge + apply **DB-R4** (`dine_in_sessions` + order FKs) — PR #70  
3. **Depollute** + merge + apply **DB-R5** — PR #71  
4. Merge + apply **DB-R6** (`restaurant_bills` + `bill_orders`) — PR #72  
5. Owner decision: accept deferred `kitchen_stations` + deferred `pos_sessions`, or add follow-up migrations before freeze declaration  
6. Re-run DB-R7 and only then declare freeze LOCKED  

Nothing in this document authorizes production SQL.
