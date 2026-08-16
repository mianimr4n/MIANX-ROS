#!/usr/bin/env python3
"""
Open Phase 11 closeout PR via GitHub API.

Creates a PR from `phase-11-closeout` branch against `main` with the
Phase 11 ADR-036/037/038 closeout files.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
HEAD = "phase-11-closeout"
BASE = "main"

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

title = "docs(v2.6.0): Phase 11 complete — ADR-036/037/038 + close report + roadmap update"
body = """## Phase 11 (Finance and Reporting) — Closeout

**Closeout-only release. No new migrations. No new code.**

### What's in this PR

- **3 new ADRs** formally accepting the as-built finance/reporting architecture:
  - `ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md` — branch GL + Chart of Accounts (5-type CoA, branch-scoped, UNIQUE branch+account_code) + `journal_entries` (3-state draft/posted/voided) + balanced `journal_entry_lines` (CHECK: exactly one of debit/credit positive) + `create_journal_entry_atomic` / `reverse_journal_entry_atomic` SECURITY DEFINER RPCs + `finance_trial_balance` / `finance_profit_loss` / `finance_balance_sheet` / `finance_cash_flow_indirect` financial-statement RPCs + `finance_periods` 3-state period control + `finance_assert_period_allows_posting` SECURITY DEFINER gate + `finance_account_mappings` (20 canonical purposes + `expense_category:*` prefix) + `finance_cash_accounts` + `finance_cash_register_entries` + `finance_exceptions` 3-state queue (never silently drops posting failures) + `finance_postings` UNIQUE (source_module, source_id) idempotency ledger + ADR-011 immutability triggers on journal_entries + journal_entry_lines; per-branch pricing + automated GL posting from kitchen/PO/invoice/sales + multi-currency consolidation + inter-branch transfers + fiscal-year close automation + bank reconciliation + fixed-asset depreciation DEFERRED
  - `ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md` — Z-Report (`pos_z_report_events` append-only Asia/Karachi audit) + `cash_reconciliations` 6-state with server-side `compute_cash_reconciliation_totals` IMMUTABLE RPC + `cash_reconciliation_events` audit + COD 4-state reconciliation (`cod_collections` UNIQUE delivery_id + ADR-010 `post_cod_collection_journal` trigger idempotent via `finance_postings` UNIQUE source_module='cod_collection') + `payments` 8-state 4-method (cash/card_terminal/bank_manual/complimentary) with cash_tendered/change + idempotency_key UNIQUE + `bill_splits` 4 strategies + `bill_split_allocations` + `reservation_deposits` 7-state + `branch_payment_methods` config + `settle_bill_payment_atomic` / `close_dining_session_atomic` SECURITY DEFINER RPCs + `payment.settle`/`payment.void`/`deposit.manage` permissions; `pos_sessions` + online card gateway + multi-tender `payment_splits` + bank deposit slip + multi-timezone DEFERRED
  - `ADR-038-tax-ar-ap-cogs-expense-posting-contract.md` — `tax_definitions` (configurable rates, exclusive/inclusive basis, input/output classification, effective dates, payable/receivable account FKs) + `tax-calc.ts` pure helpers (half-up rounding, line/invoice tax calculation) + AR surface (`customer_invoices` 7-state DRAFT/ISSUED/PARTIALLY_PAID/PAID/OVERDUE/VOID/CREDITED + `customer_invoice_lines` + `customer_receipts` 4-state + `customer_receipt_allocations` UNIQUE + `customer_credit_notes` 3-state) + AP surface (`supplier_invoices` 3-way match foundation + `supplier_payments` + `record_supplier_payment_atomic` 8-arg + 7-arg overloads SECURITY DEFINER) + `expense_claims` 6-state + `inventory_cogs_events` (4-state cost_source, 4-state status) + `inventory_consumption_events` (idempotent + reversible via reversed_event_id self-FK) + controlled GL posting services (`postSalesFromOrder` / `postSupplierInvoice` / `postCogsEvent` / `postPayrollAccrual` / `postPayrollSettlement`) gated on mapping-required + period-gated + exception-recording + 20 mapping purposes; seeded jurisdiction rates + automated COGS GL posting from kitchen consume + weighted-average/FIFO costing + `inventory_cost_history` + `sale` movement type wiring + automated procurement-to-GL automation + automated 3-way match + supplier-side invoice submission + partial-cancel of order line items + dedicated `refunds` table + partial-refund API + discounts master table DEFERRED
- **ADR_INDEX.md** updated with ADR-036/037/038 rows + extended Note paragraph.
- **`scripts/phase_11_verify.py`** — 70+ checks across 10 categories (foundation finance tables, ADR-036 RPCs + ADR-011 immutability triggers, ADR-037 cash tables, ADR-037 RPCs, ADR-038 tax/AR/AP/COGS tables, ADR-038 RPCs, RLS on ~30 finance tables, permissions + roles seeded, CHECK constraints, API + frontend surface prerequisites).
- **`docs/testing/acceptance-evidence/phase11-closeout/PHASE11_FINAL_GATE.md`** — comprehensive close report (16 gate criteria all PASS, gap analysis, deferred items with triggers, pending operator follow-ups, Phase 12 unlock).
- **`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`** — Phase 11 row marked ✅ COMPLETE; Current pointer updated to Phase 12.
- **`docs/00-governance/REPOSITORY_STATUS.md`** — reconciled to Phase 11 COMPLETE (v2.6.0).
- **`CHANGELOG.md`** — comprehensive [2.6.0] entry covering all 3 ADRs with detailed sub-sections.
- **`docs/releases/v2.6.0_RELEASE_NOTES.md`** — full release notes (ADR index final state, production deployment status, pending operator actions, Phase 12 unlock).

### Verification

- All finance migrations already in Production (foundation `20260713190000` orders/payments + `20260713191000` seed + `20260725110000` D3 corrective payments/deposits + `20260729010000` branch_payment_methods + `20260730210000` pos_z_report_events + `20260730260000` finance_core + `20260731010000` finance_account_mappings + `20260731020000` cash_reconciliations + `20260731030000` expense_claims + `20260731040000` finance_posting_and_ap_idempotency + `20260730270000` supplier_invoices_payments + `20260731180000` rc4_inventory_recipes_cogs + `20260731190000` rc4_finance_phase2_foundation + `20260731200000`/`20260731210000` rc4_payroll_calculation_foundation + `20260814180100`/`20260815000000` adr_011_accounting_immutability + FU-1 fix + `20260817000000` adr_008_009_010_delivery_rider COD + `20260819000000` adr_012_domain_event_audit).
- Production DB tip unchanged: `20260821000000` (Phase 3 OTP, same as Phase 5/6/7/8/9/10 closeouts).
- No new code — backend tests remain at 1096 passing.
- `scripts/phase_11_verify.py` provided as future re-verification artifact (70+ checks; SUPABASE_PAT required to execute).

### Phase 11 sub-area status

| Sub-area | Status |
|---|---|
| Revenue | ✅ DONE |
| Expenses | ✅ DONE |
| Payments | ✅ DONE |
| Cash | ✅ DONE |
| Branch P&L | ✅ DONE |
| Taxes | ✅ DONE |
| Discounts | 🟡 PARTIAL (order-level + coupons + loyalty rewards exist; non-coupon discounts master table DEFERRED per ADR-018/021) |
| Refunds | 🟡 PARTIAL (payments.refunded_at + customer_credit_notes + voidPayment + reverse_journal exist; dedicated refunds table + refund lifecycle service + partial-refund API DEFERRED per ADR-018/024/026) |
| Reconciliation | ✅ DONE |
| Reports | ✅ DONE |

### Phase 12 unlock

Phase 12 (Customer and Staff Apps) is now UNLOCKED. Dependencies satisfied through Phase 11. The Phase 11 finance GL + ADR-011 immutability + Phase 7 payments/bill-splits/deposits + Phase 9 COD reconciliation + Phase 11 AR/AP surfaces + Phase 6 reports & analytics registry provide the data foundation for Phase 12's customer-facing order history, loyalty wallet, invoice download, and rider/staff app finance summaries.

### Operator follow-ups

2 new for Phase 11: **FU-19** (configure `tax_definitions` rows per branch with jurisdiction-specific rates — without these, tax calculations return zero), **FU-20** (configure `finance_account_mappings` rows for the 20 mapping purposes per branch — without these, GL posting services fall back to exception-recording).
"""

url = f"https://api.github.com/repos/{REPO}/pulls"
headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28",
}
payload = json.dumps({
    "title": title,
    "body": body,
    "head": HEAD,
    "base": BASE,
    "draft": False,
}).encode()

req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode())
        print(f"PR #{result['number']} opened: {result['html_url']}")
        print(f"  head SHA: {result['head']['sha']}")
        print(f"  mergeable_state: {result.get('mergeable_state', 'unknown')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
