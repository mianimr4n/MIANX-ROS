# Database Schema Inventory

**Project:** `pyeowxvacgypohrbvgee`
**Audit date:** 2026-07-18 (extended — core restaurant pre-freeze)
**Migration chain:** 17 files in repo (`main` includes PR #63); linked remote must be re-verified
**Public tables (prod baseline from PR #62):** 20 (19 managed + 1 unmanaged `profiles`)
**Repo-managed additions (PR #63, apply status verify):** +4 modifier tables
**Freeze:** **BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**

## Migration chain (owning order)

| Version | File | Purpose |
|---|---|---|
| 20260713190000 | `foundation_schema.sql` | Core tables, indexes, RLS enable, public menu/branch read policies |
| 20260713191000 | `seed_foundation_data.sql` | Seed roles/permissions/branches baseline |
| 20260714100000 | `sync_verified_menu_catalog.sql` | Verified menu catalog sync |
| 20260714120000 | `grant_public_access.sql` | Broad GRANT SELECT/INSERT/UPDATE/DELETE to anon/authenticated/service_role |
| 20260715120000 | `pizza_toppings_catalog.sql` | Extend `product_type` + topping SKUs |
| 20260715153000 | `option_b_toppings_catalog_repair.sql` | Toppings catalog repair |
| 20260716010000 | `sprint3_customer_auth_foundation.sql` | `public.users` auth bootstrap (no parallel profiles table) |
| 20260716020000 | `sprint3_authorization_foundation.sql` | RBAC seeds / authorization foundation |
| 20260716100000 | `sprint3_slice2b_staff_permissions.sql` | Staff permission codes |
| 20260716101000 | `sprint3_slice2b_staff_invites.sql` | `staff_invites` + `staff_invite_events` |
| 20260716102000 | `sprint3_slice2b_accept_helper.sql` | `finalize_staff_invite_acceptance` |
| 20260716103000 | `sprint3_slice2b_locked_decisions.sql` | Locked invite decisions + `auth_user_email_exists` |
| 20260716120000 | `sprint4_1_orders_quote_snapshots.sql` | Order snapshots, idempotency, `order_status_logs` |
| 20260716140000 | `sprint3_slice2d_order_branch_rls.sql` | Branch-scoped order RLS + operational grant lockdown |
| 20260716150000 | `customer_identity_phone_e164.sql` | E.164 phone constraints/indexes |
| 20260716160000 | `sync_owner_menu_catalog.sql` | Owner menu catalog sync |
| 20260718120000 | `product_modifier_system.sql` | `modifier_groups`, `modifier_options`, `item_modifier_groups`, `order_item_modifiers` + seeds (PR #63) |

## Object matrix

Legend — **Status:** Current / Legacy / Incomplete / Unmanaged. **App:** Yes if backend/website/tests reference.

| Object | Purpose | Owning migration | App | RLS | Grants (summary) | Data (T0) | Status | Action |
|---|---|---|---|---|---|---|---|---|
| `users` | Canonical identity / profile | foundation + sprint3 auth | Yes | ON | Over-broad anon DML+TRUNCATE | 1 | Current | Harden grants (P0) |
| `profiles` | Legacy Auth bootstrap table | **NONE** (drift) | No table refs | ON | Full anon/auth DML+TRUNCATE | 0 | Unmanaged | Retire after removing dead fn (P1) |
| `roles` | RBAC role catalog | foundation | Yes | ON | Over-broad | 7 | Current | Revoke anon writes |
| `permissions` | RBAC permission catalog | foundation | Yes | ON | Over-broad | 17 | Current | Revoke anon writes |
| `role_permissions` | Role↔permission map | foundation | Yes | ON | Over-broad | 43 | Current | Revoke anon writes |
| `user_roles` | User↔role↔branch | foundation + auth | Yes | ON | Over-broad; client mutate blocked by trigger | 1 | Current | Revoke anon writes |
| `branches` | Store locations | foundation | Yes | ON | Over-broad writes | 2 | Current | SELECT-only clients |
| `customers` | Customer CRM row | foundation | Yes | ON / **no policies** | Over-broad | 0 | Current/incomplete policies | Service-role path; add policies when needed |
| `menu_categories` | Menu taxonomy | foundation + seeds | Yes | ON | Over-broad writes | 15 | Current | SELECT-only clients |
| `menu_items` | Menu SKUs (incl. topping) | foundation + toppings | Yes | ON | Over-broad writes | 67 | Current | SELECT-only clients |
| `menu_item_variants` | Size/price variants | foundation | Yes | ON | Over-broad writes | 40 | Current | SELECT-only clients |
| `orders` | Orders + snapshots | foundation + 4.1 + 2D | Yes | ON | Auth SELECT; no anon; TRUNCATE residue | 5→0* | Current | Revoke TRUNCATE (P0) |
| `order_items` | Line items + extras | foundation + 4.1 | Yes | ON | Auth SELECT; no anon; TRUNCATE residue | 5→0* | Current | Revoke TRUNCATE (P0) |
| `order_status_logs` | Immutable status audit | sprint4.1 | Yes | ON | Auth SELECT; no anon | 4→?* | Current | Keep append-only via API |
| `payments` | Payment records | foundation | Partial | ON / no client policies | service_role (+postgres) only | 0 | Current | Keep locked |
| `riders` | Rider workforce | foundation | Minimal | ON | Over-broad | 0 | Current / future ops | No feature unlock now |
| `deliveries` | Delivery assignments | foundation + 2D | Yes | ON | Auth SELECT; no anon | 5→0* | Current | Revoke TRUNCATE (P0) |
| `staff` | Staff employment row | foundation | Yes | ON | Over-broad | 0 | Current | Revoke anon writes |
| `staff_invites` | Invite lifecycle | slice2b | Yes | ON | service_role only | 0 | Current | Keep locked |
| `staff_invite_events` | Invite audit events | slice2b | Yes | ON | service_role only | 0 | Current | Keep locked |
| `modifier_groups` | Reusable modifier group catalog | 20260718120000 | Yes | ON | SELECT anon/auth | seed | Current (PR #63) | Verify prod apply |
| `modifier_options` | Options + price deltas | 20260718120000 | Yes | ON | SELECT anon/auth | seed | Current (PR #63) | Verify prod apply |
| `item_modifier_groups` | Item↔group attach (**not** `menu_item_modifier_groups`) | 20260718120000 | Yes | ON | SELECT anon/auth | seed | Current (PR #63) | Do not rename |
| `order_item_modifiers` | Line modifier snapshots | 20260718120000 | Yes | ON | Auth SELECT | 0+ | Current (PR #63) | Keep with extras_snapshot |

\*T0 = first read-only inventory during PR #62 audit; later re-check showed operational order/delivery rows at 0 (test data volatility — not a migration).

## Planned tables (REQUIRED BEFORE FREEZE — not migrated)

| Object | Purpose | Design doc | Slice |
|---|---|---|---|
| `branch_modifier_options` | Optional per-branch option availability | MENU-MODIFIER-ARCHITECTURE | DB-R2 |
| `restaurant_tables` | Per-branch table registry + QR hash | DINE-IN-TABLE-QR-ARCHITECTURE | DB-R3 |
| `dine_in_sessions` | Active table sessions (multi-order) | DINE-IN-TABLE-QR-ARCHITECTURE | DB-R4 |
| `orders.dine_in_session_id` / `restaurant_table_id` / `table_display_snapshot` | Nullable dine-in binding | DINE-IN-TABLE-QR-ARCHITECTURE | DB-R4 |
| `kitchen_stations` | Branch prep stations | KITCHEN-TICKET-ARCHITECTURE | DB-R5 |
| `kitchen_tickets` | Order×station tickets | KITCHEN-TICKET-ARCHITECTURE | DB-R5 |
| `kitchen_ticket_items` | Ticket line prep state | KITCHEN-TICKET-ARCHITECTURE | DB-R5 |
| `pos_sessions` | Cashier shift sessions | POS-BILLING-FOUNDATION | DB-R6 |
| `restaurant_bills` | Session/check header | POS-BILLING-FOUNDATION | DB-R6 |
| `restaurant_bill_orders` | Bill↔order join | POS-BILLING-FOUNDATION | DB-R6 |

## Explicitly deferred (SAFE FOR FEATURE PHASE / not freeze)

`payment_splits`, offline POS sync, till counts, printer configs, `menu_item_kitchen_stations` (if default product_type routing accepted), Admin/POS/Kitchen/Rider UI, inventory/BOM/loyalty/notifications/devices.

## Functions (public)

| Function | Security | Expected EXECUTE | Actual EXECUTE (prod) | Notes |
|---|---|---|---|---|
| `set_updated_at` | INVOKER | trigger only | anon/auth/service | OK-ish |
| `prevent_users_privilege_escalation` | INVOKER | trigger | anon/auth/service | OK-ish |
| `prevent_user_roles_client_mutation` | INVOKER | trigger | anon/auth/service | OK-ish |
| `ensure_customer_profile_for_auth_user` | DEFINER | **service_role** | anon+auth+service | **P0 drift** |
| `handle_auth_user_created` | DEFINER | trigger / service | anon+auth+service | **P0 drift** |
| `current_app_user_id` | DEFINER | auth+service | **includes anon** | **P0 drift** |
| `current_user_is_active` | DEFINER | auth+service | includes anon | **P0 drift** |
| `current_user_is_super_admin` | DEFINER | auth+service | includes anon | **P0 drift** |
| `current_user_branch_ids` | DEFINER | auth+service | includes anon | **P0 drift** |
| `current_user_has_branch_access` | DEFINER | auth+service | includes anon | **P0 drift** |
| `current_customer_owns_order` | DEFINER | auth+service | includes anon | **P0 drift** |
| `finalize_staff_invite_acceptance` | DEFINER | **service_role** | anon+auth+service | **P0 drift** |
| `auth_user_email_exists` | DEFINER | **service_role** | anon+auth+service | **P0 drift** |
| `enforce_staff_invite_rules` | INVOKER | trigger | anon/auth/service | OK-ish |
| `handle_new_user` | DEFINER | **none (dead)** | anon+auth+service | Writes `profiles`; **not attached**; retire with profiles |

## Auth trigger attachment (prod)

| Trigger | Table | Function |
|---|---|---|
| `on_auth_user_created` | `auth.users` | `handle_auth_user_created` → `public.users` |

`handle_new_user` (profiles writer) is **not** attached.

## Sequences / enums

- UUID PKs via `gen_random_uuid()`; no app-owned serial sequences required for freeze.
- State machines enforced via `CHECK` constraints (see relationship matrix).

## Snapshot artifact

`docs/database/production-schema-snapshot.sql` — schema-only dump with **DO NOT EXECUTE** header (baseline from PR #61/#62 era; refresh after restaurant foundations apply). Re-dump before freeze declaration.

## Freeze status

**BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED**
