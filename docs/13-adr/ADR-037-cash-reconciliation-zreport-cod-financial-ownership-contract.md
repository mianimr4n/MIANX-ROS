# ADR-037: Cash Reconciliation, Z-Report & COD Financial Ownership Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.6.0` (closes Phase 11 — Finance and Reporting, ADR-037 of 3)

---

## Context

Telepizza's cash management + reconciliation surface was shipped across
five waves between July and August 2026:

1. **POS Z-Report Events** (`20260730210000_pos_z_report_events.sql`,
   31 lines) — creates the `pos_z_report_events` append-only audit table
   for end-of-day cash drawer closes.
2. **Cash Reconciliations** (`20260731020000_cash_reconciliations.sql`,
   151 lines) — creates `cash_reconciliations` (6-state machine with
   server-computed expected_cash + variance) +
   `cash_reconciliation_events` audit + the
   `compute_cash_reconciliation_totals` IMMUTABLE RPC.
3. **D3 Payments + Deposits** (`20260725110000_d3_corrective_timezone_payments_deposits.sql`,
   770 lines) — extends `payments` to 8-state status + 4 methods +
   `cash_tendered`/`cash_change` + `idempotency_key` UNIQUE; creates
   `bill_splits` (4 strategies) + `bill_split_allocations` +
   `reservation_deposits` (7-state); adds the
   `settle_bill_payment_atomic` + `close_dining_session_atomic` RPCs;
   seeds `payment.settle`, `payment.void`, `deposit.manage` permissions.
4. **Branch Payment Methods** (`20260729010000_opening_m2_payments_notifications_devices.sql`,
   366 lines) — creates `branch_payment_methods` (per-branch enabled
   methods + verification) + `branch_payment_method_events` audit.
5. **COD Collections** (`20260817000000_adr_008_009_010_delivery_rider.sql`,
   673 lines, ADR-010) — creates `cod_collections` (4-state
   reconciliation_status: pending/reconciled/shortage/overage) + the
   `post_cod_collection_journal` SECURITY DEFINER trigger (fires on
   reconcile→reconciled; idempotent via `finance_postings` UNIQUE).
6. **Finance Cash Accounts** (`20260731190000_rc4_finance_phase2_foundation.sql`,
   622 lines, ADR-036 §11) — creates `finance_cash_accounts` (cash/bank
   GL accounts) + `finance_cash_register_entries` (deposit/withdrawal/
   transfer with reconciliation_status).

The backend service layer
(`backend/api/src/services/pos/z-report.ts`, 175 lines +
`backend/api/src/services/payments/settlement.ts`, 357 lines +
`backend/api/src/services/deliveries/cod-service.ts`, 457 lines +
`backend/api/src/services/finance/operations.ts`, 1578 lines for cash
reconciliation) exposes the full cash management surface. Admin
routers: `modules/admin/pos.ts` (219 lines, 3 routes — Z-report
read/close) + `modules/admin/payments.ts` (337 lines, 9 routes —
settle/split/void/deposit) + `modules/admin/delivery-rider.ts` (470
lines, 5 COD routes). Frontend: `AdminFinance.tsx` `CashPanel` +
`ZReportModal` (88 lines) in `components/admin/pos/`.

However, the cash reconciliation + Z-report + COD collection model
was never elevated to a formal ADR. The deferral of `pos_sessions`
table, online card gateway, multi-timezone, bank deposit slip
generation, and `payment_splits` table is documented piecemeal across
ADR-023 §8, ADR-024 §6, ADR-025 §5, ADR-026 §5, and ADR-010 §"Future
work". This ADR consolidates those deferrals into a single accepted
decision with explicit trigger conditions.

This ADR formally accepts the as-built cash reconciliation + Z-Report
+ COD financial ownership model as the canonical Phase 11 contract.

---

## Decision

### 1. POS Z-Report Events (`pos_z_report_events`)

`pos_z_report_events` (migration `20260730210000` lines 10-30) is the
append-only audit trail for end-of-day (EOD) cash drawer closes. One
row per close event per branch per business date.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `business_date` | date NOT NULL | Business date (Asia/Karachi) |
| `total_orders` | integer NOT NULL DEFAULT 0 | Total orders in business day |
| `total_cash_sales` | numeric(14,2) NOT NULL DEFAULT 0 | Total cash sales (sum of cash payments) |
| `expected_cash` | numeric(14,2) NOT NULL DEFAULT 0 | Expected cash in drawer (opening + cash sales − cash refunds − cash payouts) |
| `actual_cash` | numeric(14,2) NULLABLE | Counted cash (filled at close time) |
| `variance` | numeric(14,2) NOT NULL DEFAULT 0 | `actual_cash` − `expected_cash` (positive = overage, negative = shortage) |
| `payload` | jsonb NOT NULL DEFAULT `'{}'` | Full snapshot (cash breakdown by payment method + non-cash totals + timezone + closing user) |
| `timezone` | text NOT NULL DEFAULT `'Asia/Karachi'` | Timezone invariant |
| `closed_by` | uuid FK → `users(id)` | Closing user |
| `created_at` | timestamptz NOT NULL DEFAULT `now()` | Close timestamp |

UNIQUE on `(branch_id, business_date, closed_by)` — one Z-report per
cashier per business date per branch. (Multiple cashiers on the same
shift each produce their own Z-report.)

**Why append-only?** Same rationale as `delivery_state_transitions`
(ADR-007), `pos_z_report_events` (ADR-025), and `supplier_portal_events`
(ADR-035 §8): the audit trail is immutable. Corrections require a new
Z-report event with `payload.correction_for` pointing to the original
event ID — never an UPDATE of the original.

**Asia/Karachi invariant.** The `business_date` is the Asia/Karachi
calendar date of the close. The Supabase DB stores timestamps in UTC;
the service layer
(`backend/api/src/services/pos/z-report.ts`, 175 lines) converts at
query time using `AT TIME ZONE 'Asia/Karachi'`. Multi-timezone is
DEFERRED (§8).

**Why no `pos_sessions` table?** A `pos_sessions` table (tracking
cashier login/logout + drawer open/close + float assignment) was
considered in ADR-025 §2 and explicitly deferred. Today, the
"session" is implicit: the cashier's first Z-report close of the
business day opens the session, and the close ends it. This is
sufficient for single-shift single-drawer branches. Multi-drawer
support requires `pos_sessions` (DEFERRED, §8).

### 2. Cash Reconciliations (`cash_reconciliations`)

`cash_reconciliations` (migration `20260731020000` lines 10-60) is the
formal cash reconciliation workflow. A BM creates a draft
reconciliation, fills in counted cash, submits for review, an SA
approves or rejects, and on approval the reconciliation is posted to
GL.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `reconciliation_date` | date NOT NULL | Reconciliation date (Asia/Karachi) |
| `register_id` | varchar(40) NOT NULL DEFAULT `'main'` | Register identifier (single-drawer today; multi-drawer DEFERRED) |
| `opening_cash` | numeric(14,2) NOT NULL DEFAULT 0 | Opening cash (carry-over from prior close) |
| `expected_cash` | numeric(14,2) NOT NULL DEFAULT 0 | Server-computed expected cash |
| `counted_cash` | numeric(14,2) NULLABLE | BM-counted cash |
| `variance` | numeric(14,2) NOT NULL DEFAULT 0 | Server-computed `counted_cash` − `expected_cash` |
| `cash_sales` | numeric(14,2) NOT NULL DEFAULT 0 | Total cash sales in period |
| `cash_refunds` | numeric(14,2) NOT NULL DEFAULT 0 | Total cash refunds in period |
| `cash_payouts` | numeric(14,2) NOT NULL DEFAULT 0 | Total cash payouts (expenses paid in cash) |
| `cash_deposits` | numeric(14,2) NOT NULL DEFAULT 0 | Total cash deposits to bank |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `submitted`, `approved`, `rejected`, `voided`, `posted`} | 6-state machine |
| `posting_status` | text NOT NULL DEFAULT `'pending'` CHECK ∈ {`pending`, `posted`, `failed`, `skipped`, `reversed`} | GL posting status |
| `journal_entry_id` | uuid FK → `journal_entries(id)` NULLABLE | Posted journal entry (variance GL post) |
| `z_report_event_id` | uuid FK → `pos_z_report_events(id)` NULLABLE | Linked Z-report event |
| `idempotency_key` | varchar(80) NULLABLE UNIQUE | Client-supplied idempotency key |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `approved_by` | uuid FK → `users(id)` NULLABLE | Approver |
| `approved_at` | timestamptz NULLABLE | Approval timestamp |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE partial index on `(branch_id, reconciliation_date, register_id)
WHERE status != 'voided'` — one active reconciliation per branch per
date per register.

**6-state machine:**

```text
draft → submitted    (BM submits for review)
submitted → approved (SA approves; triggers GL post if variance ≠ 0)
submitted → rejected (SA rejects with notes)
approved → posted    (GL post complete; terminal)
rejected → draft     (BM edits + re-submits)
draft → voided       (BM discards)
```

`posted` is terminal. To correct a posted reconciliation, void it and
create a new one — the void creates a reversal journal entry via
`reverse_journal_entry_atomic` (ADR-036 §6).

### 3. Cash Reconciliation Totals RPC (`compute_cash_reconciliation_totals`)

The `compute_cash_reconciliation_totals` IMMUTABLE RPC (migration
`20260731020000` lines 100-140) is the **single source of truth** for
expected cash + variance. It computes:

```text
expected_cash = opening_cash
               + SUM(payments WHERE method='cash' AND status='completed' AND date matches)
               − SUM(payments WHERE method='cash' AND status='refunded' AND date matches)
               − SUM(expense_claims WHERE payment_method='cash' AND status='paid' AND date matches)
               − SUM(finance_cash_register_entries WHERE entry_type='withdrawal' AND date matches)

variance = counted_cash − expected_cash
```

**Why IMMUTABLE?** The function is pure — given the same inputs
(opening_cash + branch_id + date range), it always returns the same
output. This lets Postgres cache the result and lets us use it in
indexes if needed. It also makes the function safe to call from
triggers (no side effects).

**Why server-computed (not client)?** The client cannot be trusted to
compute expected cash — a bug or tampering could hide a variance. The
server pulls from authoritative `payments` + `expense_claims` +
`finance_cash_register_entries` tables and computes the variance. The
client only fills in `counted_cash`. This matches the ADR-022 §1
"query-time computation from authoritative sources" pattern.

### 4. Cash Reconciliation Events (`cash_reconciliation_events`)

`cash_reconciliation_events` (lines 80-95) is the append-only audit
trail for every reconciliation transition. Same pattern as
`delivery_state_transitions` (ADR-007), `pos_z_report_events` (§1),
and `supplier_portal_events` (ADR-035 §8). Each row records
`(reconciliation_id, from_status, to_status, actor_user_id,
actor_role, reason, payload, created_at)`.

### 5. Cash Reconciliation GL Posting

When a reconciliation transitions `submitted → approved` with
`variance ≠ 0`, the service layer
(`backend/api/src/services/finance/operations.ts`,
`transitionCashReconciliation` method) calls a controlled GL post
(ADR-036 §10 pattern):

- **Variance > 0 (overage):** DR `cash_on_hand` / CR `cash_variance`
- **Variance < 0 (shortage):** DR `cash_variance` / CR `cash_on_hand`

The post is idempotent via `finance_postings` UNIQUE on
`('cash_recon', reconciliation_id)`. If the `cash_variance` mapping is
missing, a `finance_exception` is recorded and the reconciliation
proceeds to `posted` without GL (the BM sees the exception in the
finance work queue).

### 6. COD Collections (`cod_collections`)

`cod_collections` (migration `20260817000000` lines 100-180, ADR-010)
records every Cash-on-Delivery collection by a rider. Each delivery
with `payment_method='cod'` produces one COD collection row when the
rider marks the delivery as `delivered` (ADR-031 §4).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `delivery_id` | uuid FK → `deliveries(id)` ON DELETE RESTRICT | Source delivery |
| `order_id` | uuid FK → `orders(id)` | Source order (denormalized) |
| `rider_id` | uuid FK → `users(id)` | Collecting rider |
| `collected_amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Amount collected from customer |
| `expected_amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Expected amount (order total) |
| `collected_at` | timestamptz NOT NULL DEFAULT `now()` | Collection timestamp |
| `reconciliation_status` | text NOT NULL DEFAULT `'pending'` CHECK ∈ {`pending`, `reconciled`, `shortage`, `overage`} | 4-state reconciliation |
| `reconciled_at` | timestamptz NULLABLE | Reconciliation timestamp |
| `reconciled_by` | uuid FK → `users(id)` NULLABLE | Reconciler |
| `variance_amount` | numeric(14,2) NOT NULL DEFAULT 0 | `collected_amount` − `expected_amount` |
| `variance_reason` | text NULLABLE | Reason for shortage/overage |
| `journal_entry_id` | uuid FK → `journal_entries(id)` NULLABLE | Posted journal entry |
| `notes` | text | Free-text notes |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `delivery_id` — one collection per delivery. RLS enabled
with `current_user_has_branch_access(branch_id)` for SELECT.

**4-state reconciliation:**

```text
pending → reconciled   (collected_amount = expected_amount; auto-posts to GL)
pending → shortage     (collected_amount < expected_amount; rider owes the difference)
pending → overage      (collected_amount > expected_amount; branch owes the customer)
shortage → reconciled  (rider pays the shortage; BM resolves)
overage → reconciled   (branch refunds the customer; BM resolves)
```

### 7. COD Auto-GL Posting Trigger (`post_cod_collection_journal`)

The `post_cod_collection_journal` SECURITY DEFINER trigger function
(migration `20260817000000` lines 200-280, ADR-010) fires AFTER UPDATE
on `cod_collections` when `reconciliation_status` transitions to
`'reconciled'`. In one transaction:

1. Looks up `finance_account_mappings` for `ar_control` + `cash_on_hand`
   for the branch.
2. Checks `finance_postings` for an existing
   `('cod', cod_collection_id)` row — if present, returns (idempotent).
3. Calls `create_journal_entry_atomic` with:
   - DR `cash_on_hand` for `collected_amount`
   - CR `ar_control` for `expected_amount`
   - If shortage: DR `cash_variance` for the shortage amount
   - If overage: CR `cash_variance` for the overage amount
4. Inserts `finance_postings ('cod', cod_collection_id, journal_entry_id)`.
5. Updates `cod_collections.journal_entry_id`.

If any mapping is missing, the trigger records a `finance_exception`
and skips posting — the COD reconciliation is not blocked. If
`create_journal_entry_atomic` raises (e.g., period closed), the
trigger records a `finance_exception` with the error message and
returns without blocking the transition.

**Why a trigger (not a service-layer call)?** COD reconciliation can
happen via multiple paths: (a) BM reconciles via admin API, (b)
auto-reconcile job (future), (c) direct DB update by an auditor. The
trigger guarantees GL posting regardless of the path. This is the
same rationale as the `delivery_state_transitions` trigger (ADR-007)
and the ADR-011 immutability triggers.

### 8. Payments Table (8-state, 4 methods)

`payments` (migration `20260713190000` foundation + extended by
`20260725110000` D3 corrective) is the canonical payment record. Each
row is one tender against one bill (or one order, for non-dine-in).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope (added by D3) |
| `order_id` | uuid FK → `orders(id)` NULLABLE | Source order |
| `dining_session_id` | uuid FK → `dining_sessions(id)` NULLABLE | Source dining session |
| `restaurant_bill_id` | uuid FK → `restaurant_bills(id)` NULLABLE | Source bill |
| `payment_method` | text NOT NULL CHECK ∈ {`cash`, `card_terminal`, `bank_manual`, `complimentary`} | 4 methods |
| `amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Payment amount |
| `currency` | varchar(3) NOT NULL DEFAULT `'PKR'` | Currency (PKR only) |
| `status` | text NOT NULL DEFAULT `'pending'` CHECK ∈ {`pending`, `completed`, `failed`, `refunded`, `partially_refunded`, `voided`, `disputed`, `in_progress`} | 8-state |
| `cash_tendered` | numeric(14,2) NULLABLE | Cash tendered (for change calculation) |
| `cash_change` | numeric(14,2) NULLABLE | Change given back |
| `received_by` | uuid FK → `users(id)` | Receiving user |
| `terminal_device_ref` | varchar(120) NULLABLE | Card terminal device reference |
| `idempotency_key` | varchar(80) NULLABLE UNIQUE | Client-supplied idempotency |
| `completed_at` | timestamptz NULLABLE | Completion timestamp |
| `failed_at` | timestamptz NULLABLE | Failure timestamp |
| `refunded_at` | timestamptz NULLABLE | Refund timestamp |
| `voided_at` | timestamptz NULLABLE | Void timestamp |
| `failure_reason` | text NULLABLE | Failure reason |
| `audit_metadata` | jsonb NULLABLE | Structured audit detail |
| `created_at` / `updated_at` | timestamptz | Timestamps |

CHECK constraint: `chk_payments_order_or_bill` — at least one of
`order_id` / `restaurant_bill_id` must be non-null.

**8-state machine:**

```text
pending → in_progress    (card terminal authorization started)
in_progress → completed  (card terminal authorized; terminal for cash)
pending → completed      (cash — settles immediately)
pending → failed         (card terminal declined)
in_progress → failed     (card terminal declined after auth)
completed → refunded     (full refund — sets refunded_at)
completed → partially_refunded (partial refund — DEFERRED, see §8)
completed → voided       (void before settlement — sets voided_at)
completed → disputed     (chargeback raised — DEFERRED)
```

**4 payment methods:**

| Method | Use | Settlement |
|---|---|---|
| `cash` | POS cash payments | Immediate — DR `cash_on_hand` |
| `card_terminal` | External card terminal (no online gateway) | Immediate (terminal-settled) — DR `cash_in_bank` (or `cash_on_hand` if terminal settles to drawer) |
| `bank_manual` | Manual bank transfer (customer sends proof of payment) | Immediate on confirmation — DR `cash_in_bank` |
| `complimentary` | Free meal (staff / promotional) | No GL post (revenue recognized at zero) |

Online card gateway (Stripe / Braintree / 2C2P) is DEFERRED (§8).

### 9. Bill Settlement Atomic RPC (`settle_bill_payment_atomic`)

The `settle_bill_payment_atomic` SECURITY DEFINER RPC (migration
`20260725110000` lines 200-300) settles a dine-in bill with one or
more tenders in one transaction:

1. Validates the bill is in `open` status (not already settled).
2. Validates the sum of tender amounts equals the bill total (or
   leaves a known remainder for complimentary / void).
3. INSERTs one `payments` row per tender (multi-tender via multiple
   rows against the same bill — NOT a `payment_splits` table, which
   was considered and rejected in ADR-024 §3).
4. If cash tender: computes `cash_tendered` − `cash_change` and
   stores both.
5. Updates the bill status to `settled`.
6. Updates the parent `dining_session.status` to `closed` (if all
   bills settled) via `close_dining_session_atomic`.
7. Returns the posted payments + updated bill + session as JSON.

On any failure, the entire transaction rolls back — no partial
settlement.

### 10. Bill Splits (`bill_splits` + `bill_split_allocations`)

`bill_splits` (migration `20260725110000` lines 320-360) records how
a dine-in bill was split among customers. 4 strategies:

| Strategy | Use |
|---|---|
| `equal` | Split equally among N parties |
| `items` | Each party pays for their assigned items |
| `amount` | Each party pays a custom amount |
| `share` | Each party pays a percentage share |

`bill_split_allocations` (lines 380-410) records the per-party
allocation (party_label, allocated_amount, allocated_items JSONB).

### 11. Reservation Deposits (`reservation_deposits`)

`reservation_deposits` (migration `20260725110000` lines 450-510) is
the 7-state deposit lifecycle for dine-in reservations. Customers
pay a deposit at reservation time; the deposit is applied, waived,
forfeited, or refunded based on whether the reservation is honored.

```text
pending → collected    (deposit collected at reservation)
collected → applied    (deposit applied to the bill at dine-in)
collected → refunded   (deposit refunded — cancellation within policy)
collected → forfeited  (deposit forfeited — no-show or late cancellation)
collected → waived     (deposit waived by manager decision)
applied → refunded     (partial refund of unused deposit)
refunded → voided      (refund reversed)
```

### 12. Branch Payment Methods (`branch_payment_methods`)

`branch_payment_methods` (migration `20260729010000` lines 10-50)
configures which of the 4 payment methods are enabled per branch.
Each row is one `(branch_id, payment_method)` pair with an
`is_enabled` flag + `verification_required` flag (for methods that
need a manager's PIN, e.g., complimentary).

`branch_payment_method_events` (lines 70-90) is the append-only audit
trail for every enable/disable/verify transition.

### 13. Admin API Surface (19 routes)

```text
# backend/api/src/modules/admin/pos.ts (mounted under /api/v1/admin/pos)
GET   /pos/z-report                          (today's Z-report data: expected cash + cash sales + non-cash totals)
POST  /pos/z-report/close                    (record Z-report close event + counted cash + variance)
POST  /pos/orders                            (cashier order create — Phase 7 ADR-023)

# backend/api/src/modules/admin/payments.ts (mounted under /api/v1/admin/payments)
POST  /payments/settle                       (settle bill with one or more tenders → settle_bill_payment_atomic)
POST  /payments/split                        (split a bill into allocations)
GET   /payments/bills/:billId/balance        (outstanding balance on a bill)
GET   /payments/sessions/:sessionId          (list payments for a dining session)
POST  /payments/:paymentId/void              (void a payment — sets voided_at)
POST  /payments/deposits                     (create reservation deposit)
GET   /payments/deposits/:reservationId      (list deposits for a reservation)
POST  /payments/deposits/:reservationId/waive     (manager waives deposit)
POST  /payments/deposits/:reservationId/forfeit   (forfeit deposit on no-show)
POST  /payments/deposits/:reservationId/refund    (refund deposit)
POST  /payments/deposits/:reservationId/apply     (apply deposit to bill)

# backend/api/src/modules/admin/finance.ts (cash recon routes — ADR-036 §14)
GET   /finance/cash-reconciliations
POST  /finance/cash-reconciliations
PATCH /finance/cash-reconciliations/:id
POST  /finance/cash-reconciliations/:id/transition

# backend/api/src/modules/admin/delivery-rider.ts (COD routes — ADR-030 §3)
POST  /cod/collections                  (record COD collection — usually auto-created by delivery trigger)
GET   /cod/collections                  (list COD collections for branch)
GET   /cod/collections/:id              (get one COD collection)
POST  /cod/collections/:id/reconcile    (reconcile: pending → reconciled/shortage/overage)
POST  /cod/collections/:id/resolve      (resolve shortage/overage: shortage/overage → reconciled)
```

Permissions: `payment.settle` for settle/split, `payment.void` for
void, `deposit.manage` for deposits, `order.manage` for Z-report
read, `finance.manage` for cash reconciliations, `delivery.assign`
for COD routes. All branch-scoped via RLS.

### 14. Deferred Items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| `pos_sessions` table (cashier login/logout + drawer open/close + float assignment) | Multi-drawer support OR >3 cashiers per branch per shift (currently single-drawer single-shift) |
| Online card gateway (Stripe / Braintree / 2C2P) | Owner request for online card payment OR >30% of customers requesting card payment (currently external card terminal only) |
| Multi-timezone (Asia/Karachi only today) | Branch expansion to a different timezone (currently 2 branches both in PKT) |
| `payment_splits` table (rejected — multi-tender via multiple `payments` rows against same bill) | Not planned — the multiple-rows-per-bill pattern is sufficient and simpler |
| Bank deposit slip generation (PDF of cash deposits to take to the bank) | Owner request OR >5 cash deposits per branch per week |
| Multi-currency payments (PKR only today) | First foreign-currency transaction |
| `refunded_at` lifecycle service (column exists but no `/api/v1/admin/refunds` route) | Phase 12+ when customer-facing refund flow is needed (see ADR-038 §8 for refund deferral) |
| Partial refund API (only full void today) | First partial-refund request from a customer |
| Cash deposit to bank automation (auto-create `finance_cash_register_entries` row on Z-report close) | Owner request for closed-loop cash tracking |
| Recurring cash reconciliation (auto-create draft daily) | >5 reconciliations per branch per week (currently manual draft creation) |
| Rider cash float tracking (rider starts shift with X PKR float) | >5 riders per branch OR >2 cash shortage incidents per rider per month |
| Auto-shortage detection (flag if collected_amount < expected_amount by >X%) | >3 shortage incidents per branch per month |
| Bank statement import + reconciliation (match `finance_cash_register_entries` to bank statement lines) | Owner request OR >5 bank accounts per branch |
| Multi-drawer support (multiple cash drawers per branch) | Branch square footage exceeds single-drawer capacity OR >3 cashiers per shift |

---

## Consequences

**Positive:**

- **Server-computed variance.** The `compute_cash_reconciliation_totals`
  IMMUTABLE RPC is the single source of truth — the client cannot
  hide a variance by sending a wrong expected_cash.
- **6-state reconciliation workflow.** Draft → submitted → approved
  → posted provides proper segregation of duties (BM prepares, SA
  approves).
- **COD auto-GL posting.** The `post_cod_collection_journal` trigger
  guarantees GL consistency regardless of the reconciliation path.
- **Idempotent COD posts.** `finance_postings` UNIQUE on
  `('cod', cod_collection_id)` prevents double-posting if the trigger
  fires twice.
- **8-state payment lifecycle.** Captures every payment state from
  pending through refunded/voided/disputed.
- **Multi-tender bill settlement.** Multiple `payments` rows against
  the same bill (no `payment_splits` table — simpler and equally
  correct).
- **Append-only Z-report audit.** Corrections require a new event
  with `payload.correction_for` — never an UPDATE of the original.
- **Asia/Karachi invariant.** All business dates are PKT calendar
  dates, regardless of Supabase's UTC storage.

**Negative:**

- **No `pos_sessions` table.** Multi-drawer / multi-shift support
  requires workarounds (the `register_id` column on
  `cash_reconciliations` defaults to `'main'` — multiple registers
  require manual configuration).
- **No online card gateway.** Card payments require an external
  terminal; the platform records the result manually. This is
  acceptable for V1 but limits scalability.
- **No partial refund API.** Only full void is supported today.
  Partial refunds require a new `payments` row with negative amount
  (workaround) or a dedicated `refunds` table (DEFERRED to ADR-038 §8).
- **Single timezone.** All business dates are Asia/Karachi. A branch
  in a different timezone would need timezone-aware Z-report queries.

**Neutral:**

- The cash surface is branch-scoped, like every other operational
  table. A future multi-branch cash consolidation layer would sit
  above the per-branch tables and roll up by date.

---

## Related

- [ADR-007](./ADR-007-delivery-state-machine.md) — Delivery State Machine (state-machine + append-only audit pattern)
- [ADR-010](./ADR-010-cod-financial-ownership.md) — COD Financial Ownership (`cod_collections` + `post_cod_collection_journal` trigger)
- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability (GL posts are immutable)
- [ADR-018](./ADR-018-order-lifecycle-state-machine.md) — Order Lifecycle (COD collection created on `delivered` transition)
- [ADR-019](./ADR-019-rbac-authorization-principal.md) — RBAC (`payment.settle` / `payment.void` / `deposit.manage` / `order.manage` permissions)
- [ADR-022](./ADR-022-reports-analytics-framework.md) — Reports & Analytics (cash + sales metrics)
- [ADR-023](./ADR-023-pos-cashier-workflow-order-source-contract.md) — POS Cashier Workflow (cash-only payment contract at place-order)
- [ADR-024](./ADR-024-dine-in-bill-settlement.md) — Dine-in Bill Settlement (`settle_bill_payment_atomic` + multi-tender via multiple payments rows)
- [ADR-025](./ADR-025-pos-shifts-zreport-cash-recon.md) — POS Shifts/Z-Report/Cash Recon (Phase 7 closeout)
- [ADR-026](./ADR-026-branch-sync-offline-safe-pos-contract.md) — Branch Sync / Offline-Safe POS (Idempotency-Key + retry)
- [ADR-030](./ADR-030-rider-identity-dispatch-assignment-contract.md) — Rider Identity (COD collected by rider)
- [ADR-031](./ADR-031-delivery-lifecycle-pickup-pod-surface.md) — Delivery Lifecycle (COD collection auto-created on `delivered`)
- [ADR-036](./ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md) — Branch GL (cash variance GL posts)
- [ADR-038](./ADR-038-tax-ar-ap-cogs-expense-posting-contract.md) — Tax, AR, AP, COGS & Expense Posting (Phase 11 sibling)
- `supabase/migrations/20260713190000_foundation_schema.sql` — payments table foundation
- `supabase/migrations/20260725110000_d3_corrective_timezone_payments_deposits.sql` — D3 payments extension + bill splits + reservation deposits + settle RPC
- `supabase/migrations/20260729010000_opening_m2_payments_notifications_devices.sql` — branch payment methods
- `supabase/migrations/20260730210000_pos_z_report_events.sql` — Z-report events
- `supabase/migrations/20260731020000_cash_reconciliations.sql` — cash reconciliations + IMMUTABLE totals RPC
- `supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql` — COD collections + auto-GL trigger
- `backend/api/src/services/pos/z-report.ts` — Z-report service
- `backend/api/src/services/payments/settlement.ts` — payment settlement service
- `backend/api/src/services/deliveries/cod-service.ts` — COD service
- `backend/api/src/services/finance/operations.ts` — cash reconciliation service
- `backend/api/src/modules/admin/pos.ts` — POS routes (3)
- `backend/api/src/modules/admin/payments.ts` — payment routes (9)
- `backend/api/src/modules/admin/delivery-rider.ts` — COD routes (5)
- `backend/api/src/modules/admin/finance.ts` — cash recon routes (4 of the 30 finance routes)
