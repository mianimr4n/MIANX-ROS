# ADR-025: POS Shifts, Z-Report & Cash Reconciliation

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.2.0` (closes Phase 7 — POS System, ADR-025 of 4)

---

## Context

Telepizza's POS shift-close and cash reconciliation surface has been
live in Production since the RC3 Finance PR1 migrations
(`20260730210000_pos_z_report_events.sql` and
`20260731020000_cash_reconciliations.sql`, both committed July 2026)
and the RC3 Finance PR2 migration
(`20260731040000_finance_posting_and_ap_idempotency.sql`, which added
the journal posting path).

The `pos_z_report_events` table records append-only shift-close
confirmations. The `cash_reconciliations` table records the full
draft → submitted → approved → posted lifecycle with server-side
expected_cash and variance computation. Both are wired into the
backend (`backend/api/src/services/pos/z-report.ts` and
`backend/api/src/services/finance/operations.ts`) and exposed through
the admin API (`modules/admin/pos.ts` and `modules/admin/finance.ts`).

However, no ADR records the canonical Phase 7 contract for POS
shifts, Z-Report, and cash reconciliation. The
`POS-BILLING-FOUNDATION.md` plan explicitly deferred `pos_sessions`
(opening float, register assignment) — that deferral is still in
effect, and this ADR documents it as an intentional V1 boundary.

This ADR formally accepts the as-built RC3 Finance architecture as
the canonical Phase 7 decision for POS shifts, Z-Report, and cash
reconciliation.

## Decision

### 1. Two-tier shift model — events vs reconciliations

Telepizza's POS shift model has TWO distinct layers, intentionally
separated to enforce segregation of duties:

| Layer | Table | Purpose | Lifecycle |
|---|---|---|---|
| **Shift-close audit** | `pos_z_report_events` | Append-only confirmation that a shift was closed | Insert-only, no states |
| **Cash reconciliation** | `cash_reconciliations` | Full draft → submitted → approved → posted lifecycle | State machine |

The shift-close event is a *snapshot* of what the system computed at
shift close (total_orders, total_cash_sales, expected_cash). The
cash reconciliation is the *process* by which the cashier counts the
drawer, the branch-manager reviews, and finance posts to the GL.

This separation prevents a cashier from unilaterally "closing" the
drawer without manager review. The event is the cashier's claim
("I closed the shift with X expected cash"); the reconciliation is
the manager's verification ("I counted Y, variance is Z").

### 2. `pos_z_report_events` — append-only shift-close audit

```sql
create table public.pos_z_report_events (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  actor_user_id uuid references public.users (id),
  business_date date not null,
  timezone text not null default 'Asia/Karachi',
  total_orders integer not null check (total_orders >= 0),
  total_cash_sales numeric(12, 2) not null check (total_cash_sales >= 0),
  expected_cash numeric(12, 2) not null check (expected_cash >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);
```

| Column | Source |
|---|---|
| `business_date` | Asia/Karachi local date at shift-close time |
| `timezone` | Always `Asia/Karachi` (locked V1) |
| `total_orders` | Count of orders created in the business day for the branch |
| `total_cash_sales` | Sum of `payments.amount` where `method = 'cash'` and `status in ('completed', 'paid')` |
| `expected_cash` | Equal to `total_cash_sales` (no opening float at shift-close — that's at cash recon time) |
| `payload` | JSONB snapshot of breakdown (by order_type, by hour, etc.) |

The table is **append-only** — there is no UPDATE or DELETE path.
The service (`PosZReportService.confirmClose`) inserts a row and
returns the snapshot to the cashier UI, which displays it in the
`ZReportModal.tsx` component.

### 3. `cash_reconciliations` — full state machine

```text
draft → submitted → approved → posted
                    ↘ rejected → (back to draft)
draft → voided
submitted → voided
approved → voided (with reason)
```

| Status | Actor | Allowed next |
|---|---|---|
| `draft` | Cashier (preparer) | `submitted`, `voided` |
| `submitted` | Branch-manager (reviewer) | `approved`, `rejected` |
| `rejected` | Branch-manager | (back to `draft` via re-edit) |
| `approved` | Finance (poster) | `posted`, `voided` |
| `posted` | System | **Immutable** (reversal via ADR-011 only) |
| `voided` | Any authorized | **Immutable** |

The state machine is enforced application-side in
`backend/api/src/services/finance/operations.ts`. Each transition
appends a row to `cash_reconciliation_events` with `before_state`,
`after_state`, `actor_user_id`, `action`, and `reason`.

### 4. Server-side expected_cash + variance

The `compute_cash_reconciliation_totals` RPC (SECURITY DEFINER,
immutable) computes expected_cash and variance server-side:

```text
expected_cash = opening_float
              + cash_sales
              - cash_refunds
              - cash_drops
              - paid_out_expenses
              + other_inflows
              - other_outflows

variance = counted_cash - expected_cash
```

The cashier UI sends the input fields; the server computes
expected_cash and variance. The client NEVER computes these —
this prevents drift between UI and audit trail.

Inputs:
- `opening_float`: Counted at shift-open (or carried from prior day's closing)
- `cash_sales`: From `payments` where `method = 'cash'` and `status in ('completed', 'paid')`
- `cash_refunds`: From `payments` where `method = 'cash'` and `status = 'refunded'`
- `cash_drops`: Manual entries (cash removed from drawer mid-shift)
- `paid_out_expenses`: From `expense_claims` where `status = 'paid'` and `method = 'cash'`
- `other_inflows` / `other_outflows`: Manual entries (tips, petty cash, etc.)
- `counted_cash`: Cashier's physical count at shift-close

Output:
- `expected_cash`: Server-computed
- `variance`: `counted_cash - expected_cash` (null if `counted_cash` is null)

### 5. Idempotency + UNIQUE per (branch, business_date, register)

The `cash_reconciliations` table has TWO uniqueness guarantees:

1. **Idempotency key**: UNIQUE on `idempotency_key` where NOT NULL.
   Prevents duplicate reconciliation creation on retry.
2. **Active per day per register**: UNIQUE on `(branch_id, business_date, coalesce(register_id, '00000000-...'))` where `status NOT IN ('voided')`.
   Prevents two active reconciliations for the same branch/day/register.

A voided reconciliation does NOT block the creation of a new one for
the same day — this allows "void and redo" workflows.

### 6. GL posting on approval

When a cash reconciliation is `approved`, the finance service can
post it to the general ledger (ADR-011). The posting:

1. Creates a `journal_entries` row (double-entry, immutable after post).
2. Creates `journal_lines` debiting `cash_on_hand` and crediting
   `sales_revenue` (or debiting `cash_over_short` if variance ≠ 0).
3. Updates `cash_reconciliations.journal_entry_id` and
   `posting_status = 'posted'`.

The `finance_account_mappings` table (RC3 Finance PR1) maps each
`purpose` (e.g., `cash_on_hand`, `cash_over_short`, `sales_revenue`)
to a `chart_of_accounts` row per branch. This decouples the
accounting logic from the specific CoA used by each branch.

Posting is **idempotent** — the `finance_postings` table (RC3 Finance
PR2) has a UNIQUE on `(source_module, source_id)`. A retry of the
posting RPC returns the existing `journal_entry_id` without creating
a duplicate.

### 7. Variance handling — `cash_over_short`

When `variance ≠ 0`, the posting creates an additional journal line:

| Variance | Debit | Credit |
|---|---|---|
| `variance > 0` (over) | `cash_on_hand` (extra cash) | `cash_over_short` (revenue) |
| `variance < 0` (short) | `cash_over_short` (expense) | `cash_on_hand` (missing cash) |

The `cash_over_short` purpose maps to a specific account in
`finance_account_mappings` per branch. Variances are flagged in the
Exception Center (ADR-022) for management review.

### 8. RLS hard gate

| Table | Cashier | Branch-manager | Finance | Super-admin | Other |
|---|---|---|---|---|---|
| `pos_z_report_events` | SELECT own branch | SELECT own branch | SELECT all | Full | No access |
| `cash_reconciliations` | SELECT own branch | SELECT own branch | SELECT all | Full | No access |
| `cash_reconciliation_events` | SELECT own branch | SELECT own branch | SELECT all | Full | No access |

The `current_user_has_branch_access(p_branch_id)` helper (Slice 2D)
is the authz function for `cash_reconciliations` and
`cash_reconciliation_events`. The `pos_z_report_events` table uses
the same helper. All mutations go through `service_role`.

Cashier can CREATE a draft reconciliation (via the API, which uses
service_role internally) but cannot transition it past `submitted`.
Branch-manager can transition to `approved` or `rejected`. Finance
can transition to `posted`.

### 9. Asia/Karachi timezone invariant

All shift-close and reconciliation business dates are computed in
`Asia/Karachi` (the only supported timezone in V1). The
`branches.timezone` column (D3 §1) defaults to `Asia/Karachi` and
is NOT NULL with a shape CHECK constraint. The
`branch_local_date(p_branch_id, p_at)` helper converts a UTC
timestamp to the branch's local date.

V1 lock: `Asia/Karachi` only. Multi-timezone support (e.g., for a
future international branch) would require:
1. A new timezone value in `branches.timezone`.
2. Validation that the `pos_z_report_events.timezone` column matches.
3. UI updates to render business dates in the branch's local timezone.

This is deferred to a future ADR if/when Telepizza opens branches
outside Pakistan.

### 10. API surface

```text
# Z-Report (modules/admin/pos.ts)
GET  /api/v1/admin/pos/z-report?branchId=
  → 200 { timezone, businessDate, dayStart, branchId,
          totalOrders, totalCashSales, expectedCashInDrawer, generatedAt }

POST /api/v1/admin/pos/z-report/close
  → 201 { ...same as GET, confirmed: true, confirmedAt, eventId }
  → 409 if already closed for the business day (idempotent replay returns prior event)

# Cash reconciliations (modules/admin/finance.ts)
GET    /api/v1/admin/finance/cash-reconciliations?branchId=&status=
POST   /api/v1/admin/finance/cash-reconciliations
       body: { branchId, businessDate, openingFloat, cashDrops, ...,
               countedCash?, idempotencyKey? }
PATCH  /api/v1/admin/finance/cash-reconciliations/:id/draft
POST   /api/v1/admin/finance/cash-reconciliations/:id/transition
       body: { action: 'submit' | 'approve' | 'reject' | 'post' | 'void', reason? }
GET    /api/v1/admin/finance/cash-reconciliations/:id/events

# Account mappings (modules/admin/finance.ts)
GET    /api/v1/admin/finance/account-mappings?branchId=
POST   /api/v1/admin/finance/account-mappings
PATCH  /api/v1/admin/finance/account-mappings/:id
```

All endpoints require Bearer → `AuthPrincipal` →
`requirePermission('payment.settle' | 'payment.void' | 'finance.manage')`
+ `requireBranchAccess`.

## Consequences

### Positive

- **Segregation of duties enforced.** Cashier prepares, branch-manager
  reviews, finance posts. No single role can unilaterally move cash
  from drawer to GL.
- **Server-side computation.** `expected_cash` and `variance` are
  computed by the database (immutable RPC), not the client. Prevents
  drift between UI and audit trail.
- **Append-only shift-close.** `pos_z_report_events` cannot be
  edited after insert — the cashier's claim at shift-close is
  permanently recorded.
- **Idempotent posting.** `finance_postings` UNIQUE on
  `(source_module, source_id)` prevents duplicate GL entries on retry.
- **Variance flagged.** Non-zero variance creates a `cash_over_short`
  journal line AND triggers an Exception Center entry (ADR-022) for
  management review.
- **Void-and-redo supported.** A voided reconciliation does not block
  a new one for the same day, allowing error correction workflows.

### Negative

- **No `pos_sessions` table.** Opening float is captured at cash
  reconciliation time, not at shift open. This means a cashier can
  start a shift without recording the opening float — only at
  shift-close does the system know what was supposed to be in the
  drawer. This is a V1 deferral documented in
  `POS-BILLING-FOUNDATION.md` §2.
- **No register / terminal assignment.** The `register_id` column on
  `cash_reconciliations` is nullable — most branches have a single
  register and leave it null. Multi-register branches would need to
  populate this column, but there is no `registers` table to enforce
  referential integrity.
- **`Asia/Karachi` only.** The timezone is hardcoded as the default
  and the only validated value. International expansion would require
  a new ADR.

## Alternatives Considered

- **Single table for shift-close + reconciliation.** Rejected: the
  shift-close event is append-only (cashier's claim), while the
  reconciliation is a state machine (manager's review). Combining
  them would force the cashier's claim to be mutable, defeating the
  audit purpose.
- **`pos_sessions` table with opening float at shift-open.** Rejected
  for V1: the `POS-BILLING-FOUNDATION.md` plan explicitly deferred
  this to avoid overbuilding. The current model (opening float at
  cash recon time) is sufficient for single-register branches.
- **Client-side variance computation.** Rejected: the
  `compute_cash_reconciliation_totals` RPC is IMMUTABLE and
  SECURITY DEFINER — the server is the source of truth. Client-side
  computation could drift due to floating-point or logic differences.
- **`pos_z_report_events` as a materialized view.** Rejected: MVs
  require refresh logic and are not append-only. The event table is
  a point-in-time snapshot that never changes, which matches the
  audit requirement.
- **Multi-timezone support in V1.** Rejected: Telepizza's only
  branches are in Multan, Pakistan (Asia/Karachi). Adding multi-TZ
  support without a clear use case would complicate the UI and
  business-date logic for no benefit.

## As-Built Verification (2026-08-16)

`scripts/phase_7_verify.py` confirms Production Supabase has:

- ✅ 3 tables: `pos_z_report_events`, `cash_reconciliations`,
  `cash_reconciliation_events`
- ✅ `pos_z_report_events.timezone` default = `Asia/Karachi`
- ✅ `cash_reconciliations.status` CHECK: `draft`, `submitted`,
  `approved`, `rejected`, `posted`, `voided`
- ✅ `cash_reconciliations.posting_status` CHECK: `not_applicable`,
  `pending`, `posted`, `blocked`, `reversed`
- ✅ `cash_reconciliations` UNIQUE per-branch-per-day-per-register
  (where not voided)
- ✅ `cash_reconciliations.idempotency_key` UNIQUE partial index
- ✅ `compute_cash_reconciliation_totals` RPC exists (IMMUTABLE,
  SECURITY DEFINER)
- ✅ `cash_reconciliation_events` table for audit trail
- ✅ `finance_account_mappings` table with 20 purposes seeded
- ✅ `finance_postings` table with UNIQUE on
  `(source_module, source_id)`
- ✅ RLS enabled on `pos_z_report_events`, `cash_reconciliations`,
  `cash_reconciliation_events`
- ✅ `branches.timezone` NOT NULL with default `Asia/Karachi`

**Result: see PHASE7_FINAL_GATE.md for the full verification matrix.**

## References

- [`docs/architecture/POS-BILLING-FOUNDATION.md`](../architecture/POS-BILLING-FOUNDATION.md) — `pos_sessions` deferral
- [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md) — Phase 7 entry
- [`docs/13-adr/ADR-011-accounting-immutability.md`](./ADR-011-accounting-immutability.md) — journal entry immutability
- [`docs/13-adr/ADR-022-reports-analytics-framework.md`](./ADR-022-reports-analytics-framework.md) — Exception Center
- [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](./ADR-023-pos-cashier-workflow-order-source-contract.md) — POS place-order
- [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](./ADR-024-dine-in-bill-settlement.md) — bill settlement
- [`supabase/migrations/20260730210000_pos_z_report_events.sql`](../../supabase/migrations/20260730210000_pos_z_report_events.sql) — Z-Report events
- [`supabase/migrations/20260731020000_cash_reconciliations.sql`](../../supabase/migrations/20260731020000_cash_reconciliations.sql) — cash recon
- [`supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql`](../../supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql) — GL posting
- [`backend/api/src/services/pos/z-report.ts`](../../backend/api/src/services/pos/z-report.ts) — Z-Report service
- [`backend/api/src/services/finance/operations.ts`](../../backend/api/src/services/finance/operations.ts) — cash recon service
