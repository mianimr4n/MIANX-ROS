#!/usr/bin/env python3
"""
Create v2.4.0 annotated tag + GitHub Release for Phase 9 closeout.

Steps:
1. Fetch latest main commit SHA (post-merge).
2. Create annotated tag v2.4.0 on that SHA.
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
TAG = "v2.4.0"

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
tag_message = f"""v2.4.0 — Phase 9 Complete (Rider and Delivery App)

3 new ADRs accepted:
- ADR-030: Rider Identity, Dispatch & Assignment Contract
- ADR-031: Delivery Lifecycle, Pickup & POD Surface
- ADR-032: Rider Location, Navigation & Performance Contract

All 32 ADRs (ADR-001..ADR-032) Accepted v1.0.

Closeout-only release — no new migrations, no new code.
Production DB tip remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8).

Phase 10 (Inventory and Procurement) UNLOCKED.
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

# Step 4: Get tag object SHA for reporting
result = subprocess.run(
    ["git", "rev-parse", TAG],
    capture_output=True,
    text=True,
)
tag_object_sha = result.stdout.strip() if result.returncode == 0 else "unknown"
print(f"  tag object SHA: {tag_object_sha}")

# Step 5: Create GitHub Release
print(f"\nCreating GitHub Release {TAG}...")
release_body = f"""# Phase 9 Complete — Rider and Delivery App

**Closeout-only release. No new migrations. No new code.**

## 3 new ADRs

- **ADR-030** — Rider Identity, Dispatch & Assignment Contract: rider role + 1:1 user_id + 1:1 branch_id, manual dispatch with 8 invariants, idempotent assignment, auto-dispatch DEFERRED.
- **ADR-031** — Delivery Lifecycle, Pickup & POD Surface: 6-state machine (pending→assigned→picked-up→delivered|failed|cancelled), order mirror via mirrorOrderStatus + compensating rollback, POD-mandatory-for-delivered enforcement chain, failed-delivery capture + redelivery DEFERRED.
- **ADR-032** — Rider Location, Navigation & Performance Contract: rider_locations ephemeral GPS table (ADR-008 elevation), 24h TTL purge, GPS ingest endpoint, aggregate KPIs, per-rider KPIs + rider_daily_summaries + rider mobile app + customer live map DEFERRED to Phase 12.

## All 32 ADRs Accepted v1.0

ADR-001 through ADR-032 now have standalone markdown files under `docs/13-adr/`.

## Verification

`scripts/phase_9_verify.py` — 70+ checks across 10 categories. Run with `SUPABASE_PAT=<token> python3 scripts/phase_9_verify.py`.

## Production DB tip

`20260821000000` (Phase 3 OTP) — unchanged since Phase 5 closeout. All rider/delivery migrations already in Production.

## Phase 10 unlock

Phase 10 (Inventory and Procurement) is now UNLOCKED.

## Pending operator follow-ups (no code blockers)

8 follow-ups total (7 inherited + 1 new for Phase 9: FU-15 — set `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` on Render). See `docs/testing/acceptance-evidence/phase9-closeout/PHASE9_FINAL_GATE.md` for full list.

---

**Next major workstream:** Phase 10 (Inventory and Procurement) — UNLOCKED.
"""

url = f"https://api.github.com/repos/{REPO}/releases"
payload = json.dumps({
    "tag_name": TAG,
    "target_commitish": main_sha,
    "name": f"{TAG} — Phase 9 Complete (Rider and Delivery App)",
    "body": release_body,
    "draft": False,
    "prerelease": False,
}).encode()

req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        result = json.loads(resp.read().decode())
        print(f"  Release created: {result.get('html_url', 'unknown')}")
        print(f"  Release ID: {result.get('id', 'unknown')}")
        print(f"  Published at: {result.get('published_at', 'unknown')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"HTTP {e.code}: {body[:500]}")
    sys.exit(1)
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

print(f"\n✅ v2.4.0 tag + release created successfully.")
