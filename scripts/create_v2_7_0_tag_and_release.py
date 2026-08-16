#!/usr/bin/env python3
"""
Create v2.7.0 annotated tag + GitHub Release for Phase 12 closeout.

Steps:
1. Fetch latest main commit SHA (post-merge).
2. Create annotated tag v2.7.0 on that SHA.
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
TAG = "v2.7.0"

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
tag_message = f"""v2.7.0 — Phase 12 Complete (Customer and Staff Apps)

3 new ADRs accepted:
- ADR-039: Customer Mobile & Franchise Portal Contract
- ADR-040: Rider Mobile App & Delivery Dashboard Contract
- ADR-041: Staff App & Support Panel Contract

All 41 ADRs (ADR-001..ADR-041) Accepted v1.0.

Closeout-only release — no new migrations, no new code.
Production DB tip remains 20260821000000 (Phase 3 OTP, same as Phase 5/6/7/8/9/10/11).

Phase 13 (AI and Automation) UNLOCKED.
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
release_body = """# Phase 12 Complete — Customer and Staff Apps (v2.7.0)

**Phase 12 — Customer and Staff Apps — is FEATURE-COMPLETE and Production-verified.**

This release ships **3 new ADRs** formally accepting the as-built customer/staff/rider/franchise/support/delivery surface: ADR-039 (Customer Mobile & Franchise Portal Contract), ADR-040 (Rider Mobile App & Delivery Dashboard Contract), and ADR-041 (Staff App & Support Panel Contract). All 41 ADRs (ADR-001 through ADR-041) are now Accepted v1.0 with standalone ADR markdown files under `docs/13-adr/`.

Phase 12 is a **closeout phase**: the underlying code has been live in Production across multiple prior waves — v1.2.0 (Phase 1 customer website foundation), v1.6.0/v1.10.0 (Phase 2/3 customer auth + OTP), v1.7.0 (Phase 4 order placement + tracking), v2.1.0 (Phase 6 admin dashboard + analytics registry + CRM + WhatsApp), v2.2.0 (Phase 7 POS cashier workflow), v2.3.0 (Phase 8 KDS), v2.4.0 (Phase 9 rider endpoints + delivery dashboard + rider_locations), v2.5.0 (Phase 10 inventory), and v2.6.0 (Phase 11 finance). This release adds no new migrations and no new code — only formal ADR elevation + verification script + closeout documentation. The Production DB tip remains `20260821000000` (same as Phase 5/6/7/8/9/10/11 closeouts).

## Highlights

- **ADR-039** — Customer mobile surface (web-first PWA via `apps/website` React + Vite SPA with 25+ customer pages + `site.webmanifest` PWA manifest + ADR-017 phone-first auth + ADR-018 order lifecycle + ADR-021 loyalty wallet + `TrackOrder.tsx` 316 lines + `MyTelepizza.tsx` 2,303 lines) + franchise portal surface (`organization_owner` role seeded in Identity 01 migration + `AnalyticsService.getOwnerWorkspace` 25-module analytics dashboard including `branch_comparison` cross-branch KPI matrix + mounted at `GET /api/v1/admin/reports/owner-workspace` + `AdminBranchManager.tsx` 689 lines multi-branch view); NO native mobile app, NO service worker, NO push notifications, NO offline ordering, NO `franchisee` role, NO multi-tenant SaaS isolation, NO franchise agreement tracking, NO royalty computation — all DEFERRED with explicit trigger conditions.
- **ADR-040** — Rider mobile surface (`rider` role + `/staff/login` + `isRiderOnly` scope check + 4 rider-facing routes under `/api/v1/riders/*`: assignments, roster, assign, status + ADR-030/031/032 rider identity + delivery lifecycle + POD; uses admin web on mobile browser, NO native rider app) + delivery dashboard surface (`AdminDelivery.tsx` 550 lines + 8 sub-components totaling ~3,500 lines: DeliveryCards/Drawer/Filters/Insights/KPIs/SidePanels/Timeline/DispatchQueue + 10 admin delivery routes in `delivery-rider.ts` + ADR-008 `rider_locations` ephemeral table with 24h TTL purge + GPS ingest endpoint + ADR-009 POD capture + ADR-010 COD reconciliation + aggregate KPIs in DeliveryKPIs + DeliveryInsights); NO turn-by-turn nav, NO in-app call masking, NO push notifications, NO offline-tolerant queue, NO live rider map, NO `rider_daily_summaries` table, NO per-rider KPI dashboard — all DEFERRED from Phase 9 ADR-032 §8-12 with explicit trigger conditions.
- **ADR-041** — Staff app surface (`AdminShell.tsx` + 37 admin pages + 5 ops pages + 32 admin router modules totaling 350+ routes + ADR-019 RBAC with 8 canonical roles `platform_super_admin`/`organization_owner`/`finance`/`hr`/`auditor`/`branch_manager`/`kitchen_manager`/`support` + 4 legacy roles + ADR-027/028/029 KDS + ADR-023/024/025/026 POS + ADR-012 audit log + 24-month WhatsApp PII anonymization job) + support panel surface (de facto via `AdminCrm.tsx` 306 lines + 8 CRM routes + `AdminWhatsApp.tsx` + 11 WhatsApp routes; `support` role seeded); NO mobile-optimized staff UI, NO PWA-installable admin, NO branch-manager mobile checklist, NO kitchen handheld view, NO customer 360 unified view, NO ticketing system, NO refund initiation workflow — all DEFERRED with explicit trigger conditions.

## Verification

`scripts/phase_12_verify.py` — 278 checks across 10 categories (ADR files, ADR_INDEX, roadmap, CHANGELOG, REPOSITORY_STATUS, release notes, customer mobile surface, franchise portal surface, rider mobile + delivery dashboard surface, staff app + support panel surface).

Run with: `python3 scripts/phase_12_verify.py`

## Production Deployment Status

- Database migrations: ✅ Already in Production (no new migrations in v2.7.0)
- Production DB tip: `20260821000000` (Phase 3 OTP, unchanged since Phase 5)
- Backend API: ✅ Already deployed (350+ admin routes + 4 rider routes + 2 kitchen routes + 11 WhatsApp routes + 8 CRM routes live)
- Frontend: ✅ Already deployed (37 admin pages + 5 ops pages + 25+ customer pages + 8 delivery dashboard components)
- Backend tests: unchanged from v2.6.0 (closeout-only release)

## ADR Index — Final State (41 ADRs)

All 41 ADRs (ADR-001 through ADR-041) Accepted v1.0 with standalone files under `docs/13-adr/`. Phase 12 contributes ADR-039, ADR-040, ADR-041.

## Phase 13 Unlock

Phase 13 (AI and Automation) is now UNLOCKED. Dependencies satisfied through Phase 12. ADR-013/014/015 AI governance (shipped v1.9.0 Phase 2.6) + Phase 6 analytics registry + Phase 9 rider_locations + Phase 11 finance GL + Phase 12 customer/staff/rider/franchise/support/delivery surface provide the data + UI foundation for Phase 13's demand forecasting, inventory prediction, delivery optimization, support AI, marketing automation, fraud signals, and operational AI teams.

## Closing

The remaining PARTIAL gaps (native mobile app, push notifications, offline PWA, ticketing system, customer 360 unified view, per-rider KPIs, live rider map, franchisee role onboarding — 51 items total) are explicitly deferred with documented trigger conditions in ADR-039 §8 / ADR-040 §8 / ADR-041 §8. The backend contract is stable and will not change when these gaps are filled in future phases.
"""

release_url = f"https://api.github.com/repos/{REPO}/releases"
release_payload = json.dumps({
    "tag_name": TAG,
    "target_commitish": main_sha,
    "name": f"v2.7.0 — Phase 12 Complete (Customer and Staff Apps)",
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

print(f"\n✅ v2.7.0 tag + release complete.")
