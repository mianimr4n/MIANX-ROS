# ADR-023: POS Cashier Workflow & Order Source Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.2.0` (closes Phase 7 — POS System, ADR-023 of 4)

---

## Context

Telepizza's POS (Point-of-Sale) cashier surface has been live in Production
since Sprint 4.5 / 4.6 and the D3 corrective pass (commits `b345b42`,
`f307051`, `88c6eeb`). The cashier UI (`apps/website/client/src/pages/admin/AdminPos.tsx`)
and 13 supporting components under `apps/website/client/src/components/admin/pos/`
are deployed. Backend endpoints under `backend/api/src/modules/admin/pos.ts`,
`bills.ts`, `payments.ts`, and `table-sessions.ts` are wired through the
`AuthPrincipal` permission pipeline (ADR-019).

However, the POS cashier workflow was never elevated to a formal ADR. The
closest existing artifact is `docs/architecture/POS-BILLING-FOUNDATION.md`,
a DB-R6 plan-only document that explicitly defers `pos_sessions`,
`payment_splits`, full cashier UI, and offline sync. The deferrals listed
there have been partially lifted by D3 (payment splits, multi-tender
settlement, deposits) and by RC3 Finance (cash reconciliation, expense
claims, journal posting) — but no ADR records the canonical Phase 7
cashier contract that operators actually rely on today.

This ADR formally accepts the as-built POS cashier workflow as the
canonical Phase 7 decision: order source matrix, payment contract at
place-order (cash only), permission model, branch operational gate,
and Idempotency-Key requirement. It deliberately scopes receipts,
shifts, and offline sync to companion ADRs (ADR-024, ADR-025, ADR-026).

## Decision

### 1. POS order source — `orders.order_source = 'pos'`

Every order created through the cashier UI is stamped with
`order_source = 'pos'` and a `branch_id` taken from the cashier's
`AuthPrincipal.branchIds` (never from the request body). This
distinguishes POS orders from website (`'website'`) and WhatsApp
(`'whatsapp'`) orders for reporting, KPI drilldowns, and audit.

| Order source | Stamp | Creator | Branch source |
|---|---|---|---|
| `pos` | Cashier UI | Authenticated staff | `AuthPrincipal.branchIds` |
| `website` | Public website | Guest or auth customer | Customer-selected branch |
| `whatsapp'` | WhatsApp order builder | Staff on behalf of customer | Conversation branch |

The `orders.order_source` column was added in Sprint 4.1 and is
constrained by `orders_order_source_check` to `'website'`, `'pos'`,
`'whatsapp'`. Adding a new source requires a migration + ADR amendment.

### 2. Order type matrix (delivery / pickup / dine-in)

The POS place-order endpoint (`POST /api/v1/admin/pos/orders`) accepts
`orderType: 'delivery' | 'pickup' | 'dine-in'`. Each type drives a
distinct server-side flow:

| Order type | `dining_session_id` | Auto-link to bill | Kitchen ticket | Payment at place-order |
|---|---|---|---|---|
| `delivery` | null | No | Yes (on confirm) | Cash → `pending` (COD); non-cash → 409 |
| `pickup` | null | No | Yes (on confirm) | Cash → `completed`; non-cash → 409 |
| `dine-in` | Required (UUID) | Yes (Option B — ADR-024) | Yes (on confirm) | Cash → `pending` (settled at bill close) |

The cashier UI (`OrderTypeSelector.tsx`) renders these three options.
Delivery requires `deliveryAddress`; dine-in requires `diningSessionId`
(resolved from the active session QR / table). Pickup and delivery do
NOT create a `restaurant_bill` row — they use order-level `payments`
only, as documented in `POS-BILLING-FOUNDATION.md` §8.

### 3. Cashier permission contract

The cashier role (`roles.code = 'cashier'`) is seeded with the
following permissions (locked in D3 corrective migration
`20260725110000_d3_corrective_timezone_payments_deposits.sql`):

| Permission | Granted to | Purpose |
|---|---|---|
| `order.create` | cashier, branch-manager, admin, super-admin | Place POS orders |
| `order.manage` | branch-manager, admin, super-admin (NOT cashier) | Confirm / reject / transition |
| `payment.settle` | cashier, waiter, branch-manager, admin, super-admin | Settle bill payments |
| `payment.void` | branch-manager, admin, super-admin (NOT cashier) | Void / refund payments |
| `payment.override_close` | branch-manager, admin, super-admin | Emergency close with unpaid bill |
| `deposit.manage` | host, branch-manager, admin, super-admin | Collect / waive / forfeit deposits |
| `dinein.manage` | branch-manager, admin, super-admin | Floor / table / session ops |

The cashier can PLACE orders and SETTLE bills but CANNOT:
- Confirm / reject / transition orders (that's `order.manage`)
- Void payments (that's `payment.void`)
- Override-close a session with an unpaid bill (that's `payment.override_close`)
- Manage deposits (that's `deposit.manage`, granted to host instead)

This intentional separation prevents a cashier from completing the
full order lifecycle alone — branch-manager or higher approval is
required for transitions, voids, and overrides. The `customer` role
has zero permissions by default (ADR-019 §3) and can never call any
POS endpoint.

### 4. Branch operational gate

Before a POS order is created, the service calls
`assertBranchOperational(branchId)` which verifies:
1. The branch exists and is `active`.
2. The branch is not in `soft_closed` or `hard_closed` state.
3. The cashier's `AuthPrincipal.branchIds` includes the branch.

If any check fails, the API returns `409 BRANCH_NOT_OPERATIONAL` with
the offending reason. This gate prevents cashiers from placing orders
against a closed branch (e.g., post-Z-Report) and from placing orders
against a branch they are not assigned to.

### 5. Payment contract at place-order — cash only

The POS place-order endpoint accepts `paymentMethod: 'cash'` only.
This is enforced by `z.literal("cash").optional().default("cash")`
in the request schema (`backend/api/src/modules/admin/pos.ts`).
Attempting to pass `'card_terminal'`, `'bank_manual'`, or
`'complimentary'` returns `400 INVALID_PAYMENT_METHOD`.

The cash payment is recorded differently per order type:

| Order type | Payment status at place-order | Settled at |
|---|---|---|
| `pickup` | `completed` (paid in cash at counter) | Place-order (immediate) |
| `delivery` | `pending` (COD — cash on delivery) | Rider POD (ADR-009) |
| `dine-in` | `pending` (will be settled at bill close) | Bill settlement (ADR-024) |

Card / bank / complimentary settlements are only available through
the bill settlement RPC (`settle_bill_payment_atomic`), which is
called from the bill close flow — not from the POS place-order flow.

### 6. Idempotency-Key requirement

Every POST to `/api/v1/admin/pos/orders` MUST include an
`Idempotency-Key` header. The service generates a UUID v4 idempotency
key per cart submission (in the cashier UI, `AdminPos.tsx` calls
`crypto.randomUUID()` before the request). The backend stores this
key on the resulting `orders.idempotency_key` column (UNIQUE per
branch) and replays the same response on retry.

Without this header, the API returns `400 IDEMPOTENCY_KEY_REQUIRED`.
This prevents duplicate orders when a cashier double-clicks "Place
Order" or when the network flickers between request and response.

### 7. API surface

```text
# Cashier place-order (modules/admin/pos.ts)
POST /api/v1/admin/pos/orders
  Headers: Authorization, Idempotency-Key
  Body: { branchCode, orderType, contactName, contactPhone,
          deliveryAddress?, notes?, couponCode?, quoteId?,
          paymentMethod: 'cash', diningSessionId?, items[] }
  → 201 { orderId, orderNumber, status, paymentStatus }
  → 409 BRANCH_NOT_OPERATIONAL | DUPLICATE_IDEMPOTENCY_KEY

# Z-Report (modules/admin/pos.ts)
GET  /api/v1/admin/pos/z-report?branchId=
POST /api/v1/admin/pos/z-report/close

# Bills (modules/admin/bills.ts) — ADR-024
GET  /api/v1/admin/bills?sessionId=
POST /api/v1/admin/bills/:id/close

# Payments (modules/admin/payments.ts) — ADR-024
POST /api/v1/admin/payments/settle
POST /api/v1/admin/payments/split
POST /api/v1/admin/payments/void
GET  /api/v1/admin/payments/balance/:billId

# Table sessions (modules/admin/table-sessions.ts) — ADR-024
GET  /api/v1/admin/table-sessions/floor-state
POST /api/v1/admin/table-sessions/walk-in
POST /api/v1/admin/table-sessions/:id/transfer
POST /api/v1/admin/table-sessions/:id/request-bill
POST /api/v1/admin/table-sessions/:id/close
```

All cashier endpoints require Bearer → `AuthPrincipal` →
`requirePermission('order.create' | 'payment.settle' | ...)` +
`requireBranchAccess`. Suspended users are denied. Client-supplied
`branchId` is never trusted for authz beyond principal scope.

### 8. Non-goals (this ADR)

The following are explicitly OUT OF SCOPE for ADR-023 and are
covered by companion ADRs or deferred:

| Concern | ADR / status |
|---|---|
| Dine-in bill settlement + multi-tender | ADR-024 |
| POS shifts + Z-Report + cash reconciliation | ADR-025 |
| Branch sync + offline-safe | ADR-026 |
| Receipt format + tax invoice + fiscal printer | Deferred — no formal ADR (UI preview only) |
| Online card gateway (Stripe / Braintree) | Deferred — no provider integrated |
| `pos_sessions` table (opening float, register assignment) | Deferred — POS-BILLING-FOUNDATION §2 |
| Loyalty redemption at POS | ADR-021 (loyalty engine) — separate RPC, not POS-specific |

## Consequences

### Positive

- **Single source of truth for POS orders.** `order_source = 'pos'`
  cleanly separates cashier-placed orders from website/WhatsApp,
  enabling accurate KPI breakdowns in ADR-022 reports.
- **Cashier cannot self-approve lifecycle transitions.** The
  permission split (cashier has `order.create` + `payment.settle`
  but NOT `order.manage` or `payment.void`) enforces dual-control
  on order transitions and payment voids.
- **No duplicate orders on retry.** The Idempotency-Key header
  prevents double-charging when a cashier double-clicks or the
  network flickers.
- **Closed branch = no new orders.** The `assertBranchOperational`
  gate prevents post-Z-Report order placement, which would corrupt
  the cash drawer expectation.
- **Cash-only at place-order is intentional.** Card / bank /
  complimentary require bill-level settlement, which has its own
  audit trail (ADR-024). This keeps the place-order path simple
  and pushes complex payment logic to the bill close flow.

### Negative

- **No online card payment at POS place-order.** Cash-only at
  place-order means card-paying customers must wait for bill
  settlement. This is acceptable for V1 (Pakistan market is
  cash-dominant) but will need an online gateway integration
  before scaling to card-heavy markets.
- **Cashier depends on branch-manager for transitions.** A
  cashier cannot confirm an order alone — they must ask a
  branch-manager. This is intentional (dual control) but adds
  friction in low-staffed branches.
- **`pos_sessions` table still deferred.** Without `pos_sessions`,
  there is no formal "shift open" lifecycle — only the shift-close
  audit (`pos_z_report_events`). Opening float is captured at
  cash reconciliation time, not at shift open. This is documented
  in ADR-025 §5 (Deferred).

## Alternatives Considered

- **Allow all payment methods at POS place-order.** Rejected: the
  `settle_bill_payment_atomic` RPC enforces bill-level invariants
  (remaining balance, overpayment rules, cash change computation).
  Duplicating that logic at place-order would split the audit
  trail and risk drift. Cash-only at place-order pushes non-cash
  flows through the bill settle RPC, which has the correct
  invariants.
- **Single `cashier` permission covering place + settle + void.**
  Rejected: dual control on voids and overrides is a financial
  control best practice. A single cashier permission would let
  one person both create and void a payment, defeating segregation
  of duties.
- **Trust client-supplied `branchId` for cashiers.** Rejected:
  `AuthPrincipal.branchIds` is the authz source of truth. A buggy
  UI that sends the wrong `branchId` would otherwise let a cashier
  place orders against a branch they're not assigned to.
- **Use `orders.order_source = 'cashier'` instead of `'pos'`.**
  Rejected: `'pos'` matches the product language ("POS system",
  "POS terminal") and is what operators see in reports. `'cashier'`
  is a role, not a source — mixing them would conflate two concepts.

## As-Built Verification (2026-08-16)

`scripts/phase_7_verify.py` confirms Production Supabase has:

- ✅ `orders.order_source` column exists with CHECK constraint
  including `'pos'`, `'website'`, `'whatsapp'`
- ✅ `orders.idempotency_key` column exists with UNIQUE per-branch
  index
- ✅ `orders.order_type` column exists with CHECK constraint
  including `'delivery'`, `'pickup'`, `'dine-in'`
- ✅ 4 POS permissions seeded: `order.create`, `payment.settle`,
  `payment.void`, `payment.override_close`
- ✅ Cashier role has `order.create` + `payment.settle` but NOT
  `order.manage` or `payment.void`
- ✅ `settle_bill_payment_atomic` RPC exists and accepts the 4
  allowed methods (`cash`, `card_terminal`, `bank_manual`,
  `complimentary`)
- ✅ `assertBranchOperational` is wired (verified via the
  `/api/v1/admin/pos/orders` endpoint contract test)

**Result: see PHASE7_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/POS-BILLING-FOUNDATION.md`](../architecture/POS-BILLING-FOUNDATION.md) — DB-R6 plan-only foundation
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 7 entry
- [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](./ADR-019-rbac-authorization-principal.md) — cashier role + permission model
- [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](./ADR-018-order-lifecycle-state-machine.md) — order status transitions
- [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](./ADR-024-dine-in-bill-settlement.md) — bill settlement RPC
- [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](./ADR-025-pos-shifts-zreport-cash-recon.md) — shifts + Z-Report + cash recon
- [`backend/api/src/modules/admin/pos.ts`](../../backend/api/src/modules/admin/pos.ts) — cashier endpoints
- [`backend/api/src/services/orders/management.ts`](../../backend/api/src/services/orders/management.ts) — order creation service
- [`apps/website/client/src/pages/admin/AdminPos.tsx`](../../apps/website/client/src/pages/admin/AdminPos.tsx) — cashier UI
