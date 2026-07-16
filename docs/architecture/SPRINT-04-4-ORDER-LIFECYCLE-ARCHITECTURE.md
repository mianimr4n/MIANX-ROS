# Sprint 4.4 — Order Lifecycle Architecture (Plan-Only)

**Status:** ▶ **READY FOR OWNER REVIEW** · plan-only · **no implementation in this slice**
**Date:** 2026-07-16
**Master sequence:** `TELEPIZZA-MASTER-ROADMAP.md` Phase 5
**Baseline:** Sprint 4.1–4.3 + Phase B **PASS AND CLOSED** on production
**Architecture inherit:** O1–O12 APPROVED / FROZEN
**Catalog freeze:** v1.2.0 unchanged
**Verified business contact (current):** 0304-1110495 — re-verify at Phase 15
**Authz SSOT:** `AuthPrincipal` + permissions · **RLS before POS/Kitchen/Rider UI (O10)**

```text
This document FREEZES lifecycle rules only.
No staff transition APIs, Kitchen UI, Rider UI, POS, Admin, OTP, or migrations ship in Sprint 4.4.
```

---

## 1. Purpose

Freeze the complete **order lifecycle** so Phase 5 implementation slices cannot drift:

- Branch confirm / reject
- Kitchen preparing / ready
- Rider assignment → dispatch → delivered
- Cancellation matrix (customer + staff)
- Audit / status history
- RLS and branch-scope dependencies
- Notification touchpoints (contract only)

After owner **APPROVED / FROZEN**, implementation proceeds in small closable slices (see §10).

---

## 2. What already exists (do not redo)

| Capability | Status |
|---|---|
| Order create + server pricing + quote | ✅ Sprint 4.1–4.2 |
| Website checkout + guest/auth create | ✅ Sprint 4.3 |
| Guest tracking + guest cancel (pending, 15 min) | ✅ Sprint 4.3 Phase B |
| `order_status_logs` table + create/cancel append | ✅ Schema + API |
| `cancel_reason_code` / `cancel_note` columns | ✅ Schema |
| `deliveries` row on delivery create | ✅ Create path |
| Status enum | ✅ `pending \| confirmed \| preparing \| ready \| dispatched \| completed \| cancelled` |

---

## 3. Canonical state machines (frozen)

### 3.1 `orders.status` (keep O1 — no enum rename)

```text
pending
  → confirmed          # branch accept
  → preparing          # kitchen start
  → ready              # kitchen done
  → dispatched         # delivery in transit (product: out_for_delivery)
  → completed          # delivered / picked up / dine-in done

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

**Deferred as order.status:** `draft`, `submitted`, `assigned`, `out_for_delivery`, `delivered`, `rejected` (use reason codes / `deliveries.status` instead).

### 3.2 Allowed order transitions

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

Illegal → `409 ORDER_INVALID_TRANSITION`.

### 3.3 `deliveries.status` (rider lane)

```text
pending → assigned → picked-up → delivered
                  ↘ failed
                  ↘ cancelled
```

| Delivery event | Mirror on `orders.status` |
|---|---|
| `assigned` | usually still `ready` (or already `dispatched` if branch policy dispatches on assign) |
| `picked-up` | `dispatched` |
| `delivered` | `completed` |
| `failed` | stay `dispatched` + staff intervention (no auto-complete) |
| `cancelled` | with order cancel path only |

**V1 default:** Rider mutates **delivery** row; order mirror transitions via same staff/rider service call (single transaction / ordered writes). Rider **never** updates another branch's order.

### 3.4 Cancellation matrix (O5 locked + staff)

| Actor | Status | Window / rule |
|---|---|---|
| Guest / customer | `pending` only | **15 minutes** from `created_at` (already live) |
| Guest / customer | `confirmed+` | **No** online cancel — WhatsApp / branch |
| Staff | `pending` / `confirmed` | Yes · reason required |
| Staff | `preparing` / `ready` | BM / SA only · reason required |
| Staff | `dispatched` / `completed` | No cancel — refund path later (payment table) |
| Branch reject | any pre-kitchen or early | `cancelled` + `cancel_reason_code = rejected_by_branch` |

Reason codes (V1 minimum):

| Code | Meaning |
|---|---|
| `customer_cancelled` | Guest/customer self-cancel |
| `rejected_by_branch` | Branch will not fulfill |
| `staff_cancelled` | Operational cancel |
| `duplicate` | Duplicate order cleanup |
| `test` | Smoke / QA only |

Every cancel / transition appends **`order_status_logs`** (`actor_type`, `actor_user_id`, `reason_code`, `note`).

---

## 4. API surface (design freeze — not implemented here)

### 4.1 Staff lifecycle (requires Slice 2D + O9)

```text
POST /api/v1/staff/orders/:id/transition
  { toStatus, reasonCode?, note? }

GET  /api/v1/staff/orders?branchId=&status=
GET  /api/v1/staff/orders/:id
```

Rules:

- Bearer required · `AuthPrincipal` only
- `requirePermission('order.manage' | 'order.read')`
- `requireBranchAccess` — no cross-branch
- Suspended users denied
- Never trust client `branchId` for authz beyond principal scope

### 4.2 Kitchen queue read (same gate)

```text
GET /api/v1/staff/kitchen/orders?branchId=&status=confirmed|preparing|ready
```

Read-only projection for Kitchen Display. Mutations still go through transition API.

### 4.3 Rider / delivery (after 4.5)

```text
POST /api/v1/staff/deliveries/:id/assign   { riderId }
POST /api/v1/staff/deliveries/:id/transition { toStatus, note? }
```

Permissions: `delivery.assign` / `delivery.update` · branch-scoped.

### 4.4 Customer (already partially live)

| Endpoint | Status |
|---|---|
| `POST /orders/quote` · `POST /orders` | ✅ Live |
| `GET /orders/:orderNumber?phone=` · `/tracking` | ✅ Live |
| `POST /orders/:orderNumber/cancel` | ✅ Live (O5) |
| `GET /orders` (auth own list) | 🔒 Future customer slice (My Orders drift) |

---

## 5. RLS and middleware (hard gate)

### 5.1 Current risk

- RLS **enabled** on `orders` / `order_items` / `payments` / `deliveries` with **no policies**
- API uses **service role** (bypasses RLS)
- Staff UIs **must not** unlock until Slice **2D** PASS (O9 / O10)

### 5.2 Slice 2D — required before POS / Kitchen / Rider UI

| Table | Intent |
|---|---|
| `orders` | Staff: SELECT/UPDATE within `branch_id` + permission · Customer: own phone/auth only · Guest: no table SELECT (API phone proof) |
| `order_items` | Same as parent order |
| `payments` | Staff branch-scoped · no public SELECT |
| `deliveries` | Staff/rider branch-scoped |
| `order_status_logs` | Append via service / SECURITY DEFINER · staff read branch-scoped |

**Middleware** remains first line for staff APIs; **RLS** is defense-in-depth before any browser UI with elevated privileges.

### 5.3 Explicit non-goals of Sprint 4.4

- No RLS SQL migration in this docs turn
- No staff API implementation
- No Kitchen/Rider/POS UI
- No payment gateway

---

## 6. Audit and history

| Requirement | Rule |
|---|---|
| Append-only | `order_status_logs` never updated/deleted by app code |
| Every create | log → `pending` (`actor_type=guest|customer|staff`) |
| Every transition | `from_status` → `to_status` + actor + reason |
| Every cancel | reason_code mandatory for staff; guest uses `customer_cancelled` |
| PII | No tokens, passwords, full payment PANs in notes |

---

## 7. Notifications (contract only)

| Event | Channel (V1) |
|---|---|
| Order placed | Optional local notification already; WhatsApp human confirm remains |
| Confirmed / preparing / ready | Future — SMS/WhatsApp template (not OTP number) |
| Dispatched / completed | Future |
| Cancelled | Future |

**Do not** send OTP or auth messages on **0304-1110495**. Marketing/ops templates are Phase 15 + ops approval.

---

## 8. Security rules (carry forward)

- Never trust client money, role, user id, or branch id for authorization
- Guest proof = phone digit match (existing)
- Staff proof = Bearer → `AuthPrincipal` + permission + branch
- No service-role keys in frontend
- Rate-limit staff transition endpoints (design: per user + order)

---

## 9. Dependency graph

```text
Sprint 4.4 Architecture APPROVED/FROZEN
        │
        ├─► Slice 2D RLS PASS  ─────────────┐
        │                                   │
        ├─► Staff transition APIs (4.5) ◄───┘
        │         │
        │         ├─► Kitchen queue read
        │         └─► Branch confirm/reject UI (later Admin/POS)
        │
        └─► Rider/delivery APIs (4.6) after 4.5
                  │
                  └─► Kitchen / Rider / POS UIs (Phases 7–9)
```

**Slice 2C OTP** remains parallel ops track — does **not** block lifecycle architecture or staff APIs after 2D.

---

## 10. Implementation slices (after architecture close)

| Slice | Scope | Gate |
|---|---|---|
| **4.4** | This architecture + owner freeze | Plan-only |
| **2D** | RLS policies + tests for orders/payments/deliveries/logs | Before staff UI |
| **4.5a** | `POST .../transition` + matrix enforcement + logs | After 2D |
| **4.5b** | Staff list/detail by branch + kitchen queue read | After 4.5a |
| **4.6** | Delivery assign + delivery transitions + order mirror | After 4.5 |
| **4.7** | Production migrate/deploy/smoke/close for lifecycle APIs | After 4.6 |

Optional parallel (does not unlock kitchen): authenticated **My Orders** list API (customer only).

---

## 11. Definition of Done for Sprint 4.4 (docs)

| Gate | Required |
|---|---|
| Master roadmap locked | ✅ `TELEPIZZA-MASTER-ROADMAP.md` |
| Transition matrix frozen | ✅ this doc §3 |
| Cancel matrix frozen | ✅ this doc §3.4 |
| RLS dependency explicit | ✅ this doc §5 |
| API contracts named | ✅ this doc §4 |
| Implementation slices sequenced | ✅ this doc §10 |
| No code / migration / deploy | ✅ |
| Owner marks APPROVED / FROZEN | ⬜ pending |

---

## 12. Explicitly out of scope (this turn)

- Any backend/website feature code
- Migrations
- Kitchen / Rider / POS / Admin UI
- Payment gateway
- Slice 2C OTP UI
- Final production number lock (Phase 15)
- Inventory / finance / AI product slices

---

## Final lines

**SPRINT 4.4 ORDER LIFECYCLE ARCHITECTURE: READY FOR OWNER REVIEW**
**IMPLEMENTATION: NOT STARTED**
**MASTER ROADMAP: LOCKED**
