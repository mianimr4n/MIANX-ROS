#!/usr/bin/env python3
"""
Create v2.6.0 annotated tag + GitHub Release for Phase 11 closeout.

Steps:
1. Fetch latest main commit SHA (post-merge).
2. Create annotated tag v2.6.0 on that SHA.
3. Push tag to origin (via git CLI).
4. Create GitHub Release via API.
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
TAG = "v2.6.0"

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

# Step 1: Fetch latest main commit SHA
url = f"https://api.github.com/repos/{REPO}/branches/main"
headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28",
}
req = urllib.request.Request(url, headers=headers, method="GET")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())
        main_sha = data["commit"]["sha"]
        print(f"main HEAD SHA: {main_sha}")
except Exception as e:
    print(f"ERROR fetching main: {e}")
    sys.exit(2)

# Step 2: Create annotated tag via git CLI
tag_message = f"""v2.6.0 — Phase 11 Complete (Finance and Reporting)

3 new ADRs accepted:
- ADR-036: Branch GL, P&L, Balance Sheet & Cash Flow Contract
- ADR-037: Cash Reconciliation, Z-Report & COD Financial Ownership Contract
- ADR-038: Tax, AR, AP, COGS & Expense Posting Contract

All 38 ADRs (ADR-001..ADR-038) Accepted v1.0.

Closeout-only release — no new migrations, no new code.
Production DB tip remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8/9/10).

Phase 12 (Customer and Staff Apps) UNLOCKED.
"""

print(f"\nCreating annotated tag {TAG} on {main_sha}...")
result = subprocess.run(
    ["git", "tag", "-a", TAG, "-m", tag_message, main_sha],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(f"git tag failed: {result.stderr}")
    sys.exit(1)
print(f"  tag created locally.")

# Step 3: Push tag to origin
print(f"\nPushing tag {TAG} to origin...")
result = subprocess.run(
    ["git", "push", "origin", TAG],
    capture_output=True,
    text=True,
)
if result.returncode != 0:
    print(f"git push failed: {result.stderr}")
    sys.exit(1)
print(f"  tag pushed.")

# Step 4: Create GitHub Release
print(f"\nCreating GitHub Release {TAG}...")
release_body = """# Phase 11 Complete — Finance and Reporting (v2.6.0)

**Phase 11 — Finance and Reporting — is FEATURE-COMPLETE and Production-verified.**

This release ships **3 new ADRs** formally accepting the as-built finance and reporting architecture: ADR-036 (Branch GL, P&L, Balance Sheet & Cash Flow Contract), ADR-037 (Cash Reconciliation, Z-Report & COD Financial Ownership Contract), and ADR-038 (Tax, AR, AP, COGS & Expense Posting Contract). All 38 ADRs (ADR-001 through ADR-038) are now Accepted v1.0 with standalone ADR markdown files under `docs/13-adr/`.

Phase 11 is a **closeout phase**: the underlying code has been live in Production across multiple prior waves — v1.8.0 (foundation orders + payments + ADR-010 COD + ADR-011 immutability), v1.9.0 (Phase 2.5 account mappings), v2.0.0 (D3 corrective payments expansion + bill splits + reservation deposits + `close_dining_session_atomic`), v2.1.0 (Phase 6 analytics registry + admin reports routes), v2.2.0 (Phase 7 POS + Z-report + cash reconciliations + `branch_payment_methods`), and v2.3.0 (Phase 8 RC4 Finance Phase 2 — `tax_definitions` + AR + finance periods + balance sheet + cash flow indirect + COGS events). This release adds no new migrations and no new code — only formal ADR elevation + verification script + closeout documentation. The Production DB tip remains `20260821000000` (same as Phase 5/6/7/8/9/10 closeouts).

## Highlights

- **ADR-036** — Branch GL + 5-type Chart of Accounts (branch-scoped, UNIQUE branch+account_code) + double-entry `journal_entries` (3-state draft/posted/voided) + balanced `journal_entry_lines` + `create_journal_entry_atomic` / `reverse_journal_entry_atomic` SECURITY DEFINER RPCs + `finance_trial_balance` / `finance_profit_loss` / `finance_balance_sheet` / `finance_cash_flow_indirect` financial-statement RPCs + `finance_periods` 3-state period control + `finance_assert_period_allows_posting` SECURITY DEFINER gate + `finance_account_mappings` (20 canonical purposes) + `finance_exceptions` 3-state queue + `finance_postings` idempotency UNIQUE + ADR-011 immutability triggers.
- **ADR-037** — Z-Report append-only audit + `cash_reconciliations` 6-state with server-side `compute_cash_reconciliation_totals` IMMUTABLE RPC + COD 4-state reconciliation with ADR-010 `post_cod_collection_journal` trigger (idempotent via `finance_postings` UNIQUE) + `payments` 8-state 4-method + `bill_splits` 4 strategies + `reservation_deposits` 7-state + `branch_payment_methods` config + `settle_bill_payment_atomic` / `close_dining_session_atomic` SECURITY DEFINER RPCs.
- **ADR-038** — `tax_definitions` (configurable rates, exclusive/inclusive basis, input/output classification) + AR surface (`customer_invoices` 7-state + `customer_receipts` + `customer_receipt_allocations` + `customer_credit_notes` 3-state) + AP surface (`supplier_invoices` 3-way match foundation + `supplier_payments` + `record_supplier_payment_atomic` 8-arg + 7-arg overloads) + `expense_claims` 6-state + `inventory_cogs_events` (4-state cost_source, 4-state status) + `inventory_consumption_events` (idempotent + reversible) + controlled GL posting services (postSalesFromOrder / postSupplierInvoice / postCogsEvent / postPayrollAccrual / postPayrollSettlement) gated on mapping-required + period-gated + exception-recording.

## Verification

`scripts/phase_11_verify.py` — 70+ checks across 10 categories (foundation finance tables, ADR-036 RPCs + ADR-011 immutability triggers, ADR-037 cash tables, ADR-037 RPCs, ADR-038 tax/AR/AP/COGS tables, ADR-038 RPCs, RLS on ~30 finance tables, permissions + roles seeded, CHECK constraints, API + frontend surface prerequisites).

Run with: `SUPABASE_PAT=<token> python3 scripts/phase_11_verify.py`

## Production Deployment Status

- Database migrations: ✅ Already in Production (no new migrations in v2.6.0)
- Production DB tip: `20260821000000_adr_016_017_otp.sql` (unchanged since Phase 5)
- Backend API: ✅ Already deployed (59 finance/payment/report/POS/COD routes live — 30 finance + 9 payments + 12 reports + 3 POS + 5 COD)
- Frontend: ✅ Already deployed (AdminFinance + AdminReports + AdminPos + finance/reports/POS component families + 2 dashboard panels)
- Backend tests: 1096 passing (unchanged from v2.5.0)

## ADR Index — Final State (38 ADRs)

All 38 ADRs (ADR-001 through ADR-038) Accepted v1.0 with standalone files under `docs/13-adr/`. Phase 11 contributes ADR-036, ADR-037, ADR-038.

## Phase 12 Unlock

Phase 12 (Customer and Staff Apps) is now UNLOCKED. Dependencies satisfied through Phase 11. The Phase 11 finance GL + ADR-011 immutability + Phase 7 payments/bill-splits/deposits + Phase 9 COD reconciliation + Phase 11 AR/AP surfaces + Phase 6 reports & analytics registry provide the data foundation for Phase 12's customer-facing order history, loyalty wallet, invoice download, and rider/staff app finance summaries.

## Closing

The remaining PARTIAL gaps (Discounts — no master table for non-coupon discounts; Refunds — no dedicated refunds table + no refund lifecycle service + no partial-refund API) are explicitly deferred with documented trigger conditions. The backend contract is stable and will not change when these gaps are filled in future phases.
"""

release_url = f"https://api.github.com/repos/{REPO}/releases"
release_payload = json.dumps({
    "tag_name": TAG,
    "target_commitish": main_sha,
    "name": f"v2.6.0 — Phase 11 Complete (Finance and Reporting)",
    "body": release_body,
    "draft": False,
    "prerelease": False,
}).encode()

release_req = urllib.request.Request(release_url, data=release_payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(release_req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
        print(f"  Release created: {result.get('html_url', 'unknown')}")
        print(f"  Release ID: {result.get('id', 'unknown')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

print(f"\n✅ v2.6.0 tag + release complete.")
