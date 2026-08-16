#!/usr/bin/env python3
"""Create annotated tag v2.7.1 + GitHub Release for Dashboard Docs Refresh."""
import json
import os
import sys
import urllib.request

REPO = "mianimr4n/telepizza"
TAG = "v2.7.1"
TARGET_COMMITISH = "main"  # will use latest main HEAD after fetch
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
if not TOKEN:
    print("ERROR: GITHUB_TOKEN / GH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
}

def fetch_json(url, method="GET", data=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers,
        method=method,
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

# Get latest main HEAD SHA
pr_info = fetch_json(f"https://api.github.com/repos/{REPO}/branches/main")
head_sha = pr_info["commit"]["sha"]
print(f"main HEAD: {head_sha}")

TAG_MESSAGE = f"""v2.7.1 — Dashboard & Status Docs Refresh (Phase 12 baseline)

Docs-only refresh — no new migrations, no code, no ADRs.

5 owner-facing living documents were stuck at 2026-07-28 / 2026-08-04
era (Phase 1.1 / Phase 2). All reconciled to Phase 12 baseline
(v2.7.0 / 94e5d69 / 41 ADRs / Phase 13 UNLOCKED).

Files refreshed:
  1. README.md (root)
  2. docs/README.md
  3. docs/DOCUMENTATION_MAP.md
  4. docs/00-governance/PROJECT_STATUS.md
  5. docs/17-releases/RELEASE_HISTORY.md
  6. docs/testing/DASHBOARD_AUDIT_REPORT.md

Plus:
  - docs/releases/v2.7.1_RELEASE_NOTES.md (new file)
  - CHANGELOG.md entry [2.7.1]
  - worklog.md task entry

Production DB tip unchanged at 20260821000000.
All 41 ADRs (ADR-001..ADR-041) remain Accepted v1.0.
Phase 13 (AI and Automation) remains UNLOCKED.

Squash merge: PR #240 → {head_sha[:7]}
"""

# Create annotated tag via refs + tag object
# Step 1: create the tag object
tag_payload = {
    "tag": TAG,
    "message": TAG_MESSAGE,
    "object": head_sha,
    "type": "commit",
}
tag_obj = fetch_json(
    f"https://api.github.com/repos/{REPO}/git/tags",
    method="POST",
    data=tag_payload,
)
tag_sha = tag_obj["sha"]
print(f"Tag object created: {tag_sha}")

# Step 2: create the ref
ref_payload = {"ref": f"refs/tags/{TAG}", "sha": tag_sha}
ref_obj = fetch_json(
    f"https://api.github.com/repos/{REPO}/git/refs",
    method="POST",
    data=ref_payload,
)
print(f"Ref refs/tags/{TAG} → {ref_obj['object']['sha'][:7]}")

# Step 3: create the GitHub Release
RELEASE_BODY = """## Dashboard & Status Docs Refresh — v2.7.1

**Docs-only refresh** — no new migrations, no code, no ADRs. This release synchronizes the owner-facing dashboard and status documents to the Phase 12 baseline (`v2.7.0`). Five living documents were previously stuck at the 2026-07-28 / 2026-08-04 era (Phase 1.1 / Phase 2) and are now reconciled to the current state (Phase 12 COMPLETE · `v2.7.0` · PR #239 · `94e5d69` · 41 ADRs · Phase 13 UNLOCKED).

### Files refreshed (6)

- `README.md` (root) — updated What Ships Today + Repository Focus + Repository Status
- `docs/README.md` — updated Last verified + Start here (Owner) + RC6 planning → Phase history
- `docs/DOCUMENTATION_MAP.md` — full rewrite of verified state + LIVE/DERIVED/FOUNDATION/UNAVAILABLE
- `docs/00-governance/PROJECT_STATUS.md` — full rewrite with Phase 5-12 release history
- `docs/17-releases/RELEASE_HISTORY.md` — full rewrite with v2.0.0 → v2.7.0 release history
- `docs/testing/DASHBOARD_AUDIT_REPORT.md` — reconciled Phase 2 backlog with Phase 5-12 closeouts (5 SHIPPED, 2 PARTIAL, 1 DEFERRED to Phase 13)

### Auxiliary files

- `docs/releases/v2.7.1_RELEASE_NOTES.md` (new)
- `CHANGELOG.md` entry `[2.7.1]`
- `worklog.md` task entry

### Verification

- ✅ Docs-only — no new code, no migration, no UI changes
- ✅ 6/6 CI checks PASS on PR #240 (CodeQL, Vercel Preview, Typecheck and test, Owner Playwright, Analyze, Dependency Scan)
- ✅ All 41 ADRs (ADR-001 through ADR-041) remain Accepted v1.0
- ✅ Production DB tip unchanged at `20260821000000`
- ✅ Phase 13 (AI and Automation) remains UNLOCKED

### Compatibility

Docs-only — no runtime impact, no migration, no breaking change.

### What's next

**Phase 13 (AI and Automation)** is the next major workstream — UNLOCKED with all dependencies satisfied. Phase 13 scope: demand forecasting · inventory prediction · delivery optimization · support AI · marketing automation · fraud signals · Mianx.ai agents · operational AI teams. ADR-013/014/015 AI governance (shipped v1.9.0 Phase 2.6) provides the framework.
"""

release_payload = {
    "tag_name": TAG,
    "target_commitish": head_sha,
    "name": f"v2.7.1 — Dashboard & Status Docs Refresh",
    "body": RELEASE_BODY,
    "draft": False,
    "prerelease": False,
    "make_latest": "true",
}
release = fetch_json(
    f"https://api.github.com/repos/{REPO}/releases",
    method="POST",
    data=release_payload,
)
print(f"GitHub Release created: {release['html_url']} (ID {release['id']})")
