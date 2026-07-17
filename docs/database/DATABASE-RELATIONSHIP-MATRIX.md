# Database Relationship Matrix

**Audit date:** 2026-07-18  
**Scope:** Application-owned `public` schema

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

menu_categories ──< menu_items ──< menu_item_variants
                     │
orders ──< order_items >── menu_items / menu_item_variants
     ──< order_status_logs
     ──< payments
     ── deliveries (1:1)

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
| **profiles** | id | auth.users | CASCADE |

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

## Application reference map (high level)

| Domain | Primary tables | Access path |
|---|---|---|
| Customer auth /me | users, user_roles, roles | API service_role + Auth JWT |
| Menu catalog | menu_* , branches | Public SELECT policies / API |
| Checkout / orders | orders, order_items, order_status_logs | API service_role writes; authenticated SELECT RLS |
| Staff invites | staff_invites, staff_invite_events, users | API service_role + DEFINER accept helper |
| Payments | payments | service_role only (no client policies) |
| Delivery / riders | deliveries, riders | SELECT RLS for orders path; ops APIs deferred |

## Intentionally absent (not required for V1 freeze)

inventory_*, bom_*, suppliers, finance ledgers, loyalty_*, coupons, notifications, devices, push_tokens, kitchen tickets, POS sessions — **SAFE TO ADD IN FEATURE PHASE** / **NOT REQUIRED FOR V1**.
