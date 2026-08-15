# ADR-018: Order Lifecycle State Machine & Staff Transition API

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.0.0` (closes Phase 5 — Order Lifecycle)

---

## Context

Telepizza's order domain needed a deterministic, auditable, role-aware state
machine before any staff-facing POS / Kitchen / Rider UI could ship. The
Sprint 4.4 architecture (`docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`)
froze the canonical transition matrix, cancellation matrix, and RLS
dependencies — but as a *plan-only* artifact, with no ADR recording the
decision in the architecture register.

Phase 2 (v1.9.0) added the audit infrastructure (`domain_events`, ADR-012)
that the order lifecycle now mirrors into. Phase 3 (v1.10.0) added the
phone-first auth (ADR-016/017) that staff eventually use to call the
transition API. The order lifecycle itself has been implemented in code
since Sprint 4.5 / 4.6 (commits `f307051`, `88c6eeb`, `b345b42`) and
deployed to Production Supabase across the `20260716*`, `20260725*`,
`20260814*`, `20260819*` migration families — but the architecture decision
was never elevated to an ADR.

This ADR formally accepts the Sprint 4.4 frozen architecture as the
canonical Phase 5 decision and records the as-built implementation
against the as-designed matrix.

## Decision

### 1. Frozen `orders.status` enum (no rename)

```text
pending → confirmed → preparing → ready → dispatched → completed
                                                            
pending | confirmed | preparing | ready → cancelled
```

| Product language | DB value |
|---|---|
| Placed | `pending` |
| Branch accepted | `confirmed` |
| Cooking | `preparing` |
| Ready | `ready` |
| Out for delivery | `dispatched` |
| Done | `completed` |
| Cancelled / rejected | `cancelled` (+ reason code) |

The `orders.status` column is `text` with a CHECK constraint listing
all seven values (`orders_status_check`). No enum type, no rename —
text + CHECK keeps migrations additive and avoids enum-type rebuilds.

The following candidate statuses are **deferred / out of scope**:
`draft`, `submitted`, `assigned`, `out_for_delivery`, `delivered`,
`rejected` — these are represented by `deliveries.status` (ADR-007) or
by `cancel_reason_code` values.

### 2. Allowed transitions

| From | To | Actor | Permission / proof |
|---|---|---|---|
| — | `pending` | Guest / auth create | Public create (O2) |
| `pending` | `confirmed` | Staff | `order.manage` + branch |
| `pending` | `cancelled` | Customer or staff | Guest phone (O5) **or** `order.manage` |
| `confirmed` | `preparing` | Kitchen / staff | `order.manage` + branch |
| `confirmed` | `cancelled` | Staff only (V1) | `order.manage` + branch |
| `preparing` | `ready` | Kitchen / staff | `order.manage` + branch |
| `preparing` | `cancelled` | Staff (BM/SA) | `order.manage` + branch |
| `ready` | `dispatched` | Staff / delivery | `order.manage` or `delivery.assign` + branch |
| `ready` | `completed` | Staff | Pickup / dine-in · `order.manage` |
| `ready` | `cancelled` | Staff (BM/SA) | Stricter · `order.manage` |
| `dispatched` | `completed` | Staff / rider | `order.manage` or `delivery.update` |
| `dispatched` / `completed` / `cancelled` | * | **None** | Terminal |

Illegal transitions return `409 ORDER_INVALID_TRANSITION`.

### 3. Cancellation matrix (locked)

| Actor | Status | Window / rule |
|---|---|---|
| Guest / customer | `pending` only | **15 minutes** from `created_at` (live since Sprint 4.3 Phase B) |
| Guest / customer | `confirmed+` | **No** online cancel — WhatsApp / branch |
| Staff | `pending` / `confirmed` | Yes · reason required |
| Staff | `preparing` / `ready` | BM / SA only · reason required |
| Staff | `dispatched` / `completed` | No cancel — refund path later (payment table) |
| Branch reject | any pre-kitchen | `cancelled` + `cancel_reason_code = rejected_by_branch` |

Reason codes (V1 minimum): `customer_cancelled`, `rejected_by_branch`,
`staff_cancelled`, `duplicate`, `test`.

### 4. Auditability — `order_status_logs` (append-only)

Every create and every transition appends a row to `order_status_logs`:

| Column | Purpose |
|---|---|
| `order_id` | FK to `orders.id` |
| `from_status` | previous status (`null` on create) |
| `to_status` | new status |
| `actor_type` | `guest` / `customer` / `staff` / `system` |
| `actor_user_id` | nullable; set for staff / auth customers |
| `reason_code` | nullable; mandatory for staff cancels |
| `note` | optional free-text (no PII / PAN / tokens) |
| `created_at` | transition timestamp |

The table is RLS-protected and service-role-writable only — application
code never UPDATEs or DELETEs rows. A mirror trigger forwards every
insert into `domain_events` (ADR-012) as `order.transitioned`, enabling
cross-domain correlation via `correlation_id`.

### 5. Delivery lane (ADR-007) — single transaction mirror

```text
deliveries: pending → assigned → picked-up → delivered
                                   ↘ failed
                                   ↘ cancelled
```

| Delivery event | Mirror on `orders.status` |
|---|---|
| `assigned` | still `ready` (or already `dispatched` per branch policy) |
| `picked-up` | `dispatched` |
| `delivered` | `completed` |
| `failed` | stay `dispatched` + staff intervention (no auto-complete) |
| `cancelled` | with order cancel path only |

V1 default: rider mutates the **delivery** row; the order mirror
transition is written in the same service call (single transaction,
ordered writes). The rider never updates another branch's order.

### 6. RLS hard gate (Slice 2D)

Before any staff UI ships, Row-Level Security must be enabled with
branch-scoped policies on:

| Table | Intent |
|---|---|
| `orders` | Staff: SELECT/UPDATE within `branch_id` + permission · Customer: own `auth_user_id` / phone proof · Guest: no table SELECT (API phone proof) |
| `order_items` | Same as parent order |
| `order_status_logs` | Append via service / SECURITY DEFINER · staff read branch-scoped |
| `deliveries` | Staff/rider branch-scoped |

Helpers (SECURITY DEFINER, pinned `search_path = public`):
`current_app_user_id()`, `current_user_is_active()`,
`current_user_is_super_admin()`, `current_user_branch_ids()`,
`current_user_has_branch_access(p_branch_id)`.

### 7. API surface

```text
# Staff lifecycle (modules/admin/orders.ts)
POST /api/v1/admin/orders/:id/confirm
POST /api/v1/admin/orders/:id/reject
POST /api/v1/admin/orders/:id/preparing
POST /api/v1/admin/orders/:id/ready
POST /api/v1/admin/orders/:id/dispatch
POST /api/v1/admin/orders/:id/complete
POST /api/v1/admin/orders/:id/cancel
GET  /api/v1/admin/orders?branchId=&status=
GET  /api/v1/admin/orders/:id

# Kitchen queue read (modules/kitchen/routes.ts)
GET  /api/v1/staff/kitchen/tickets?branchId=&status=

# Rider / delivery (modules/riders/routes.ts)
GET  /api/v1/riders/assignments
GET  /api/v1/riders/roster
POST /api/v1/riders/deliveries/:id/assign
POST /api/v1/riders/deliveries/:id/transition
```

All staff endpoints require Bearer → `AuthPrincipal` →
`requirePermission('order.manage' | 'delivery.assign' | 'delivery.update')`
+ `requireBranchAccess`. Suspended users are denied. Client-supplied
`branchId` is never trusted for authz beyond principal scope.

### 8. Idempotent transitions

If a staff member clicks `confirm` on an order already in `confirmed`
state, the API returns `200` with the current state and **does not**
append a new `order_status_logs` row. This prevents duplicate audit
entries on retries / double-clicks without masking genuine errors.

## Consequences

### Positive

- **Impossible to reach invalid states.** CHECK constraint +
  TypeScript validator + RLS give three layers of defense.
- **Full audit trail.** Every state change is recorded with who/when/why,
  mirrored into `domain_events` for cross-domain correlation.
- **Terminal states are truly terminal.** `completed` / `cancelled`
  reject all further transitions.
- **Idempotent retries.** Operators can safely re-click transitions
  without polluting audit logs.
- **Branch-scoped by default.** RLS prevents cross-branch data leakage
  even if a future UI bug forgets to scope a query.
- **Helpful errors.** Backend returns `409 ORDER_INVALID_TRANSITION`
  with the offending state, before hitting the DB.

### Negative

- **No partial-cancel of line items.** The current model is order-level
  cancel only. Partial cancels (refund one pizza) require a future
  refund/credit-note table (Phase 11 — Finance).
- **No auto-cancel on payment failure.** Payment-failed orders stay in
  `pending` until staff or customer explicitly cancels. Intentional —
  auto-cancel on payment webhook could race with customer retry.
- **Rider cannot directly complete an order.** Rider updates
  `deliveries.status`; the order mirror is written by the service in
  the same transaction. This adds one round-trip but keeps the audit
  trail on the staff/rider actor correctly.

## Alternatives Considered

- **Postgres enum type for `orders.status`.** Rejected: enum-type
  additions require `ALTER TYPE` which is not transactional with the
  rest of a migration in some PG versions, and removing a value is
  essentially impossible without a full rewrite. Text + CHECK is
  additive and migration-safe.
- **Single status enum combining order + delivery.** Rejected: the
  delivery lane has its own actor set (rider) and its own terminal
  states (`failed`). Combining would force the order enum to carry
  delivery-specific values like `out_for_delivery`, which the product
  team explicitly rejected (frozen §3.1).
- **Application-only enforcement (no SQL CHECK).** Rejected: defense
  in depth. A buggy service or a manual `psql` fix could otherwise
  land the DB in an invalid state with no record.
- **State-machine as a separate `order_state_transitions` table
  (mirroring `delivery_state_transitions`).** Rejected: the existing
  `order_status_logs` table already serves this role. Adding a
  parallel table would split the audit trail and require two joins
  for every "what happened to this order" query.

## As-Built Verification (2026-08-16)

`scripts/phase_5_verify.py` confirms Production Supabase has:

- ✅ 6 tables: `orders`, `order_items`, `order_status_logs`,
  `deliveries`, `delivery_state_transitions`, `kitchen_tickets`
- ✅ `orders.status` CHECK constraint contains all 7 frozen values
- ✅ `deliveries.status` CHECK constraint contains all 6 ADR-007 values
- ✅ 9 functions: 5 Slice 2D RLS helpers + `enforce_delivery_transition_append_only`
  + `validate_delivery_state_transition` + `emit_domain_event`
  + `enforce_domain_events_append_only`
- ✅ RLS enabled on `orders`, `order_items`, `order_status_logs`, `deliveries`
  (8 policies total)
- ✅ 4 permissions seeded: `order.manage`, `order.read`,
  `delivery.assign`, `delivery.update`
- ✅ `order_status_logs` schema complete: `id`, `order_id`, `from_status`,
  `to_status`, `actor_type`, `actor_user_id`, `reason_code`, `note`,
  `created_at`

**Result: 63/63 checks PASS.**

## References

- [`docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`](../architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md) — frozen architecture (plan-only source of truth)
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 5 entry
- [`docs/13-adr/ADR-007-delivery-state-machine.md`](./ADR-007-delivery-state-machine.md) — delivery lane
- [`docs/13-adr/ADR-012-domain-event-audit.md`](./ADR-012-domain-event-audit.md) — `domain_events` mirror
- [`backend/api/src/services/orders/transitions.ts`](../../backend/api/src/services/orders/transitions.ts) — TypeScript state machine
- [`backend/api/src/services/orders/management.ts`](../../backend/api/src/services/orders/management.ts) — branch order service
- [`backend/api/src/modules/admin/orders.ts`](../../backend/api/src/modules/admin/orders.ts) — staff transition endpoints
