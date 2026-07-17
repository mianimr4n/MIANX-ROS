# Database RLS and Grants Matrix

**Audit date:** 2026-07-18 (extended — core restaurant pre-freeze)
**Project:** `pyeowxvacgypohrbvgee`
**Freeze:** **BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**

## Locked expected privilege model (owner / migration intent)

| Object class | anon | authenticated | service_role | Notes |
|---|---|---|---|---|
| `branches`, `menu_*` | SELECT only | SELECT only | DML | Public read via RLS |
| `modifier_groups`, `modifier_options`, `item_modifier_groups` | SELECT active | SELECT active | DML | PR #63 locked grants |
| `order_item_modifiers` | **none** | SELECT (own/branch) | DML | Like order_items |
| `branch_modifier_options` (planned) | SELECT | SELECT | DML | Filter availability |
| `users` | **none** | SELECT + UPDATE (own row; trigger-guarded) | DML | No client INSERT/DELETE |
| `user_roles`, `roles` | **none** | SELECT | DML | Client mutate blocked by trigger too |
| `permissions`, `role_permissions` | **none** | none (or SELECT if product needs) | DML | Prefer service_role |
| `customers`, `staff`, `riders` | **none** | none unless explicit policy | DML | API service_role |
| `orders`, `order_items`, `order_status_logs`, `deliveries` | **none** | SELECT only | DML | Slice 2D model |
| `payments` | **none** | **none** | DML | No client SELECT in 2D |
| `restaurant_tables` (planned) | **none** (no hash exposure) | SELECT branch staff | DML | QR via API hash only |
| `dine_in_sessions` (planned) | **none** | SELECT branch staff | DML | Guests via API |
| `kitchen_*` (planned) | **none** | SELECT branch staff | DML | Writes via API |
| `pos_sessions`, `restaurant_bills`, `restaurant_bill_orders` (planned) | **none** | SELECT branch staff w/ pos perms | DML | No guest settle |
| `staff_invites`, `staff_invite_events` | **none** | **none** | DML (events: SELECT/INSERT) | Locked |
| `profiles` | **none** (object should not exist) | **none** | n/a | Unmanaged — retire |
| All app tables | **NEVER** TRUNCATE / REFERENCES / TRIGGER | **NEVER** TRUNCATE / REFERENCES / TRIGGER | as needed | TRUNCATE bypasses RLS |
| DEFINER helpers (`current_*`, invite/auth) | **no EXECUTE** | only documented set | documented set | Revoke PUBLIC |

## Production RLS policies (actual)

| Table | Policy | Cmd | Roles |
|---|---|---|---|
| branches | Public can read branches | SELECT | public |
| menu_categories | Public can read active menu categories | SELECT | public |
| menu_items | Public can read active menu items | SELECT | public |
| menu_item_variants | Public can read active menu variants | SELECT | public |
| users | Users can read own profile | SELECT | authenticated |
| users | Users can update own allowed profile fields | UPDATE | authenticated |
| user_roles | Users can read own role assignments | SELECT | authenticated |
| roles | Authenticated can read role catalog codes | SELECT | authenticated |
| orders | Customers select own orders | SELECT | authenticated |
| orders | Staff select branch orders | SELECT | authenticated |
| order_items | Customers / Staff select… | SELECT | authenticated |
| order_status_logs | Customers / Staff select… | SELECT | authenticated |
| deliveries | Customers / Staff select… | SELECT | authenticated |
| modifier_groups / options / item_modifier_groups | Public read active… | SELECT | public (when migration applied) |
| order_item_modifiers | Customers / Staff select… | SELECT | authenticated (when applied) |
| **profiles** | Users can view/update own profile | SELECT/UPDATE | **public** |
| customers, staff, payments, permissions, riders, role_permissions, staff_* | *(no policies)* | — | RLS ON ⇒ PostgREST clients blocked; service_role bypasses |

## Production grant drift (high signal)

### P0 — dangerous privileges present for client roles

| Finding | Risk |
|---|---|
| `anon` / `authenticated` hold **TRUNCATE** on many tables (users, staff, roles, menu_*, customers, riders, profiles, and residual on orders family for authenticated) | **TRUNCATE bypasses RLS** |
| `anon` holds INSERT/UPDATE/DELETE on `users`, `staff`, `roles`, `permissions`, `user_roles`, `customers`, `riders`, menu, branches | Defense-in-depth failure; policy gaps = data exposure/mutation |
| `anon` has **EXECUTE** on DEFINER functions intended for `authenticated`/`service_role` only (`current_*`, `ensure_customer_profile_*`, `finalize_staff_invite_acceptance`, `auth_user_email_exists`, `handle_*`) | Privilege escalation / invite abuse surface |
| `authenticated` retains TRUNCATE/REFERENCES/TRIGGER on orders/order_items/order_status_logs/deliveries after write revoke | Incomplete lockdown vs Slice 2D intent |

### Aligned / good

| Area | Status |
|---|---|
| `payments` client grants | Locked to postgres + service_role |
| `staff_invites` / `staff_invite_events` | Locked to postgres + service_role |
| anon revoked on orders family | No anon table grants (good) |
| authenticated writes revoked on orders family | No INSERT/UPDATE/DELETE (good) |
| RLS enabled | All 20 public tables |

## Expected vs actual — summary by role

### anon

| Expected | Actual |
|---|---|
| SELECT on public catalog (branches/menu) only | Full DML+TRUNCATE on catalog **and** identity/RBAC/staff/customers/riders/profiles |
| No orders/payments/invites | Orders/payments/invites correctly denied |
| No DEFINER EXECUTE | Has EXECUTE on privileged DEFINER set |

### authenticated

| Expected | Actual |
|---|---|
| SELECT(+limited UPDATE) on own users; SELECT roles/user_roles; SELECT orders family | Mostly matched for DML on orders family |
| No TRUNCATE | **Has TRUNCATE** on orders family + over-broad tables |
| No payments/invites | Matched |

### service_role

| Expected | Actual |
|---|---|
| Full DML on app tables used by API | Present |

### public (PUBLIC grantee)

| Expected | Actual |
|---|---|
| No residual table DML; no DEFINER EXECUTE | Function EXECUTE historically granted via PUBLIC then partially revoked — **anon still shows EXECUTE** (treat as drift) |

## Remediation pointer

Designed (not applied): `docs/database/remediation/P0_harden_grants_and_definer_execute.sql`
Profiles retirement design: `docs/database/remediation/P1_retire_unmanaged_profiles.sql`
Restaurant foundations + RBAC slice: `docs/architecture/DATABASE-PRE-FREEZE-REMEDIATION-PLAN.md` (DB-R0…DB-R7)

## New permission codes (planned — DB-R7)

| Code | Actors (sketch) |
|---|---|
| `table.read` / `table.manage` | Manager, super-admin |
| `dine_in.read` / `dine_in.manage` | Cashier, manager |
| `kitchen.read` / `kitchen.manage` | Kitchen, manager |
| `pos.session` / `pos.bill` | Cashier, manager |

**Principal rule:** DB JWT + `user_roles` + branch helpers — **never** trust client role headers.

## Freeze status

**BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**
