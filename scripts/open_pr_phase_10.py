#!/usr/bin/env python3
"""
Open Phase 10 closeout PR via GitHub API.

Creates a PR from `phase-10-closeout` branch against `main` with the
Phase 10 ADR-033/034/035 closeout files.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
HEAD = "phase-10-closeout"
BASE = "main"

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

title = "docs(v2.5.0): Phase 10 complete — ADR-033/034/035 + close report + roadmap update"
body = """## Phase 10 (Inventory and Procurement) — Closeout

**Closeout-only release. No new migrations. No new code.**

### What's in this PR

- **3 new ADRs** formally accepting the as-built inventory/procurement architecture:
  - `ADR-033-inventory-stock-master-movement-ledger-contract.md` — inventory stock master (branch-scoped `inventory_items` with `(branch_id, sku)` UNIQUE) + immutable `stock_movements` ledger (8 movement types) + `adjust_inventory_stock_atomic` SECURITY DEFINER RPC with 4 invariants (QUANTITY_DELTA_INVALID, INVENTORY_ITEM_NOT_FOUND, INSUFFICIENT_STOCK, MOVEMENT_TYPE_INVALID); low-stock alerts + dedicated transfers + batch tracking + cost history DEFERRED
  - `ADR-034-recipe-bom-cogs-costing-contract.md` — versioned `inventory_recipes` (one-active-per-menu_item partial UNIQUE index) + `inventory_recipe_lines` with waste_factor + idempotent + reversible `inventory_consumption_events` (UNIQUE idempotency_key + reversed_event_id self-FK) + `inventory_cogs_events` with last_known cost_source (forward-compatible with weighted_average/fifo) + cost-availability honesty model (LIVE/DERIVED/UNAVAILABLE/DEFERRED); modifier-effect consume + COGS GL posting + recipe versioning rollback DEFERRED
  - `ADR-035-procurement-suppliers-grn-contract.md` — suppliers (status + approval_status split) + purchase_orders (8-state machine with approval gate) + GRN (3-state machine with `create_goods_receiving_with_stock_atomic` RPC) + supplier_invoices (3-way match foundation: match_status + variance_amount) + supplier_payments (`record_supplier_payment_atomic` RPC with GL posting) + full supplier portal surface (20 routes + idempotent responses + document upload); automated 3-way match + multi-branch consolidation + supplier SSO + supplier-side invoice submission DEFERRED
- **ADR_INDEX.md** updated with ADR-033/034/035 rows + Note section.
- **`scripts/phase_10_verify.py`** — 70+ checks across 10 categories (foundation inventory tables, ADR-033 atomic RPC, ADR-034 recipe/COGS tables + RPCs, ADR-035 procurement tables + portal tables, RLS on 23 tables, permissions + roles, CHECK constraints, API + frontend surface prerequisites).
- **`docs/testing/acceptance-evidence/phase10-closeout/PHASE10_FINAL_GATE.md`** — comprehensive close report (16 gate criteria all PASS, gap analysis, deferred items with triggers, pending operator follow-ups, Phase 11 unlock).
- **`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`** — Phase 10 row marked ✅ COMPLETE; Current pointer updated to Phase 11.
- **`docs/00-governance/REPOSITORY_STATUS.md`** — reconciled to Phase 10 COMPLETE (v2.5.0).
- **`CHANGELOG.md`** — comprehensive [2.5.0] entry covering all 3 ADRs with detailed sub-sections.
- **`docs/releases/v2.5.0_RELEASE_NOTES.md`** — full release notes (ADR index final state, production deployment status, pending operator actions, Phase 11 unlock).

### Verification

- All inventory/procurement migrations already in Production (RC3 `20260730160000` + `20260730170000` + `20260730180000` + `20260730220000` + `20260730230000` + `20260730270000` + `20260731120000` + `20260731130000` + RC4 `20260731180000`).
- Production DB tip unchanged: `20260821000000` (Phase 3 OTP, same as Phase 5/6/7/8/9 closeouts).
- No new code — backend tests remain at 1096 passing.
- `scripts/phase_10_verify.py` provided as future re-verification artifact (70+ checks; SUPABASE_PAT required to execute).

### Phase 10 sub-area status

| Sub-area | Status |
|---|---|
| Ingredients | ✅ DONE |
| Recipe/BOM | ✅ DONE |
| Stock | ✅ DONE |
| Branch inventory | ✅ DONE |
| POs | ✅ DONE |
| Suppliers | ✅ DONE |
| Wastage | ✅ DONE |
| Transfers | 🟡 PARTIAL (movement types exist; dedicated table + endpoint DEFERRED) |
| Alerts | 🟡 PARTIAL (columns exist; automated notification DEFERRED) |
| Costing | ✅ DONE (last_known wired; weighted_average/fifo DEFERRED to Phase 11) |

### Phase 11 unlock

Phase 11 (Finance and Reporting) is now UNLOCKED.

### Operator follow-ups

3 new for Phase 10: **FU-16** (seed `inventory_items` rows per branch), **FU-17** (seed `inventory_recipes` + activate per branch), **FU-18** (configure Supabase Storage bucket `supplier-documents`).
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
