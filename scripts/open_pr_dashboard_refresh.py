#!/usr/bin/env python3
"""Open PR #240 — Dashboard & Status Docs Refresh v2.7.1.

Docs-only refresh of 6 stale owner-facing dashboard/status docs to Phase 12
baseline (v2.7.0). No new migrations, no code, no ADRs.
"""
import json
import os
import sys
import urllib.request

REPO = "mianimr4n/telepizza"
BRANCH = "dashboard-status-refresh-v2.7.1"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

PR_BODY = """## Dashboard & Status Docs Refresh — v2.7.1 (docs-only)

**User report:** *"dashboard abhi bi phase 2 par hy"* — the dashboard is still at Phase 2 even though Phase 12 shipped (`v2.7.0`).

### Root cause

Audit found **6 owner-facing living documents** stuck at the 2026-07-28 / 2026-08-04 era (Phase 1.1 / Phase 2):

| # | File | Stale state |
| --- | --- | --- |
| 1 | `README.md` (root) | "Current Delivery Slice: D1 – Executive Dashboard v1" |
| 2 | `docs/README.md` | "Phase 2 not started" (2026-08-04) |
| 3 | `docs/DOCUMENTATION_MAP.md` | references 2026-07-28 state, PR #102/#111 |
| 4 | `docs/00-governance/PROJECT_STATUS.md` | references PR #113-#120 from July 2026 |
| 5 | `docs/17-releases/RELEASE_HISTORY.md` | says `v1.5.1` is latest tag |
| 6 | `docs/testing/DASHBOARD_AUDIT_REPORT.md` | "READY WITH PHASE 2 BACKLOG" (2026-07-30) |

`docs/00-governance/REPOSITORY_STATUS.md` was **already** at Phase 12 baseline (reconciled during v2.7.0 closeout) — no update needed.

### Resolution

All 6 files refreshed to Phase 12 baseline:

- **`README.md`** — updated "What Ships Today" + "Repository Focus" + "Repository Status" sections. Removed stale D1 marker. Added Phase 12 closeout anchor block (PR #239 · `94e5d69` · `v2.7.0` · 6/6 CI PASS).
- **`docs/README.md`** — updated "Last verified" line. Updated "Start here (Owner)" table. Replaced stale "RC6 planning" section with full Phase 5–13 release history table.
- **`docs/DOCUMENTATION_MAP.md`** — full rewrite of "Current verified state" + "What is LIVE / DERIVED / FOUNDATION / UNAVAILABLE". Added Phase release history table. Consolidated FOUNDATION items with ADR trigger conditions.
- **`docs/00-governance/PROJECT_STATUS.md`** — full rewrite. 8-row phase release history table. LIVE capabilities across all 12 phases. 6 Operator Follow-ups (FU-3/4/5/7/8/11). Phase 13 unlock.
- **`docs/17-releases/RELEASE_HISTORY.md`** — full rewrite. Canonical anchors updated to `v2.7.0` / `94e5d69` / Phase 13 UNLOCKED. Full Phase 5–12 release history table with PR numbers, SHAs, ADRs, GitHub Release links. Pre-Phase-5 historical anchors preserved.
- **`docs/testing/DASHBOARD_AUDIT_REPORT.md`** — reconciled 2026-07-30 "Phase 2 backlog" verdict with Phase 5–12 closeouts. The 8 original Phase 2 backlog items now resolved: 5 SHIPPED (coupons, loyalty, reports Excel/PDF, HR attendance/payroll, three-way match), 2 PARTIAL (menu bulk/nested tree, inventory transfers/FIFO/WAC) with explicit DEFERRED tracking, 1 DEFERRED (AI autonomous runtime → Phase 13). 21-module status matrix updated.

### Auxiliary files

- `docs/releases/v2.7.1_RELEASE_NOTES.md` — new file (~180 lines)
- `CHANGELOG.md` — added `[2.7.1]` entry
- `worklog.md` — appended `dashboard-status-refresh-v2.7.1` task entry

### Verification

- ✅ Docs-only — no new code, no migration, no UI changes.
- ✅ `docs/00-governance/REPOSITORY_STATUS.md` was already at Phase 12 baseline.
- ✅ All 41 ADRs (ADR-001 through ADR-041) remain Accepted v1.0.
- ✅ Production DB tip unchanged at `20260821000000`.
- ✅ Phase 13 (AI and Automation) remains UNLOCKED.

### Compatibility

Docs-only — no runtime impact, no migration, no breaking change. Phase 13 audit + ADR drafting begins after this PR merges.

---

**Phase 13 unlock status:** UNLOCKED with all dependencies satisfied (Phase 5 ADR-018 · Phase 6 ADR-019/020/021/022 · Phase 7 ADR-023/024/025/026 · Phase 8 ADR-027/028/029 · Phase 9 ADR-030/031/032 · Phase 10 ADR-033/034/035 · Phase 11 ADR-036/037/038 · Phase 12 ADR-039/040/041).
"""

payload = {
    "title": "docs(v2.7.1): refresh dashboard & status docs to Phase 12 baseline",
    "head": BRANCH,
    "base": "main",
    "body": PR_BODY,
    "draft": False,
}

req = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/pulls",
    data=json.dumps(payload).encode("utf-8"),
    headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
    sys.exit(1)

print(f"PR #{data['number']} opened: {data['html_url']}")
print(f"  head_sha: {data['head']['sha']}")
print(f"  mergeable_state: {data.get('mergeable_state')}")
