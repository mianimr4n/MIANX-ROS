# ADR-030: Rider Identity, Dispatch & Assignment Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.4.0` (closes Phase 9 — Rider and Delivery App, ADR-030 of 3)

---

## Context

Telepizza's rider identity and dispatch surface has been live in Production
since Phase 1 (foundation schema `20260713190000_foundation_schema.sql`
introduced the `riders` and `deliveries` tables alongside the `rider` role
enumerated on `users.user_type` and `roles.code`). Sprint 4.6 then layered
the operational API surface (`modules/riders/routes.ts`, 4 routes) and the
Supabase delivery operations data source (`services/deliveries/operations.ts`,
563 lines) on top — providing rider roster listing, manual assignment, and
status transitions with idempotent order mirror. ADR-019 (RBAC, v2.1.0)
formally accepted the `rider` role as one of the eight ASSIGNABLE_STAFF_ROLES
and seeded the `delivery.assign`, `delivery.update`, `delivery.read`,
`delivery.access` permissions.

Despite this, the rider identity + dispatch contract was never elevated to a
formal ADR. The closest existing artifacts are ADR-007 (delivery state
machine — covers transitions, not identity or assignment) and ADR-019 §3
(RBAC — covers permission model, not the assignment operational contract).
The ROS Current State Assessment classifies the delivery surface as
"Partially Implemented" and accepts manual-only dispatch as a known
limitation, but no ADR records the canonical Phase 9 rider identity and
manual dispatch contract that operators actually rely on today.

This ADR formally accepts the as-built rider identity + manual dispatch
surface as the canonical Phase 9 decision: rider role + login flow, the
rider roster + assignment API, the same-branch + state-machine + rider-active
invariants enforced at the service layer, and the explicit deferral of
auto-dispatch. It deliberately scopes the delivery lifecycle transitions +
POD surface to ADR-031, and rider location + navigation + performance to
ADR-032.

## Decision

### 1. Rider identity — `rider` role + `riders` table + `user_id` UNIQUE

A rider is a staff-class identity. The rider logs in via the same Supabase
auth + RBAC flow as every other staff role (`/staff/login`). There is no
dedicated `/api/v1/rider/*` surface — the rider uses `/api/v1/riders/*`
alongside branch managers and customer support, with role-based access
differentiation enforced at the route + service layer.

The `riders` table (foundation schema, lines 208-221) is the canonical rider
profile:

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `id` | uuid PK | `default gen_random_uuid()` | Internal rider ID |
| `user_id` | uuid UNIQUE | `references users(id) on delete cascade` | 1:1 link to auth user |
| `branch_id` | uuid NOT NULL | `references branches(id) on delete restrict` | Home branch (cannot be null — riders belong to exactly one branch) |
| `full_name` | varchar(150) NOT NULL | | Display name |
| `phone` | varchar(30) NOT NULL | | Contact phone |
| `vehicle_type` | varchar(50) NOT NULL | | bike / car / scooter |
| `vehicle_number` | varchar(100) nullable | | Plate / identifier |
| `status` | text NOT NULL | `CHECK in ('offline', 'available', 'busy', 'inactive')` default `'offline'` | Operational state |

The `user_id` UNIQUE constraint enforces 1:1 between `auth.users` and
`riders`. A rider cannot exist without an auth user, and an auth user cannot
have two rider profiles.

The `branch_id NOT NULL` constraint enforces that every rider belongs to
exactly one branch. Cross-branch rider assignment is forbidden by the service
layer (see §3).

The `status` column has four values:

- `offline` — rider is not on shift (default on creation)
- `available` — rider is on shift and accepting deliveries
- `busy` — rider is on an active delivery (`deliveries.status IN ('assigned', 'picked-up')`)
- `inactive` — rider is suspended / no longer with the company (cannot be assigned)

`inactive` is the only hard block on assignment; `offline` and `busy` produce
warning states in the UI but do not block the API (the branch manager can
force-assign if needed).

### 2. Rider login flow — no dedicated surface

The rider authenticates via `POST /api/v1/auth/staff/login` (or the
phone-first variant per ADR-017). The auth response includes the rider's
`AuthPrincipal` with `roles: ['rider']`, `branchIds: [<home branch>]`, and
the seeded permissions (`delivery.read`, `delivery.update`, `delivery.access`).

The rider does NOT have `delivery.assign` — that permission is reserved for
branch-manager and super-admin. A rider cannot assign a delivery to themselves
or to another rider; only a branch manager (or SA) can. This enforces the
operational discipline that dispatch is a controlled action, not a
self-service one.

The `isRiderOnly(scope)` helper in `services/deliveries/operations.ts` line
111 detects this role shape:

```typescript
function isRiderOnly(scope: DeliveryActorScope): boolean {
  return scope.roles.includes("rider")
      && !scope.isSuperAdmin
      && !scope.roles.includes("branch-manager");
}
```

When `isRiderOnly` is true, the list-assignments endpoint automatically
filters to only the rider's own deliveries (resolved via
`riders.user_id = scope.userId` lookup). A rider cannot see another rider's
deliveries, even within the same branch.

### 3. Manual dispatch contract — `POST /api/v1/riders/deliveries/:id/assign`

The assignment endpoint is the single entry point for rider dispatch:

```
POST /api/v1/riders/deliveries/:deliveryId/assign
Authorization: requires permission "delivery.assign"
Body: { "riderId": "<uuid>" }
```

`delivery.assign` is granted to `branch-manager` and `super-admin` only
(see ADR-019 §3 permission seed matrix). Neither `cashier`, `kitchen`,
`customer-support`, nor `rider` itself can assign.

The service-layer `assignRider` function (`services/deliveries/operations.ts`
line 334) enforces four invariants in order:

| # | Invariant | Failure mode | HTTP code |
|---|---|---|---|
| 1 | `delivery.assign` permission present | `AUTHZ_FORBIDDEN` | 403 |
| 2 | Delivery exists | `DELIVERY_NOT_FOUND` | 404 |
| 3 | Delivery branch ∈ actor's branchIds (or SA) | `DELIVERY_ACCESS_DENIED` | 403 |
| 4 | Delivery branch is operational (not closed/suspended) | `BRANCH_NOT_OPERATIONAL` | 409 |
| 5 | Rider exists | `RIDER_NOT_FOUND` | 404 |
| 6 | Rider's `branch_id` = delivery's `branch_id` | `VALIDATION_ERROR` "Rider must belong to the same branch" | 400 |
| 7 | Rider's `status != 'inactive'` | `RIDER_INACTIVE` | 409 |
| 8 | Delivery's `status` ∈ `['pending', 'assigned']` | `INVALID_DELIVERY_TRANSITION` | 409 |

Only when all eight pass does the UPDATE fire. The UPDATE itself is guarded
by a `.in("status", ["pending", "assigned"])` clause, so a concurrent
transition to a terminal state causes the UPDATE to affect zero rows; the
service detects this and throws `DELIVERY_STATE_CONFLICT` (409).

### 4. Idempotent assignment — same rider + same state = no-op success

If the delivery is already `assigned` to the same rider, the endpoint
returns 200 with `idempotentReplay: true` (line 344-353). This handles the
case where a branch manager clicks "Assign" twice, or where a network retry
resends the same request. The idempotency check is on the
`(delivery.status === 'assigned' && delivery.rider_id === riderId)` tuple —
a different rider in the `assigned` state is NOT idempotent (it would
re-assign, which is allowed but produces `idempotentReplay: false`).

Re-assignment to a different rider IS supported while in `assigned` state —
this handles the case where the original rider becomes unavailable (e.g.
vehicle breakdown) and the branch manager needs to swap. The previous
rider's `assigned_at` is overwritten; the `delivery_state_transitions` audit
table records the transition `assigned → assigned` with the new rider_id in
metadata. This is intentional: the audit trail preserves who was assigned
when, even across re-assignments.

### 5. Auto-dispatch is explicitly deferred

The current contract is **manual dispatch only**. A branch manager must
explicitly choose a rider for each delivery. There is no:

- Auto-assignment on order `confirmed` (the delivery is created in `pending`
  state and waits for manual dispatch).
- Rider-scoring algorithm (proximity, current load, on-time %).
- Capacity cap (a rider can be assigned unlimited deliveries in sequence;
  the `busy` status is set by external systems, not the assignment API).
- Round-robin or load-balancing distribution.

This is a V1 limitation accepted by the business. The trigger to revisit
auto-dispatch is **branch volume > 50 deliveries/day per branch** (point at
which manual dispatch becomes a bottleneck), or **owner sign-off that
dispatch accuracy is hurting SLA**. At that point a new ADR will be authored
to specify the scoring algorithm + auto-assignment trigger + override
surface.

### 6. Order lifecycle integration — `syncDeliveryLaneForOrderStatus`

When an order transitions to `dispatched` or `completed` via the staff
order-management API, `services/orders/management.ts` lines 822-824 calls
`syncDeliveryLaneForOrderStatus(supabase, orderId, plan.toStatus, now)` to
keep the delivery lane aligned. This handles the case where staff use the
admin order endpoints (rather than the rider endpoints) to advance the
lifecycle.

| Order transition | Delivery sync action |
|---|---|
| `confirmed → dispatched` | If delivery exists + status = `assigned`, set `picked_up_at = now`, `status = 'picked-up'` |
| `dispatched → completed` | If delivery exists + status = `picked-up`, set `delivered_at = now`, `status = 'delivered'` (POD check still enforced by ADR-007 trigger) |
| `* → cancelled` | `UPDATE deliveries SET status='cancelled' WHERE order_id = ? AND status != 'delivered'` |

This is a one-way mirror: order transitions can advance the delivery lane,
but delivery transitions do NOT directly mutate the order (the rider
endpoints in `modules/riders/routes.ts` use `mirrorOrderStatus` to push the
order forward when the rider advances the delivery — see ADR-031 §3).

### 7. Branch isolation — RLS + service-layer defense in depth

Branch isolation is enforced at three layers, mirroring the kitchen ticket
pattern (ADR-027 §6):

1. **RLS on `riders` and `deliveries`** (foundation schema lines 335-336):
   `alter table riders enable row level security; alter table deliveries enable row level security;`
   Branch staff see only riders/deliveries in their branch; riders see only
   their own profile + their own assigned deliveries.

2. **Service-layer `assertBranchInScope`** (operations.ts line 100):
   ```typescript
   function assertBranchInScope(scope, branchId) {
     if (scope.isSuperAdmin) return;
     if (!scope.branchIds.includes(branchId)) {
       throw new ApiError(403, "DELIVERY_ACCESS_DENIED", "Delivery belongs to another branch.");
     }
   }
   ```

3. **`isRiderOnly` scope check** (operations.ts line 111, called in
   `listAssignments` and `transitionDelivery`): if the actor is a rider
   (not BM/SA), the query is automatically filtered to
   `rider_id IN (SELECT id FROM riders WHERE user_id = scope.userId)`. A
   rider cannot list or transition another rider's deliveries.

Cross-branch assignment returns 400 `VALIDATION_ERROR` ("Rider must belong
to the same branch as the delivery") at the service layer — this is a
data-integrity check, not just an access control one (even an SA cannot
assign a rider from branch A to a delivery in branch B).

## Consequences

### Positive

- **Rider identity is simple.** 1:1 with auth users, 1:1 with branches, no
  complex multi-branch or franchise-rider model. Onboarding a rider is just
  "create auth user + insert riders row".
- **Manual dispatch is auditable.** Every assignment is a deliberate action
  by a branch manager (or SA), recorded in `delivery_state_transitions`
  with actor_user_id + actor_role. No "system auto-assigned" rows to
  debug.
- **Idempotent assignment** handles network retries and double-clicks
  gracefully — no duplicate deliveries, no spurious audit rows.
- **Re-assignment is supported** without reversing the delivery — branch
  managers can swap riders mid-flight if needed, with full audit trail.
- **Branch isolation is defense-in-depth.** RLS + service-layer check +
  rider-scope filter means a misconfigured token still cannot leak
  cross-branch data.

### Negative

- **Manual dispatch is a bottleneck at scale.** Above ~50 deliveries/day per
  branch, the branch manager becomes the single point of dispatch failure.
  Auto-dispatch is deferred (§5).
- **Riders cannot self-assign.** A rider who arrives for shift must wait for
  the branch manager to assign deliveries — no "pull next delivery" queue.
  This is intentional (operational discipline) but adds latency.
- **`busy` status is not automatically maintained.** The `riders.status`
  column is set by external systems (HR shift scheduling, future work), not
  by the assignment API. A rider in `available` state can be assigned even
  if they are already on a delivery — the API does not check. This is
  acceptable in V1 because manual dispatch implies the branch manager knows
  the rider's state; it becomes a problem when auto-dispatch is added.
- **No rider capacity cap.** A branch manager can assign 10 deliveries to
  one rider in sequence; the API does not enforce a max-active-deliveries
  limit. The `busy` status is a hint, not a hard block.

## Implementation references

- Foundation schema: `supabase/migrations/20260713190000_foundation_schema.sql` lines 208-239 (riders + deliveries tables), lines 335-336 (RLS enable).
- ADR-007 migration: `supabase/migrations/20260814180000_adr_007_delivery_state_machine.sql` (delivery state machine + append-only audit + transition validator).
- ADR-019 RBAC: `docs/13-adr/ADR-019-rbac-authorization-principal.md` §3 — `delivery.assign` / `delivery.update` / `delivery.read` permission seeds.
- Backend route: `backend/api/src/modules/riders/routes.ts` (157 lines, 4 routes).
- Backend service: `backend/api/src/services/deliveries/operations.ts` (563 lines — `assignRider` at line 334, `isRiderOnly` at line 111, `assertBranchInScope` at line 100).
- Backend state machine: `backend/api/src/services/deliveries/state-machine.ts` (127 lines).
- Order lifecycle wiring: `backend/api/src/services/orders/management.ts` lines 812-824 (cancel + dispatch sync).
- Frontend dispatch surface: `apps/website/client/src/pages/admin/AdminDelivery.tsx` (550 lines), `apps/website/client/src/components/admin/delivery/DispatchQueue.tsx` (197 lines), `apps/website/client/src/components/admin/delivery/DeliverySidePanels.tsx` (131 lines — DeliveryRiderPanel).
- Tests: `backend/api/tests/riders-auth.test.ts` (31 lines), `backend/api/tests/riders-delivery.authz.test.ts` (268 lines).

## Future work (out of scope for this ADR)

- **Auto-dispatch engine** — Rider scoring by proximity (live GPS via ADR-008),
  current active-delivery count, on-time % (from `rider_daily_summaries`,
  deferred in ADR-032), and automatic assignment on order `confirmed` when
  the branch manager has not assigned within N minutes. Trigger: branch
  volume > 50 deliveries/day or owner sign-off.
- **Rider self-assign queue** — Allow riders to pull the next available
  delivery from a FIFO queue without branch-manager intervention. Requires
  a `delivery_queue` table with `queued_at` ordering + atomic
  `claim_next_delivery(rider_id)` RPC. Trigger: owner sign-off that
  branch-manager dispatch latency is hurting SLA.
- **Rider shift scheduling integration** — Sync `riders.status` with
  `hr_shift_scheduling` so that `offline`/`available` is set automatically
  based on the rider's roster. Trigger: Phase 12 (Customer and Staff Apps)
  when the rider mobile app is built.
- **Rider capacity cap** — Add a `max_active_deliveries` column to `riders`
  (default 1) and enforce in `assignRider`. Trigger: when auto-dispatch is
  added (otherwise the branch manager is the cap).
- **Multi-branch riders** — Allow a rider to be assigned to multiple
  branches (e.g. a floater who covers two nearby branches). Requires a
  `rider_branches` join table + dropping the `branch_id NOT NULL` on
  `riders`. Trigger: franchise expansion (Phase 15+).
- **Rider vehicle + license tracking** — Add `license_number`,
  `license_expiry`, `insurance_policy_number`, `insurance_expiry` columns
  to `riders`. Trigger: regulatory requirement or insurance underwriting.
