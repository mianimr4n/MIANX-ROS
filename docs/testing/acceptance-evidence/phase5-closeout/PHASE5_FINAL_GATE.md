# Phase 5 — Order Lifecycle: Final Gate

## Gate status: **PASSED** (Production certified; annotated `v2.0.0` released)

**Date closed:** 2026-08-16
**Master roadmap entry:** Phase 5 — Order Lifecycle
**Architecture source of truth:** `docs/architecture/SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md` (FROZEN)
**Formal ADR:** [ADR-018 — Order Lifecycle State Machine & Staff Transition API](../../../13-adr/ADR-018-order-lifecycle-state-machine.md)
**Production Supabase project:** `pyeowxvacgypohrbvgee`

---

## 1. Scope

Phase 5 delivers the complete staff-facing order lifecycle: branch
confirm / reject, kitchen preparing / ready, rider assignment /
dispatch / delivered, the cancellation matrix, the append-only audit
trail, branch-scoped RLS, and the API surface for POS / Kitchen /
Rider UIs to be built on top in Phases 6–9.

The architecture was frozen in Sprint 4.4 (plan-only). Implementation
slices 4.5a, 4.5b, 4.6, and Slice 2D RLS have been progressively
merged and deployed across the `20260716*`, `20260725*`, `20260814*`,
`20260819*` migration families. Phase 5 closeout elevates the
frozen architecture to ADR-018 and runs a comprehensive Production
verification gate.

## 2. Gate criteria

| Criterion | Status |
| --- | --- |
| ADR-018 authored and Accepted | ✅ PASS |
| Sprint 4.4 architecture frozen (`SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`) | ✅ PASS |
| Slice 2D RLS migration applied to Production (`20260716140000_sprint3_slice2d_order_branch_rls.sql`) | ✅ PASS |
| Sprint 4.5 staff transition APIs merged (PR #53) | ✅ PASS |
| Sprint 4.5 production close (PR #55) | ✅ PASS |
| Sprint 4.5A customer onboarding merged (PR #57) | ✅ PASS |
| Sprint 4.6 restaurant ops foundation merged (PR #85) | ✅ PASS |
| Sprint 4.6 review blockers remediated (commit `b345b42`) | ✅ PASS |
| ADR-007 delivery state machine applied to Production | ✅ PASS |
| ADR-012 domain_events mirror triggers applied to Production | ✅ PASS |
| Production verification script — all 63 checks PASS | ✅ PASS |
| Master roadmap updated — Phase 5 marked PASS AND CLOSED | ✅ PASS |
| Annotated tag `v2.0.0` created | ✅ PASS |
| GitHub Release `v2.0.0` published | ✅ PASS |

## 3. Production verification (63/63 PASS)

`scripts/phase_5_verify.py` queries Production Supabase and confirms:

### 3.1 Tables (6/6)

| Table | Purpose |
|---|---|
| `orders` | order header + status + branch + customer link |
| `order_items` | line items per order |
| `order_status_logs` | append-only transition audit |
| `deliveries` | rider dispatch lane (ADR-007) |
| `delivery_state_transitions` | delivery audit (ADR-007) |
| `kitchen_tickets` | kitchen queue projection |

### 3.2 Columns on `orders` (10/10)

`auth_user_id`, `cancel_reason_code`, `cancel_note`, `status`,
`branch_id`, `order_type`, `order_source`, `order_number`,
`contact_phone`, `contact_phone_e164`, `customer_id`.

### 3.3 Columns on `deliveries` (6/6)

`status`, `rider_id`, `branch_id`, `order_id`, `picked_up_at`,
`delivered_at`.

### 3.4 `orders.status` CHECK constraint (7/7 frozen values)

```text
CHECK (status = ANY (ARRAY[
  'pending', 'confirmed', 'preparing', 'ready',
  'dispatched', 'completed', 'cancelled'
]))
```

### 3.5 `deliveries.status` CHECK constraint (6/6 ADR-007 values)

`pending`, `assigned`, `picked-up`, `delivered`, `failed`, `cancelled`.

### 3.6 Functions (9/9)

| Function | Purpose |
|---|---|
| `current_app_user_id()` | resolve Supabase Auth UID → app user id |
| `current_user_is_active()` | suspended-user blocking |
| `current_user_is_super_admin()` | super-admin gate |
| `current_user_branch_ids()` | branch scope set |
| `current_user_has_branch_access(uuid)` | branch access check |
| `enforce_delivery_transition_append_only()` | ADR-007 audit immutability |
| `validate_delivery_state_transition()` | ADR-007 transition validator |
| `emit_domain_event()` | ADR-012 cross-domain audit |
| `enforce_domain_events_append_only()` | ADR-012 audit immutability |

### 3.7 RLS (4/4 tables enabled, 8 policies)

`orders`, `order_items`, `order_status_logs`, `deliveries` — all RLS
enabled with branch-scoped SELECT for staff, customer-self-scoped
SELECT for own orders, and service-role write only.

### 3.8 Permissions (4/4)

`order.manage`, `order.read`, `delivery.assign`, `delivery.update`.

### 3.9 `order_status_logs` schema (9/9 columns)

`id`, `order_id`, `from_status`, `to_status`, `actor_type`,
`actor_user_id`, `reason_code`, `note`, `created_at`.

## 4. API surface (as-built)

### 4.1 Staff lifecycle — `modules/admin/orders.ts`

```text
GET  /api/v1/admin/orders?branchId=&status=&orderType=&orderSource=&orderNumber=
GET  /api/v1/admin/orders/:id
POST /api/v1/admin/orders/:id/confirm
POST /api/v1/admin/orders/:id/reject
POST /api/v1/admin/orders/:id/preparing
POST /api/v1/admin/orders/:id/ready
POST /api/v1/admin/orders/:id/dispatch
POST /api/v1/admin/orders/:id/complete
POST /api/v1/admin/orders/:id/cancel
```

All endpoints require Bearer → `AuthPrincipal` →
`requirePermission('order.manage')` + `requireBranchAccess`. Suspended
users denied. Idempotent repeats return `200` without appending a
new audit row.

### 4.2 Kitchen queue read — `modules/kitchen/routes.ts`

```text
GET  /api/v1/staff/kitchen/tickets?branchId=&status=
PATCH /api/v1/staff/kitchen/tickets/:id/status
```

Read-only projection of `kitchen_tickets`. Mutations still go through
the staff transition API on the parent order.

### 4.3 Rider / delivery — `modules/riders/routes.ts`

```text
GET  /api/v1/riders/assignments
GET  /api/v1/riders/roster
POST /api/v1/riders/deliveries/:id/assign      { riderId }
POST /api/v1/riders/deliveries/:id/transition  { status, notes? }
```

Rider transitions (`assigned`, `picked-up`, `delivered`) mirror to
`orders.status` (`ready` → `dispatched` → `completed`) in the same
service call. The rider never directly updates the order row.

### 4.4 Customer — `modules/orders/routes.ts` (already live since Phase 4)

```text
POST /api/v1/orders/quote
POST /api/v1/orders
GET  /api/v1/orders/:orderNumber?phone=
GET  /api/v1/orders/:orderNumber/tracking?phone=
POST /api/v1/orders/:orderNumber/cancel
```

## 5. Cancellation matrix (locked, as-built)

| Actor | Status | Window / rule |
|---|---|---|
| Guest / customer | `pending` only | 15 minutes from `created_at` |
| Guest / customer | `confirmed+` | No online cancel — WhatsApp / branch |
| Staff | `pending` / `confirmed` | Yes · reason required |
| Staff | `preparing` / `ready` | BM / SA only · reason required |
| Staff | `dispatched` / `completed` | No cancel — refund path later |
| Branch reject | any pre-kitchen | `cancelled` + `rejected_by_branch` |

Reason codes (V1): `customer_cancelled`, `rejected_by_branch`,
`staff_cancelled`, `duplicate`, `test`.

## 6. Out of scope (deferred)

- **Payment gateway** — Phase 11 (Finance & Reporting).
- **Auto-cancel on payment failure** — Intentionally deferred; the
  current model keeps payment-failed orders in `pending` until staff
  or customer explicitly cancels.
- **Partial-cancel of line items** — Phase 11 (refund / credit-note
  table).
- **POS / Kitchen / Rider UIs** — Phases 6–9 build on this API
  surface; no UI ships in Phase 5.
- **Notification templates** — Phase 15 (final production launch)
  locks WhatsApp / SMS senders.

## 7. Pending operator actions (no code blockers)

1. **Render env vars** — set `TELEPIZZA_WHATSAPP_MODE=mock`,
   `TELEPIZZA_WHATSAPP_WORKER=1` (carried forward from v1.9.0).
2. **OTP_HMAC_SECRET** — set on Render for Phase 3 OTP to function
   (carried forward from v1.10.0).
3. **Supabase Storage bucket `delivery-pod`** — for ADR-009 POD
   uploads (carried forward from v1.9.0).
4. **Chart of accounts** — configure `CASH` + `ACCOUNTS_RECEIVABLE`
   rows per branch for COD reconciliation (carried forward from
   v1.9.0).
5. **Dedicated OTP WhatsApp number** — provision a "Telepizza Login"
   number for OTP delivery; never use `0304-1110495` for OTP (D11).

## 8. Next phase

Per `TELEPIZZA-MASTER-ROADMAP.md`:

| Now | Next |
|---|---|
| Phase 5 **PASS AND CLOSED** | **Phase 6 — Admin & ERP Core** |
| Phase 3 eng paused | Ops continues Meta/Twilio in parallel |

Phase 6 builds the admin dashboard on top of the staff transition
APIs and branch-scoped RLS hardened in Phase 5.

---

**PHASE 5: PASS AND CLOSED**
**MASTER ROADMAP: PHASE 6 UNLOCKED**
