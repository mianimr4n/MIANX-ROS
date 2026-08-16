# PHASE 11 FINAL GATE — Finance and Reporting

**Phase:** 11 — Finance and Reporting
**Status:** ✅ COMPLETE & SHIPPED (v2.6.0)
**Date closed:** 2026-08-16
**Release:** [v2.6.0](https://github.com/mianimr4n/telepizza/releases/tag/v2.6.0)
**Closeout type:** Closeout-only — no new migrations applied. Production DB tip unchanged from Phase 5/6/7/8/9/10 closeouts.

---

## Scope

Phase 11 covers the Finance and Reporting operational surface,
comprising ten sub-areas per the master roadmap:

1. Revenue (orders + AR customer_invoices + sales posting)
2. Expenses (expense_claims + AP supplier_invoices + GL posting)
3. Payments (payments 8-state + bill splits + reservation deposits)
4. Cash (Z-report + cash_reconciliations 6-state + COD reconciliation)
5. Branch P&L (finance_profit_loss + balance_sheet + cash_flow RPCs)
6. Taxes (tax_definitions + tax-calc helpers + output_tax mapping)
7. Discounts (order-level + coupons + loyalty rewards)
8. Refunds (payments.refunded_at + customer_credit_notes + void + reverse)
9. Reconciliation (cash recon + COD recon + finance_postings idempotency)
10. Reports (12 routes + 25-module analytics registry + CSV/Excel/PDF)

The phase is largely already implemented in code and Production across
multiple prior waves: foundation (`20260713190000` orders + payments),
D3 corrective (`20260725110000` payments expansion + bill_splits +
deposits), M2 (`20260729010000` branch_payment_methods), Z-report
(`20260730210000`), Finance GL core (`20260730260000` CoA + journal
entries + trial balance / P&L RPCs), account mappings (`20260731010000`),
cash reconciliations (`20260731020000`), expense claims (`20260731030000`),
AP idempotency + reverse journal (`20260731040000`), RC4 inventory COGS
(`20260731180000`), RC4 Finance Phase 2 (`20260731190000` — tax + AR +
periods + balance sheet + cash flow), RC4 payroll foundation
(`20260731200000` + `20260731210000` mapping purposes), ADR-011
immutability (`20260814180100` + `20260815000000` FU-1 fix), ADR-010 COD
(`20260817000000`), and ADR-012 domain events (`20260819000000`).
Phase 11 closeout formally elevates the as-built design to three new
ADRs (ADR-036, ADR-037, ADR-038) — no new migrations and no new code
are required.

---

## Formal ADRs Accepted in This Closeout

| ADR | Title | Status | Implemented in |
|---|---|---|---|
| ADR-036 | Branch GL, P&L, Balance Sheet & Cash Flow Contract | Accepted v1.0 | v2.6.0 (Phase 11 closeout) |
| ADR-037 | Cash Reconciliation, Z-Report & COD Financial Ownership Contract | Accepted v1.0 | v2.6.0 (Phase 11 closeout) |
| ADR-038 | Tax, AR, AP, COGS & Expense Posting Contract | Accepted v1.0 | v2.6.0 (Phase 11 closeout) |

**All 38 ADRs (ADR-001..ADR-038) Accepted v1.0 with standalone files under `docs/13-adr/`.**

---

## Gate Criteria (all PASS)

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | ADR-036 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md` |
| 2 | ADR-037 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md` |
| 3 | ADR-038 markdown file exists under `docs/13-adr/` | ✅ PASS | `docs/13-adr/ADR-038-tax-ar-ap-cogs-expense-posting-contract.md` |
| 4 | ADR_INDEX.md updated with ADR-036/037/038 rows + Note | ✅ PASS | `docs/00-governance/ADR_INDEX.md` (3 new rows + extended Note paragraph) |
| 5 | Phase 11 verify script exists with 70+ checks | ✅ PASS | `scripts/phase_11_verify.py` (10 categories, 70+ checks) |
| 6 | Master roadmap Phase 11 row marked Complete | ✅ PASS | `docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md` Phase 11 section |
| 7 | REPOSITORY_STATUS.md updated to Phase 11 COMPLETE | ✅ PASS | `docs/00-governance/REPOSITORY_STATUS.md` |
| 8 | CHANGELOG.md has v2.6.0 entry | ✅ PASS | `CHANGELOG.md` |
| 9 | Release notes v2.6.0 authored | ✅ PASS | `docs/releases/v2.6.0_RELEASE_NOTES.md` |
| 10 | PR opened, CI green, merged to main | ✅ PASS | PR (squash merge) |
| 11 | Annotated tag v2.6.0 created + pushed | ✅ PASS | tag object on origin |
| 12 | GitHub Release v2.6.0 published | ✅ PASS | https://github.com/mianimr4n/telepizza/releases/tag/v2.6.0 |
| 13 | Production DB tip unchanged (closeout-only) | ✅ PASS | `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP, same as Phase 5/6/7/8/9/10) |
| 14 | No new migrations required | ✅ PASS | All finance migrations already in Production (D3 + RC4 + ADR-010/011) |
| 15 | No new code required | ✅ PASS | All finance code already shipped in v1.8.0/v1.9.0/v2.0.0/v2.1.0/v2.2.0 |
| 16 | Worklog updated with phase-11-audit + phase-11-shipped entries | ✅ PASS | `worklog.md` |

---

## Production Verification

### Database state (Production Supabase `pyeowxvacgypohrbvgee`)

#### Branch GL tables (ADR-036)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `chart_of_accounts` | table (5-type CoA: ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE; UNIQUE branch+account_code) | ✅ in Production | `20260730260000_finance_core.sql` |
| `journal_entries` | table (3-state draft/posted/voided + reversed_by/reverses self-FK) | ✅ in Production | `20260730260000` + `20260731040000` |
| `journal_entry_lines` | table (CHECK: exactly one of debit/credit positive) | ✅ in Production | `20260730260000` |
| `finance_periods` | table (3-state open/soft_closed/closed; UNIQUE branch+start+end) | ✅ in Production | `20260731190000_rc4_finance_phase2_foundation.sql` |
| `finance_period_events` | table (period lifecycle audit) | ✅ in Production | `20260731190000` |
| `finance_account_mappings` | table (purpose→account_id; 20 purposes + `expense_category:*`; UNIQUE branch+purpose) | ✅ in Production | `20260731010000` + `20260731190000` (extended) + `20260731210000` (payroll purposes) |
| `finance_cash_accounts` | table (kind cash/bank; UNIQUE branch+name) | ✅ in Production | `20260731190000` |
| `finance_cash_register_entries` | table (3-type deposit/withdrawal/transfer; reconciliation_status 3-state) | ✅ in Production | `20260731190000` |
| `finance_exceptions` | table (3-state open/resolved/ignored) | ✅ in Production | `20260731190000` |
| `finance_postings` | table (UNIQUE source_module+source_id idempotency; status posted/reversed; reversal_journal_entry_id FK) | ✅ in Production | `20260731040000_finance_posting_and_ap_idempotency.sql` |
| `create_journal_entry_atomic` | SECURITY DEFINER RPC (validates balance + branch match + min 2 lines) | ✅ in Production | `20260730260000` |
| `reverse_journal_entry_atomic` | SECURITY DEFINER RPC (equal-and-opposite posted entry; marks original voided) | ✅ in Production | `20260731040000` |
| `finance_trial_balance` | RPC (dynamic, posted-only, as-of date) | ✅ in Production | `20260730260000` |
| `finance_profit_loss` | RPC (Revenue credit−debit; Expense debit−credit; netIncome) | ✅ in Production | `20260730260000` |
| `finance_balance_sheet` | RPC (assets−liabilities−equity+current earnings) | ✅ in Production | `20260731190000` |
| `finance_cash_flow_indirect` | RPC (operating+investing+financing; unclassified movements returned explicitly) | ✅ in Production | `20260731190000` |
| `finance_assert_period_allows_posting` | SECURITY DEFINER RPC (blocks posting into closed periods) | ✅ in Production | `20260731190000` |
| `enforce_journal_entry_immutability` | trigger function (ADR-011; blocks UPDATE/DELETE on posted entries) | ✅ in Production | `20260814180100_adr_011_accounting_immutability.sql` |
| `enforce_journal_entry_line_immutability` | trigger function (ADR-011; blocks UPDATE/DELETE on lines of posted+voided entries) | ✅ in Production | `20260814180100` |
| `trg_journal_entry_immutability` | BEFORE UPDATE/DELETE trigger | ✅ in Production | `20260814180100` |
| `trg_journal_entry_line_immutability` | BEFORE UPDATE/DELETE trigger | ✅ in Production | `20260814180100` |
| `finance.manage` permission seeded | permission | ✅ in Production | `20260730260000` (super-admin + branch-manager) |
| RLS on all 10 GL tables | RLS | ✅ in Production | `20260730260000` + `20260731010000` + `20260731040000` + `20260731190000` |

#### Cash / Z-Report / COD / Payments tables (ADR-037)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `pos_z_report_events` | table (append-only audit; timezone default 'Asia/Karachi') | ✅ in Production | `20260730210000_pos_z_report_events.sql` |
| `cash_reconciliations` | table (6-state draft/submitted/approved/rejected/posted/voided; server-computed expected_cash + variance; posting_status 5-state; idempotency_key UNIQUE) | ✅ in Production | `20260731020000_cash_reconciliations.sql` |
| `cash_reconciliation_events` | table (audit) | ✅ in Production | `20260731020000` |
| `cod_collections` | table (4-state reconciliation pending/reconciled/shortage/overage; UNIQUE delivery_id; journal_entry_id FK) | ✅ in Production | `20260817000000_adr_008_009_010_delivery_rider.sql` |
| `payments` | table (8-state status, 4 methods cash/card_terminal/bank_manual/complimentary; cash_tendered/change; idempotency_key UNIQUE; chk_payments_order_or_bill) | ✅ in Production | `20260713190000` + `20260725110000` (extended) |
| `bill_splits` | table (4 strategies: equal/even/items/custom) | ✅ in Production | `20260725110000` |
| `bill_split_allocations` | table (per-tender allocation) | ✅ in Production | `20260725110000` |
| `reservation_deposits` | table (7-state) | ✅ in Production | `20260725110000` |
| `branch_payment_methods` | table (per-branch enabled methods + verification) | ✅ in Production | `20260729010000_opening_m2_payments_notifications_devices.sql` |
| `branch_payment_method_events` | table (audit) | ✅ in Production | `20260729010000` |
| `compute_cash_reconciliation_totals` | IMMUTABLE RPC (server-side expected + variance) | ✅ in Production | `20260731020000` |
| `settle_bill_payment_atomic` | SECURITY DEFINER RPC | ✅ in Production | `20260725110000` |
| `close_dining_session_atomic` | SECURITY DEFINER RPC | ✅ in Production | `20260725110000` |
| `post_cod_collection_journal` | SECURITY DEFINER trigger function (ADR-010; fires on reconciliation_status→reconciled; idempotent via `finance_postings` UNIQUE source_module='cod_collection') | ✅ in Production | `20260817000000` |
| `trg_cod_collection_post_journal` | AFTER UPDATE trigger | ✅ in Production | `20260817000000` |
| `payment.read` / `payment.manage` permissions | permissions | ✅ in Production | `20260713191000` (super-admin + branch-manager + cashier + customer-support) |
| `payment.settle` / `payment.void` / `deposit.manage` permissions | permissions | ✅ in Production | `20260725110000` |
| RLS on all 10 cash/payment tables | RLS | ✅ in Production | multiple migrations |

#### Tax / AR / AP / COGS tables (ADR-038)

| Object | Type | Status | Source migration |
|---|---|---|---|
| `tax_definitions` | table (rate 0-1; tax_basis exclusive/inclusive; classification input/output; effective_from/to; payable/receivable account FKs; UNIQUE branch+tax_code) | ✅ in Production | `20260731190000_rc4_finance_phase2_foundation.sql` |
| `customer_invoices` | table (7-state DRAFT/ISSUED/PARTIALLY_PAID/PAID/OVERDUE/VOID/CREDITED; UNIQUE branch+invoice_number; source_order_id FK) | ✅ in Production | `20260731190000` |
| `customer_invoice_lines` | table (per-line amounts + tax) | ✅ in Production | `20260731190000` |
| `customer_receipts` | table (4-state payment_method; idempotency_key UNIQUE; unapplied_amount) | ✅ in Production | `20260731190000` |
| `customer_receipt_allocations` | table (UNIQUE receipt+invoice) | ✅ in Production | `20260731190000` |
| `customer_credit_notes` | table (3-state DRAFT/ISSUED/VOID; UNIQUE branch+credit_number) | ✅ in Production | `20260731190000` |
| `supplier_invoices` | table (3-way match foundation: match_status + variance_amount + matched_grn_id; status pending/paid/partially_paid; due_date + exception fields) | ✅ in Production | `20260730270000_supplier_invoices_payments.sql` + `20260731040000` (extended) |
| `supplier_payments` | table (4-state payment_method cash/bank_transfer/cheque/other; idempotency_key UNIQUE) | ✅ in Production | `20260730270000` + `20260731040000` |
| `expense_claims` | table (6-state draft/submitted/approved/rejected/paid/voided; posting_status 5-state; idempotency_key UNIQUE) | ✅ in Production | `20260731030000_expense_claims.sql` |
| `expense_claim_events` | table (audit) | ✅ in Production | `20260731030000` |
| `inventory_cogs_events` | table (cost_source 4-state last_purchase_cost_price/unavailable/weighted_average/fifo; status 4-state pending/posted/deferred/skipped; idempotency_key UNIQUE) | ✅ in Production | `20260731180000_rc4_inventory_recipes_cogs.sql` |
| `inventory_consumption_events` | table (idempotent + reversible via reversed_event_id self-FK) | ✅ in Production | `20260731180000` |
| `record_supplier_payment_atomic` | SECURITY DEFINER RPC (8-arg with idempotency + 7-arg legacy overload; validates branch/supplier match, 3-way match discrepancy block, overage block) | ✅ in Production | `20260730270000` (7-arg) + `20260731040000` (8-arg overload) |
| RLS on all 12 AR/AP/COGS tables | RLS | ✅ in Production | multiple migrations |

**Production DB tip:** `20260821000000_adr_016_017_otp.sql` (Phase 3 OTP — unchanged since Phase 5 closeout).

### Backend API surface (as-built)

#### Finance admin routes (30 routes — ADR-036/038)

Gated by `requireAnyPermission(['finance.manage', 'admin.access'])`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/finance/accounts` | finance.manage OR admin.access | List CoA accounts |
| `POST` | `/api/v1/admin/finance/accounts` | finance.manage OR admin.access | Create account |
| `GET` | `/api/v1/admin/finance/account-mappings` | finance.manage OR admin.access | List account mappings |
| `PUT` | `/api/v1/admin/finance/account-mappings` | finance.manage OR admin.access | Upsert mapping |
| `GET` | `/api/v1/admin/finance/journal-entries` | finance.manage OR admin.access | List journal entries |
| `POST` | `/api/v1/admin/finance/journal-entries` | finance.manage OR admin.access | Create journal entry (calls create_journal_entry_atomic) |
| `POST` | `/api/v1/admin/finance/journal-entries/:id/reverse` | finance.manage OR admin.access | Reverse journal entry (calls reverse_journal_entry_atomic) |
| `GET` | `/api/v1/admin/finance/reports/trial-balance` | finance.manage OR admin.access | Trial balance report |
| `GET` | `/api/v1/admin/finance/reports/profit-loss` | finance.manage OR admin.access | P&L report |
| `GET` | `/api/v1/admin/finance/reports/balance-sheet` | finance.manage OR admin.access | Balance sheet |
| `GET` | `/api/v1/admin/finance/reports/cash-flow` | finance.manage OR admin.access | Cash flow indirect |
| `GET` | `/api/v1/admin/finance/cash-reconciliations` | finance.manage OR admin.access | List cash reconciliations |
| `POST` | `/api/v1/admin/finance/cash-reconciliations` | finance.manage OR admin.access | Create cash reconciliation |
| `PATCH` | `/api/v1/admin/finance/cash-reconciliations/:id` | finance.manage OR admin.access | Update draft |
| `POST` | `/api/v1/admin/finance/cash-reconciliations/:id/transition` | finance.manage OR admin.access | Transition state (submit/approve/reject/void/post) |
| `GET` | `/api/v1/admin/finance/expenses` | finance.manage OR admin.access | List expense claims |
| `POST` | `/api/v1/admin/finance/expenses` | finance.manage OR admin.access | Create expense claim |
| `PATCH` | `/api/v1/admin/finance/expenses/:id` | finance.manage OR admin.access | Update draft |
| `POST` | `/api/v1/admin/finance/expenses/:id/transition` | finance.manage OR admin.access | Transition (submit/approve/reject/pay/void/post) |
| `POST` | `/api/v1/admin/finance/supplier-payments/:id/post` | finance.manage OR admin.access | Controlled GL post |
| `GET` | `/api/v1/admin/finance/mapping-health` | finance.manage OR admin.access | Mapping health (LIVE/UNAVAILABLE) |
| `GET` | `/api/v1/admin/finance/tax-definitions` | finance.manage OR admin.access | List tax definitions |
| `PUT` | `/api/v1/admin/finance/tax-definitions` | finance.manage OR admin.access | Upsert tax definition |
| `POST` | `/api/v1/admin/finance/ar/invoices` | finance.manage OR admin.access | Create AR invoice |
| `POST` | `/api/v1/admin/finance/ar/invoices/:id/issue` | finance.manage OR admin.access | Issue invoice |
| `POST` | `/api/v1/admin/finance/ar/receipts` | finance.manage OR admin.access | Create receipt |
| `POST` | `/api/v1/admin/finance/ar/credit-notes` | finance.manage OR admin.access | Create credit note |
| `GET` | `/api/v1/admin/finance/periods` | finance.manage OR admin.access | List finance periods |
| `POST` | `/api/v1/admin/finance/periods` | finance.manage OR admin.access | Create period |
| `POST` | `/api/v1/admin/finance/periods/:id/status` | finance.manage OR admin.access | Set period status |
| `GET` | `/api/v1/admin/finance/exceptions` | finance.manage OR admin.access | List finance exceptions queue |
| `POST` | `/api/v1/admin/finance/sales/post-from-order/:orderId` | finance.manage OR admin.access | Post sales from order (GL) |
| `POST` | `/api/v1/admin/finance/ap/invoices/:id/post` | finance.manage OR admin.access | Post AP invoice (GL) |
| `POST` | `/api/v1/admin/finance/cogs/events/:id/post` | finance.manage OR admin.access | Post COGS event (GL) |

#### Payments admin routes (9 routes — ADR-037)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/admin/payments/settle` | payment.settle | Settle bill payment (calls settle_bill_payment_atomic) |
| `POST` | `/api/v1/admin/payments/split` | payment.settle | Split bill (4 strategies) |
| `GET` | `/api/v1/admin/payments/bills/:billId/balance` | payment.settle | Get bill balance |
| `GET` | `/api/v1/admin/payments/sessions/:sessionId` | payment.settle | List session payments |
| `POST` | `/api/v1/admin/payments/:paymentId/void` | payment.void | Void payment |
| `POST` | `/api/v1/admin/payments/deposits` | deposit.manage | Create reservation deposit |
| `GET` | `/api/v1/admin/payments/deposits/:reservationId` | deposit.manage | List deposits for reservation |
| `POST` | `/api/v1/admin/payments/deposits/:reservationId/{waive\|forfeit\|refund}` | deposit.manage | Transition deposit (3 actions) |
| `POST` | `/api/v1/admin/payments/deposits/:reservationId/apply` | deposit.manage | Apply deposit to bill |

#### Reports admin routes (12 routes — ADR-022)

Gated by `requireAnyPermission(['reports.read', 'order.manage', 'admin.access'])`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/reports/sales` | reports.read OR order.manage OR admin.access | Daily sales aggregates |
| `GET` | `/api/v1/admin/reports/sales/export` | reports.read OR order.manage OR admin.access | Stream sales CSV |
| `GET` | `/api/v1/admin/reports/orders/export` | reports.read OR order.manage OR admin.access | Stream orders CSV |
| `GET` | `/api/v1/admin/analytics/modules` | reports.read OR order.manage OR admin.access | List 25 analytics modules |
| `GET` | `/api/v1/admin/analytics/registry` | reports.read OR order.manage OR admin.access | Full metric registry |
| `GET` | `/api/v1/admin/analytics/workspace` | reports.read OR order.manage OR admin.access | Owner BI workspace envelope |
| `GET` | `/api/v1/admin/analytics/modules/:moduleId` | reports.read OR order.manage OR admin.access | Module snapshot |
| `GET` | `/api/v1/admin/analytics/drilldown/:metricId` | reports.read OR order.manage OR admin.access | Metric drilldown |
| `GET` | `/api/v1/admin/analytics/export` | reports.read OR order.manage OR admin.access | CSV/Excel/PDF export |
| `GET` | `/api/v1/admin/analytics/scheduled-reports` | reports.read OR order.manage OR admin.access | List scheduled reports (execution='DEFERRED') |
| `POST` | `/api/v1/admin/analytics/scheduled-reports` | reports.read OR order.manage OR admin.access | Create scheduled report |
| `GET` | `/api/v1/admin/analytics/exceptions` | reports.read OR order.manage OR admin.access | List analytics exceptions |
| `POST` | `/api/v1/admin/analytics/data-quality/run` | reports.read OR order.manage OR admin.access | Run data quality checks |

#### POS admin routes (3 routes — ADR-023/025)

Gated by `requireAnyPermission(['order.manage', 'payment.manage', 'admin.access'])`:

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/pos/z-report` | order.manage OR payment.manage OR admin.access | Get Z-report (cash drawer totals) |
| `POST` | `/api/v1/admin/pos/z-report/close` | order.manage OR payment.manage OR admin.access | Confirm close (logs pos_z_report_events row) |
| `POST` | `/api/v1/admin/pos/orders` | order.manage + Idempotency-Key header | Cashier order create |

#### COD routes (5 routes — ADR-010, in `modules/admin/delivery-rider.ts`)

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/admin/cod/collections` | delivery.access | Record COD collection |
| `GET` | `/api/v1/admin/cod/collections` | delivery.access | List collections |
| `GET` | `/api/v1/admin/cod/collections/:id` | delivery.access | Get collection |
| `POST` | `/api/v1/admin/cod/collections/:id/reconcile` | delivery.access | Reconcile (fires GL post trigger) |
| `POST` | `/api/v1/admin/cod/collections/:id/resolve` | delivery.access | Resolve shortage/overage |

### Frontend surface (as-built)

| Route | Component | Lines | Role | Purpose |
|---|---|---|---|---|
| `/admin/finance` | `AdminFinance.tsx` | 296 | BM/SA | Finance ERP dashboard (CoA + journals + trial balance + P&L + cash + AR + AP + expenses + tax + ledger + statements + insights) |
| `/admin/reports` | `AdminReports.tsx` | 149 | BM/SA | Reports & BI (workspace + sales export + orders export + analytics export + business insights) |
| `/admin/pos` | `AdminPos.tsx` | 632 | Cashier/BM/SA | POS cashier page (cart + payment + Z-report modal + customer + summary + product grid) |

Finance components (8 files, 1,527 lines total): FinanceHeader (52), FinanceStatusBanner (34), FinanceKPIs (111), FinanceInsights (42), FinanceFoundationPanel (89), SalesOverview (88), FinancePanels (606 — exports CashPanel, ReceivablePanel, PayablePanel, ExpensePanel, TaxPanel), LedgerPanel (505 — exports LedgerPanel + StatementsPanel).

Reports components (12 files, 1,114 lines total): ReportsHeader (56), ReportsStatusBanner (25), ReportsFoundationPanel (90), ReportsFilters (56), ExportPanel (87), OwnerBiWorkspacePanel (210), ReportCharts (71), ReportSections (241), BusinessInsights (45), BranchComparison (69), ExecutiveKPIs (144), TrendAnalysis (72).

POS components (13 files, 1,119 lines total): ZReportModal (88), PaymentPanel (67), ReceiptPreview (70), ShoppingCart (102), POSHeader (103), POSInsights (110), POSActions (77), CustomerPanel (147), OrderSummary (76), OrderTypeSelector (42), ProductGrid (117), ProductConfigureModal (168), CategorySidebar (62).

Dashboard panels (2 files, 509 lines total): ProfitabilityTruthPanel.tsx (265), EodPackPanel.tsx (244).

### Test coverage

| Category | Files | Lines | Notes |
|---|---|---|---|
| Backend unit/service | 17 | ~2,830 | accounting-immutability (262), cod-service (688), finance-gl-wiring (30), finance-operations-calc (42), finance-phase2 (101), pos-z-report (153), d3-payment-settlement (71), reports (173), analytics-api (227), analytics-registry (69), analytics-order-items-schema (130), payroll-calc (167), pos-isolation (315), rc3-coupon-pricing (57), marketing-depth (64), loyalty-depth (134), menu-price-audit-atomic (147) |
| Website static | (touched in 4+ existing tests) | — | AdminFinance, AdminReports, AdminPos, role-matrix, dashboard-smoke |
| Database | (touched in 5+ existing tests) | — | foundation-migrations, sprint3-slice2d-order-rls, db-r5-kitchen-tickets, db-r6-pos-bill-foundation, identity-01-tenant-owner-onboarding |
| E2E Playwright | (touched in 4+ specs) | — | dashboard-smoke, role-matrix, polish-qa, opening-scope |

---

## Gap Analysis vs Phase 11 Scope

| # | Sub-area | Status | Explanation |
|---|---|---|---|
| 1 | Revenue | ✅ DONE | `orders.subtotal/discount_amount/tax_amount/delivery_fee/total_amount`. `customer_invoices` (AR) 7-state. `customer_receipts` + allocations. `postSalesFromOrder` service + `/finance/sales/post-from-order` route. `finance_profit_loss` RPC. `sales.gross/net/aov` analytics metrics. |
| 2 | Expenses | ✅ DONE | `expense_claims` 6-state + events audit. `tryPostExpenseJournal` + `postSupplierInvoice` services. `/finance/expenses/*` (5 routes). `ExpensePanel` (606 lines in FinancePanels). |
| 3 | Payments | ✅ DONE | `payments` 8-state, 4 methods, cash_tendered/change, idempotency_key. `settle_bill_payment_atomic`. `bill_splits` 4 strategies. `reservation_deposits` 7-state. `branch_payment_methods`. 9 routes. `PaymentSettlementService` (357 lines). |
| 4 | Cash | ✅ DONE | `pos_z_report_events` append-only (Asia/Karachi business day). `cash_reconciliations` 6-state + `compute_cash_reconciliation_totals` IMMUTABLE RPC. `finance_cash_accounts` (cash/bank). `finance_cash_register_entries`. `PosZReportService` (175 lines). `tryPostCashVarianceJournal`. |
| 5 | Branch P&L | ✅ DONE | `finance_profit_loss` + `finance_balance_sheet` + `finance_cash_flow_indirect` RPCs. Branch-scoped + RLS. `finance_periods` 3-state + `finance_assert_period_allows_posting`. `StatementsPanel` (LedgerPanel.tsx). Analytics registry has 8 finance metrics incl. `finance.profit`, `finance.margin`. |
| 6 | Taxes | ✅ DONE | `tax_definitions` (rate 0-1, basis exclusive/inclusive, classification input/output, effective dates). `tax-calc.ts` pure helpers (half-up rounding, line/invoice tax). `/finance/tax-definitions` GET+PUT routes. `orders.tax_amount`. `output_tax` mapping purpose. **DEFERRED**: seeded jurisdiction rates (no PK GST/SST hardcoded — `is_active defaults false`). |
| 7 | Discounts | 🟡 PARTIAL | `orders.discount_amount` column. `sales_discounts` mapping purpose. `sales.discounts` analytics metric. Coupon system (ADR-021) + loyalty rewards exist. **GAP**: NO `discounts` master table for non-coupon discounts (staff-discretionary, happy-hour, bulk). NO `discount_reason` audit. NO multi-line discount allocation on `order_items` (order-level only). |
| 8 | Refunds | 🟡 PARTIAL | `payments.refunded_at` + `voided_at` + status `refunded`/`partially_refunded` columns. `customer_credit_notes` 3-state (DRAFT/ISSUED/VOID). `refunds` mapping purpose. `cash_reconciliations.cash_refunds`. `sales.refunds` metric. **GAPS**: (1) NO dedicated `refunds` table for operational refund tracking. (2) NO `/api/v1/admin/refunds` route. (3) NO refund lifecycle service (`voidPayment` sets `voided_at` not `refunded_at`). (4) NO partial-refund API (only full void). ADR-018 §"Negative consequences" partial mitigation via `customer_credit_notes`. |
| 9 | Reconciliation | ✅ DONE | `cash_reconciliations` 6-state with server-side variance + GL posting link. `cod_collections` 4-state with auto-GL posting trigger. `finance_cash_register_entries.reconciliation_status`. `finance_postings` UNIQUE idempotency. `reverse_journal_entry_atomic`. ADR-010 trigger fires on COD reconcile. ADR-011 immutability guards posted journals. `FinanceAttentionSnapshot` exposes reconciliation queues. |
| 10 | Reports | ✅ DONE | 12 routes in `modules/admin/reports.ts`. 25-module analytics registry (finance, sales, executive, branch_comparison, etc.). CSV/Excel/PDF export. `getOwnerWorkspace` aggregates 25 modules. Scheduled reports (execution_status='deferred' — analytics worker not deployed). AdminReports.tsx (149 lines) + 12 supporting components (1,114 lines). ADR-022 formally accepted. |

**Summary:** 8 DONE (Revenue, Expenses, Payments, Cash, Branch P&L, Taxes, Reconciliation, Reports), 2 PARTIAL (Discounts, Refunds), 0 NOT STARTED. All PARTIAL gaps are explicitly labeled as deferred in ADR-018/024/026 + addressed by as-built `customer_credit_notes` + `payments.refunded_at` + `voidPayment` + `reverse_journal_entry_atomic` for V1.

---

## Deferred Items (with explicit triggers)

| Item | Deferred in | Trigger to revisit |
|---|---|---|
| Per-branch pricing (non-canonical menu pricing) | ADR-020 | Owner request OR >3 incidents of single-price catalog causing branch friction |
| Automated GL posting from kitchen consume (COGS auto-post) | ADR-034 §10, ADR-038 | Owner request for COGS dashboards in the GL OR >2 incidents of stale COGS metrics |
| Automated GL posting from PO/GRN/invoice (procurement-to-GL) | ADR-035 §9, ADR-038 | Owner request for procurement P&L dashboards OR >2 incidents of stale AP metrics |
| Automated GL posting from sales order (auto sales posting) | ADR-036 | Owner request OR daily manual posting becomes >30 min routine |
| Multi-currency consolidation (PKR-only today) | ADR-036 | Franchise expansion to non-PKR market OR >3 monthly FX-reval incidents |
| Inter-branch transfers (GL-level) | ADR-036 | Multi-branch COGS reconciliation OR owner request for inter-branch P&L |
| Fiscal-year close automation | ADR-036 | First annual fiscal-year close event |
| Bank reconciliation (statement import + matching) | ADR-036 | Owner request OR >5 unreconciled bank transactions per month |
| Fixed-asset depreciation | ADR-036 | Owner request for asset register OR >2 capitalized purchases |
| `pos_sessions` table (POS-BILLING-FOUNDATION §2) | ADR-023, ADR-025, ADR-026 | Owner request for shift-level cash accountability OR >2 cash-variance incidents per branch per month |
| Online card gateway (Stripe/Braintree) | ADR-023, ADR-024, ADR-026 | >30% of orders requesting card payment OR owner request |
| Multi-tender `payment_splits` table | ADR-024 | Multi-tender handled via multiple payments rows against same bill — revisit only if unified ledger is requested |
| Bank deposit slip generation | ADR-037 | Owner request OR >5 cash deposits per branch per day |
| Multi-timezone (Asia/Karachi only today) | ADR-025 | First branch opening in non-Karachi timezone |
| Seeded jurisdiction tax rates (PK GST/SST) | ADR-038 | Owner request for jurisdiction defaults OR >2 incidents of zero-tax invoice due to missing config |
| Weighted-average / FIFO costing methods | ADR-034 §10, ADR-038 | Last-known cost causes COGS distortion >5% on volatile-price ingredients |
| `inventory_cost_history` table (historical COGS) | ADR-033, ADR-034 | BMs request historical COGS dashboards |
| `sale` movement type wiring for finished-goods | ADR-033 | Pre-made items (drinks, desserts) require finished-goods inventory tracking |
| Automated 3-way match (DB-level trigger) | ADR-035 §9, ADR-038 | Owner request OR >3 incidents of invoice over-billing per quarter |
| Supplier-side invoice submission | ADR-035 §9, ADR-038 | >10 active suppliers OR owner request to offload invoice entry |
| Partial-cancel of order line items | ADR-018 | First incident of single-item refund requiring credit note |
| Dedicated `refunds` table for operational refunds | ADR-018, ADR-024 | >3 partial-refund requests per month OR first refund-fraud incident |
| Partial-refund API (currently only full void) | ADR-024 | First incident of partial refund request OR >3 refunded orders per branch per month |
| Discounts master table for non-coupon discounts | ADR-018, ADR-021 | Owner request for happy-hour/staff-discretionary/bulk discounts OR >3 incidents of unmapped discount reasons |
| Finance domain event mirror triggers (no finance triggers today) | ADR-012 | Owner request for finance event stream OR audit finding flagging finance mutation observability |

---

## Pending Operator Follow-ups (no code blockers)

These are operational configuration tasks inherited from prior phases. None
block Phase 11 closeout — they are listed for completeness.

1. **FU-3** (Phase 2.2): Set `TELEPIZZA_WHATSAPP_MODE=mock` + `TELEPIZZA_WHATSAPP_WORKER=1` on Render.
2. **FU-7** (Phase 3, P2): Set `OTP_HMAC_SECRET` on Render (32+ byte random string).
3. **FU-4** (Phase 2.5): Configure `chart_of_accounts` rows per branch.
4. **FU-5** (Phase 2.4): Configure Supabase Storage bucket `delivery-pod`.
5. **FU-8** (Phase 3): Provision dedicated "Telepizza Login" WhatsApp number.
6. **FU-11** (Phase 7): Configure `finance_account_mappings` rows per branch for POS purposes.
7. **FU-13** (Phase 8): Seed `menu_item_inventory_components` rows per branch for kitchen atomic stock consume.
8. **FU-15** (Phase 9): Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render.
9. **FU-16** (Phase 10): Seed `inventory_items` rows per branch for active menu SKUs (dough, cheese, sauce, toppings, packaging). Without this, kitchen atomic stock consume cannot deduct stock.
10. **FU-17** (Phase 10): Seed `inventory_recipes` + `inventory_recipe_lines` rows per branch for each menu item, then call `POST /api/v1/admin/inventory/recipes/:id/activate` to promote to `active` status.
11. **FU-18** (Phase 10): Configure Supabase Storage bucket `supplier-documents` — required for supplier document uploads.
12. **FU-19** (NEW, Phase 11): Configure `tax_definitions` rows per branch with jurisdiction-specific rates (e.g., PK GST 17%, SST 13% where applicable). Without these rows, tax calculations return zero — `tax_definitions.is_active` defaults to `false` per design (no hardcoded jurisdiction rates). Operational data setup task; no code change required.
13. **FU-20** (NEW, Phase 11): Configure `finance_account_mappings` rows for the 20 mapping purposes per branch (cash_on_hand, cash_over_short, ap_control, bank_clearing, expense_default, ar_control, sales_revenue, sales_discounts, output_tax, refunds, inventory_asset, cogs, cash_flow_operating, cash_flow_investing, cash_flow_financing, salary_expense, allowance_expense, payroll_payable, payroll_tax_payable, payroll_deduction_payable + `expense_category:*`). Without these mappings, GL posting services (`postSalesFromOrder`, `postSupplierInvoice`, `postCogsEvent`, `postPayrollAccrual`, `postPayrollSettlement`) fall back to exception-recording in `finance_exceptions` queue. Operational data setup task; no code change required.

---

## Phase 12 Unlock

Phase 12 (Customer and Staff Apps) is now UNLOCKED. Dependencies satisfied:

- ✅ Phase 5 (Order Lifecycle, ADR-018) — closed v2.0.0
- ✅ Phase 6 (Admin & ERP Core, ADR-019/020/021/022) — closed v2.1.0
- ✅ Phase 7 (POS, ADR-023/024/025/026) — closed v2.2.0
- ✅ Phase 8 (Kitchen Dashboard, ADR-027/028/029) — closed v2.3.0
- ✅ Phase 9 (Rider and Delivery App, ADR-030/031/032) — closed v2.4.0
- ✅ Phase 10 (Inventory and Procurement, ADR-033/034/035) — closed v2.5.0
- ✅ Phase 11 (Finance and Reporting, ADR-036/037/038) — closed v2.6.0

The Phase 11 finance GL (`chart_of_accounts` + `journal_entries` + ADR-011
immutability, ADR-036) + the Phase 7 payments/bill-splits/deposits
(ADR-024) + the Phase 9 COD reconciliation (ADR-010) + the Phase 11 AR/AP
surfaces (ADR-038) + the Phase 6 reports & analytics registry (ADR-022)
provide the data foundation for Phase 12's customer-facing order history,
loyalty wallet, invoice download, and rider/staff app finance summaries.

---

## Conclusion

Phase 11 (Finance and Reporting) is **COMPLETE & SHIPPED** as
v2.6.0. The closeout formally elevates the as-built finance surface —
which has been live in Production since v1.8.0 (foundation orders +
payments + ADR-010 COD + ADR-011 immutability), v1.9.0 (Phase 2.5
account mappings), v2.0.0 (D3 corrective payments expansion + bill
splits + deposits + close_dining_session), v2.1.0 (Phase 6 analytics
registry + admin reports routes), v2.2.0 (Phase 7 POS + Z-report + cash
reconciliations), and v2.3.0 (Phase 8 RC4 Finance Phase 2 — tax +
AR + periods + balance sheet + cash flow + COGS events) — to three new
ADRs (ADR-036, ADR-037, ADR-038). No new migrations and no new code were
required. All 38 ADRs are now Accepted v1.0 with standalone files under
`docs/13-adr/`.

The remaining PARTIAL gaps (Discounts, Refunds) are explicitly deferred
with documented trigger conditions. The backend contract is stable and
will not change when these gaps are filled in future phases.

**Next major workstream:** Phase 12 (Customer and Staff Apps) — UNLOCKED.
