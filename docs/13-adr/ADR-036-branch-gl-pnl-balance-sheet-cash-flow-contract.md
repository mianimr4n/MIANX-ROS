# ADR-036: Branch GL, P&L, Balance Sheet & Cash Flow Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.6.0` (closes Phase 11 — Finance and Reporting, ADR-036 of 3)

---

## Context

Telepizza's general-ledger (GL) and financial-statement surface was shipped
across three waves between July and August 2026:

1. **RC3 Finance Core** (`20260730260000_finance_core.sql`, 448 lines) —
   creates the double-entry bookkeeping foundation: `chart_of_accounts`
   (branch-scoped, 5-type CoA), `journal_entries` (3-state
   draft/posted/voided), `journal_entry_lines` (balanced one-side-positive
   CHECK), and three SECURITY DEFINER RPCs (`create_journal_entry_atomic`,
   `finance_trial_balance`, `finance_profit_loss`). Seeds the
   `finance.manage` permission on super-admin + branch-manager.
2. **RC3 Finance Mappings** (`20260731010000_finance_account_mappings.sql`,
   47 lines) — adds `finance_account_mappings` (purpose → account_id
   resolution table) with UNIQUE `(branch_id, purpose)`.
3. **RC4 Finance Phase 2** (`20260731190000_rc4_finance_phase2_foundation.sql`,
   622 lines) — extends the mapping purposes from 5 to 15 (later extended
   further to 20 by the payroll mapping migration `20260731210000`) and
   adds the full Phase 2 surface: `tax_definitions`, AR
   (`customer_invoices` + `customer_invoice_lines` +
   `customer_receipts` + `customer_receipt_allocations` +
   `customer_credit_notes`), `finance_periods` (3-state with
   `finance_assert_period_allows_posting` RPC), `finance_cash_accounts`,
   `finance_cash_register_entries`, `finance_exceptions`. Adds two more
   RPCs: `finance_balance_sheet` and `finance_cash_flow_indirect`.

Two follow-up migrations harden the immutability guarantees:

4. **ADR-011 Immutability** (`20260814180100_adr_011_accounting_immutability.sql`,
   170 lines + FU-1 fix `20260815000000_adr_011_fix_bypass_delete.sql`,
   109 lines) — adds DB-layer triggers that block UPDATE/DELETE on posted
   journal entries except for the documented reversal flow. See ADR-011
   for full rationale.

5. **Posting Idempotency + Reversal** (`20260731040000_finance_posting_and_ap_idempotency.sql`,
   350 lines) — adds `finance_postings` UNIQUE `(source_module, source_id)`
   table for idempotent GL posts; adds `reversed_by_journal_id` /
   `reverses_journal_id` self-FK on `journal_entries`; adds the
   `reverse_journal_entry_atomic` SECURITY DEFINER RPC.

The backend service layer (`backend/api/src/services/finance/management.ts`,
459 lines + `backend/api/src/services/finance/operations.ts`, 1578 lines +
`backend/api/src/services/finance/phase2.ts`, 1202 lines) exposes the
full GL + reconciliation + AR/AP posting surface. The admin router
(`backend/api/src/modules/admin/finance.ts`, 913 lines, 30 routes)
mounts under `/api/v1/admin/finance/*`. Frontend
`apps/website/client/src/pages/admin/AdminFinance.tsx` (296 lines) + 8
supporting components in `components/admin/finance/` (1,527 lines)
render the owner-facing finance ERP.

However, the GL + statements data model was never elevated to a formal
ADR. The deferral of multi-currency consolidation, inter-branch
transfers, fiscal-year close automation, bank reconciliation, and
fixed-asset depreciation is documented piecemeal across `FinanceStatusBanner.tsx`
(lines 22-35) and various service-level comments. This ADR consolidates
those deferrals into a single accepted decision with explicit trigger
conditions.

This ADR formally accepts the as-built branch GL + financial-statement
model as the canonical Phase 11 contract.

---

## Decision

### 1. Chart of Accounts (`chart_of_accounts`)

`chart_of_accounts` (migration `20260730260000` lines 24-65) is the
branch-scoped account directory. Each account belongs to exactly one
branch (same pattern as `inventory_items` in ADR-033 §1 and `suppliers`
in ADR-035 §1).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` ON DELETE CASCADE | Branch scope |
| `account_code` | varchar(40) NOT NULL | Account code (e.g., `1000-CASH`, `4000-SALES`) |
| `name` | varchar(200) NOT NULL | Account name |
| `type` | text NOT NULL CHECK ∈ {`asset`, `liability`, `equity`, `revenue`, `expense`} | 5-type CoA |
| `is_active` | boolean NOT NULL DEFAULT `true` | Soft-delete flag |
| `description` | text | Free-text description |
| `parent_account_id` | uuid FK → `chart_of_accounts(id)` NULLABLE | Parent account (hierarchical CoA) |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, account_code)`. RLS enabled with
`current_user_has_branch_access(branch_id)` for SELECT, service_role
for write.

**Why branch-scoped?** Each branch maintains its own CoA. This is
consistent with `inventory_items` (ADR-033 §1) and `suppliers`
(ADR-035 §1) — every operational table in the platform is
branch-scoped. A future multi-branch consolidation layer (DEFERRED, §9)
would sit above the per-branch CoA and roll up by account code +
account type.

**Why 5 types (asset/liability/equity/revenue/expense)?** These are
the 5 fundamental accounting types. Sub-classifications (current vs
non-current asset, operating vs non-operating revenue, etc.) are
expressed via the `parent_account_id` hierarchy, not via additional
enum values. This keeps the schema simple while supporting arbitrarily
deep CoA hierarchies.

### 2. Journal Entries (`journal_entries`)

`journal_entries` (lines 80-110) is the posted-or-draft ledger header.
Each entry belongs to one branch and has many lines.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `entry_date` | date NOT NULL | Accounting date (Asia/Karachi) |
| `description` | text NOT NULL | Description |
| `reference_type` | varchar(80) | Source module (e.g., `sales`, `ap`, `cogs`, `cash_recon`, `expense_claim`, `cod`, `manual`) |
| `reference_id` | uuid | Source row ID (links back to the originating `orders.id`, `supplier_invoices.id`, etc.) |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `posted`, `voided`} | Lifecycle |
| `reversed_by_journal_id` | uuid FK → `journal_entries(id)` NULLABLE | If this entry was reversed, points to the reversal entry |
| `reverses_journal_id` | uuid FK → `journal_entries(id)` NULLABLE | If this entry is a reversal, points to the original entry |
| `created_by` | uuid FK → `users(id)` ON DELETE SET NULL | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

Indexes on `branch_id`, `status`, `entry_date`, `reference_type`,
`reference_id`.

**3-state machine:**

```text
draft → posted     (via create_journal_entry_atomic)
posted → voided    (via reverse_journal_entry_atomic)
```

`draft` entries can be freely edited (lines added/removed, amounts
changed). `posted` entries are immutable (see §4 ADR-011 triggers).
`voided` entries remain in the ledger as audit history — they are never
deleted.

### 3. Journal Entry Lines (`journal_entry_lines`)

`journal_entry_lines` (lines 130-160) stores the per-line debit/credit.
Each line is exactly one side (debit OR credit), never both.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `journal_entry_id` | uuid FK → `journal_entries(id)` ON DELETE CASCADE | Parent entry |
| `account_id` | uuid FK → `chart_of_accounts(id)` ON DELETE RESTRICT | Account (RESTRICT prevents deleting an account with journal lines) |
| `description` | text | Line description (optional) |
| `debit` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Debit amount (mutually exclusive with credit) |
| `credit` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Credit amount (mutually exclusive with debit) |
| `sort_order` | integer NOT NULL DEFAULT 0 | Display order |
| `created_at` | timestamptz | Creation timestamp |

CHECK constraint: `CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))`
— exactly one side must be positive. This is the double-entry invariant
at the row level. The balanced-totals invariant (sum of debits = sum of
credits) is enforced at the entry level by `create_journal_entry_atomic`.

### 4. Atomic Journal Entry Posting (`create_journal_entry_atomic`)

The `create_journal_entry_atomic` SECURITY DEFINER RPC (lines 200-280)
is the single entry point for creating a posted journal entry. It
validates and posts in one transaction:

1. Validates the entry has ≥ 2 lines (a one-line entry cannot balance).
2. Validates `SUM(debit) = SUM(credit)` across all lines (balanced
   totals). If unbalanced, raises `JOURNAL_UNBALANCED` with the
   debit-total and credit-total in the error message.
3. Validates every `account_id` belongs to the same `branch_id` as
   the entry (cross-branch posting forbidden). Raises
   `JOURNAL_BRANCH_MISMATCH` on violation.
4. Validates every `account_id` has `is_active = true`. Raises
   `JOURNAL_ACCOUNT_INACTIVE` on violation.
5. Validates `entry_date` falls within an open `finance_periods` row
   for this branch (calls `finance_assert_period_allows_posting`).
   Raises `JOURNAL_PERIOD_CLOSED` on violation.
6. INSERTs the `journal_entries` row with `status='posted'`.
7. INSERTs all `journal_entry_lines` rows.
8. Returns the posted entry + lines as a JSON payload.

On any validation failure, the entire transaction rolls back — no
partial writes.

**Why SECURITY DEFINER?** The RPC runs with the privileges of the
function owner (postgres), not the caller. This lets us enforce
immutability + balance + branch-match + period-gate invariants at
the DB layer regardless of how the caller authenticated. The API
service layer (`FinanceService.createJournalEntry`) calls this RPC;
it never INSERTs into `journal_entries` directly.

### 5. ADR-011 Immutability Triggers

Two triggers (migration `20260814180100`, ADR-011) enforce immutability
at the DB layer:

- `trg_journal_entry_immutability` (BEFORE UPDATE OR DELETE on
  `journal_entries`) — blocks UPDATE/DELETE on rows with
  `status='posted'`, except for:
  - `status` change from `posted` → `voided` (used by
    `reverse_journal_entry_atomic`).
  - Setting `reversed_by_journal_id` (linkage update on the original
    entry).
  - Setting `reverses_journal_id` (linkage on the new reversal entry).
- `trg_journal_entry_line_immutability` (BEFORE UPDATE OR DELETE on
  `journal_entry_lines`) — blocks UPDATE/DELETE on lines belonging to
  entries with `status` in (`posted`, `voided`). Only `draft` entry
  lines can be edited.

A session variable `app.bypass_immutability = 'on'` allows trusted
SECURITY DEFINER functions to skip the trigger. Reserved for future
year-end archival procedures. Not used by the application today. The
existing `reverse_journal_entry_atomic` RPC does NOT need this bypass —
its operations are explicitly permitted by the trigger rules. (See
ADR-011 + FU-1 fix `20260815000000` for the bypass-on-DELETE bug
that was corrected.)

### 6. Reverse Journal Entry (`reverse_journal_entry_atomic`)

The `reverse_journal_entry_atomic` SECURITY DEFINER RPC (migration
`20260731040000` lines 100-200) creates an equal-and-opposite posted
entry that voids the original. In one transaction:

1. Validates the original entry has `status='posted'`. Raises
   `JOURNAL_NOT_REVERSIBLE` if the entry is `draft` or already `voided`.
2. Creates a new `journal_entries` row with `status='posted'`, same
   `branch_id`, same `entry_date`, description prefix `[REVERSAL] `,
   `reverses_journal_id` set to the original entry's ID.
3. Creates mirror `journal_entry_lines` rows: every debit becomes a
   credit and vice versa. Account IDs unchanged.
4. Updates the original entry: sets `status='voided'` and
   `reversed_by_journal_id` to the new reversal entry's ID.
5. Returns the reversal entry + lines as JSON.

The reversal is itself a posted entry, so it is immutable. To "reverse
a reversal" (re-instate the original), create another reversal of the
reversal entry — the system supports unlimited reversal chains.

### 7. Financial Statements (3 RPCs)

Three SECURITY DEFINER RPCs compute the standard financial statements
on-demand from posted journal entries:

- **`finance_trial_balance`** (migration `20260730260000` lines
  300-360) — returns `(account_code, account_name, type,
  debit_balance, credit_balance)` for every account in a branch as of
  a given date. Used by the AdminFinance `LedgerPanel`.
- **`finance_profit_loss`** (lines 380-450) — returns
  `(revenue_total, expense_total, net_profit, revenue_breakdown[],
  expense_breakdown[])` for a branch between `start_date` and
  `end_date`. Revenue = sum of credits − debits on `revenue` accounts.
  Expense = sum of debits − credits on `expense` accounts. Net profit
  = revenue − expense. Used by the AdminFinance `StatementsPanel` +
  the analytics registry's `finance.profit` + `finance.margin` metrics
  (ADR-022).
- **`finance_balance_sheet`** (migration `20260731190000` lines
  400-480) — returns `(assets_total, liabilities_total, equity_total,
  assets_breakdown[], liabilities_breakdown[], equity_breakdown[])`
  for a branch as of a given date. Assets = debits − credits on
  `asset` accounts. Liabilities = credits − debits on `liability`
  accounts. Equity = credits − debits on `equity` accounts. Used by
  the AdminFinance `StatementsPanel`.
- **`finance_cash_flow_indirect`** (lines 500-590) — returns
  `(operating_cash_flow, investing_cash_flow, financing_cash_flow,
  net_cash_flow, operating_breakdown[], investing_breakdown[],
  financing_breakdown[])` for a branch between `start_date` and
  `end_date`. Indirect method: starts from net profit, adjusts for
  non-cash items + working-capital changes. Used by the AdminFinance
  `StatementsPanel`.

**Why query-time RPCs (not materialized views)?** Consistent with
ADR-022 §1: query-time computation guarantees freshness, no refresh job
to monitor, no refresh-lag to explain. Telepizza's data volume (2
branches, ~thousands of orders/month) means all four statements compute
in <500ms.

### 8. Accounting Periods (`finance_periods`)

`finance_periods` (migration `20260731190000` lines 30-70) controls
the posting window. Each branch defines its own periods (typically
monthly).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `name` | varchar(120) NOT NULL | Period name (e.g., `2026-08`) |
| `start_date` | date NOT NULL | Period start (inclusive) |
| `end_date` | date NOT NULL | Period end (inclusive) |
| `status` | text NOT NULL DEFAULT `'open'` CHECK ∈ {`open`, `soft_closed`, `closed`} | Lifecycle |
| `closed_by` | uuid FK → `users(id)` NULLABLE | User who closed the period |
| `closed_at` | timestamptz NULLABLE | Close timestamp |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, name)`.

**3-state machine:**

```text
open → soft_closed     (BM marks the period for review; adjusts still allowed with warning)
soft_closed → closed   (SA finalizes; no further posting allowed)
soft_closed → open     (BM re-opens for correction)
```

The `finance_assert_period_allows_posting` SECURITY DEFINER RPC (lines
100-130) checks whether a given `(branch_id, entry_date)` falls within
a period that allows posting. `open` and `soft_closed` periods allow
posting; `closed` periods reject. Called by `create_journal_entry_atomic`
(§4) as the period gate.

`finance_period_events` (lines 80-95) is the append-only audit trail
for every period transition. Same pattern as `delivery_state_transitions`
(ADR-007), `pos_z_report_events` (ADR-025), and `supplier_portal_events`
(ADR-035 §8).

### 9. Account Mappings (`finance_account_mappings`)

`finance_account_mappings` (migration `20260731010000` + extended by
`20260731190000` + `20260731210000`) is the purpose → account_id
resolution table. Each branch configures which CoA account to post to
for each well-known purpose.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `purpose` | varchar(80) NOT NULL | Purpose key (see catalog below) |
| `account_id` | uuid FK → `chart_of_accounts(id)` ON DELETE RESTRICT | Resolved account |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, purpose)`. 20 purposes are currently supported
(extended from 5 → 15 by RC4 + 15 → 20 by the payroll mapping
migration):

**Revenue / Sales:**
- `sales_revenue` — credit account for gross sales
- `sales_discounts` — debit account for order-level discounts (contra-revenue)
- `output_tax` — credit account for output tax (sales tax collected)
- `refunds` — debit account for refund payouts (contra-revenue)
- `delivery_fee_revenue` — credit account for delivery fees charged

**AR / Customers:**
- `ar_control` — debit account for customer receivables
- `customer_deposit` — credit account for reservation deposits held

**Inventory / COGS:**
- `inventory_asset` — debit account for on-hand inventory value
- `cogs` — debit account for cost of goods sold
- `inventory_adjustments` — debit/credit account for stock variances

**AP / Suppliers:**
- `ap_control` — credit account for supplier payables
- `purchase_variance` — debit/credit account for PO-vs-invoice price variances

**Cash / Bank:**
- `cash_on_hand` — debit account for POS cash drawer
- `cash_in_bank` — debit account for bank deposits
- `cash_variance` — debit/credit account for cash-reconciliation variances

**Expenses (specific):**
- `expense_category:*` — wildcard pattern for per-category expense
  accounts (e.g., `expense_category:rent`, `expense_category:utilities`,
  `expense_category:marketing`). Each row resolves a specific category.

**Payroll (added by `20260731210000`):**
- `salary_expense` — debit account for gross salaries
- `allowance_expense` — debit account for staff allowances
- `payroll_payable` — credit account for net pay owed to staff
- `payroll_tax_payable` — credit account for employer-side payroll taxes
- `payroll_deduction_payable` — credit account for staff-side deductions

The `mappingHealth` service (`FinancePhase2Service.mappingHealth`)
returns a report of which purposes are configured vs missing for a
branch. Missing mappings cause controlled GL posting services (§10) to
record a `finance_exception` and skip posting — they never crash.

### 10. Controlled GL Posting Services

The `FinancePhase2Service` (migration `backend/api/src/services/finance/phase2.ts`,
1202 lines) exposes 5 controlled GL posting methods that post from
external modules to the GL:

| Method | Source | Posts |
|---|---|---|
| `postSalesFromOrder(orderId)` | `orders` | DR `ar_control` (or `cash_on_hand` if paid) / CR `sales_revenue` + `output_tax` − `sales_discounts` |
| `postSupplierInvoice(invoiceId)` | `supplier_invoices` | DR `inventory_asset` (or `expense_category:*`) / CR `ap_control` + `input_tax` |
| `postCogsEvent(cogsEventId)` | `inventory_cogs_events` | DR `cogs` / CR `inventory_asset` |
| `postPayrollAccrual(payrollRunId)` | `hr_payroll_runs` | DR `salary_expense` + `allowance_expense` / CR `payroll_payable` + `payroll_tax_payable` + `payroll_deduction_payable` |
| `postPayrollSettlement(payrollRunId)` | `hr_payroll_runs` | DR `payroll_payable` / CR `cash_in_bank` |

All 5 follow the same 4-step pattern:

1. **Mapping-required:** Look up the relevant `finance_account_mappings`
   rows for the branch. If any required purpose is missing, record a
   `finance_exception` with `type='missing_mapping'` and return without
   posting. Do NOT throw — the calling module (orders, AP, COGS,
   payroll) continues to function.
2. **Period-gated:** Call `finance_assert_period_allows_posting` with
   the entry date. If the period is `closed`, record a
   `finance_exception` with `type='period_closed'` and return without
   posting.
3. **Idempotent:** Insert a `finance_postings` row with
   `(source_module, source_id)` UNIQUE. If the row already exists, the
   posting has already been made — return the existing journal entry
   ID. This makes the posting safe to retry on network failures.
4. **Atomic:** Call `create_journal_entry_atomic` with the computed
   lines. If the RPC raises (e.g., `JOURNAL_UNBALANCED`), record a
   `finance_exception` with `type='posting_failed'` and the error
   message, then return without throwing. The calling module is not
   blocked by GL failures.

The 5 endpoints exposing these services are:

- `POST /api/v1/admin/finance/sales/post-from-order/:orderId`
- `POST /api/v1/admin/finance/ap/invoices/:id/post`
- `POST /api/v1/admin/finance/cogs/events/:id/post`
- (Payroll accrual + settlement are called by the payroll service
  directly, not via dedicated admin endpoints.)

**Why controlled (manual-trigger) rather than automated?** Each
controlled post is a business decision: the BM/owner reviews the source
record (order, invoice, COGS event, payroll run) and decides when to
post to GL. This avoids flooding the GL with low-value entries (e.g.,
every single order) and lets the operator batch-post at end-of-day.
Automation is DEFERRED (§9) with an explicit trigger: "when daily
posting volume exceeds 50 entries per branch per day, automate the
post-from-order path."

### 11. Cash Accounts & Register Entries

`finance_cash_accounts` (migration `20260731190000` lines 200-230)
defines the cash/bank accounts tracked at the cash-register level.
Each row maps a payment method to a GL cash account.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `name` | varchar(120) NOT NULL | Account name (e.g., `Main Cash Drawer`, `HBL Bank Account`) |
| `account_type` | text NOT NULL CHECK ∈ {`cash`, `bank`} | Type |
| `gl_account_id` | uuid FK → `chart_of_accounts(id)` | Linked GL account |
| `is_active` | boolean NOT NULL DEFAULT `true` | Soft-delete flag |
| `opening_balance` | numeric(14,2) NOT NULL DEFAULT 0 | Opening balance |
| `currency` | varchar(3) NOT NULL DEFAULT `'PKR'` | Currency (PKR only today — multi-currency DEFERRED) |

`finance_cash_register_entries` (lines 250-290) records every cash
movement at the register level (deposits, withdrawals, transfers).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `cash_account_id` | uuid FK → `finance_cash_accounts(id)` | Cash account |
| `entry_type` | text NOT NULL CHECK ∈ {`deposit`, `withdrawal`, `transfer`} | Type |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Amount |
| `entry_date` | timestamptz NOT NULL DEFAULT `now()` | When |
| `reference_type` | varchar(80) | Source (e.g., `cash_recon`, `cod`, `manual`) |
| `reference_id` | uuid | Source row ID |
| `reconciliation_status` | text NOT NULL DEFAULT `'unreconciled'` CHECK ∈ {`unreconciled`, `reconciled`, `excluded`} | Recon state |
| `reconciled_at` | timestamptz NULLABLE | When reconciled |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` | timestamptz | Creation timestamp |

### 12. Finance Exceptions Queue

`finance_exceptions` (migration `20260731190000` lines 320-360) is
the BM/owner work queue for GL posting failures + missing mappings +
period-closed attempts. 3-state lifecycle (`open` / `resolved` /
`wontfix`).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `type` | text NOT NULL CHECK ∈ {`missing_mapping`, `period_closed`, `posting_failed`, `unbalanced`, `account_inactive`, `branch_mismatch`} | Exception type |
| `source_module` | varchar(80) NOT NULL | Source (e.g., `sales`, `ap`, `cogs`, `payroll`) |
| `source_id` | uuid NOT NULL | Source row ID |
| `message` | text NOT NULL | Error message |
| `detail` | jsonb NULLABLE | Structured detail (account_id, purpose, etc.) |
| `status` | text NOT NULL DEFAULT `'open'` CHECK ∈ {`open`, `resolved`, `wontfix`} | Lifecycle |
| `resolved_by` | uuid FK → `users(id)` NULLABLE | Resolver |
| `resolved_at` | timestamptz NULLABLE | Resolution timestamp |
| `created_at` | timestamptz | Creation timestamp |

`GET /api/v1/admin/finance/exceptions` lists open exceptions for the
current branch. Used by AdminFinance `CashPanel` +
`ReceivablePanel` + `PayablePanel` to surface "X exceptions need
attention."

### 13. `finance_postings` Idempotency Table

`finance_postings` (migration `20260731040000` lines 50-80) records
every successful controlled GL post. UNIQUE on
`(source_module, source_id)` makes every post idempotent — calling
`postSalesFromOrder(orderId)` twice returns the same journal entry ID
both times, without creating a duplicate.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `source_module` | text NOT NULL | Source (e.g., `sales`, `ap`, `cogs`, `payroll`, `cash_recon`, `cod`, `expense_claim`) |
| `source_id` | uuid NOT NULL | Source row ID |
| `journal_entry_id` | uuid FK → `journal_entries(id)` ON DELETE RESTRICT | Posted journal entry |
| `posted_at` | timestamptz NOT NULL DEFAULT `now()` | When posted |
| `posted_by` | uuid FK → `users(id)` | Who/what posted |

UNIQUE on `(source_module, source_id)` — this is the idempotency
guarantee. The COD auto-posting trigger (ADR-010, ADR-037 §6) uses
this same table, so a COD collection reconciled twice does not double-
post to GL.

### 14. Admin API Surface (30 routes)

```text
# backend/api/src/modules/admin/finance.ts (mounted under /api/v1/admin/finance)

# Chart of Accounts
GET    /finance/accounts                                       (list accounts)
POST   /finance/accounts                                       (create account)

# Account Mappings
GET    /finance/account-mappings                               (list mappings)
PUT    /finance/account-mappings                               (upsert mapping)
GET    /finance/mapping-health                                 (mapping health report)

# Journal Entries
GET    /finance/journal-entries                                (list entries)
POST   /finance/journal-entries                                (create draft or posted)
POST   /finance/journal-entries/:id/reverse                    (reverse posted entry)

# Financial Statements
GET    /finance/reports/trial-balance                          (trial balance)
GET    /finance/reports/profit-loss                            (P&L)
GET    /finance/reports/balance-sheet                          (balance sheet)
GET    /finance/reports/cash-flow                              (cash flow indirect)

# Cash Reconciliations (ADR-037 §1)
GET    /finance/cash-reconciliations                           (list)
POST   /finance/cash-reconciliations                           (create draft)
PATCH  /finance/cash-reconciliations/:id                       (update draft)
POST   /finance/cash-reconciliations/:id/transition            (submit/approve/reject/void/post)

# Expense Claims (ADR-038 §6)
GET    /finance/expenses                                       (list)
POST   /finance/expenses                                       (create draft)
PATCH  /finance/expenses/:id                                   (update draft)
POST   /finance/expenses/:id/transition                        (submit/approve/reject/pay/void/post)

# Supplier Payments (ADR-038 §5)
POST   /finance/supplier-payments/:id/post                     (controlled GL post)

# Tax Definitions (ADR-038 §1)
GET    /finance/tax-definitions                                (list)
PUT    /finance/tax-definitions                                (upsert)

# AR — Customer Invoices / Receipts / Credit Notes (ADR-038 §3)
POST   /finance/ar/invoices                                    (create draft invoice)
POST   /finance/ar/invoices/:id/issue                          (issue invoice)
POST   /finance/ar/receipts                                    (create receipt)
POST   /finance/ar/credit-notes                                (create credit note)

# Accounting Periods
GET    /finance/periods                                        (list)
POST   /finance/periods                                        (create period)
POST   /finance/periods/:id/status                             (open/soft_close/close/reopen)

# Exceptions Queue
GET    /finance/exceptions                                     (list open exceptions)

# Controlled GL Posting Services (ADR-038 §7)
POST   /finance/sales/post-from-order/:orderId                 (post sales from order)
POST   /finance/ap/invoices/:id/post                           (post AP invoice)
POST   /finance/cogs/events/:id/post                           (post COGS event)
```

All 30 routes require `finance.manage` OR `admin.access` permission.
Branch scope enforced via `current_user_has_branch_access`.

### 15. Deferred Items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Per-branch pricing (different menu prices per branch) | Franchise expansion OR >5 branches (currently 2 with single-price catalog — ADR-020) |
| Automated GL posting from kitchen consume (currently manual `POST /finance/cogs/events/:id/post`) | Daily posting volume >50 entries per branch OR owner request for real-time COGS |
| Automated GL posting from PO/GRN/invoice (currently manual `POST /finance/ap/invoices/:id/post`) | Daily AP posting volume >20 entries per branch OR owner request for real-time AP |
| Automated GL posting from orders (currently manual `POST /finance/sales/post-from-order/:orderId`) | Daily sales posting volume >50 entries per branch OR owner request for real-time revenue |
| Multi-currency consolidation (PKR only today) | First foreign-currency transaction (e.g., USD supplier payment) |
| Inter-branch cash/account transfers (currently each branch is independent) | Franchise expansion OR HQ-level treasury function requested |
| Fiscal-year close automation (manual period close today) | First fiscal-year end (owner request for year-end close checklist) |
| Bank reconciliation (statement import + matching to `finance_cash_register_entries`) | Owner request OR >5 bank accounts per branch |
| Fixed-asset depreciation (no depreciation schedule table) | First capital purchase >100,000 PKR |
| `finance` role seed (only `finance.manage` permission is seeded today) | First dedicated finance-team hire requiring a distinct role |
| Daily snapshot table for historical metric comparison | Query latency >2s for any analytics metric (ADR-022 §6 alternative) |
| Pre-computed P&L cache for Owner Workspace dashboard | P&L RPC latency >1s at current data volume |
| Multi-level approval workflow for high-value journal entries | First manual journal entry >500,000 PKR |
| Recurring journal entries (e.g., monthly rent) | >5 recurring entries per branch per month |
| Budget vs actual variance reports | Owner request for annual budgeting |

---

## Consequences

**Positive:**

- **Double-entry integrity.** Every journal entry is balanced at the
  row level (one-side-positive CHECK) and at the entry level (sum-of-
  debits = sum-of-credits enforced by `create_journal_entry_atomic`).
- **Tamper-evident.** ADR-011 triggers block all UPDATE/DELETE on
  posted entries at the DB layer — no application bug or rogue script
  can silently corrupt accounting history.
- **Reversible.** The `reverse_journal_entry_atomic` RPC provides the
  documented reversal flow: equal-and-opposite posted entry + original
  voided + linkage. Auditors can trace every reversal.
- **Idempotent controlled posts.** `finance_postings` UNIQUE on
  `(source_module, source_id)` makes every controlled GL post safe to
  retry — no duplicate entries on network failure.
- **Period-gated.** Closed accounting periods reject new posts at the
  DB layer (via `finance_assert_period_allows_posting` called from
  `create_journal_entry_atomic`). Soft-close lets BMs mark a period
  for review while still allowing corrections.
- **Branch-scoped.** Every table is `branch_id`-scoped with RLS.
  Cross-branch posting is forbidden by `create_journal_entry_atomic`.
- **Query-time statements.** Trial balance, P&L, balance sheet, cash
  flow all compute live in <500ms — no stale materialized views to
  explain away.
- **Mapping-required honesty.** Controlled GL posts record a
  `finance_exception` instead of throwing when a mapping is missing
  or a period is closed. The calling module (orders, AP, COGS, payroll)
  is never blocked by GL issues.

**Negative:**

- **No multi-currency.** All amounts are PKR. A foreign-currency
  supplier payment would require manual conversion + a `currency` +
  `exchange_rate` column on `journal_entry_lines` (DEFERRED).
- **No inter-branch transfers.** Each branch's CoA is independent.
  HQ-level consolidation requires exporting each branch's trial
  balance and rolling up in a spreadsheet (DEFERRED).
- **Manual period close.** BM must explicitly close each period — no
  scheduled job auto-closes on month-end (DEFERRED).
- **Controlled GL posts are manual.** A BM must invoke
  `POST /finance/sales/post-from-order/:orderId` for each order. This
  is intentional (operator reviews before posting) but means GL can
  lag behind operations by hours or days.
- **No bank reconciliation.** Bank statements must be reconciled
  manually against `finance_cash_register_entries` (DEFERRED).

**Neutral:**

- The CoA is branch-scoped, like inventory and procurement. A future
  multi-branch consolidation layer would sit above the per-branch CoA
  and roll up by `(account_code, account_type)`.

---

## Related

- [ADR-002](./ADR-002-settings-versioning-rollback.md) — Settings Versioning (period close config)
- [ADR-007](./ADR-007-delivery-state-machine.md) — Delivery State Machine (state-machine + append-only audit pattern)
- [ADR-010](./ADR-010-cod-financial-ownership.md) — COD Financial Ownership (auto-posts to GL via `finance_postings`)
- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability (DB triggers on `journal_entries` + `journal_entry_lines`)
- [ADR-012](./ADR-012-domain-event-audit.md) — Domain Event Audit (finance events can feed into this in future)
- [ADR-019](./ADR-019-rbac-authorization-principal.md) — RBAC (`finance.manage` permission)
- [ADR-022](./ADR-022-reports-analytics-framework.md) — Reports & Analytics (`finance` module delegates to `FinanceService`)
- [ADR-033](./ADR-033-inventory-stock-master-movement-ledger-contract.md) — Inventory Stock Master (`inventory_asset` GL account)
- [ADR-034](./ADR-034-recipe-bom-cogs-costing-contract.md) — Recipe/BOM & COGS (`cogs` GL account + `postCogsEvent`)
- [ADR-035](./ADR-035-procurement-suppliers-grn-contract.md) — Procurement, Suppliers & GRN (`ap_control` GL account + `postSupplierInvoice`)
- [ADR-037](./ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md) — Cash Recon, Z-Report & COD (Phase 11 sibling — cash-side GL posts)
- [ADR-038](./ADR-038-tax-ar-ap-cogs-expense-posting-contract.md) — Tax, AR, AP, COGS & Expense Posting (Phase 11 sibling — controlled GL posting services)
- `supabase/migrations/20260730260000_finance_core.sql` — CoA + journal_entries + lines + 3 RPCs
- `supabase/migrations/20260731010000_finance_account_mappings.sql` — account mappings (5 → 15 purposes)
- `supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql` — `finance_postings` + reversal RPC
- `supabase/migrations/20260731190000_rc4_finance_phase2_foundation.sql` — Phase 2: periods + tax + AR + cash accounts + exceptions + 2 more RPCs
- `supabase/migrations/20260731210000_rc4_payroll_finance_mapping_purposes.sql` — 5 payroll mapping purposes
- `supabase/migrations/20260814180100_adr_011_accounting_immutability.sql` — ADR-011 immutability triggers
- `supabase/migrations/20260815000000_adr_011_fix_bypass_delete.sql` — FU-1 immutability bypass fix
- `backend/api/src/services/finance/management.ts` — `FinanceService` (CoA + journal + statements)
- `backend/api/src/services/finance/operations.ts` — `FinanceOperationsService` (mappings + cash recon + expenses + reversal)
- `backend/api/src/services/finance/phase2.ts` — `FinancePhase2Service` (tax + AR + periods + exceptions + controlled posts)
- `backend/api/src/services/finance/ar-calc.ts` — AR allocation helpers
- `backend/api/src/services/finance/tax-calc.ts` — Tax calculation helpers
- `backend/api/src/modules/admin/finance.ts` — admin routes (30 routes)
- `apps/website/client/src/pages/admin/AdminFinance.tsx` — admin frontend
- `apps/website/client/src/components/admin/finance/` — 8 finance components
