# ADR-027: Kitchen Ticket Lifecycle & Queue Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.3.0` (closes Phase 8 — Kitchen Dashboard, ADR-027 of 3)

---

## Context

Telepizza's kitchen ticket surface has been live in Production since Sprint 4.5
/ 4.6, when DB-R5 (`supabase/migrations/20260718160000_db_r5_kitchen_tickets.sql`)
introduced the `kitchen_tickets` and `kitchen_ticket_items` tables alongside
the order lifecycle plumbing in `services/orders/management.ts`. The
corrective recipe-stock-consume pass (`20260730230000_kitchen_recipe_stock_consume.sql`)
then layered the atomic preparing transition on top. Two parallel UIs ship in
Production: the owner/admin ERP view at `/admin/kitchen`
(`apps/website/client/src/pages/admin/AdminKitchen.tsx`, 435 lines) and the
kitchen-manager full-screen KDS at `/admin/kitchen-dashboard`
(`apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`, 622 lines).

Despite this, the kitchen ticket lifecycle was never elevated to a formal ADR.
The closest existing artifacts are `docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`
(a plan-only doc that explicitly defers realtime and stations), `docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`
(elevated into ADR-018 — order lifecycle, not kitchen), and partial coverage
under ADR-024 §3 (Option B auto-link on dine-in confirm). The
`ROS_CURRENT_STATE_ASSESSMENT_2026-07-25.md` classifies both kitchen surfaces
as "Partially Implemented" and accepts three parallel kitchen UIs as known
debt — but no ADR records the canonical Phase 8 ticket contract that
operators actually rely on today.

This ADR formally accepts the as-built kitchen ticket lifecycle as the
canonical Phase 8 decision: one ticket per order, the 6-state status machine
with allowed transitions, the `ORDER_STATUS_MIRROR` mapping onto
`orders.status`, idempotent transition semantics, the public API surface, and
the branch-isolation boundary. It deliberately scopes KOT item snapshots and
per-item status to ADR-028, and display contract (timers, priority, stations)
to ADR-029.

## Decision

### 1. One ticket per order — `kitchen_tickets.order_id UNIQUE`

Every order that reaches `confirmed` state gets exactly one kitchen ticket.
The `kitchen_tickets.order_id` column has a `UNIQUE` constraint
(`20260718160000` line 28), enforced by a primary-key-grade index. There is no
"multiple tickets per order" pattern and no `parent_ticket_id` lineage.

The ticket is created by `createKitchenTicketForConfirmedOrder(supabase, orderId)`
in `backend/api/src/services/kitchen/tickets.ts` (605 lines, function around
line 380), which is called from `services/orders/management.ts` lines 805-818
whenever `plan.toStatus === "confirmed"`. Creation is idempotent: a unique
violation (PostgreSQL error code `23505`) is caught and treated as a no-op
success, returning the existing ticket.

| Order outcome | Kitchen ticket? | Trigger |
|---|---|---|
| Order → `confirmed` (any source) | Yes | `createKitchenTicketForConfirmedOrder` on transition |
| Order → `cancelled` (after confirm) | Existing ticket → `cancelled` | `cancelKitchenTicketForOrder` reverses consumed stock if any |
| Order rejected before confirm | No ticket created | N/A — kitchen only sees confirmed orders |
| Dine-in order → confirmed | Yes (same path) + bill auto-link (ADR-024) | `attachConfirmedDineInOrderToBill` + `createKitchenTicketForConfirmedOrder` |

### 2. Ticket status machine — 6 states, 7 forward transitions + cancelled

`KITCHEN_TICKET_STATUSES` (`backend/api/src/services/kitchen/transitions.ts`
line 8) defines the canonical enum:

```
queued → accepted → preparing → ready → completed
                                       ↘ cancelled (allowed at every non-terminal step)
```

| Status | Meaning | Set by | Timestamp column populated |
|---|---|---|---|
| `queued` | New ticket, not yet picked up by kitchen staff | Ticket creation (default) | `created_at` |
| `accepted` | Kitchen staff has claimed the ticket | `transitionTicket` (PATCH `/tickets/:id/status`) | `accepted_at`, `accepted_by_user_id` |
| `preparing` | Kitchen is actively cooking; stock consumed | `kitchen_ticket_set_preparing_atomic` RPC | `started_at` |
| `ready` | Food is ready for pickup / dispatch | `transitionTicket` (PATCH) | `ready_at` |
| `completed` | Ticket closed (picked up by customer/rider or served) | `transitionTicket` (PATCH) | `completed_at` |
| `cancelled` | Ticket voided (order cancelled or kitchen aborted) | `transitionTicket` (PATCH) or `cancelKitchenTicketForOrder` | (no dedicated timestamp — `updated_at` only) |

`KITCHEN_TICKET_FINAL_STATUSES = {completed, cancelled}` (line 19) — once in
either, no further transitions are allowed (HTTP 409
`TICKET_ALREADY_FINAL`).

### 3. Allowed transitions matrix

`ALLOWED_TRANSITIONS` (line 25) defines exactly which `toStatus` values are
legal from each `fromStatus`:

| fromStatus | Allowed toStatus |
|---|---|
| `queued` | `accepted`, `preparing`, `cancelled` |
| `accepted` | `preparing`, `cancelled` |
| `preparing` | `ready`, `cancelled` |
| `ready` | `completed`, `cancelled` |
| `completed` | (none — terminal) |
| `cancelled` | (none — terminal) |

Notable: the matrix allows skipping `accepted` (`queued → preparing` is
legal — kitchen staff can start cooking without an explicit accept step).
This matches the as-built UI: `nextKitchenActions(status)` in
`apps/website/client/src/lib/admin-kitchen.ts` exposes "Start preparing"
directly from `queued`.

Any illegal transition returns HTTP 409 `INVALID_TICKET_TRANSITION` with the
message `Cannot move kitchen ticket from '<from>' to '<to>'.`.

### 4. `ORDER_STATUS_MIRROR` — limited projection onto `orders.status`

The kitchen ticket lifecycle is **independent** from the order lifecycle, but
three statuses mirror onto `orders.status` to keep the customer-facing order
timeline accurate:

```typescript
export const ORDER_STATUS_MIRROR: Partial<Record<KitchenTicketStatus, string>> = {
  preparing: "preparing",
  ready: "ready",
  cancelled: "cancelled",
};
```

| Kitchen ticket status | Mirrors onto `orders.status`? | Why |
|---|---|---|
| `queued` | No | Order is already `confirmed` — no order-state change needed |
| `accepted` | No | Ticket-local; kitchen staff assignment doesn't affect customer |
| `preparing` | Yes → `preparing` | Customer sees "Your order is being prepared" |
| `ready` | Yes → `ready` | Customer sees "Your order is ready for pickup/dispatch" |
| `completed` | No | Order completion is driven by delivery / pickup / bill close — NOT by kitchen ticket |
| `cancelled` | Yes → `cancelled` | Order is cancelled alongside the ticket |

This is enforced in `transitionTicket` (`services/kitchen/tickets.ts`) which
calls `ordersService.patchStatus(orderId, mirrorStatus)` when
`plan.orderMirrorStatus` is non-null. Idempotent: if the order is already in
the mirrored status, the patch is a no-op.

### 5. Idempotent transition contract

`planKitchenTicketTransition({currentStatus, toStatus})` (line 44) returns
an `idempotentNoop: boolean` flag when `currentStatus === toStatus`. The
service layer uses this to skip the database UPDATE and audit log write —
replaying the same transition returns the existing ticket state without
side effects.

This contract is critical for the 8-second polling UI: if a kitchen staff
member clicks "Start preparing" twice (or the network flickers), the second
PATCH returns 200 with the existing ticket state, not 409. The frontend
treats both responses identically.

The only exception is terminal states: PATCH on a `completed` or `cancelled`
ticket returns 409 `TICKET_ALREADY_FINAL` regardless of `toStatus`, because
terminal states must never be silently re-confirmed.

### 6. API surface

```text
# Kitchen ticket queue + transitions (modules/kitchen/routes.ts)
GET   /api/v1/kitchen/tickets?branchId=&status=&limit=&offset=
  Headers: Authorization
  → 200 { ok, data: KitchenTicket[], meta: { pagination } }
  → 403 KITCHEN_ACCESS_DENIED (rider / cashier / customer / cross-branch)

PATCH /api/v1/kitchen/tickets/:id/status
  Headers: Authorization
  Body: { status: 'accepted'|'preparing'|'ready'|'completed'|'cancelled', note? }
  → 200 { ok, data: { ticket, orderMirrorStatus, idempotentReplay } }
  → 409 INVALID_TICKET_TRANSITION | TICKET_ALREADY_FINAL
  → 403 KITCHEN_ACCESS_DENIED
```

Both endpoints require Bearer → `AuthPrincipal` via
`createRequireAuthenticatedUser`. There is NO `requirePermission` middleware
— authorization is enforced in the service layer via `assertKitchenActor(scope)`
+ `assertBranchInScope(scope, branchId)` (defense in depth).

Limits:
- `limit` is clamped to 1-100 (default 50).
- `offset` is non-negative integer.
- `note` (optional, max 500 chars) is persisted on `order_status_logs` for
  audit (not on a dedicated kitchen ticket audit table).

### 7. Branch isolation — RLS + helper + defense in depth

Three layers enforce branch isolation:

1. **Database RLS** (DB-R5 lines 168-229): `kitchen_tickets` and
   `kitchen_ticket_items` both have RLS enabled. 4 policies (SELECT/UPDATE
   on each table) gate on `current_user_can_access_kitchen_tickets(branch_id)`.
   There are NO INSERT/DELETE policies for `authenticated` — only
   `service_role` can write (the backend service uses the service_role
   Supabase client).
2. **`current_user_can_access_kitchen_tickets(p_branch_id)` helper** (DB-R5
   line 132): `SECURITY DEFINER` SQL function. Returns true iff:
   - `p_branch_id` is not null, AND
   - caller is `current_user_is_active()`, AND
   - caller is `current_user_is_super_admin()`, OR
   - caller has a `roles.code in ('kitchen', 'branch-manager')` row in
     `user_roles` with `branch_id = p_branch_id` and `user_type <> 'customer'`.
   
   Rider, cashier, customer-support, and customer roles are explicitly
   denied — even if they have a `user_roles` row for the branch.
3. **Service-layer defense** (`services/kitchen/tickets.ts` lines 79-99):
   `assertKitchenActor(scope)` + `assertBranchInScope(scope, branchId)`.
   Throws `ApiError(403, "KITCHEN_ACCESS_DENIED")` on denial.

Additionally, `enforce_kitchen_ticket_branch_match()` trigger (DB-R5 line 67)
ensures `kitchen_tickets.branch_id == orders.branch_id` on INSERT/UPDATE of
`branch_id` or `order_id`. This prevents a service-role bug from
accidentally creating a ticket on the wrong branch.

### 8. Polling, not realtime

The kitchen UIs poll `GET /api/v1/kitchen/tickets` every 8 seconds
(`AdminKitchen.tsx` line 124 `pollMs: 8_000`; `AdminKitchenDashboard.tsx`
line 132). There are NO Supabase Realtime channels on `kitchen_tickets` or
`kitchen_ticket_items` — verified by `grep -rn "supabase.channel\|subscribe"`
returning zero matches in any kitchen-related file.

This is an explicit non-goal per `docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`
§51: *"polling (7–10s), not websockets"*. The 8s cadence is a deliberate
tradeoff:

| Concern | Polling (8s) | Realtime (supabase.channel) |
|---|---|---|
| Server load | 1 request per active kitchen user per 8s | 1 persistent websocket per active user |
| Latency | Up to 8s delay on status change | Sub-second |
| Implementation complexity | Trivial (already built) | Moderate — channel wiring + reconnection + RLS policies on broadcast |
| Failure mode | Graceful — next poll catches up | Websocket disconnect → manual reconnect |

For a single-branch kitchen with ~5 staff devices, 8s polling is well
within budget. Realtime is **deferred to a future ADR** with trigger
condition: "kitchen device count > 20 per branch OR customer-facing order
tracker requires sub-second kitchen status updates".

### 9. Non-goals (this ADR)

The following are explicitly OUT OF SCOPE for ADR-027 and are covered by
companion ADRs or deferred:

| Concern | ADR / status |
|---|---|
| KOT item snapshots (item_name, modifiers, is_completed) | ADR-028 |
| Per-item prep ticks (`PATCH /tickets/:id/items/:itemId`) | ADR-028 §4 (deferred) |
| KOT print format + sequence numbering + fiscal printer | ADR-028 §5 (deferred) |
| Atomic stock consume on preparing (`kitchen_ticket_set_preparing_atomic` RPC) | ADR-028 §3 |
| Client-side elapsed timer + display thresholds (PREP_WARN / PREP_TARGET) | ADR-029 |
| Priority field + channel-based auto-priority + manual escalation endpoint | ADR-029 §3 (deferred) |
| `kitchen_stations` table + ticket-to-station routing | ADR-029 §4 (deferred) |
| Realtime updates (Supabase Realtime channels) | Deferred — explicit non-goal (this ADR §8) |
| Audible alarms / bump-bar / recall / push notifications | Deferred — RC1 accepted limitation |
| Three parallel kitchen UIs consolidation (`/admin/kitchen` + `/admin/kitchen-dashboard` + `/ops/kitchen`) | Out of scope — RC1 known debt, not a Phase 8 blocker |

## Consequences

### Positive

- **One ticket per order is the simplest correct model.** UNIQUE on
  `order_id` means there is no ambiguity about which ticket represents an
  order's kitchen work. Cancellation, stock reversal, and audit all operate
  on a single row.
- **Independent ticket lifecycle with limited order mirror.** The kitchen
  can accept / start / ready / complete tickets without coupling to the
  order state machine — but the three customer-relevant statuses
  (preparing, ready, cancelled) DO mirror, so the customer-facing order
  tracker stays accurate.
- **Idempotent transitions are safe to retry.** The 8s polling + idempotent
  no-op contract means double-clicks and network flickers don't corrupt
  state. The frontend never has to debounce or disable buttons.
- **Branch isolation is enforced at three layers.** Even if the service
  layer has a bug, RLS denies cross-branch reads/writes at the database.
  The `enforce_kitchen_ticket_branch_match` trigger catches service_role
  bugs that would otherwise bypass RLS.
- **Polling is good enough.** For the current scale, 8s polling is cheap,
  reliable, and operationally simple. No websocket disconnects to debug.

### Negative

- **8s latency on status change.** A kitchen staff member who clicks "Mark
  ready" will see the ticket move on their own screen immediately
  (optimistic UI), but other kitchen devices won't see the change for up
  to 8s. Acceptable for current scale; will need realtime when scale grows.
- **No dedicated kitchen audit table.** Transition notes are written to
  `order_status_logs` (the order audit table), not to a
  `kitchen_ticket_events` table. This means kitchen-specific audit
  queries have to join through `orders` — slightly slower, but keeps the
  audit log unified.
- **Three parallel kitchen UIs are not consolidated.** `/admin/kitchen`
  (owner ERP), `/admin/kitchen-dashboard` (kitchen KDS), and `/ops/kitchen`
  (ops path) all coexist. This is RC1-known debt and is NOT addressed by
  this ADR — consolidation requires operator UX research, not a schema
  decision.
- **`accepted` is a ticket-local state.** Because `accepted` doesn't
  mirror onto `orders.status`, the customer never sees "kitchen accepted
  your order" — they only see `confirmed` until `preparing`. This is
  intentional (acceptance is a kitchen-internal step) but may surprise
  operators who expect a more granular customer timeline.

## Alternatives Considered

- **Multiple tickets per order (one per station / course).** Rejected: adds
  a `parent_ticket_id` column and a coordination layer (when is the order
  "fully ready"?). For Telepizza's menu (pizzas, sides, drinks — all
  prepared together), one ticket per order is the right granularity.
  Station routing is deferred to ADR-029 §4.
- **Full order-status coupling (kitchen ticket mirrors every status).**
  Rejected: the order lifecycle (ADR-018) has more states than the kitchen
  ticket lifecycle (e.g., `delivered`, `pickup_collected`), and
  customer-side states (e.g., `en_route`) are not kitchen-relevant.
  Mirroring only `preparing`/`ready`/`cancelled` keeps the coupling
  minimal and avoids feedback loops.
- **`requirePermission('kitchen.manage')` middleware.** Rejected: ADR-019
  defines the kitchen role with `order.read` + `order.manage` permissions,
  but those are too broad (also granted to branch-manager). The
  service-layer `assertKitchenActor` check is more precise — it
  explicitly enumerates `kitchen`, `branch-manager`, `super-admin` and
  denies everyone else.
- **Realtime via Supabase Realtime channels.** Rejected for V1: the
  implementation cost (channel wiring, broadcast RLS policies,
  reconnection logic) is not justified at current scale. 8s polling is
  operationally simpler and the latency is tolerable. Realtime is deferred
  with an explicit trigger condition (this ADR §8).
- **Separate `kitchen_ticket_events` audit table.** Rejected: doubles the
  audit surface for marginal benefit. `order_status_logs` already
  captures every transition with a `note` field and an `actor_user_id`.
  A kitchen-specific audit table would only be justified if kitchen
  needed audit queries that the order audit table can't service — which
  is not the case today.

## As-Built Verification (2026-08-16)

`scripts/phase_8_verify.py` (authored alongside this ADR) confirms
Production Supabase has:

- ✅ `kitchen_tickets` table exists with `status` CHECK constraint
  including all 6 statuses (`queued`, `accepted`, `preparing`, `ready`,
  `completed`, `cancelled`)
- ✅ `kitchen_tickets.order_id` has UNIQUE constraint
- ✅ `kitchen_tickets.priority` integer column exists (default 0)
- ✅ `kitchen_tickets.sequence_number` integer column exists (nullable)
- ✅ `kitchen_tickets.accepted_by_user_id` FK references `public.users`
  (NOT `auth.users`)
- ✅ `kitchen_tickets.accepted_at`, `started_at`, `ready_at`,
  `completed_at` timestamptz columns exist
- ✅ 3 indexes: `idx_kitchen_tickets_branch_id`,
  `idx_kitchen_tickets_branch_status`, `idx_kitchen_tickets_status`
- ✅ `enforce_kitchen_ticket_branch_match()` function exists as SECURITY
  DEFINER
- ✅ `trg_kitchen_tickets_branch_match` trigger fires BEFORE INSERT OR
  UPDATE OF `branch_id`, `order_id`
- ✅ `current_user_can_access_kitchen_tickets(p_branch_id)` function
  exists as SECURITY DEFINER; grants `kitchen` + `branch-manager` only
- ✅ RLS enabled on `kitchen_tickets` + `kitchen_ticket_items`; 4
  policies (SELECT/UPDATE on each); NO INSERT/DELETE policies for
  `authenticated`
- ✅ `kitchen_ticket_items` table exists with `item_name_snapshot`,
  `modifiers_snapshot` JSONB, `quantity` CHECK >0, `is_completed` boolean,
  UNIQUE on `(kitchen_ticket_id, order_item_id)`
- ✅ Backend route `GET /api/v1/kitchen/tickets` registered
- ✅ Backend route `PATCH /api/v1/kitchen/tickets/:id/status` registered
- ✅ `kitchen_ticket_set_preparing_atomic` RPC exists (covered in ADR-028)
- ✅ `KITCHEN_TICKET_STATUSES` enum in `services/kitchen/transitions.ts`
  matches the DB CHECK constraint exactly
- ✅ `ORDER_STATUS_MIRROR` only maps `preparing`/`ready`/`cancelled`

**Result: see PHASE8_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md`](../architecture/SPRINT-04-6-RESTAURANT-OPS-FOUNDATION.md) — polling-not-realtime contract
- [`docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`](../architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md) — kitchen queue read API spec (elevated to ADR-018)
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 8 entry
- [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](./ADR-018-order-lifecycle-state-machine.md) — order status transitions (parent of this ADR)
- [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](./ADR-019-rbac-authorization-principal.md) — kitchen role + permission model
- [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](./ADR-024-dine-in-bill-settlement.md) — Option B auto-link on dine-in confirm
- [`docs/13-adr/ADR-028-kot-snapshot-per-item-status.md`](./ADR-028-kot-snapshot-per-item-status.md) — KOT item snapshots + atomic stock consume
- [`docs/13-adr/ADR-029-kitchen-timers-priority-display-contract.md`](./ADR-029-kitchen-timers-priority-display-contract.md) — timers, priority, display contract
- [`supabase/migrations/20260718160000_db_r5_kitchen_tickets.sql`](../../supabase/migrations/20260718160000_db_r5_kitchen_tickets.sql) — DB-R5 schema
- [`backend/api/src/services/kitchen/tickets.ts`](../../backend/api/src/services/kitchen/tickets.ts) — KitchenTicketsService
- [`backend/api/src/services/kitchen/transitions.ts`](../../backend/api/src/services/kitchen/transitions.ts) — status machine
- [`backend/api/src/modules/kitchen/routes.ts`](../../backend/api/src/modules/kitchen/routes.ts) — public API routes
- [`apps/website/client/src/pages/admin/AdminKitchen.tsx`](../../apps/website/client/src/pages/admin/AdminKitchen.tsx) — owner ERP UI
- [`apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`](../../apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx) — kitchen KDS UI
