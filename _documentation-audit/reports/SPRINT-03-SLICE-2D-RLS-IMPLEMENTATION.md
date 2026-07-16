# Sprint 3 — Slice 2D Order / Branch RLS Implementation

**Date:** 2026-07-16  
**Branch:** `feature/sprint-3-slice-2d-order-rls`  
**Migration:** `supabase/migrations/20260716140000_sprint3_slice2d_order_branch_rls.sql`  
**Status:** Implemented for owner review — **not** production-applied in this turn  

---

## Phase 0 — Pre-implementation gate

| Item | Value |
|---|---|
| Roadmap phase | Phase 5 (Order Lifecycle) — RLS hard gate before POS/Kitchen/Rider UI |
| Sprint | Sprint 3 authz track + Sprint 4 orders foundation (parallel) |
| Slice | **2D — Order / branch RLS** |
| Canonical docs | `AUTHENTICATION_ARCHITECTURE.md`, `ORDERS_ARCHITECTURE.md`, `SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`, `TELEPIZZA-MASTER-ROADMAP.md` |
| Tables involved | `orders`, `order_items`, `order_status_logs`, `deliveries`, `payments` (+ read of `users`, `user_roles`, `roles`, `customers`, `branches`) |
| Files allowed | New migration; static DB tests; minimal orders create auth attach; auth middleware optional Bearer; status docs; this report |
| Files forbidden | Kitchen/Rider/POS/Admin UI; OTP; catalog/menu data; staff lifecycle transition APIs; Render deploy; prod migration apply |
| Existing RLS | Enabled on operational tables with **zero policies** (deny-by-default for anon/authenticated row reads) |
| Service-role API | Quote/create/track/cancel use service role (bypass RLS) — remains intentional |
| Architecture conflict? | **No blocker.** Frozen docs already require nullable `orders.auth_user_id`; schema lagged. Slice 2D adds the column (catch-up), not a silent redesign. |

---

## Phase 1 — Schema audit (summary)

| Table | RLS before | Policies before | Ownership |
|---|---|---|---|
| `orders` | Enabled | None | `branch_id` NOT NULL; `customer_id` nullable; **`auth_user_id` added in 2D** |
| `order_items` | Enabled | None | via `order_id` |
| `order_status_logs` | Enabled | None | via `order_id`; no visibility flag |
| `deliveries` | Enabled | None | `order_id`, `branch_id`, optional `rider_id` |
| `payments` | Enabled | None | via `order_id`; provider fields present |
| `users` / `user_roles` | Enabled | Own-profile / own-roles policies | `auth_user_id` mapping |

**Grant gap:** `grant_public_access.sql` had granted INSERT/UPDATE/DELETE to anon/authenticated. Slice 2D revokes anon entirely and authenticated writes on operational order tables.

**Service-role bypass:** unchanged and required for current public order APIs.

---

## Helper functions

| Function | Purpose |
|---|---|
| `current_app_user_id()` | `public.users.id` for `auth.uid()` |
| `current_user_is_active()` | `status = 'active'` gate |
| `current_user_is_super_admin()` | DB role `super-admin` + non-customer + active |
| `current_user_branch_ids()` | Distinct `user_roles.branch_id` for active user |
| `current_user_has_branch_access(uuid)` | Super-admin OR branch membership |
| `current_customer_owns_order(uuid)` | `orders.auth_user_id = auth.uid()` OR customer→user link |

All: `SECURITY DEFINER`, `search_path = public`, no metadata/JWT/header privilege.

---

## RLS policy matrix

| Table | Customer (authenticated + active) | Branch staff / super-admin | Anon | Authenticated writes |
|---|---|---|---|---|
| `orders` | SELECT own (`auth_user_id` or customer link) | SELECT where `current_user_has_branch_access(branch_id)` | None | None |
| `order_items` | SELECT via own order | SELECT via branch-accessible parent | None | None |
| `order_status_logs` | SELECT via own order (no visibility column — safest full lifecycle for own) | SELECT via branch parent | None | None |
| `deliveries` | SELECT via own order | SELECT via `branch_id` access | None | None |
| `payments` | **No policy / no SELECT grant** — use `orders.payment_status` | **Service-role only** | None | None |

**Rider:** no policies — deferred until assignment model is implemented.  
**Guest:** no direct Supabase SELECT; phone tracking remains API/service-role.

---

## Access matrices

### Customer
- Read own orders/items/logs/deliveries when `auth_user_id` linked (Bearer create) or `customers.user_id` link
- Cannot read other customers / other branches by spoofing branch id
- Cannot INSERT/UPDATE/DELETE order lifecycle, totals, payments
- Suspended/inactive → no access (`current_user_is_active`)

### Branch staff
- Read only orders (and children) for assigned `user_roles.branch_id`
- Spoofed `x-telepizza-branch-id` ineffective (not used by RLS)
- No branch assignment → no branch data
- Inactive/suspended denied

### Super admin
- All branches via DB-derived `current_user_is_super_admin()`
- Still requires `status = 'active'`

### Guest
- Anon cannot query operational order tables
- Existing `/api/v1/orders/:orderNumber?phone=` tracking unchanged (service role)

---

## Service-role / API compatibility

| Endpoint | Impact |
|---|---|
| `POST /quote` | Unchanged |
| `POST /` create | Optional Bearer → sets `orders.auth_user_id` from verified JWT only; guests still work |
| `GET /:orderNumber` + phone | Unchanged (service role) |
| `POST /:orderNumber/cancel` | Unchanged |
| Frontend service role | Still none |
| Future branch APIs | Can combine AuthPrincipal middleware + these RLS policies |

---

## Files changed

- `supabase/migrations/20260716140000_sprint3_slice2d_order_branch_rls.sql`
- `backend/api/src/middleware/auth.ts` (`createOptionalAuth`)
- `backend/api/src/modules/orders/routes.ts`
- `backend/api/src/modules/index.ts`
- `backend/api/src/services/orders/types.ts`
- `backend/api/src/services/orders/supabase.ts`
- `backend/api/tests/orders-slice2d-auth.test.ts`
- `tests/database/sprint3-slice2d-order-rls.test.mjs`
- `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` (status alignment)
- `docs/architecture/TELEPIZZA-MASTER-ROADMAP.md` (status alignment)
- `_documentation-audit/reports/SPRINT-03-SLICE-2D-RLS-IMPLEMENTATION.md`

---

## Tests

Static + unit (no live Supabase RLS runtime in this environment):

- `tests/database/sprint3-slice2d-order-rls.test.mjs`
- `backend/api/tests/orders-slice2d-auth.test.ts`
- Full suite: `pnpm check`, `pnpm test:db`, `pnpm test:backend`, `pnpm build:website`, `git diff --check`

**Live-runtime limitation:** Policies were not executed against a running local Supabase in this agent turn. Do not claim live RLS PASS until owner applies migration and runs smoke SQL / PostgREST checks.

---

## Known risks / limitations

1. Historical guest/authenticated orders with `auth_user_id IS NULL` remain invisible to customer RLS until re-linked or customer-row linked.
2. `order_status_logs` has no staff-only visibility flag — customers see all lifecycle rows for own orders.
3. `payments` intentionally service-role-only; no column-level customer payment view yet.
4. Broad default privileges migration still exists historically; Slice 2D explicitly revokes operational writes for anon/authenticated.
5. Production migration not applied in this turn.

---

## Production rollout plan

1. Owner reviews PR — no merge/deploy by agent in this turn if waiting; when approved:
2. Merge to `main`
3. Apply migration to production Supabase (`supabase db push` / dashboard migration)
4. Smoke:
   - Guest quote/create/track/cancel still works
   - Authenticated create stores `auth_user_id`
   - Anon PostgREST `orders` SELECT denied / empty
   - Customer A cannot read customer B
   - Branch staff isolation Royal Orchard vs Northern Bypass
   - Super-admin active can read both
   - Suspended denied
5. Do **not** unlock POS/Kitchen/Rider UI until smoke PASS
6. No Render change required unless API deploy desired for optional Bearer attach (website already sends Bearer when logged in)

---

## Blockers

None for PR review. Production RLS effectiveness blocked on **owner migration apply + live smoke**.

---

SPRINT 3 SLICE 2D — ORDER BRANCH RLS: PASS (static/unit) — live apply pending owner
