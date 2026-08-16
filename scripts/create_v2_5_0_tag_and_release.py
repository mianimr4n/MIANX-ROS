#!/usr/bin/env python3
"""
Create v2.5.0 annotated tag + GitHub Release for Phase 10 closeout.

Steps:
1. Fetch latest main commit SHA (post-merge).
2. Create annotated tag v2.5.0 on that SHA.
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
TAG = "v2.5.0"

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
tag_message = f"""v2.5.0 — Phase 10 Complete (Inventory and Procurement)

3 new ADRs accepted:
- ADR-033: Inventory Stock Master, Movement Ledger & Atomic Adjustment Contract
- ADR-034: Recipe/BOM & COGS Costing Contract
- ADR-035: Procurement, Suppliers & GRN Contract

All 35 ADRs (ADR-001..ADR-035) Accepted v1.0.

Closeout-only release — no new migrations, no new code.
Production DB tip remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8/9).

Phase 11 (Finance and Reporting) UNLOCKED.
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
release_body = """# Phase 10 Complete — Inventory and Procurement (v2.5.0)

**Phase 10 — Inventory and Procurement — is FEATURE-COMPLETE and Production-verified.**

This release ships **3 new ADRs** formally accepting the as-built inventory and procurement architecture: ADR-033 (Inventory Stock Master, Movement Ledger & Atomic Adjustment Contract), ADR-034 (Recipe/BOM & COGS Costing Contract), and ADR-035 (Procurement, Suppliers & GRN Contract). All 35 ADRs (ADR-001 through ADR-035) are now Accepted v1.0 with standalone ADR markdown files under `docs/13-adr/`.

Phase 10 is a **closeout phase**: the underlying code has been live in Production since v1.8.0 (purchasing + GRN + supplier invoices + supplier portal), v1.9.0 (atomic stock adjustments + kitchen recipe stock consume), and v2.0.0 (versioned recipes + COGS events). This release adds no new migrations and no new code — only formal ADR elevation + verification script + closeout documentation. The Production DB tip remains `20260821000000` (same as Phase 5/6/7/8/9 closeouts).

## Highlights

- **ADR-033** — Branch-scoped `inventory_items` + immutable `stock_movements` ledger (8 movement types) + `adjust_inventory_stock_atomic` SECURITY DEFINER RPC with 4 invariants.
- **ADR-034** — Versioned `inventory_recipes` (one-active-per-menu_item) + idempotent + reversible consumption events + COGS events with last_known cost_source (forward-compatible with weighted_average/fifo).
- **ADR-035** — Full procurement surface: suppliers (status + approval_status split) + POs (8-state machine with approval gate) + GRN (3-state machine with atomic stock post) + supplier_invoices (3-way match foundation) + supplier_payments (GL-posting RPC) + supplier portal (20 routes).

## Verification

`scripts/phase_10_verify.py` — 70+ checks across 10 categories (foundation tables, atomic RPCs, recipe/COGS tables, procurement tables, supplier portal tables, RLS on 23 tables, permissions + roles, CHECK constraints, API + frontend surface prerequisites).

Run with: `SUPABASE_PAT=<token> python3 scripts/phase_10_verify.py`

## Production Deployment Status

- Database migrations: ✅ Already in Production (no new migrations in v2.5.0)
- Production DB tip: `20260821000000_adr_016_017_otp.sql` (unchanged since Phase 5)
- Backend API: ✅ Already deployed (54 inventory/procurement routes live)
- Frontend: ✅ Already deployed (AdminInventory + AdminPurchasing + supplier portal — 10 pages)
- Backend tests: 1096 passing (unchanged from v2.4.0)

## Phase 11 Unlock

Phase 11 (Finance and Reporting) is now UNLOCKED.

## Closing

The remaining PARTIAL gaps (transfers, alerts, modifier-effect consume, COGS GL posting) are explicitly deferred with documented trigger conditions. The backend contract is stable and will not change when these gaps are filled in future phases.
"""

release_url = f"https://api.github.com/repos/{REPO}/releases"
release_payload = json.dumps({
    "tag_name": TAG,
    "target_commitish": main_sha,
    "name": f"v2.5.0 — Phase 10 Complete (Inventory and Procurement)",
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

print(f"\n✅ v2.5.0 tag + release complete.")
