# Sprint 4.5 — Branch Order APIs (backend/API only)

**Branch:** `feature/sprint-4-5-branch-order-apis`
**Base:** latest `main`
**Scope:** secure branch-scoped order-management APIs for branch staff. **No** Kitchen/Rider/POS/Admin UI,
payment gateway, OTP, customer auth UI, or menu/catalog changes.
**Authority (FROZEN):** `docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md` §3–§6,
`docs/architecture/AUTHENTICATION_ARCHITECTURE.md`, `docs/architecture/ORDERS_ARCHITECTURE.md`.

---

## Phase 0 — Pre-implementation gate

| Item | Finding |
|---|---|
| Roadmap phase | Phase 5 — lifecycle staff APIs (after Slice 2D RLS + 4.4 freeze). |
| Sprint / slice | 4.5a (transition + matrix + logs) **+** 4.5b (branch list/detail), combined per task Phase 4. |
| Canonical docs | SPRINT-04-4 lifecycle (frozen), AUTHENTICATION_ARCHITECTURE, ORDERS_ARCHITECTURE. |
| Order status enum | `pending, confirmed, preparing, ready, dispatched, completed, cancelled` (frozen O1 — unchanged). |
| Allowed transitions | Frozen §3.2 (see transition matrix below). |
| Existing permissions | Seeded in `20260713191000_seed_foundation_data.sql`: `order.read`, `order.manage` (+ payment/staff/branch/menu/delivery). |
| Files allowed to change | `backend/api/src/**` (orders/admin/middleware wiring), tests, this report. |
| Files forbidden | website client, menu/catalog data + migrations, auth UI/flows, rider/delivery impl, payment gateway, OTP, existing migrations. |

### Conflicts / decisions (no silent redesign)

1. **`reject` is not an enum value.** Per frozen §3.4, branch reject = `status='cancelled'` +
   `cancel_reason_code='rejected_by_branch'`. Implemented that way — **no new enum value invented**.
2. **Dispatch / complete deferred.** Frozen §10 places delivery-lane transitions
   (`dispatched`/`completed`) in Sprint **4.6**. This slice implements only
   `confirm / reject / preparing / ready / cancel`.
3. **Permission granularity.** The frozen matrix gates **all** transitions with a single
   `order.manage` (+ branch), with **late-stage cancel (`preparing`/`ready`) restricted to
   branch-manager / super-admin** (§3.4). The task suggested finer per-transition codes
   (`orders.confirm`, …). To avoid silently redesigning the frozen authz model, this slice uses
   the **existing** `order.manage` + the frozen BM/SA late-cancel rule — **so no permission
   migration was required**. Finer per-transition RBAC, if desired, is a separate owner-approved
   change. **No conflict blocked implementation.**
4. **Rider exclusion.** The seed grants `rider` `order.read` (for delivery tracking). The task
   requires riders be denied branch management. The branch-management surface is therefore gated
   on `order.manage` (held by branch-manager/cashier/kitchen/super-admin only), which cleanly
   excludes rider and customer-support. Documented; stricter than the frozen §4.1 read note by design.

---

## Phase 1 — Current-state audit

| Area | State (reused) | Gap closed by 4.5 |
|---|---|---|
| Orders service (`services/orders/supabase.ts`) | create/quote/track/guest-cancel; **optimistic-lock** cancel (`.eq('status',…)`) + `order_status_logs` append patterns | new branch-management data source reuses these patterns |
| Admin routes (`modules/admin/routes.ts`) | staff-invite endpoints only; `/controls` 501 stub | mounts `/admin/orders` sub-router |
| Authz middleware (`middleware/authorization.ts`) | `requireAuthenticatedUser` (JWT→DB principal→active), `requirePermission`, `requireBranchAccess`, super-admin bypass | reused unchanged |
| `AuthPrincipal` | DB-derived `roles/permissions/branchIds/isSuperAdmin`; never headers/JWT-metadata | sole authz source |
| Status logs | `order_status_logs` append-only (create/cancel) | transition audit appends |
| RLS | active on orders/items/logs/deliveries/payments; API uses **service role** (middleware is first line) | unchanged; APIs stay service-role behind middleware |
| Tests | hermetic (mocked data sources / fake verifier+principal) | followed same style |

---

## Phase 2 — Access model (enforced)

Branch authority comes **only** from `AuthPrincipal.branchIds` / `isSuperAdmin`. `x-telepizza-role`,
`x-telepizza-branch-id`, body `role`/`branchId`, and JWT metadata are never trusted.

| Actor | List/Detail | confirm | reject | preparing | ready | cancel |
|---|---|---|---|---|---|---|
| super-admin (active) | all branches | ✅ | ✅ | ✅ | ✅ | ✅ (any stage) |
| branch-manager | own branch | ✅ | ✅ | ✅ | ✅ | ✅ (incl. preparing/ready) |
| cashier | own branch | ✅ | ✅ | ✅¹ | ✅¹ | pending/confirmed only |
| kitchen | own branch | ✅ | ✅¹ | ✅ | ✅ | pending/confirmed only |
| customer | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| rider | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| suspended (any) | ❌ 403 `USER_ACCESS_DISABLED` | ❌ | ❌ | ❌ | ❌ | ❌ |

¹ Per the frozen model, `order.manage` holders (branch-manager/cashier/kitchen) may perform any
non-late-cancel transition; the frozen doc does not carve out per-transition role limits beyond the
BM/SA late-cancel rule. Late-stage cancel (`preparing`/`ready`) is **branch-manager/super-admin only**.

---

## Phase 3 — Transition matrix (frozen enum only)

| Action | From | To | Base | Extra gate | Reason |
|---|---|---|---|---|---|
| confirm | `pending` | `confirmed` | `order.manage` + branch | — | none |
| reject | `pending`,`confirmed` | `cancelled` | `order.manage` + branch | — | forced `rejected_by_branch` |
| preparing | `confirmed` | `preparing` | `order.manage` + branch | — | none |
| ready | `preparing` | `ready` | `order.manage` + branch | — | none |
| cancel | `pending`,`confirmed`,`preparing`,`ready` | `cancelled` | `order.manage` + branch | `preparing`/`ready` → BM/SA only | **required** (`staff_cancelled`/`duplicate`/`test`/`rejected_by_branch`) |

Stable errors: `ORDER_NOT_FOUND` (404), `ORDER_ACCESS_DENIED` (403), `INVALID_ORDER_TRANSITION` (409),
`ORDER_ALREADY_FINAL` (409), `ORDER_STATE_CONFLICT` (409), `VALIDATION_ERROR` (400),
`USER_ACCESS_DISABLED` (403), `FORBIDDEN` (403, permission).

Idempotent repeat: an action whose target equals the current status returns current state with
`idempotentReplay:true` and appends **no** log.

---

## Phase 4 — API contracts (`/api/v1/admin/orders`)

All endpoints: Bearer → active DB principal → `requirePermission('order.manage')` → branch scope
(enforced in the data source via principal) → safe response. Never expose payment provider/
transaction/metadata, idempotency keys, pricing snapshot, or `auth_user_id`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/orders` | branch-scoped list; `?status=&orderType=&branchId=&limit=&offset=`; safe summary + `meta.pagination` |
| GET | `/api/v1/admin/orders/:id` | branch-scoped detail: items, totals, delivery, contact, `payment_status` only, status history |
| POST | `/api/v1/admin/orders/:id/confirm` | `pending → confirmed` |
| POST | `/api/v1/admin/orders/:id/reject` | `pending`/`confirmed` → `cancelled` (`rejected_by_branch`) |
| POST | `/api/v1/admin/orders/:id/preparing` | `confirmed → preparing` |
| POST | `/api/v1/admin/orders/:id/ready` | `preparing → ready` |
| POST | `/api/v1/admin/orders/:id/cancel` | staff cancel per matrix; reason required |

Rider assignment/dispatch/delivered are **not** implemented (Sprint 4.6).

---

## Phase 6/7 — Audit + concurrency

- **Audit:** each real transition appends `order_status_logs` (`order_id`, `from_status`,
  `to_status`, `actor_type='staff'`, `actor_user_id`=principal, `reason_code`, `note`). No
  tokens/passwords/PANs. Append-only; failed/idempotent actions write nothing.
- **Concurrency:** optimistic lock — `UPDATE … WHERE id=? AND status IN (allowedFrom)`. Empty
  result → re-read: if now already at target → idempotent (no dup log); else
  `409 ORDER_STATE_CONFLICT`. Prevents lost updates / duplicate history on simultaneous actors.

---

## Files changed

**New**
- `backend/api/src/services/orders/transitions.ts` — pure frozen state machine + role/reason rules.
- `backend/api/src/services/orders/management.ts` — branch order data source (safe projections, branch scope, audit, optimistic lock).
- `backend/api/src/modules/admin/orders.ts` — `/admin/orders` router.
- `backend/api/tests/orders-transitions.test.ts`, `admin-orders.authz.test.ts`, `orders-management.test.ts`.

**Edited (wiring only)**
- `backend/api/src/modules/admin/routes.ts` (mount sub-router + dep)
- `backend/api/src/app-dependencies.ts`, `backend/api/src/modules/index.ts` (inject `branchOrderManagement`)

**Migrations:** none (existing `order.read`/`order.manage` + role mappings suffice).

---

## Tests

- **Unit — state machine** (`orders-transitions.test.ts`): all transitions, BM/SA late-cancel,
  required/forced reasons, invalid/final, idempotent no-op.
- **Router authz** (`admin-orders.authz.test.ts`): 401 no-bearer, customer/rider denied, suspended
  `USER_ACCESS_DISABLED`, spoof headers ineffective, BM own-scope, super-admin scope, cashier/kitchen
  allowed, query/body validation.
- **Data source** (`orders-management.test.ts`, mocked Supabase): branch isolation (no cross-branch
  leakage), other-branch `ORDER_ACCESS_DENIED`, not-found, audit-log-once, idempotent no-log,
  invalid transition, BM/SA late-cancel, `ORDER_STATE_CONFLICT`.
- **Suite:** `pnpm check` ✅ · `pnpm test:db` 89 ✅ · `pnpm test:backend` **127** ✅ ·
  `pnpm build:website` ✅ · `git diff --check` clean.
- **Live local E2E** (real Postgres + backend, real staff tokens, cleaned up): **18/18** — branch
  isolation, cross-branch denial, confirm/idempotent/preparing/cancel, cashier late-cancel denied,
  reject→`rejected_by_branch`, final protected, missing-reason 400, detail hides payment secrets,
  audit-once. Regression re-confirmed same session: guest quote/create/track, authenticated create
  sets `auth_user_id`, idempotency replay/409, customer own-order RLS (30/30), identity/phone (10/10),
  `/auth/me`, catalog `13/58/3/40/7`, branches `2`.

---

## Security findings

- Authorization is DB-principal only; headers/body/JWT-metadata never trusted (unit + live verified).
- Branch scope enforced server-side; cross-branch reads/writes denied.
- Safe projections exclude payment secrets, idempotency keys, pricing snapshot, `auth_user_id`.
- Service-role client stays behind middleware (frozen §5.4); RLS remains defense-in-depth.

## Known limitations

- `order_status_logs` has no dedicated actor-role column; the actor role is derivable from
  `actor_user_id` (+ `actor_type='staff'`). A role-snapshot column would need a future migration.
- Per-transition granular RBAC (cashier/kitchen carve-outs beyond the frozen `order.manage` +
  BM/SA late-cancel) is intentionally **not** added (would diverge from the frozen model).
- Notifications on transitions are not emitted (frozen §7 defers to Phase 15).
- Rider/delivery lane (dispatch/delivered) deferred to Sprint 4.6.

## Production rollout plan

1. Merge PR after owner review. **No migration** to apply (permissions already in production).
2. Deploy backend (`telepizza-api.onrender.com`). No website/catalog change.
3. Post-deploy smoke (read-only + short-lived staff personas, cleaned up): list branch isolation,
   confirm→preparing→ready, reject, cancel matrix, cross-branch denial, spoof-header ineffective,
   detail hides payment secrets. Requires production `service_role` for persona setup/cleanup.
4. Verify regression: guest quote/create/track, `/auth/me`, catalog `13/58/3/40/7`, branches `2`,
   WhatsApp `0304-1110495` unchanged.
5. Next unlocked: Sprint 4.6 Rider/Delivery APIs (delivery assign + dispatch/delivered mirror).

---

SPRINT 4.5 — BRANCH ORDER APIS: PASS
