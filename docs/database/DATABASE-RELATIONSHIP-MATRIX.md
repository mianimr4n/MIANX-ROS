# Database Relationship Matrix

**Audit date:** 2026-07-18 (extended — core restaurant pre-freeze)
**Scope:** Application-owned `public` schema
**Freeze:** **BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**

## Entity relationship overview

```text
auth.users ──< public.users.auth_user_id
                │
                ├──< user_roles >── roles ──< role_permissions >── permissions
                ├──< customers
                ├──< staff
                └──< riders

branches ──< user_roles.branch_id
         ──< staff.branch_id
         ──< riders.branch_id
         ──< orders.branch_id
         ──< deliveries.branch_id
         ──< staff_invites.branch_id
         ──< restaurant_tables.branch_id          [PLANNED]
         ──< dine_in_sessions.branch_id           [PLANNED]
         ──< kitchen_stations.branch_id           [PLANNED]
         ──< pos_sessions.branch_id               [PLANNED]
         ──< restaurant_bills.branch_id           [PLANNED]

menu_categories ──< menu_items ──< menu_item_variants
                     │
                     ├──< item_modifier_groups >── modifier_groups ──< modifier_options
                     │                                              └── (optional) branch_modifier_options [PLANNED]
                     │
orders ──< order_items >── menu_items / menu_item_variants
     │              └──< order_item_modifiers >── modifier_options (nullable FK)
     ──< order_status_logs
     ──< payments
     ── deliveries (1:1)
     ──< kitchen_tickets >── kitchen_ticket_items     [PLANNED]
     ── dine_in_session_id / restaurant_table_id      [PLANNED nullable]
     ── restaurant_bill_orders >── restaurant_bills   [PLANNED]

restaurant_tables ──< dine_in_sessions               [PLANNED]
pos_sessions ──< restaurant_bills                      [PLANNED]

staff_invites ──< staff_invite_events
             >── roles / users (invited_by, accepted_user_id)

profiles (UNMANAGED) ── FK id → auth.users(id)  [NOT in migration chain]
```

## Foreign keys (production)

| Child | Column | Parent | On delete |
|---|---|---|---|
| users | auth_user_id | auth.users | SET NULL |
| user_roles | user_id / role_id / branch_id | users / roles / branches | CASCADE |
| role_permissions | role_id / permission_id | roles / permissions | CASCADE |
| customers | user_id | users | SET NULL |
| menu_items | category_id | menu_categories | RESTRICT |
| menu_item_variants | menu_item_id | menu_items | CASCADE |
| orders | customer_id / branch_id / auth_user_id | customers / branches / auth.users | SET NULL / RESTRICT / SET NULL |
| order_items | order_id / menu_item_id / variant_id | orders / menu_items / variants | CASCADE / RESTRICT / SET NULL |
| order_status_logs | order_id / actor_user_id | orders / users | CASCADE / SET NULL |
| payments | order_id | orders | CASCADE |
| riders | user_id / branch_id | users / branches | CASCADE / RESTRICT |
| deliveries | order_id / rider_id / branch_id | orders / riders / branches | CASCADE / SET NULL / RESTRICT |
| staff | user_id / branch_id | users / branches | CASCADE / SET NULL |
| staff_invites | branch_id / role_id / invited_by / accepted_user_id | branches / roles / users | RESTRICT / RESTRICT / SET NULL / SET NULL |
| staff_invite_events | invite_id / actor_user_id | staff_invites / users | CASCADE / SET NULL |
| modifier_options | modifier_group_id / linked_menu_item_id | modifier_groups / menu_items | CASCADE / SET NULL |
| item_modifier_groups | menu_item_id / modifier_group_id | menu_items / modifier_groups | CASCADE / CASCADE |
| order_item_modifiers | order_item_id / modifier_option_id | order_items / modifier_options | CASCADE / SET NULL |
| **profiles** | id | auth.users | CASCADE |

### Planned FKs (REQUIRED BEFORE FREEZE)

| Child | Column | Parent | Notes |
|---|---|---|---|
| restaurant_tables | branch_id | branches | UNIQUE (branch_id, table_number) |
| dine_in_sessions | branch_id / restaurant_table_id | branches / restaurant_tables | One active open/billing per table |
| orders | dine_in_session_id / restaurant_table_id | sessions / tables | Nullable; required for QR dine-in path |
| kitchen_stations | branch_id | branches | UNIQUE (branch_id, code) |
| kitchen_tickets | branch_id / order_id / kitchen_station_id | branches / orders / stations | UNIQUE (order_id, station) |
| kitchen_ticket_items | kitchen_ticket_id / order_item_id | tickets / order_items | |
| pos_sessions | branch_id / opened_by_user_id | branches / users | |
| restaurant_bills | branch_id / dine_in_session_id / pos_session_id | branches / sessions / pos | |
| restaurant_bill_orders | restaurant_bill_id / order_id | bills / orders | UNIQUE (order_id) |
| branch_modifier_options | branch_id / modifier_option_id | branches / options | Optional DB-R2 |

## Check / state domains

| Table | Column | Allowed values |
|---|---|---|
| users | user_type | customer, staff, rider, admin, support, franchise |
| users | status | invited, active, inactive, suspended |
| users | phone | NULL or `^\+923[0-9]{9}$` |
| branches | status | operating, coming-soon, inactive |
| customers | status | active, inactive, blocked |
| menu_items | product_type | pizza, burger, sandwich, wings, fries, wrap, pasta, side, drink, deal, **topping** |
| orders | order_type | delivery, pickup, dine-in |
| orders | order_source | website, whatsapp, mobile, pos, admin |
| orders | status | pending, confirmed, preparing, ready, dispatched, completed, cancelled |
| orders | payment_status | pending, authorized, paid, failed, refunded |
| payments | status | pending, authorized, paid, failed, refunded |
| riders | status | offline, available, busy, inactive |
| deliveries | status | pending, assigned, picked-up, delivered, failed, cancelled |
| staff | status | active, inactive, suspended |
| staff_invites | status | draft, pending, accepted, revoked, expired |
| staff_invite_events | event_type | created, sent, resent, revoked, accept_succeeded, accept_failed, expired_marked |
| order_status_logs | actor_type | customer, staff, system, guest |
| order_items | quantity | > 0 |
| modifier_groups | selection_type | single, multi |
| order_item_modifiers | quantity | > 0 |
| restaurant_tables (planned) | status | available, occupied, reserved, inactive |
| dine_in_sessions (planned) | status | open, billing, closed, cancelled |
| kitchen_tickets (planned) | status | queued, in_progress, ready, bumped, cancelled |
| kitchen_ticket_items (planned) | status | queued, in_progress, ready, cancelled |
| pos_sessions (planned) | status | open, closed, voided |
| restaurant_bills (planned) | status | open, settled, voided, refunded |

## Application reference map (high level)

| Domain | Primary tables | Access path |
|---|---|---|
| Customer auth /me | users, user_roles, roles | API service_role + Auth JWT |
| Menu catalog | menu_* , branches, modifier_* , item_modifier_groups | Public SELECT policies / API |
| Checkout / orders | orders, order_items, order_item_modifiers, order_status_logs | API service_role writes; authenticated SELECT RLS |
| Staff invites | staff_invites, staff_invite_events, users | API service_role + DEFINER accept helper |
| Payments | payments | service_role only (no client policies) |
| Delivery / riders | deliveries, riders | SELECT RLS for orders path; ops APIs deferred |
| QR dine-in (planned) | restaurant_tables, dine_in_sessions | Token hash resolve via API only |
| Kitchen (planned) | kitchen_* | Staff branch SELECT; API writes |
| POS billing (planned) | pos_sessions, restaurant_bills, restaurant_bill_orders | Staff permissions; API writes |

## Intentionally absent / deferred

| Class | Objects | Freeze impact |
|---|---|---|
| **REQUIRED BEFORE FREEZE** | restaurant_tables, dine_in_sessions, kitchen_*, pos_sessions, restaurant_bills, restaurant_bill_orders, order dine-in FKs | Blocks freeze until migrated |
| **SAFE FOR FEATURE PHASE** | payment_splits, offline POS, printers, till counts, kitchen_ticket_events, menu_item_kitchen_stations (if defaults OK) | Does not block freeze after required set |
| **NOT REQUIRED FOR V1** | inventory_*, bom_*, suppliers, finance ledgers, loyalty_*, coupons, notifications, devices, push_tokens | Out of freeze scope |
| **UI** | Admin / POS / Kitchen / Rider apps | Not a DB freeze blocker |

**Do not** create separate physical database tables/schemas per branch.
