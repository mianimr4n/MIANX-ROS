#!/usr/bin/env python3
"""
Merge Phase 10 closeout PR via GitHub API (squash merge).

Reads PR number from env or arg, performs squash merge, prints merge commit SHA.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
PR_NUMBER = int(os.environ.get("PHASE10_PR_NUMBER", sys.argv[1] if len(sys.argv) > 1 else "237"))

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

commit_title = f"docs(v2.5.0): Phase 10 complete — ADR-033/034/035 + close report + roadmap update (#{PR_NUMBER})"
commit_message = """Phase 10 (Inventory and Procurement) closeout:

- 3 new ADRs accepted: ADR-033 (Inventory Stock Master/Movement Ledger/
  Atomic Adjustment Contract), ADR-034 (Recipe/BOM & COGS Costing
  Contract), ADR-035 (Procurement, Suppliers & GRN Contract).
- All 35 ADRs (ADR-001..ADR-035) now Accepted v1.0 with standalone files.
- Closeout-only release — no new migrations, no new code. Production DB tip
  remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8/9 closeouts).
- scripts/phase_10_verify.py provided (70+ checks across 10 categories).
- Phase 11 (Finance and Reporting) UNLOCKED.
"""

url = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/merge"
headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "X-GitHub-Api-Version": "2022-11-28",
}
payload = json.dumps({
    "commit_title": commit_title,
    "commit_message": commit_message,
    "merge_method": "squash",
}).encode()

req = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
        print(f"PR #{PR_NUMBER} merged: {result.get('message', 'OK')}")
        print(f"  merge commit SHA: {result.get('sha', 'unknown')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
