# ADR-038: Tax, AR, AP, COGS & Expense Posting Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.6.0` (closes Phase 11 — Finance and Reporting, ADR-038 of 3)

---

## Context

Telepizza's tax + accounts-receivable (AR) + accounts-payable (AP) +
COGS + expense surface was shipped across four waves between July and
August 2026:

1. **RC3 Finance Core** (`20260730260000_finance_core.sql`) —
   creates the GL foundation (ADR-036) including `expense_claims`
   placeholder columns.
2. **RC3 Expense Claims** (`20260731030000_expense_claims.sql`, 85
   lines) — creates `expense_claims` (6-state machine) +
   `expense_claim_events` audit.
3. **RC3 Posting Idempotency** (`20260731040000_finance_posting_and_ap_idempotency.sql`,
   350 lines) — adds `finance_postings` UNIQUE table + extends
   `supplier_invoices` (due_date + exception approval) +
   `supplier_payments.idempotency_key` UNIQUE + the 8-arg
   `record_supplier_payment_atomic` RPC (with 7-arg legacy overload
   for backward compatibility).
4. **RC4 Finance Phase 2** (`20260731190000_rc4_finance_phase2_foundation.sql`,
   622 lines) — creates `tax_definitions` + the full AR surface
   (`customer_invoices` 7-state + `customer_invoice_lines` +
   `customer_receipts` + `customer_receipt_allocations` +
   `customer_credit_notes` 3-state).
5. **RC4 COGS Events** (`20260731180000_rc4_inventory_recipes_cogs.sql`,
   683 lines, ADR-034) — creates `inventory_cogs_events` (4-state
   cost_source + 4-state status) + `inventory_consumption_events`
   (idempotent + reversible).

The backend service layer
(`backend/api/src/services/finance/phase2.ts`, 1202 lines +
`backend/api/src/services/finance/ar-calc.ts`, 49 lines +
`backend/api/src/services/finance/tax-calc.ts`, 68 lines) exposes the
full tax + AR + AP + COGS posting surface. Admin router
(`backend/api/src/modules/admin/finance.ts`, 913 lines) mounts 12 of
its 30 routes under `/api/v1/admin/finance/{tax-definitions, ar/*,
expenses/*, supplier-payments/*, sales/post-from-order/*, ap/invoices/*,
cogs/events/*}`.

However, the tax + AR + AP + COGS + expense data model was never
elevated to a formal ADR. The deferral of seeded jurisdiction rates,
automated COGS GL posting, weighted-average/FIFO costing, `refunds`
table, partial-refund API, and discounts master table is documented
piecemeal across ADR-018 §"Negative consequences", ADR-024 §6,
ADR-034 §10, and ADR-035 §9. This ADR consolidates those deferrals
into a single accepted decision with explicit trigger conditions.

This ADR formally accepts the as-built tax + AR + AP + COGS + expense
posting model as the canonical Phase 11 contract.

---

## Decision

### 1. Tax Definitions (`tax_definitions`)

`tax_definitions` (migration `20260731190000` lines 100-150) is the
configurable tax-rate directory. Each row is one tax rate for one
branch (or globally if `branch_id` is null) with effective dates.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` NULLABLE | Branch scope (null = global default; branch-specific overrides take precedence) |
| `name` | varchar(120) NOT NULL | Tax name (e.g., `PK GST Standard`, `PK SST Restaurant`) |
| `code` | varchar(40) NOT NULL | Tax code (e.g., `GST`, `SST`) |
| `rate` | numeric(5,4) NOT NULL CHECK ≥ 0 AND ≤ 1 | Tax rate as decimal (e.g., 0.17 for 17%) |
| `tax_basis` | text NOT NULL DEFAULT `'exclusive'` CHECK ∈ {`exclusive`, `inclusive`} | Exclusive = tax added on top; Inclusive = tax included in price |
| `classification` | text NOT NULL CHECK ∈ {`input`, `output`} | Input = tax paid on purchases (recoverable); Output = tax collected on sales (payable) |
| `effective_from` | date NOT NULL | Effective start date (inclusive) |
| `effective_to` | date NULLABLE | Effective end date (inclusive; null = open-ended) |
| `payable_account_id` | uuid FK → `chart_of_accounts(id)` NULLABLE | Output tax: GL account for tax payable to authority |
| `receivable_account_id` | uuid FK → `chart_of_accounts(id)` NULLABLE | Input tax: GL account for tax receivable from authority |
| `is_active` | boolean NOT NULL DEFAULT `false` | Active flag (defaults FALSE — owner must explicitly activate) |
| `description` | text | Free-text description |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, code, effective_from)`.

**Why `is_active` defaults FALSE?** Telepizza has not yet finalized
its tax registration status with the FBR (Federal Board of Revenue,
Pakistan). Defaulting to FALSE ensures no tax is computed until the
owner explicitly activates a rate after registration. Seeded
jurisdiction rates (PK GST 17% / SST 13%) are DEFERRED (§8).

**Why both `exclusive` and `inclusive` basis?** Different tax
jurisdictions and product categories use different bases. Pakistan's
GST on restaurant sales is exclusive (added on top of menu price);
some promotional items may be inclusive (tax included in advertised
price). The `tax_basis` column lets the same `tax_definitions` table
support both modes. The `tax-calc.ts` helper
(`backend/api/src/services/finance/tax-calc.ts`, 68 lines) computes
the correct tax based on the basis.

### 2. Tax Calculation Helpers (`tax-calc.ts`)

`backend/api/src/services/finance/tax-calc.ts` (68 lines) exports 4
pure helpers:

- `roundMoney(amount)` — round to 2 decimal places using half-up
  rounding (the accounting standard). JavaScript's `Math.round` uses
  round-half-to-even (banker's rounding), which would cause 1-paisa
  variances; `roundMoney` corrects this.
- `isTaxEffectiveOn(taxDef, date)` — returns true if `date` falls
  within `[effective_from, effective_to]` and `is_active = true`.
- `calculateLineTax(lineAmount, taxDef)` — computes tax for one line
  item. For `exclusive` basis: `tax = lineAmount × rate`. For
  `inclusive` basis: `tax = lineAmount − (lineAmount / (1 + rate))`.
- `calculateInvoiceTaxTotals(lines, taxDefs)` — aggregates per-line
  tax into per-tax-code subtotals + grand total.

These helpers are used by the order-pricing engine (ADR-020), the AR
invoice issuance service (§3), and the expense-claim GL posting
service (§6).

### 3. Accounts Receivable (AR) — Customer Invoices

`customer_invoices` (migration `20260731190000` lines 200-260) is the
AR invoice header. Each invoice is issued against an order (or
manually for non-order revenue).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `customer_id` | uuid FK → `customers(id)` NULLABLE | Customer (null for walk-in) |
| `source_order_id` | uuid FK → `orders(id)` NULLABLE | Source order (null for manual invoice) |
| `invoice_number` | varchar(40) NOT NULL | Invoice number (UNIQUE per branch) |
| `invoice_date` | date NOT NULL | Invoice date (Asia/Karachi) |
| `due_date` | date NOT NULL | Payment due date |
| `subtotal` | numeric(14,2) NOT NULL CHECK ≥ 0 | Pre-tax subtotal |
| `tax_amount` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Total tax |
| `discount_amount` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Total discount |
| `total_amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Total (subtotal + tax − discount) |
| `paid_amount` | numeric(14,2) NOT NULL DEFAULT 0 | Amount paid to date |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `issued`, `partially_paid`, `paid`, `overdue`, `voided`} | 7-state |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, invoice_number)`.

**7-state machine:**

```text
draft → issued          (BM issues invoice to customer)
issued → partially_paid (customer pays part of the total)
partially_paid → paid   (customer pays the remaining balance)
issued → paid           (customer pays in full at once)
issued → overdue        (system marks past due_date with unpaid balance)
paid → voided           (rare — reversal of a mistakenly-paid invoice)
issued → voided         (cancel before payment)
```

`customer_invoice_lines` (lines 280-310) stores the per-line items
(menu_item_id, quantity, unit_price, line_total, tax_amount,
tax_definition_id).

### 4. Customer Receipts + Allocations

`customer_receipts` (migration `20260731190000` lines 330-380) records
customer payments against invoices. Each receipt can be allocated
across multiple invoices.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `customer_id` | uuid FK → `customers(id)` | Customer |
| `receipt_number` | varchar(40) NOT NULL | Receipt number |
| `receipt_date` | date NOT NULL | Receipt date |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Total receipt amount |
| `unapplied_amount` | numeric(14,2) NOT NULL DEFAULT 0 | Amount not yet allocated to invoices |
| `payment_method` | text NOT NULL CHECK ∈ {`cash`, `bank_transfer`, `cheque`, `other`} | Payment method |
| `reference_number` | varchar(120) | Payment reference |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` | timestamptz | Creation timestamp |

UNIQUE on `(branch_id, receipt_number)`.

`customer_receipt_allocations` (lines 400-440) records how a receipt
is split across invoices. Each row allocates `amount` to one
`customer_invoice_id`. Sum of allocations ≤ receipt.amount; the
remainder stays as `unapplied_amount` on the receipt.

The `ar-calc.ts` helper (`backend/api/src/services/finance/ar-calc.ts`,
49 lines) provides:
- `classifyInvoiceStatus(invoice, asOfDate)` — returns `paid`,
  `partially_paid`, `overdue`, or `open` based on `paid_amount` vs
  `total_amount` vs `due_date`.
- `allocateReceiptAmount(invoices, receiptAmount)` — FIFO allocation
  of a receipt amount across the oldest unpaid invoices.

### 5. Customer Credit Notes

`customer_credit_notes` (migration `20260731190000` lines 460-510) is
the credit-note lifecycle for AR. A credit note reduces a customer's
outstanding balance (refund, discount-after-the-fact, write-off).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `customer_id` | uuid FK → `customers(id)` | Customer |
| `original_invoice_id` | uuid FK → `customer_invoices(id)` NULLABLE | Original invoice being credited |
| `credit_note_number` | varchar(40) NOT NULL | Credit note number |
| `credit_note_date` | date NOT NULL | Credit note date |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Credit amount |
| `reason` | text NOT NULL | Reason (refund, post-billing discount, write-off) |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `issued`, `voided`} | 3-state |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, credit_note_number)`.

**3-state machine:**

```text
draft → issued   (BM issues credit note to customer)
issued → voided  (reverse a mistakenly-issued credit note)
```

When a credit note is `issued`, the service layer:
1. Reduces the original invoice's `paid_amount` (if linked) or
   increases the customer's `credit_balance`.
2. Posts to GL: DR `sales_discounts` (or `refunds`) / CR `ar_control`.

### 6. Expense Claims (`expense_claims`)

`expense_claims` (migration `20260731030000` lines 10-50) is the
6-state expense reimbursement workflow. A staff member submits an
expense claim, a BM approves, an SA pays, and the system posts to GL.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `expense_number` | varchar(40) NOT NULL | Expense claim number |
| `claimant_user_id` | uuid FK → `users(id)` | Claiming staff member |
| `category` | varchar(80) NOT NULL | Expense category (e.g., `rent`, `utilities`, `marketing`, `misc`) |
| `description` | text NOT NULL | Description |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Claim amount |
| `payment_method` | text NOT NULL DEFAULT `'cash'` CHECK ∈ {`cash`, `bank_transfer`, `cheque`, `other`} | Payment method |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `submitted`, `approved`, `rejected`, `paid`, `voided`} | 6-state |
| `posting_status` | text NOT NULL DEFAULT `'pending'` CHECK ∈ {`pending`, `posted`, `failed`, `skipped`, `reversed`} | GL posting status |
| `journal_entry_id` | uuid FK → `journal_entries(id)` NULLABLE | Posted journal entry |
| `idempotency_key` | varchar(80) NULLABLE UNIQUE | Idempotency key |
| `notes` | text | Free-text notes |
| `submitted_at` | timestamptz NULLABLE | Submission timestamp |
| `approved_by` | uuid FK → `users(id)` NULLABLE | Approver |
| `approved_at` | timestamptz NULLABLE | Approval timestamp |
| `paid_at` | timestamptz NULLABLE | Payment timestamp |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, expense_number)`.

**6-state machine:**

```text
draft → submitted    (claimant submits)
submitted → approved (BM approves)
submitted → rejected (BM rejects with notes)
approved → paid      (SA pays; triggers GL post)
rejected → draft     (claimant edits + re-submits)
draft → voided       (claimant discards)
paid → voided        (rare — reversal of a mistakenly-paid claim)
```

When the claim transitions `approved → paid`, the service layer
calls `tryPostExpenseJournal` (in `finance/operations.ts`):
- DR `expense_category:<category>` (or generic `expense_category:misc` if specific mapping missing)
- CR `cash_on_hand` (if cash) or `cash_in_bank` (if bank_transfer)

The post is idempotent via `finance_postings` UNIQUE on
`('expense_claim', expense_claim_id)`. If the `expense_category:*`
mapping is missing, the system falls back to the generic
`expense_category:misc` mapping; if that is also missing, a
`finance_exception` is recorded and the payment proceeds without GL
(the BM sees the exception in the finance work queue).

### 7. Supplier Invoices (3-way Match Foundation)

`supplier_invoices` (migration `20260730270000` + extended by
`20260731040000`) is the AP invoice header. Each invoice references a
PO and is matched against GRN(s) for 3-way match (PO + GRN + Invoice).

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `supplier_id` | uuid FK → `suppliers(id)` | Supplier |
| `purchase_order_id` | uuid FK → `purchase_orders(id)` NULLABLE | Source PO (optional — direct invoices without PO allowed) |
| `invoice_number` | varchar(120) NOT NULL | Supplier's invoice number |
| `invoice_date` | date NOT NULL | Invoice date |
| `due_date` | date NULLABLE | Payment due date (added by `20260731040000`) |
| `subtotal` | numeric(14,2) NOT NULL CHECK ≥ 0 | Pre-tax subtotal |
| `tax_amount` | numeric(14,2) NOT NULL DEFAULT 0 CHECK ≥ 0 | Tax amount |
| `total_amount` | numeric(14,2) NOT NULL CHECK ≥ 0 | Total (subtotal + tax) |
| `paid_amount` | numeric(14,2) NOT NULL DEFAULT 0 | Amount paid to date |
| `status` | text NOT NULL DEFAULT `'draft'` CHECK ∈ {`draft`, `pending_approval`, `approved`, `paid`, `disputed`, `cancelled`} | 6-state |
| `matched_grn_id` | uuid FK → `goods_receiving(id)` NULLABLE | Matched GRN (for 3-way match) |
| `match_status` | text NOT NULL DEFAULT `'unmatched'` CHECK ∈ {`unmatched`, `matched`, `variance`, `exception_approved`} | 4-state match |
| `variance_amount` | numeric(14,2) NOT NULL DEFAULT 0 | Variance vs PO+GRN |
| `exception_approved_at` | timestamptz NULLABLE | Exception approval timestamp |
| `exception_approved_by` | uuid FK → `users(id)` NULLABLE | Exception approver |
| `exception_reason` | text NULLABLE | Exception reason |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` / `updated_at` | timestamptz | Timestamps |

UNIQUE on `(branch_id, invoice_number)`.

**6-state invoice + 4-state match_status** (full lifecycle documented
in ADR-035 §6).

### 8. Supplier Payments + Atomic GL Posting

`supplier_payments` (migration `20260730270000` + extended by
`20260731040000`) records payments made to suppliers against invoices.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `supplier_invoice_id` | uuid FK → `supplier_invoices(id)` ON DELETE RESTRICT | Source invoice |
| `supplier_id` | uuid FK → `suppliers(id)` | Denormalized for query efficiency |
| `payment_date` | date NOT NULL | Payment date |
| `amount` | numeric(14,2) NOT NULL CHECK > 0 | Payment amount |
| `payment_method` | text NOT NULL DEFAULT `'bank_transfer'` CHECK ∈ {`cash`, `bank_transfer`, `cheque`, `other`} | Payment method |
| `reference_number` | varchar(120) | Payment reference |
| `idempotency_key` | varchar(80) NULLABLE UNIQUE | Idempotency key (added by `20260731040000`) |
| `notes` | text | Free-text notes |
| `created_by` | uuid FK → `users(id)` | Author |
| `created_at` | timestamptz | Creation timestamp |

The `record_supplier_payment_atomic` SECURITY DEFINER RPC (migration
`20260731040000` lines 150-280) has two overloads:

- **8-arg overload (canonical):** `(branch_id, supplier_invoice_id,
  supplier_id, payment_date, amount, payment_method, reference_number,
  idempotency_key)`. Used by new code.
- **7-arg legacy overload:** omits `idempotency_key`. Kept for
  backward compatibility with code written before the hardening
  migration. Internally generates a synthetic idempotency key from
  `(supplier_invoice_id, payment_date, amount)`.

The RPC performs in one transaction:
1. Checks `finance_postings` for existing `('supplier_payment',
   supplier_payment_id)` — if present, returns existing journal entry
   (idempotent).
2. INSERTs the `supplier_payments` row (idempotent via UNIQUE on
   `idempotency_key`).
3. Updates the parent `supplier_invoices.paid_amount` and
   `supplier_invoices.status` (→ `paid` if fully paid, `partially_paid`
   if partial).
4. Calls `create_journal_entry_atomic` with:
   - DR `ap_control` for `amount` (reduces the payable)
   - CR `cash_on_hand` (if cash) or `cash_in_bank` (if bank_transfer)
5. INSERTs `finance_postings ('supplier_payment', supplier_payment_id,
   journal_entry_id)`.

If any mapping is missing, the RPC records a `finance_exception` and
returns without throwing — the payment is recorded but GL is not
posted (the BM sees the exception in the finance work queue).

### 9. COGS Events (`inventory_cogs_events`)

`inventory_cogs_events` (migration `20260731180000` lines 400-460,
ADR-034 §5) records cost-of-goods-sold per consumption event. Each
consumption event (kitchen preparing an order) produces one COGS
event.

| Column | Type | Purpose |
|---|---|---|
| `id` | uuid PK | Internal row ID |
| `branch_id` | uuid FK → `branches(id)` | Branch scope |
| `consumption_event_id` | uuid FK → `inventory_consumption_events(id)` | Source consumption event |
| `menu_item_id` | uuid FK → `menu_items(id)` | Menu item produced |
| `quantity` | numeric(14,3) NOT NULL CHECK > 0 | Quantity produced |
| `total_cost` | numeric(14,2) NOT NULL DEFAULT 0 | Total cost (sum of ingredient costs) |
| `unit_cost` | numeric(14,4) NOT NULL DEFAULT 0 | `total_cost` / `quantity` |
| `cost_source` | text NOT NULL DEFAULT `'last_known'` CHECK ∈ {`last_known`, `weighted_average`, `fifo`, `manual`} | Costing method |
| `status` | text NOT NULL DEFAULT `'pending'` CHECK ∈ {`pending`, `posted`, `deferred`, `skipped`} | GL posting status |
| `journal_entry_id` | uuid FK → `journal_entries(id)` NULLABLE | Posted journal entry |
| `idempotency_key` | varchar(80) NULLABLE UNIQUE | Idempotency key |
| `posted_at` | timestamptz NULLABLE | GL post timestamp |
| `created_at` | timestamptz | Creation timestamp |

**`cost_source` values (4 — only `last_known` wired today):**

- `last_known` — uses `inventory_items.cost_price` (the last known
  purchase price). This is the only wired method today.
- `weighted_average` — uses the weighted-average cost over a period.
  DEFERRED (§8).
- `fifo` — uses First-In-First-Out costing. DEFERRED (§8).
- `manual` — cost manually set by the BM. DEFERRED (§8).

**`status` values (4):**

- `pending` — event created, not yet posted to GL.
- `posted` — event posted to GL via `postCogsEvent` service.
- `deferred` — GL post skipped due to missing mapping or closed period;
  recorded as `finance_exception`.
- `skipped` — GL post intentionally skipped (e.g., zero-cost event).

### 10. Controlled GL Posting Services (5 services)

The `FinancePhase2Service` (migration `backend/api/src/services/finance/phase2.ts`,
1202 lines) exposes 5 controlled GL posting methods (the same 4-step
pattern as ADR-036 §10):

| Method | Source | GL Post | Endpoint |
|---|---|---|---|
| `postSalesFromOrder(orderId)` | `orders` | DR `ar_control` (or `cash_on_hand` if paid) / CR `sales_revenue` + `output_tax` − `sales_discounts` + `delivery_fee_revenue` | `POST /finance/sales/post-from-order/:orderId` |
| `postSupplierInvoice(invoiceId)` | `supplier_invoices` | DR `inventory_asset` (or `expense_category:*`) / CR `ap_control` + `input_tax` | `POST /finance/ap/invoices/:id/post` |
| `postCogsEvent(cogsEventId)` | `inventory_cogs_events` | DR `cogs` / CR `inventory_asset` | `POST /finance/cogs/events/:id/post` |
| `postPayrollAccrual(payrollRunId)` | `hr_payroll_runs` | DR `salary_expense` + `allowance_expense` / CR `payroll_payable` + `payroll_tax_payable` + `payroll_deduction_payable` | (called by payroll service directly) |
| `postPayrollSettlement(payrollRunId)` | `hr_payroll_runs` | DR `payroll_payable` / CR `cash_in_bank` | (called by payroll service directly) |

All 5 follow the 4-step pattern (mapping-required + period-gated +
idempotent + atomic — see ADR-036 §10 for full description). The 3
admin-facing endpoints are manual-trigger: the BM reviews the source
record and invokes the endpoint when ready to post to GL.

### 11. Admin API Surface (12 routes)

```text
# backend/api/src/modules/admin/finance.ts (mounted under /api/v1/admin/finance)

# Tax Definitions
GET    /finance/tax-definitions                                (list)
PUT    /finance/tax-definitions                                (upsert)

# AR — Customer Invoices
POST   /finance/ar/invoices                                    (create draft invoice)
POST   /finance/ar/invoices/:id/issue                          (issue invoice: draft → issued)

# AR — Customer Receipts
POST   /finance/ar/receipts                                    (create receipt + auto-allocate)

# AR — Customer Credit Notes
POST   /finance/ar/credit-notes                                (create credit note)

# AP — Supplier Payments (controlled GL post)
POST   /finance/supplier-payments/:id/post                     (post supplier payment to GL)

# Expense Claims (6-state workflow)
GET    /finance/expenses                                       (list)
POST   /finance/expenses                                       (create draft)
PATCH  /finance/expenses/:id                                   (update draft)
POST   /finance/expenses/:id/transition                        (submit/approve/reject/pay/void)

# Controlled GL Posting Services
POST   /finance/sales/post-from-order/:orderId                 (post sales from order to GL)
POST   /finance/ap/invoices/:id/post                           (post AP invoice to GL)
POST   /finance/cogs/events/:id/post                           (post COGS event to GL)
```

All 12 routes require `finance.manage` OR `admin.access` permission.
Branch scope enforced via RLS.

### 12. Deferred Items (with explicit triggers)

| Item | Trigger to revisit |
|---|---|
| Seeded jurisdiction tax rates (no PK GST 17% / SST 13% hardcoded — `is_active` defaults FALSE) | Owner completes FBR tax registration + confirms applicable rates |
| Automated COGS GL posting from kitchen consume (currently manual `POST /finance/cogs/events/:id/post`) | Daily COGS posting volume >50 entries per branch OR owner request for real-time COGS in GL |
| Automated AP GL posting from supplier invoice (currently manual `POST /finance/ap/invoices/:id/post`) | Daily AP posting volume >20 entries per branch OR owner request for real-time AP in GL |
| Automated sales GL posting from order (currently manual `POST /finance/sales/post-from-order/:orderId`) | Daily sales posting volume >50 entries per branch OR owner request for real-time revenue in GL |
| Weighted-average costing method (forward-compatible CHECK constraint allows; not wired) | Last-known cost causes COGS distortion >5% on volatile-price ingredients (e.g., cheese, cooking oil) |
| FIFO costing method (forward-compatible; not wired) | Owner request for FIFO inventory valuation (regulatory or audit requirement) |
| `inventory_cost_history` table (track cost_price changes over time for accurate weighted-average) | First request for historical COGS dashboard OR weighted-average/FIFO implementation |
| `sale` movement type wiring (POS-driven finished-goods deduction for pre-made items) | Pre-made items (drinks, desserts) requiring finished-goods inventory tracking |
| Automated procurement-to-GL (PO + GRN + invoice auto-post on transition) | Phase 12+ when BMs request procurement P&L dashboards |
| Automated 3-way match (system computes `variance_amount` + sets `match_status='variance'` when >threshold) | Owner request for automated invoice auditing OR >3 incidents of invoice over-billing per quarter |
| Supplier-side invoice submission (suppliers upload invoices directly via portal) | >10 active suppliers OR owner request to offload invoice entry |
| Partial-cancel of order line items (ADR-018 negative consequence — partial-cancel of one pizza) | First customer request for partial-cancel of an order line (currently must cancel entire order) |
| Dedicated `refunds` table (refund_reason, refund_method, refund_amount, original_payment_id) | First customer-facing refund flow OR >5 refund incidents per branch per month |
| Partial-refund API (only full void today) | First partial-refund request from a customer (e.g., refund one item of a multi-item order) |
| Discounts master table for non-coupon discounts (staff-discretionary, happy-hour, bulk) | Owner request for non-coupon discount tracking OR >5 staff-discretionary discounts per day |
| `discount_reason` audit (track why a discount was applied) | First incident of unauthorized discount application |
| Multi-line discount allocation on `order_items` (discounts are order-level only today) | First request for per-item discount reporting (e.g., "discount on pizza only, not drinks") |
| `customer_invoices` auto-issuance on order delivery (currently manual `POST /finance/ar/invoices`) | Daily invoice volume >30 per branch OR owner request for automatic customer invoicing |
| Recurring invoices (e.g., monthly retainer to a corporate customer) | First corporate customer with a recurring billing arrangement |
| Dunning / collection letters for overdue invoices | First invoice >30 days overdue OR owner request for automated dunning |
| Multi-currency AR/AP (PKR only today) | First foreign-currency invoice or supplier payment |
| Tax authority remittance (auto-generate monthly tax return from `output_tax` − `input_tax`) | First monthly tax return filing OR owner request for tax automation |
| Reverse charge mechanism (customer self-accounts tax) | First B2B customer requesting reverse charge treatment |
| Tax exemption certificates (customer-specific tax exemptions) | First tax-exempt customer (e.g., diplomatic, charitable) |

---

## Consequences

**Positive:**

- **Configurable tax rates.** The `tax_definitions` table supports
  any number of tax jurisdictions + rate changes over time + per-
  branch overrides. The `is_active=false` default ensures no tax is
  computed until the owner explicitly activates.
- **Pure tax helpers.** `tax-calc.ts` is pure (no side effects) —
  easy to unit-test (12 tests in `payroll-calc.test.ts` +
  `finance-phase2.test.ts`) and reusable across the order-pricing
  engine, AR invoice issuance, and expense-claim GL posting.
- **7-state AR invoice lifecycle.** Captures every state from draft
  through overdue + voided. Overdue is computed by
  `classifyInvoiceStatus` based on `due_date`.
- **Receipt allocation across invoices.** A single receipt can pay
  multiple invoices via `customer_receipt_allocations`. The
  `unapplied_amount` column tracks credit the customer holds with
  the branch.
- **3-way match foundation.** `match_status` + `variance_amount` +
  `matched_grn_id` on `supplier_invoices` provide the data model
  for automated 3-way match (DEFERRED but the schema is ready).
- **Idempotent supplier payments.** `record_supplier_payment_atomic`
  is idempotent via both `idempotency_key` UNIQUE and
  `finance_postings` UNIQUE. Retries on network failure produce no
  duplicate GL entries.
- **6-state expense workflow.** Draft → submitted → approved → paid
  provides proper segregation of duties (claimant submits, BM
  approves, SA pays).
- **COGS cost_source forward-compatibility.** The CHECK constraint
  allows `last_known`, `weighted_average`, `fifo`, `manual` — only
  `last_known` is wired today, but the schema supports the others
  without migration.
- **Controlled GL posting.** All 5 posting services follow the same
  4-step pattern (mapping-required + period-gated + idempotent +
  atomic). The pattern is documented in ADR-036 §10 and reused
  consistently.

**Negative:**

- **No seeded tax rates.** The owner must configure `tax_definitions`
  rows per branch before tax calculations return non-zero. This is
  intentional (Telepizza's FBR registration is pending) but means
  the system ships with zero tax by default.
- **Manual GL posting.** Sales / AP / COGS posts are manual-trigger.
  The GL can lag behind operations by hours or days. Automation is
  DEFERRED with explicit triggers.
- **No `refunds` table.** Refunds are handled via
  `payments.refunded_at` (full void only) + `customer_credit_notes`
  (AR credit notes). Partial refunds + refund reason tracking
  require a dedicated table (DEFERRED).
- **No partial-cancel of order line items.** ADR-018 explicitly
  defers this — the workaround is to cancel the entire order and
  re-place the items the customer still wants.
- **No discounts master table.** Non-coupon discounts (staff-
  discretionary, happy-hour, bulk) are not tracked separately from
  order-level `discount_amount`. Coupon discounts ARE tracked
  (ADR-021).

**Neutral:**

- The tax + AR + AP + COGS + expense surface is branch-scoped, like
  every other operational table. A future multi-branch consolidation
  layer would sit above the per-branch tables and roll up by date +
  account code.

---

## Related

- [ADR-010](./ADR-010-cod-financial-ownership.md) — COD Financial Ownership (cash-side of customer payment)
- [ADR-011](./ADR-011-accounting-immutability.md) — Accounting Immutability (controlled GL posts are immutable)
- [ADR-018](./ADR-018-order-lifecycle-state-machine.md) — Order Lifecycle (defers partial-cancel to "Phase 11 — Finance")
- [ADR-019](./ADR-019-rbac-authorization-principal.md) — RBAC (`finance.manage` permission)
- [ADR-020](./ADR-020-canonical-single-price-menu-catalog.md) — Single-Price Catalog (per-branch pricing DEFERRED to Phase 11+)
- [ADR-021](./ADR-021-deals-coupons-loyalty-engine.md) — Deals/Coupons/Loyalty (coupon discounts tracked here)
- [ADR-022](./ADR-022-reports-analytics-framework.md) — Reports & Analytics (`finance` module delegates to `FinanceService`)
- [ADR-024](./ADR-024-dine-in-bill-settlement.md) — Dine-in Bill Settlement (payment-side of customer payment)
- [ADR-034](./ADR-034-recipe-bom-cogs-costing-contract.md) — Recipe/BOM & COGS (`inventory_cogs_events` source)
- [ADR-035](./ADR-035-procurement-suppliers-grn-contract.md) — Procurement/Suppliers/GRN (`supplier_invoices` + `supplier_payments` source)
- [ADR-036](./ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md) — Branch GL (controlled GL post target)
- [ADR-037](./ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md) — Cash Recon/Z-Report/COD (Phase 11 sibling)
- `supabase/migrations/20260730260000_finance_core.sql` — GL foundation (ADR-036)
- `supabase/migrations/20260730270000_supplier_invoices_payments.sql` — supplier invoices + payments + 7-arg RPC
- `supabase/migrations/20260731030000_expense_claims.sql` — expense claims 6-state
- `supabase/migrations/20260731040000_finance_posting_and_ap_idempotency.sql` — `finance_postings` + 8-arg RPC + AP hardening
- `supabase/migrations/20260731180000_rc4_inventory_recipes_cogs.sql` — COGS events (ADR-034)
- `supabase/migrations/20260731190000_rc4_finance_phase2_foundation.sql` — tax + AR + periods
- `backend/api/src/services/finance/phase2.ts` — `FinancePhase2Service` (1202 lines)
- `backend/api/src/services/finance/ar-calc.ts` — AR allocation helpers
- `backend/api/src/services/finance/tax-calc.ts` — tax calculation helpers
- `backend/api/src/modules/admin/finance.ts` — admin routes (12 of the 30 finance routes)
