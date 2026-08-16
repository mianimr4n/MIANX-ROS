# ADR-024: Dine-in Bill Settlement & Multi-tender Payments

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.2.0` (closes Phase 7 — POS System, ADR-024 of 4)

---

## Context

Telepizza's dine-in bill settlement surface has been live in Production
since the DB-R6 foundation (migration `20260718170000_db_r6_pos_bill_foundation.sql`,
committed July 2026) and the D3 corrective pass (migration
`20260725110000_d3_corrective_timezone_payments_deposits.sql`, which added
the `settle_bill_payment_atomic` RPC, bill splits, deposits, and per-branch
timezones).

The original DB-R6 plan (`docs/architecture/POS-BILLING-FOUNDATION.md`)
explicitly deferred `payment_splits` and multi-tender flows. The D3
corrective pass partially lifted those deferrals: it added
`bill_splits` + `bill_split_allocations` for deterministic party splits,
`reservation_deposits` for deposit application, and the
`settle_bill_payment_atomic` RPC that handles all four payment methods
(cash, card_terminal, bank_manual, complimentary) with full overpayment /
change / idempotency logic.

However, no ADR records the canonical dine-in bill settlement contract
that operators rely on today. This ADR formally accepts the as-built
DB-R6 + D3 + RC3 Finance architecture as the canonical Phase 7 decision
for dine-in bill settlement and multi-tender payments.

## Decision

### 1. `restaurant_bills` lifecycle (immutable after close)

```text
open → billed → paid
       ↘ voided
open → voided
```

| Status | Meaning | Mutability |
|---|---|---|
| `open` | New bill, orders can be attached | Mutable |
| `billed` | First payment applied, balance remains | Mutable (more payments allowed) |
| `paid` | Fully settled (paid_total ≥ grand_total) | **Immutable** |
| `voided` | Canceled (audited emergency) | **Immutable** |

The `enforce_restaurant_bill_immutability()` trigger (DB-R6) blocks
any UPDATE on rows in `paid` or `voided` status. The allowed
transitions are encoded in the same trigger: `open → billed|paid|voided`
and `billed → paid|voided`. Any other transition raises
`23514` (CHECK violation).

The `enforce_restaurant_bill_branch_match()` trigger (DB-R6) ensures
`restaurant_bills.branch_id = dine_in_sessions.branch_id` on every
INSERT and UPDATE — preventing cross-branch bill creation even if a
service bug sends mismatched IDs.

### 2. `bill_orders` — UNIQUE on `order_id`

An order belongs to AT MOST ONE bill. This is enforced by a UNIQUE
constraint on `bill_orders.order_id` (DB-R6 §2). The
`enforce_bill_orders_bill_open()` trigger (DB-R6 §5) blocks INSERT
into `bill_orders` when the parent bill is not in `open` or `billed`
status — preventing attachment of orders to a paid/voided bill.

### 3. Option B auto-link (dine-in order → confirmed → bill)

When a dine-in order transitions to `confirmed` and has a
`dine_in_session_id`, the order service automatically attaches it to
the session's open bill (creating the bill if none exists). This is
the "Option B" auto-link documented in `POS-BILLING-FOUNDATION.md` §5.

```text
dine-in order created (pending)
  → staff confirms (order.status = 'confirmed')
  → attachConfirmedDineInOrderToBill() runs in the same transaction
  → bill_orders row inserted (or bill created + row inserted)
  → kitchen_ticket created (DB-R5)
```

The auto-link is **idempotent** — if the order is already attached,
the service returns the existing bill. It **must not run** for
delivery or pickup orders (those use order-level `payments` only).

### 4. `settle_bill_payment_atomic` RPC — single-transaction settlement

The D3 corrective migration added this SECURITY DEFINER RPC as the
sole entry point for bill payment settlement. It runs in a single
transaction and performs:

1. **Idempotency replay check** — if `(branch_id, idempotency_key)`
   already exists in `payments`, return the existing payment row
   with `idempotentReplay: true`. No new row inserted.
2. **Bill lock** — `SELECT ... FOR UPDATE` on the bill row. Blocks
   concurrent settlement attempts on the same bill.
3. **Branch match** — `v_bill.branch_id <> p_branch_id` →
   `BILL_BRANCH_MISMATCH`.
4. **Bill settleable** — `v_bill.status in ('paid', 'voided')` →
   `BILL_NOT_SETTLEABLE`.
5. **Remaining balance** — `grand_total - sum(payments where status
   in ('completed', 'paid'))`.
6. **Method-specific validation**:
   - `complimentary`: amount MUST equal remaining (no overpay).
   - `cash`: tendered MUST be ≥ amount; change = tendered - amount.
     Applied amount cannot exceed remaining (overpay rejected).
   - `card_terminal` / `bank_manual`: amount MUST equal remaining
     (no overpay, no change).
7. **Payment INSERT** — into `payments` with all columns
   (`cash_tendered`, `cash_change`, `terminal_device_ref`,
   `idempotency_key`, `completed_at`, `audit_metadata`).
8. **Audit INSERT** — into `table_service_audit` with action
   `'payment_settled'` and after_data capturing billId, amount,
   method, remainingBefore, change.
9. **Bill status update** — if `paid_total ≥ grand_total`, set
   `status = 'paid'`, `closed_by_user_id`, `closed_at`. Otherwise,
   if status was `open`, set to `billed`.
10. **Session status update** — on full payment, set
    `dine_in_sessions.service_status = 'payment_pending'` (if
    currently in `bill_requested`, `dining`, `ordering`, `seated`).

The RPC returns a JSONB object with `id`, `status`, `amount`,
`cashChange`, `billStatus`, `remainingBalance`, `idempotentReplay`.

### 5. Payment methods — 4 allowed, no online gateway

| Method | Tendered / change | Overpay | Online gateway |
|---|---|---|---|
| `cash` | Required (tendered ≥ amount, change = tendered - amount) | Rejected (applied amount ≤ remaining) | N/A |
| `card_terminal` | Both null | Rejected (amount = remaining) | None — terminal is offline device |
| `bank_manual` | Both null | Rejected (amount = remaining) | None — bank transfer recorded manually |
| `complimentary` | Both null | Rejected (amount = remaining, exactly) | N/A — comp covers balance |

The `payment_method` CHECK constraint on `payments` enforces these
four values. Attempting to pass any other value to
`settle_bill_payment_atomic` raises `PAYMENT_METHOD_INVALID`.

There is **no online card gateway integration** (Stripe, Braintree,
etc.). Card payments are recorded as `card_terminal` with a
`terminal_device_ref` and `external_reference` — the actual capture
happens on a separate physical terminal, not through the API. This
is documented honestly in the `payments` table comment:
"Opening methods: cash, card_terminal, bank_manual, complimentary.
No online card gateway claimed."

### 6. Bill splits — 4 deterministic strategies

The `bill_splits` + `bill_split_allocations` tables (D3 §3) record
how a bill was split across a party. The `allocation_sum` MUST equal
`original_total` (enforced by `chk_bill_splits_reconcile` CHECK
constraint).

| Strategy | Allocation basis | Determinism |
|---|---|---|
| `equal` | Equal split across N parties | Cent-precise (last party absorbs remainder) |
| `by_item` | Each party pays for their items | Deterministic by `order_item_ids[]` |
| `by_quantity` | Split by item count | Deterministic by quantity mapping |
| `by_amount` | Custom amounts per party | Caller-supplied; sum MUST equal total |

The `splitEqual(total, parts)` helper in
`backend/api/src/services/payments/settlement.ts` implements the
equal strategy with deterministic cent rounding:
```typescript
const cents = Math.round(total * 100);
const base = Math.floor(cents / parts);
const remainder = cents - base * parts;
// First `remainder` parties get base+1 cents; rest get base cents.
// Sum always equals `cents`.
```

### 7. Deposits → bill application

Reservation deposits (`reservation_deposits` table) can be applied
to a bill at most once (enforced by UNIQUE partial index
`uq_reservation_deposits_applied_once` on `reservation_id` where
`applied_to_bill_id IS NOT NULL`). The deposit lifecycle is:

```text
pending → paid → applied_to_bill
              ↘ refunded
              ↘ forfeited
              ↘ waived
```

A deposit can be waived (no charge), forfeited (charge retained
without applying to bill), refunded (return to customer), or
applied to a bill (credit against the bill total). The applied
amount reduces the bill's remaining balance at settlement time.

### 8. RLS hard gate

| Table | Cashier | Branch-manager | Super-admin | Other staff | Customer/anon |
|---|---|---|---|---|---|
| `restaurant_bills` | SELECT/UPDATE own branch | SELECT/UPDATE own branch | Full | No access | No access |
| `bill_orders` | SELECT own branch | SELECT own branch | Full | No access | No access |
| `bill_splits` | SELECT own branch | SELECT own branch | Full | No access | No access |
| `bill_split_allocations` | SELECT own branch | SELECT own branch | Full | No access | No access |
| `reservation_deposits` | SELECT own branch | SELECT own branch | Full | No access | No access |
| `payments` | SELECT own branch | SELECT own branch | Full | No access | No access |

The `current_user_can_access_restaurant_bills(p_branch_id)` helper
(DB-R6 §7) is the single authz function — it returns true for
super-admin OR for users with a `cashier` or `branch-manager` role
assignment on the given branch. All mutations go through
`service_role` (server-side only); the authenticated role can only
SELECT/UPDATE.

### 9. API surface

```text
# Bills (modules/admin/bills.ts)
GET  /api/v1/admin/bills?sessionId=
POST /api/v1/admin/bills/:id/close  body: { status: 'paid' | 'voided' }

# Payments (modules/admin/payments.ts)
POST /api/v1/admin/payments/settle    body: { billId, amount, method, cashTendered?, ... }
POST /api/v1/admin/payments/split     body: { billId, strategy, partyCount, allocations? }
POST /api/v1/admin/payments/void      body: { paymentId, reason }
GET  /api/v1/admin/payments/balance/:billId
GET  /api/v1/admin/payments/session/:sessionId
POST /api/v1/admin/payments/deposits/record
GET  /api/v1/admin/payments/deposits
POST /api/v1/admin/payments/deposits/:id/waive
POST /api/v1/admin/payments/deposits/:id/forfeit
POST /api/v1/admin/payments/deposits/:id/refund
POST /api/v1/admin/payments/deposits/:id/apply

# Table sessions (modules/admin/table-sessions.ts)
GET  /api/v1/admin/table-sessions/floor-state
POST /api/v1/admin/table-sessions/walk-in
GET  /api/v1/admin/table-sessions
GET  /api/v1/admin/table-sessions/:id
POST /api/v1/admin/table-sessions/:id/transfer
POST /api/v1/admin/table-sessions/:id/server
POST /api/v1/admin/table-sessions/:id/request-bill
POST /api/v1/admin/table-sessions/:id/close
POST /api/v1/admin/table-sessions/:id/cancel
```

All endpoints require Bearer → `AuthPrincipal` →
`requirePermission('payment.settle' | 'payment.void' | 'deposit.manage' | 'dinein.manage')`
+ `requireBranchAccess`.

## Consequences

### Positive

- **Single-transaction settlement.** The `settle_bill_payment_atomic`
  RPC locks the bill, validates, inserts payment, inserts audit, and
  updates bill status in one transaction. No partial states on
  failure.
- **Idempotent by design.** The `(branch_id, idempotency_key)` UNIQUE
  index means a retried settlement returns the original payment row,
  not a duplicate.
- **Cash change computed server-side.** The cashier UI never computes
  change — the RPC does, based on `cash_tendered - amount`. This
  prevents client-side drift and ensures the audit trail matches the
  actual cash drawer.
- **Multi-tender supported.** A bill can have multiple payments
  (e.g., half cash + half card) — each call to `settle_bill_payment_atomic`
  records one payment and updates the bill's `paid_total`.
- **Bill splits are deterministic.** The `splitEqual` helper guarantees
  the sum of allocations equals the original total, with cent-precise
  rounding. No floating-point drift.
- **Deposits reduce bill balance.** A reservation deposit applied to
  a bill reduces the remaining balance, preventing double-charging.

### Negative

- **No online card gateway.** Card payments require a separate
  physical terminal. The API records the result but does not
  capture funds. This is acceptable for V1 (Pakistan market) but
  blocks scaling to online-card-heavy markets.
- **`paid` status is irreversible.** Once a bill is `paid`, it
  cannot be reopened. Refunds must go through a separate
  `refunded_at` flag on `payments` (not implemented in V1) or a
  reversal journal entry (ADR-011).
- **`bill_orders.order_id` UNIQUE prevents bill-to-bill transfer.**
  An order attached to bill A cannot be moved to bill B. This is
  intentional (prevents audit trail confusion) but means a
  mistakenly-attached order requires voiding bill A and recreating
  bill B.

## Alternatives Considered

- **Application-level settlement (no RPC).** Rejected: the
  `settle_bill_payment_atomic` RPC locks the bill row with
  `FOR UPDATE`, preventing concurrent settlements from racing.
  Application-level code cannot do this safely across multiple
  service instances.
- **`restaurant_bill_orders` table name (per architecture doc).**
  Rejected: owner override in DB-R6 chose `bill_orders` as the
  canonical name, with `restaurant_bill_orders` as a documented
  alias. The shorter name reduces verbosity in queries.
- **Include `refunded` in `restaurant_bills.status`.** Rejected:
  owner override in DB-R6 chose `open | billed | paid | voided`
  only. Refunds are a `payments`-level concern (the `refunded_at`
  column), not a bill-level status. A bill that was paid and then
  fully refunded stays in `paid` status with a refunded payment.
- **Allow `payment_splits` as a separate table.** Rejected: the
  `bill_splits` + `bill_split_allocations` tables (D3 §3) serve
  this purpose. They record how a bill was split across a party,
  not how a single payment was split across methods. Multi-tender
  is handled by multiple `payments` rows against the same bill.

## As-Built Verification (2026-08-16)

`scripts/phase_7_verify.py` confirms Production Supabase has:

- ✅ 2 tables: `restaurant_bills`, `bill_orders` (DB-R6)
- ✅ 4 tables: `bill_splits`, `bill_split_allocations`,
  `reservation_deposits`, `payments` (D3 + extensions)
- ✅ `restaurant_bills.status` CHECK: `open`, `billed`, `paid`, `voided`
- ✅ `bill_orders.order_id` UNIQUE constraint
- ✅ 4 triggers: `trg_restaurant_bills_branch_match`,
  `trg_restaurant_bills_immutability`, `trg_bill_orders_bill_open`,
  `set_restaurant_bills_updated_at`
- ✅ 3 RPCs: `settle_bill_payment_atomic`, `next_restaurant_bill_number`,
  `enforce_restaurant_bill_branch_match`
- ✅ RLS enabled on `restaurant_bills`, `bill_orders`, `bill_splits`,
  `bill_split_allocations`, `reservation_deposits`, `payments`
- ✅ `payments.payment_method` CHECK: `cash`, `card_terminal`,
  `bank_manual`, `complimentary`
- ✅ `payments.idempotency_key` UNIQUE per-branch partial index
- ✅ `bill_splits.strategy` CHECK: `equal`, `by_item`, `by_quantity`,
  `by_amount`
- ✅ `bill_splits` reconciliation CHECK: `allocation_sum = original_total`

**Result: see PHASE7_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/POS-BILLING-FOUNDATION.md`](../architecture/POS-BILLING-FOUNDATION.md) — DB-R6 plan-only source
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 7 entry
- [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](./ADR-019-rbac-authorization-principal.md) — cashier / branch-manager roles
- [`docs/13-adr/ADR-011-accounting-immutability.md`](./ADR-011-accounting-immutability.md) — journal entry reversals
- [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](./ADR-023-pos-cashier-workflow-order-source-contract.md) — POS place-order contract
- [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](./ADR-025-pos-shifts-zreport-cash-recon.md) — cash reconciliation lifecycle
- [`supabase/migrations/20260718170000_db_r6_pos_bill_foundation.sql`](../../supabase/migrations/20260718170000_db_r6_pos_bill_foundation.sql) — DB-R6
- [`supabase/migrations/20260725110000_d3_corrective_timezone_payments_deposits.sql`](../../supabase/migrations/20260725110000_d3_corrective_timezone_payments_deposits.sql) — D3 corrective
- [`backend/api/src/services/payments/settlement.ts`](../../backend/api/src/services/payments/settlement.ts) — settlement service
- [`backend/api/src/services/bills/restaurant-bills.ts`](../../backend/api/src/services/bills/restaurant-bills.ts) — bill service
