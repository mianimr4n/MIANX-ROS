#!/usr/bin/env python3
"""Squash merge PR #240 — Dashboard & Status Docs Refresh v2.7.1."""
import json
import os
import sys
import urllib.request

REPO = "mianimr4n/telepizza"
PR_NUMBER = 240
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

COMMIT_TITLE = "docs(v2.7.1): refresh dashboard & status docs to Phase 12 baseline (#240)"

COMMIT_MESSAGE = """User reported dashboard still at Phase 2 even though Phase 12 shipped
(v2.7.0). Audit found 6 owner-facing living documents stuck at the
2026-07-28 / 2026-08-04 era (Phase 1.1 / Phase 2):

  1. README.md (root) — mentioned D1 Executive Dashboard v1 as current slice
  2. docs/README.md — said Phase 2 not started
  3. docs/DOCUMENTATION_MAP.md — referenced 2026-07-28 state
  4. docs/00-governance/PROJECT_STATUS.md — referenced PR #113-#120 from July
  5. docs/17-releases/RELEASE_HISTORY.md — said v1.5.1 was latest tag
  6. docs/testing/DASHBOARD_AUDIT_REPORT.md — said READY WITH PHASE 2 BACKLOG

All 6 files refreshed to Phase 12 baseline (v2.7.0 / 94e5d69 / 41 ADRs /
Phase 13 UNLOCKED). docs/00-governance/REPOSITORY_STATUS.md was already
at Phase 12 baseline — no update needed.

Files changed:
- README.md: updated What Ships Today + Repository Focus + Repository Status
- docs/README.md: updated Last verified + Start here + RC6 → Phase history
- docs/DOCUMENTATION_MAP.md: full rewrite of verified state + LIVE/FOUNDATION
- docs/00-governance/PROJECT_STATUS.md: full rewrite with Phase 5-12 history
- docs/17-releases/RELEASE_HISTORY.md: full rewrite with v2.0.0 → v2.7.0
- docs/testing/DASHBOARD_AUDIT_REPORT.md: reconciled Phase 2 backlog with
  Phase 5-12 closeouts — 5 SHIPPED, 2 PARTIAL, 1 DEFERRED to Phase 13
- docs/releases/v2.7.1_RELEASE_NOTES.md: new file (~180 lines)
- CHANGELOG.md: added [2.7.1] entry
- worklog.md: appended dashboard-status-refresh-v2.7.1 task entry

Docs-only — no migrations, no code, no ADRs. Production DB tip unchanged
at 20260821000000. All 41 ADRs remain Accepted v1.0. Phase 13 remains
UNLOCKED with dependencies satisfied.

6/6 CI checks PASS (CodeQL, Vercel Preview, Typecheck and test, Owner
Playwright, Analyze, Dependency Scan)."""

payload = {
    "commit_title": COMMIT_TITLE,
    "commit_message": COMMIT_MESSAGE,
    "squash": True,
    "merge_method": "squash",
}

req = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}/merge",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    },
    method="PUT",
)
try:
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode("utf-8")
        print(f"HTTP {resp.status}")
        print(body)
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
    sys.exit(1)
