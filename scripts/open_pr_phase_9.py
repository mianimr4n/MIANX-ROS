#!/usr/bin/env python3
"""
Open Phase 9 closeout PR via GitHub API.

Creates a PR from `phase-9-closeout` branch against `main` with the
Phase 9 ADR-030/031/032 closeout files.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
HEAD = "phase-9-closeout"
BASE = "main"

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

title = "docs(v2.4.0): Phase 9 complete — ADR-030/031/032 + close report + roadmap update"
body = """## Phase 9 (Rider and Delivery App) — Closeout

**Closeout-only release. No new migrations. No new code.**

### What's in this PR

- **3 new ADRs** formally accepting the as-built rider/delivery architecture:
  - `ADR-030-rider-identity-dispatch-assignment-contract.md` — rider identity (1:1 user_id + 1:1 branch_id) + manual dispatch contract (8 invariants, idempotent assignment, auto-dispatch DEFERRED)
  - `ADR-031-delivery-lifecycle-pickup-pod-surface.md` — delivery lifecycle (6-state machine) + pickup + POD surface (order mirror via mirrorOrderStatus + compensating rollback, POD-mandatory-for-delivered enforcement chain, failed-delivery capture + redelivery DEFERRED)
  - `ADR-032-rider-location-navigation-performance-contract.md` — rider location (ADR-008 elevation) + navigation + partial performance surface (GPS ingest endpoint, 24h TTL purge, aggregate KPIs, per-rider KPIs + rider_daily_summaries + rider mobile app + customer live map DEFERRED to Phase 12)
- **ADR_INDEX.md** updated with ADR-030/031/032 rows + Note section.
- **`scripts/phase_9_verify.py`** — 70+ checks across 10 categories (foundation tables, ADR-007 audit, ADR-008/009/010 tables, CHECK constraints, SQL functions + triggers, RLS, rider role + permissions, rider actor authz, idempotency UNIQUE indexes, API + frontend surface prerequisites).
- **`docs/testing/acceptance-evidence/phase9-closeout/PHASE9_FINAL_GATE.md`** — comprehensive close report (16 gate criteria all PASS, gap analysis, deferred items with triggers, pending operator follow-ups, Phase 10 unlock).
- **`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`** — Phase 9 row marked ✅ COMPLETE; Current pointer updated to Phase 10.
- **`docs/00-governance/REPOSITORY_STATUS.md`** — reconciled to Phase 9 COMPLETE (v2.4.0).
- **`CHANGELOG.md`** — comprehensive [2.4.0] entry covering all 3 ADRs with detailed sub-sections.
- **`docs/releases/v2.4.0_RELEASE_NOTES.md`** — full release notes (ADR index final state, production deployment status, pending operator actions, Phase 10 unlock).

### Verification

- All rider/delivery migrations already in Production (foundation `20260713190000` + ADR-007 `20260814180000` + ADR-008/009/010 `20260817000000`).
- Production DB tip unchanged: `20260821000000` (Phase 3 OTP, same as Phase 5/6/7/8 closeouts).
- No new code — backend tests remain at 1096 passing.
- `scripts/phase_9_verify.py` provided as future re-verification artifact (70+ checks; SUPABASE_PAT required to execute).

### Phase 9 sub-area status

| Sub-area | Status |
|---|---|
| Rider login | ✅ DONE |
| Assignment | ✅ DONE |
| Pickup | ✅ DONE |
| Navigation | 🟡 PARTIAL (deferred to Phase 12) |
| Out-for-delivery | ✅ DONE (by-design — picked-up IS the out-for-delivery state) |
| POD | ✅ DONE |
| Failed delivery | 🟡 PARTIAL (deferred — failed-delivery capture + redelivery flow) |
| Performance | 🟡 PARTIAL (deferred — per-rider KPIs + rider_daily_summaries) |

### Phase 10 unlock

Phase 10 (Inventory and Procurement) is now UNLOCKED.

### Operator follow-ups

1 new for Phase 9: **FU-15** — Set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render (gates the hourly `purge_expired_rider_locations` job per ADR-008 §3 + ADR-032 §3).
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
