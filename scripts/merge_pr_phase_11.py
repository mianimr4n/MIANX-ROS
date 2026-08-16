#!/usr/bin/env python3
"""
Merge Phase 11 closeout PR via GitHub API (squash merge).

Reads PR number from env or arg, performs squash merge, prints merge commit SHA.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
PR_NUMBER = int(os.environ.get("PHASE11_PR_NUMBER", sys.argv[1] if len(sys.argv) > 1 else "0"))

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

if not PR_NUMBER:
    print("ERROR: PR number required (env PHASE11_PR_NUMBER or argv[1])")
    sys.exit(2)

commit_title = f"docs(v2.6.0): Phase 11 complete — ADR-036/037/038 + close report + roadmap update (#{PR_NUMBER})"
commit_message = """Phase 11 (Finance and Reporting) closeout:

- 3 new ADRs accepted: ADR-036 (Branch GL, P&L, Balance Sheet & Cash Flow
  Contract), ADR-037 (Cash Reconciliation, Z-Report & COD Financial
  Ownership Contract), ADR-038 (Tax, AR, AP, COGS & Expense Posting
  Contract).
- All 38 ADRs (ADR-001..ADR-038) now Accepted v1.0 with standalone files.
- Closeout-only release — no new migrations, no new code. Production DB tip
  remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8/9/10
  closeouts).
- scripts/phase_11_verify.py provided (70+ checks across 10 categories).
- Phase 12 (Customer and Staff Apps) UNLOCKED.
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
