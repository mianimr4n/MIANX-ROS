# ADR-031: Delivery Lifecycle, Pickup & POD Surface

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.4.0` (closes Phase 9 — Rider and Delivery App, ADR-031 of 3)

---

## Context

Telepizza's delivery lifecycle has been live in Production across three
phases of construction:

1. **Phase 1 (foundation)** — `deliveries` table created with `status` CHECK
   constraint enumerating six states but no transition enforcement.
2. **Phase 2.4 / v1.8.0 (ADR-007)** — `delivery_state_transitions` append-only
   audit table + `delivery_valid_next_states()` IMMUTABLE SQL function +
   `trg_validate_delivery_state_transition` BEFORE UPDATE trigger. The TS
   validator in `services/deliveries/state-machine.ts` mirrors the SQL rules.
3. **Phase 2.4 / v1.9.0 (ADR-009 + ADR-010)** — `delivery_pod` table + POD-
   mandatory-for-delivered trigger extension + `cod_collections` table +
   reconciliation trigger posting to GL.

Sprint 4.6 also shipped the operational API surface in
`modules/riders/routes.ts` (4 routes) and the `transitionDelivery` service
function with order-mirror logic. ADR-018 (Order Lifecycle, v2.0.0)
formally accepted the order↔delivery mirror contract (`picked-up →
orders.dispatched`, `delivered → orders.completed`).

Despite this, the delivery lifecycle + pickup + POD operational contract was
never elevated to a single formal ADR. ADR-007 covers only the state machine
rules; ADR-009 covers only POD storage; ADR-018 covers only the order mirror.
No ADR records the canonical Phase 9 surface that operators and riders
actually rely on today: the rider-facing transition endpoint, the order
mirror compensating-rollback pattern, the POD-before-delivered enforcement
chain, and the explicit deferral of failed-delivery capture + redelivery +
customer-facing POD view.

This ADR formally accepts the as-built delivery lifecycle + pickup + POD
surface as the canonical Phase 9 decision. It deliberately scopes rider
identity + dispatch to ADR-030, and rider location + navigation +
performance to ADR-032.

## Decision

### 1. Delivery status machine — 6 states, ADR-007 elevation

The `deliveries.status` column has six values, enforced by CHECK constraint
(foundation schema line 231) and transition-validated by
`trg_validate_delivery_state_transition` (ADR-007 migration line 95+):

```
pending   → assigned | cancelled
assigned  → picked-up | cancelled | failed
picked-up → delivered | failed
delivered → (terminal)
failed    → (terminal)
cancelled → (terminal)
```

| Status | Meaning | Set by | Timestamp populated |
|---|---|---|---|
| `pending` | Delivery record created; no rider assigned yet | Order confirmation (or order placement for delivery orders) | `created_at` |
| `assigned` | Rider assigned; rider has not yet picked up the food | `assignRider` (POST `/api/v1/riders/deliveries/:id/assign`) | `assigned_at` |
| `picked-up` | Rider has picked up the food; en route to customer | `transitionDelivery` (POST `/api/v1/riders/deliveries/:id/status` body `{status:'picked-up'}`) | `picked_up_at` |
| `delivered` | Rider delivered to customer; POD captured | `transitionDelivery` (body `{status:'delivered'}`) — REQUIRES POD (ADR-009 §3) | `delivered_at` |
| `failed` | Delivery could not be completed (customer not home, wrong address, etc.) | Direct DB mutation by BM/SA via admin endpoint (NO rider-triggered endpoint in V1) | (no dedicated timestamp) |
| `cancelled` | Delivery voided (order cancelled, or branch aborted) | `syncDeliveryLaneForOrderStatus` on order cancel, or direct mutation | (no dedicated timestamp) |

The three terminal states (`delivered`, `failed`, `cancelled`) cannot be
exited. A `failed` delivery cannot be retried via state transition — the
business must create a new `deliveries` row (with fresh `pending` status)
for re-dispatch (see §6 Redelivery deferred).

### 2. `picked-up` IS the "out for delivery" state

ADR-018 §4 explicitly rejected an `out_for_delivery` status as a separate
state. The rationale: the delivery lane has its own actor set (rider) and
its own terminal states; adding `out_for_delivery` would create a 7th state
that duplicates the meaning of `picked-up` (rider has food, en route).

In the as-built system:

- `orders.status = 'dispatched'` corresponds to `deliveries.status = 'picked-up'`
  (set by `mirrorOrderStatus('dispatch')` when the rider transitions to
  `picked-up`).
- The customer-facing `TrackOrder.tsx` page shows `STATUS_LABELS.dispatched = 'Dispatched'`
  (line 19) — which the customer reads as "out for delivery".
- The `STATUS_STEPS` array (line 13) is `['pending', 'confirmed', 'preparing', 'ready', 'dispatched', 'completed']` — there is no separate `out_for_delivery` step.

This is by-design. The order-side label "Dispatched" and the delivery-side
label "picked-up" describe the same instant from two perspectives. Adding a
separate state would require duplicate transition rules and split the audit
trail.

### 3. Rider-facing transition endpoint — `POST /api/v1/riders/deliveries/:id/status`

```
POST /api/v1/riders/deliveries/:deliveryId/status
Authorization: requires permission "delivery.update" OR "delivery.assign"
Body: { "status": "assigned" | "picked-up" | "delivered", "notes"?: string }
```

The `statusBodySchema` (modules/riders/routes.ts line 40-45) accepts only
three values: `assigned`, `picked-up`, `delivered`. **Riders cannot trigger
`failed` or `cancelled` from this endpoint** — those transitions require
branch-manager or super-admin intervention via direct DB mutation (or the
admin order-cancel endpoint, which mirrors onto deliveries).

This is intentional:

- `failed` requires structured capture (reason category, return-to-branch
  flag) that does not yet exist in the schema (see §6). Allowing riders to
  mark `failed` without that capture would lose audit fidelity.
- `cancelled` is reserved for order-level cancellation (the customer
  cancels, or the branch aborts). A rider who cannot complete should mark
  `failed`, not `cancelled`.

The service-layer `transitionDelivery` (operations.ts line 406) enforces:

| # | Invariant | Failure | HTTP |
|---|---|---|---|
| 1 | `toStatus` ∈ `{assigned, picked-up, delivered}` | `VALIDATION_ERROR` | 400 |
| 2 | For `picked-up`/`delivered`: `delivery.update` permission | `AUTHZ_FORBIDDEN` | 403 |
| 3 | For `assigned`: `delivery.assign` permission | `AUTHZ_FORBIDDEN` | 403 |
| 4 | Delivery exists | `DELIVERY_NOT_FOUND` | 404 |
| 5 | Delivery branch ∈ actor's branchIds (or SA) | `DELIVERY_ACCESS_DENIED` | 403 |
| 6 | Delivery branch operational | `BRANCH_NOT_OPERATIONAL` | 409 |
| 7 | If `isRiderOnly`: delivery's `rider_id` ∈ rider's own rider IDs | `DELIVERY_ACCESS_DENIED` | 403 |
| 8 | `delivery.status → toStatus` is in `DELIVERY_TRANSITIONS` map | `INVALID_DELIVERY_TRANSITION` | 409 |

### 4. Order mirror — `mirrorOrderStatus` with compensating rollback

When a rider transitions a delivery, the parent order's status is mirrored:

| Delivery transition | Order mirror action |
|---|---|
| `pending → assigned` | (none — order stays in current state) |
| `assigned → picked-up` | `mirrorOrderStatus('dispatch')` → `orders.status = 'dispatched'` |
| `picked-up → delivered` | `mirrorOrderStatus('complete')` → `orders.status = 'completed'` |

The `mirrorOrderStatus` function (operations.ts line 152) uses
`planTransition` from `services/orders/transitions.ts` to compute the
allowed `from` statuses, then issues a conditional UPDATE guarded by
`.in("status", plan.allowedFromStatuses)`. If the order is already in the
target state, it returns early with `idempotentNoop: true`.

If the order mirror UPDATE fails (concurrent state change, audit log insert
failure, etc.), the delivery transition is **rolled back** via a
compensating UPDATE (operations.ts lines 492-513):

```typescript
const rollback = { status: previousStatus, updated_at: new Date().toISOString() };
if (toStatus === "picked-up") rollback.picked_up_at = null;
if (toStatus === "delivered") rollback.delivered_at = null;
await supabase.from("deliveries").update(rollback).eq("id", delivery.id).eq("status", toStatus);
```

This compensating-rollback pattern is used because the delivery UPDATE and
the order mirror UPDATE are not in a single DB transaction (they go through
separate Supabase RPC calls). If both the rollback AND the original failure
occur, the service throws `DELIVERY_ORDER_INCONSISTENT` (500) — this is a
catastrophic state that requires manual intervention, but it is also
exceedingly rare (requires two independent failures).

The `order_status_logs` table records the mirror transition with
`actor_type: 'staff'`, `actor_user_id: <rider's user id>`, and a note
indicating it was mirrored from a delivery transition.

### 5. POD-before-delivered enforcement chain (ADR-009 elevation)

The `delivered` transition is gated on POD existence. Enforcement is
layered (ADR-009 §3):

1. **SQL trigger** (`trg_validate_delivery_state_transition`, extended in
   `20260817000000` migration): the trigger function checks
   `EXISTS(SELECT 1 FROM delivery_pod WHERE delivery_id = NEW.id)` before
   allowing `NEW.status = 'delivered'`. If no POD row exists, the trigger
   raises an exception and the UPDATE is rolled back.

2. **Service-layer pre-check** (`transitionDelivery` in operations.ts):
   before attempting the UPDATE, the service calls
   `podService.podExistsForDelivery(deliveryId)`. If false, it throws
   `ApiError(422, 'POD_REQUIRED', 'Capture POD before marking delivered.')`.

3. **Frontend UI gating**: the rider app (when built, Phase 12) must
   capture POD via `POST /api/v1/admin/delivery-pod` BEFORE enabling the
   "Mark delivered" button. The current admin UI in `AdminDelivery.tsx`
   does not expose a "mark delivered" button to riders — only the
   branch-manager can advance a delivery to `delivered` via the admin
   surface, and only after the POD has been captured.

The POD capture endpoint (`POST /api/v1/admin/delivery-pod`) accepts the
photo URL (already uploaded to Supabase Storage bucket `delivery-pod`),
signature SVG path, recipient name + relationship, and notes. The POD row
is created with `captured_by_rider_id` (the rider who captured it) +
`captured_at = now()` (server-generated, ignores client timestamp).

Once the parent delivery reaches `delivered`, the POD row becomes
immutable — a trigger blocks UPDATE and DELETE (ADR-009 §7). To correct a
wrong POD, the business must reverse the delivery to `failed` (super-admin
override), which unblocks POD modification.

### 6. Failed-delivery capture — DEFERRED

The current `failed` transition is a bare status mutation. There is no
structured capture of:

- `failure_reason` (free-text)
- `failure_category` (enum: `customer_not_home`, `wrong_address`, `customer_refused`, `rider_breakdown`, `traffic_accident`, `other`)
- `return_to_branch` (boolean — did the rider return the food to the branch?)
- `failure_photo_url` (evidence photo)
- `failure_at` (timestamp — currently no dedicated column)

A `failed` delivery in the current system has none of this metadata. The
rider cannot trigger `failed` from `/api/v1/riders/deliveries/:id/status`
(the schema rejects it). A branch manager (or SA) can mark `failed` via
direct DB mutation, but the `delivery_state_transitions` audit row records
only `from_status`, `to_status`, `actor_user_id`, and a free-text `reason`
field — no structured categorization.

This is a V1 limitation. The trigger to revisit is **first failed-delivery
dispute that cannot be resolved due to missing metadata** (owner sign-off),
or **>5% delivery failure rate** (at which point structured categorization
becomes necessary for root-cause analysis). At that point a new ADR will
add the `delivery_failures` table + rider-triggered failure endpoint +
return-to-branch inventory reconciliation.

### 7. Redelivery flow — DEFERRED

When a delivery `failed`, the business currently has two options:

1. **Create a new order + new delivery** — the customer places a new order
   (or the branch manager creates one on their behalf via POS). This is the
   clean approach but loses the link to the original failed delivery.
2. **Manually un-fail the delivery** — a super-admin can directly mutate
   `deliveries.status` back to `pending` (bypassing the trigger), preserving
   the original delivery ID. This is discouraged because it breaks the
   "terminal is terminal" invariant.

Neither option is ideal. A proper redelivery flow would:

- Keep the original `failed` delivery intact (audit trail).
- Create a new `deliveries` row linked via `original_delivery_id` FK.
- Copy the delivery address, order reference, and POD (if any) forward.
- Allow the new delivery to be assigned to a different rider.

This is deferred. The trigger to revisit is the same as §6 (failed-delivery
metadata capture) — they will be addressed together.

### 8. Customer-facing POD view — DEFERRED

ADR-009 §3 RLS allows the order's customer to SELECT their own POD. However,
no customer-facing endpoint exposes the POD today. The customer can see the
order status via `GET /api/v1/orders/:orderNumber/tracking?phone=...`
(services/orders/supabase.ts line 844 — `getOrderTracking`), but the
tracking response does not include POD data.

Adding `pod` to the tracking response (or a separate `GET /api/v1/orders/:id/pod`
endpoint) would let customers verify the photo + signature + recipient name
if they dispute a delivery. This is deferred to Phase 12 (Customer and
Staff Apps) when the customer mobile app is built — the website
`TrackOrder.tsx` page is the only customer surface today, and adding POD
there requires UX work (photo viewer, signature renderer) that is out of
scope for Phase 9 closeout.

### 9. Live rider map — DEFERRED

ADR-008 §3 RLS allows branch staff to read rider locations. The
`DeliveryMapFoundation` component exists in
`apps/website/client/src/components/admin/delivery/DeliverySidePanels.tsx`
as a placeholder, but it does not render a live map. The customer-facing
`TrackOrder.tsx` page has no rider map at all.

A live rider map requires:

- Supabase Realtime channels (or WebSocket/SSE layer) to stream
  `rider_locations` inserts to subscribed clients.
- Map rendering library (Mapbox / Leaflet / Google Maps).
- Customer-side RLS policy to allow reading only the rider locations for
  their own active delivery (currently `rider_locations` RLS allows
  branch staff + the rider themselves + SA — NOT the customer).

This is deferred to Phase 12 (Customer and Staff Apps) when the customer
mobile app is built. The backend data is already there (ADR-008); the
realtime + map layer is a frontend task.

### 10. API surface — as-built

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/riders/assignments` | `delivery.read` | List deliveries (rider sees own; BM/SA sees branch) |
| `GET` | `/api/v1/riders/roster` | `delivery.assign` | List riders in branch (for assignment dropdown) |
| `POST` | `/api/v1/riders/deliveries/:id/assign` | `delivery.assign` | Assign rider to delivery (BM/SA only) |
| `POST` | `/api/v1/riders/deliveries/:id/status` | `delivery.update` OR `delivery.assign` | Transition delivery (assigned/picked-up/delivered only) |
| `POST` | `/api/v1/admin/rider-locations` | `delivery.access` | Ingest GPS ping (rider or admin) |
| `GET` | `/api/v1/admin/rider-locations/delivery/:id` | `delivery.access` | List pings for a delivery |
| `GET` | `/api/v1/admin/rider-locations/rider/:id/latest` | `delivery.access` | Latest ping for a rider |
| `POST` | `/api/v1/admin/delivery-pod` | `delivery.access` | Capture POD |
| `GET` | `/api/v1/admin/delivery-pod/:deliveryId` | `delivery.access` | Fetch POD for a delivery |
| `POST` | `/api/v1/admin/cod/collections` | `delivery.access` | Record COD collection at delivery |
| `GET` | `/api/v1/admin/cod/collections` | `delivery.access` | List COD collections (filtered) |
| `GET` | `/api/v1/admin/cod/collections/:id` | `delivery.access` | Single COD collection detail |
| `POST` | `/api/v1/admin/cod/collections/:id/reconcile` | `admin.access` OR `finance.manage` | Reconcile with handed-in amount |
| `POST` | `/api/v1/admin/cod/collections/:id/resolve` | `admin.access` OR `finance.manage` | Resolve shortage/overage → reconciled |

## Consequences

### Positive

- **State machine is DB-enforced.** Invalid transitions are rejected at the
  trigger level — even a buggy service layer cannot bypass the rules.
- **Audit trail is append-only.** Every transition is recorded in
  `delivery_state_transitions` with actor + reason + metadata. UPDATE and
  DELETE on this table are blocked by trigger.
- **POD is mandatory for delivered.** A delivery cannot reach `delivered`
  without a POD row — enforced at trigger + service + UI layers (defense
  in depth).
- **Order mirror is idempotent.** Repeated `picked-up` / `delivered`
  transitions are no-ops if the order is already in the target state. The
  compensating-rollback pattern handles rare mirror failures without
  leaving the system in an inconsistent state.
- **`picked-up` doubles as "out for delivery".** No redundant 7th state —
  the order-side `dispatched` label and the delivery-side `picked-up`
  label describe the same instant.

### Negative

- **Riders cannot trigger `failed`.** The status schema rejects it. A rider
  who cannot complete must call the branch manager, who then marks `failed`
  via direct DB mutation. This is a UX gap that becomes painful at scale
  (§6 deferred).
- **No redelivery flow.** A failed delivery requires creating a new order +
  new delivery (loses the link) or un-failing via SA override (breaks the
  terminal invariant). Neither is clean (§7 deferred).
- **No customer-facing POD.** The RLS allows it, but no endpoint exposes
  it. Customers cannot self-serve dispute resolution (§8 deferred).
- **No live rider map.** The data is collected (ADR-008) but not rendered.
  Customers and dispatchers see only status pills, not position (§9
  deferred).
- **Compensating-rollback can fail.** If both the order mirror AND the
  rollback fail, the system is in an inconsistent state requiring manual
  intervention. This is rare but possible (no single-transaction guarantee
  across the two tables).

## Implementation references

- ADR-007 migration: `supabase/migrations/20260814180000_adr_007_delivery_state_machine.sql` (181 lines).
- ADR-008/009/010 migration: `supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql` (673 lines).
- Backend routes: `backend/api/src/modules/riders/routes.ts` (157 lines), `backend/api/src/modules/admin/delivery-rider.ts` (470 lines).
- Backend services: `backend/api/src/services/deliveries/operations.ts` (563 lines — `transitionDelivery` at line 406, `mirrorOrderStatus` at line 152), `backend/api/src/services/deliveries/state-machine.ts` (127 lines), `backend/api/src/services/deliveries/pod-service.ts` (307 lines), `backend/api/src/services/deliveries/cod-service.ts` (457 lines).
- Order mirror wiring: `backend/api/src/services/orders/management.ts` lines 812-824 (cancel + dispatch sync).
- Order tracking (customer): `backend/api/src/services/orders/supabase.ts` line 844 (`getOrderTracking`).
- Frontend: `apps/website/client/src/pages/admin/AdminDelivery.tsx` (550 lines), `apps/website/client/src/pages/TrackOrder.tsx` (316 lines), `apps/website/client/src/components/admin/delivery/DeliveryDrawer.tsx` (242 lines), `apps/website/client/src/components/admin/delivery/DeliveryTimeline.tsx` (88 lines).
- Tests: `backend/api/tests/delivery-state-machine.test.ts` (238 lines, 82 cases), `backend/api/tests/delivery-pod-service.test.ts` (419 lines), `backend/api/tests/cod-service.test.ts` (688 lines), `backend/api/tests/riders-delivery.authz.test.ts` (268 lines).
- Phase 5 verify: `scripts/phase_5_verify.py` checks `deliveries` + `delivery_state_transitions` tables + RLS + CHECK constraint (63/63 PASS).

## Future work (out of scope for this ADR)

- **Failed-delivery capture** — `delivery_failures` table with `failure_reason`,
  `failure_category` enum, `return_to_branch` boolean, `failure_photo_url`,
  `failure_at` timestamp. Rider-triggered endpoint
  `POST /api/v1/riders/deliveries/:id/fail` with body `{category, reason, returnToBranch, photoUrl}`.
  Trigger: first unresolvable failed-delivery dispute OR >5% failure rate.
- **Redelivery flow** — `deliveries.original_delivery_id` FK + RPC
  `create_redelivery_from_failed(failed_delivery_id)` that copies address +
  order ref + POD forward. Trigger: same as failed-delivery capture.
- **Customer-facing POD view** — `GET /api/v1/orders/:orderNumber/pod?phone=...`
  endpoint returning the POD row + signed photo URL. Frontend: photo viewer
  + signature SVG renderer on `TrackOrder.tsx`. Trigger: Phase 12 customer
  mobile app.
- **Live rider map** — Supabase Realtime channel subscription on
  `rider_locations` for the customer's active delivery. Map rendering
  (Mapbox / Leaflet). Customer-side RLS policy to allow reading only their
  own delivery's rider pings. Trigger: Phase 12 customer mobile app.
- **Single-transaction delivery+order mirror** — Refactor
  `transitionDelivery` to use a single Postgres RPC that updates both
  tables in one transaction, eliminating the compensating-rollback pattern.
  Trigger: when `DELIVERY_ORDER_INCONSISTENT` appears in production logs
  more than once per quarter.
- **Delivery SLA tracking** — `deliveries.sla_target_minutes` column +
  `is_late` computed flag + late-alert events. Trigger: when branch
  managers request SLA dashboards (Phase 11 Finance and Reporting).
