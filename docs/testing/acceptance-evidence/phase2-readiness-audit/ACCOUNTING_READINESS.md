# Phase 2 Readiness Audit — Accounting Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current Financial Truth (Repository Evidence)

### Existing Finance Tables

| Table | Migration | Purpose | Notes |
|---|---|---|---|
| `chart_of_accounts` | `20260730260000` | CoA with account types | EXISTS |
| `journal_entries` | `20260730260000` | Double-entry journal header | EXISTS; has `reversed_by_journal_id`, `reverses_journal_id` |
| `journal_lines` | `20260730260000` | Journal line items (debit/credit) | EXISTS |
| `finance_postings` | `20260731040000` | Source → journal linkage; idempotency | EXISTS; `UNIQUE (source_module, source_id)` |
| `cash_reconciliations` | `20260731020000` | Cash reconciliation records | EXISTS |
| `expense_claims` | `20260731030000` | Staff expense claims | EXISTS |
| `finance_account_mappings` | `20260731010000` | Source → CoA account mappings | EXISTS |
| `pos_z_report_events` | `20260730210000` | POS Z-Report records | EXISTS |
| `supplier_invoices` | `20260730270000` | AP invoice records | EXISTS |
| `supplier_payments` | `20260730270000` | AP payment records | EXISTS |
| `three_way_match` | `20260730280000` | PO/GRN/Invoice matching | EXISTS |
| `inventory_recipes` / COGS tables | `20260731180000` | Recipe-based COGS | EXISTS (rc4_inventory_recipes_cogs) |
| `payroll_periods`, `payroll_runs`, `payroll_line_items` | `20260731080000` | Payroll calculation | EXISTS |
| `rc4_finance_phase2` tables | `20260731190000` | Phase 2 finance extensions | EXISTS |

### Existing Finance APIs

| Endpoint | Notes |
|---|---|
| `GET /api/v1/admin/finance/*` | Chart of accounts, journals, TB, P&L, cash, AP |
| `POST /api/v1/admin/finance/journals` | Create journal |
| `POST /api/v1/admin/finance/journals/:id/reverse` | Reverse journal (`reverse_journal_entry_atomic`) |

### Existing Capabilities

- Double-entry journal: **EXISTS** (journal_entries + journal_lines)
- Posting idempotency: **EXISTS** (`finance_postings` UNIQUE constraint)
- Journal reversal: **EXISTS** (`reverse_journal_entry_atomic` function; links via `reversed_by_journal_id`)
- CoA: **EXISTS** (chart_of_accounts)
- Cash reconciliation: **EXISTS** (cash_reconciliations)
- AP (supplier invoices + payments): **EXISTS**
- Three-way matching: **EXISTS**
- COGS foundation: **EXISTS** (inventory_recipes_cogs migration)
- Payroll calculation: **EXISTS**

### Current Gaps

| Gap | Impact |
|---|---|
| No posting periods | Cannot close books for a period; no fiscal period lock |
| No period-close workflow | Postings can be made to any date retroactively |
| No revenue recognition automation | Order completed → revenue not automatically posted |
| No tax posting engine | Tax labels exist; no tax journal entries posted |
| No discount posting | Discounts visible in orders; not posted to CoA |
| No refund posting | Refunds not automatically posted |
| No COD journal posting | COD collected but not journalized |
| No payroll finance posting | Payroll runs calculated but not posted to journals |
| No COGS automatic posting | Recipe consumption exists; no automatic COGS journal |
| P&L, BS, CF reports: partial UI honesty (RC6-UI-01) | Some report tabs show "Coming Soon" banners |
| No waste posting | Inventory waste not posted |
| No period variance analysis | No budget vs. actual |

---

## Required Decisions (Phase 2.5)

**Operational event to accounting entry mapping:**

| Event | Debit Account | Credit Account |
|---|---|---|
| Order paid (cash) | Cash | Revenue |
| Order paid (card) | Receivable (card) | Revenue |
| COD collected | Cash | Revenue |
| Supplier invoice received | Inventory / Expense | Accounts Payable |
| Supplier payment made | Accounts Payable | Cash / Bank |
| Staff expense approved | Expense | Accounts Payable / Cash |
| Inventory adjustment (loss) | COGS / Shrinkage | Inventory |
| COGS on order | COGS | Inventory |
| Payroll approved | Salaries Expense | Payroll Payable |
| Payroll paid | Payroll Payable | Cash / Bank |

**Source-document authority:**
- Order is the source document for revenue
- Supplier invoice is the source document for AP
- Z-Report is the source document for cash reconciliation
- Payroll run is the source document for payroll posting

**Double-entry model:**
- Existing model is double-entry (journal_lines with debit/credit amounts)
- All postings must balance (sum of debits = sum of credits)
- `reverse_journal_entry_atomic` correctly mirrors lines

**Posting idempotency:**
- `finance_postings` table with `UNIQUE (source_module, source_id)` — EXISTS
- All new postings must go through `finance_postings` to prevent double-posting

**Reversal model:**
- Mirror-entry reversal: new journal with opposite sign lines — EXISTS
- Original journal marked `reversed_by_journal_id` — EXISTS
- Reversal reason required (non-nullable)

**Period locking:**
- Proposed: `posting_periods` table
- Closed period: no new journals dated within the period
- Reopen: requires super-admin approval; audit log entry required

**Permissions and approvals:**
- Journal creation: super-admin, finance role (proposed)
- Journal reversal: super-admin only
- Period close: super-admin
- Period reopen: Founder authorization required

**Branch vs. organization books:**
- Primary books are per-branch
- Consolidated P&L is org-level read (super-admin)
- Each journal_entry has branch_id

**Currency:**
- PKR (Pakistan Rupee) — single currency
- No multi-currency in Phase 2

**Tax ownership:**
- Tax labels exist on orders
- Phase 2.5 must add tax journal posting
- Tax collected = Credit Tax Liability; not Revenue
- Tax filing/submission is out of scope

**Inventory valuation method:**
- Proposed: AVCO (Average Cost) for simplicity
- FIFO as future option (deferred)

**Incomplete recipe behavior:**
- If recipe not found for an order item → do not fail the order
- Log COGS gap; alert branch-manager; post estimated COGS or leave unposted for manual correction

**Historic backfill:**
- No automatic backfill of pre-Phase-2.5 orders
- From Phase 2.5 go-live date: all new events are automatically posted
- Pre-go-live historical postings: manual process with Founder authorization

**Reconciliation:**
- Cash reconciliation: Z-Report cash vs. order cash payments vs. opening float
- `cash_reconciliations` table exists — extend for period reference

**Immutable posted entries:**
- `journal_entries` with `status = 'posted'` must not be updated or deleted
- Reversals create new entries; never mutate original
- RLS policy must prevent UPDATE/DELETE on posted journals (except via atomic reverse function with security definer)

**Export boundaries:**
- P&L export: super-admin
- TB export: super-admin
- Journal export: super-admin
- No customer PII in financial exports

---

## Proposed Data Model

### `posting_periods` (new)
```sql
id uuid PRIMARY KEY
branch_id uuid REFERENCES branches(id) NOT NULL
period_name VARCHAR(50) NOT NULL -- e.g., 'August 2026'
period_start DATE NOT NULL
period_end DATE NOT NULL
status TEXT CHECK (status IN ('open', 'closed', 'reopened')) DEFAULT 'open'
closed_by uuid REFERENCES users(id)
closed_at TIMESTAMPTZ
reopened_by uuid REFERENCES users(id)
reopened_at TIMESTAMPTZ
reopen_reason TEXT
UNIQUE (branch_id, period_start, period_end)
```

### `period_close_log` (new)
```sql
id uuid PRIMARY KEY
period_id uuid REFERENCES posting_periods(id) NOT NULL
action TEXT CHECK (action IN ('close', 'reopen')) NOT NULL
actor_id uuid REFERENCES users(id) NOT NULL
created_at TIMESTAMPTZ NOT NULL
reason TEXT
```

Add FK to `journal_entries`:
```sql
ALTER TABLE journal_entries ADD COLUMN period_id uuid REFERENCES posting_periods(id);
```

---

## Readiness Assessment

| Item | Status |
|---|---|
| Chart of accounts | EXISTS |
| Double-entry journals | EXISTS |
| Posting idempotency | EXISTS |
| Journal reversal | EXISTS |
| Cash reconciliation tables | EXISTS |
| AP (invoices + payments) | EXISTS |
| Three-way matching | EXISTS |
| COGS foundation | EXISTS (partial) |
| Payroll calculation | EXISTS |
| Posting periods | MISSING |
| Period-close workflow | MISSING |
| Revenue recognition automation | MISSING |
| Tax posting | MISSING |
| COD journal posting | MISSING |
| Payroll posting | MISSING |
| Automatic COGS posting | MISSING |
| ADR-010 (period-close model) required | YES |
| ADR-011 (accounting immutability) required | YES |
| Phase 2.5 maturity | PARTIAL_LIVE → target LIVE |

**Verdict: READY TO PLAN — ADR-010 and ADR-011 must be accepted. The existing double-entry foundation is solid; the primary gap is period-close, automation, and posting completeness.**
