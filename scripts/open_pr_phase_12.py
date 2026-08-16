#!/usr/bin/env python3
"""
Open Phase 12 closeout PR via GitHub API.

Creates a PR from `phase-12-closeout` branch against `main` with the
Phase 12 ADR-039/040/041 closeout files.
"""
import json
import os
import sys
import urllib.request
import urllib.error

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = "mianimr4n/telepizza"
HEAD = "phase-12-closeout"
BASE = "main"

if not GITHUB_TOKEN:
    print("ERROR: GITHUB_TOKEN env var required")
    sys.exit(2)

title = "docs(v2.7.0): Phase 12 complete — ADR-039/040/041 + close report + roadmap update"
body = """## Phase 12 (Customer and Staff Apps) — Closeout

**Closeout-only release. No new migrations. No new code.**

### What's in this PR

- **3 new ADRs** formally accepting the as-built customer/staff/rider/franchise/support/delivery surface:
  - `ADR-039-customer-mobile-franchise-portal-contract.md` — customer mobile surface (web-first PWA via `apps/website` React + Vite SPA with 25+ customer pages + `site.webmanifest` PWA manifest + ADR-017 phone-first auth + ADR-018 order lifecycle + ADR-021 loyalty wallet + `TrackOrder.tsx` 316 lines + `MyTelepizza.tsx` 2,303 lines) + franchise portal surface (`organization_owner` role seeded in Identity 01 migration + `AnalyticsService.getOwnerWorkspace` 25-module analytics dashboard including `branch_comparison` cross-branch KPI matrix + mounted at `GET /api/v1/admin/reports/owner-workspace` + `AdminBranchManager.tsx` 689 lines multi-branch view); NO native mobile app, NO service worker, NO push notifications, NO offline ordering, NO `franchisee` role, NO multi-tenant SaaS isolation, NO franchise agreement tracking, NO royalty computation — all DEFERRED with explicit trigger conditions in ADR-039 §8
  - `ADR-040-rider-mobile-app-delivery-dashboard-contract.md` — rider mobile surface (`rider` role + `/staff/login` + `isRiderOnly` scope check + 4 rider-facing routes under `/api/v1/riders/*`: assignments, roster, assign, status + ADR-030/031/032 rider identity + delivery lifecycle + POD; uses admin web on mobile browser, NO native rider app) + delivery dashboard surface (`AdminDelivery.tsx` 550 lines + 8 sub-components totaling ~3,500 lines: DeliveryCards/Drawer/Filters/Insights/KPIs/SidePanels/Timeline/DispatchQueue + 10 admin delivery routes in `delivery-rider.ts` + ADR-008 `rider_locations` ephemeral table with 24h TTL purge + GPS ingest endpoint + ADR-009 POD capture + ADR-010 COD reconciliation + aggregate KPIs in DeliveryKPIs + DeliveryInsights); NO turn-by-turn nav, NO in-app call masking, NO push notifications, NO offline-tolerant queue, NO live rider map, NO `rider_daily_summaries` table, NO per-rider KPI dashboard — all DEFERRED from Phase 9 ADR-032 §8-12 with explicit trigger conditions in ADR-040 §8
  - `ADR-041-staff-app-support-panel-contract.md` — staff app surface (`AdminShell.tsx` + 37 admin pages + 5 ops pages + 32 admin router modules totaling 350+ routes + ADR-019 RBAC with 8 canonical roles `platform_super_admin`/`organization_owner`/`finance`/`hr`/`auditor`/`branch_manager`/`kitchen_manager`/`support` + 4 legacy roles + ADR-027/028/029 KDS + ADR-023/024/025/026 POS + ADR-012 audit log + 24-month WhatsApp PII anonymization job) + support panel surface (de facto via `AdminCrm.tsx` 306 lines + 8 CRM routes + `AdminWhatsApp.tsx` + 11 WhatsApp routes; `support` role seeded); NO mobile-optimized staff UI, NO PWA-installable admin, NO branch-manager mobile checklist, NO kitchen handheld view, NO customer 360 unified view, NO ticketing system, NO refund initiation workflow — all DEFERRED with explicit trigger conditions in ADR-041 §8
- **ADR_INDEX.md** updated with ADR-039/040/041 rows + extended Note paragraph covering Phase 12.
- **`scripts/phase_12_verify.py`** — 278 checks across 10 categories (ADR files, ADR_INDEX, roadmap, CHANGELOG, REPOSITORY_STATUS, release notes, customer mobile surface, franchise portal surface, rider mobile + delivery dashboard surface, staff app + support panel surface).
- **`docs/testing/acceptance-evidence/phase12-closeout/PHASE12_FINAL_GATE.md`** — comprehensive close report (acceptance gate criteria, as-built verification matrix, DEFERRED items consolidated into 6 categories, operator follow-ups, Phase 13 unlock).
- **`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`** — Phase 12 row marked ✅ COMPLETE (v2.7.0); Current pointer updated to Phase 13.
- **`docs/00-governance/REPOSITORY_STATUS.md`** — reconciled to Phase 12 COMPLETE (v2.7.0).
- **`CHANGELOG.md`** — comprehensive [2.7.0] entry covering all 3 ADRs with detailed sub-sections.
- **`docs/releases/v2.7.0_RELEASE_NOTES.md`** — full release notes (ADR index final state, production deployment status, pending operator actions, Phase 13 unlock).

### Verification

- All customer/staff/rider/franchise/support/delivery surface already in Production across multiple prior waves (v1.2.0 customer website + v1.6.0/v1.10.0 customer auth + v1.7.0 orders + v2.1.0 admin dashboard + v2.2.0 POS + v2.3.0 KDS + v2.4.0 rider endpoints + v2.5.0 inventory + v2.6.0 finance).
- Production DB tip unchanged: `20260821000000` (Phase 3 OTP, same as Phase 5/6/7/8/9/10/11 closeouts).
- No new code — backend tests remain unchanged from v2.6.0.
- `scripts/phase_12_verify.py` runs 278 checks against the local repo; all PASS.

### Phase 12 sub-area status

| Sub-area | Status |
|---|---|
| Customer mobile | 🟡 PARTIAL (web-first PWA via apps/website + ADR-017 phone-first auth + ADR-021 loyalty wallet live; native mobile app + service worker + push notifications + offline ordering DEFERRED per ADR-039 §8) |
| Rider app | 🟡 PARTIAL (rider role + 4 routes via /api/v1/riders/* + admin web on mobile browser live; native rider app + turn-by-turn nav + in-app call masking + push notifications + offline-tolerant queue DEFERRED per ADR-040 §8) |
| Staff app | 🟡 PARTIAL (AdminShell + 37 admin pages + 5 ops pages + 32 admin router modules live; mobile-optimized staff UI + PWA-installable admin + branch-manager mobile checklist + kitchen handheld view DEFERRED per ADR-041 §8) |
| Franchise portal | 🟡 PARTIAL (organization_owner role + getOwnerWorkspace 25-module dashboard + AdminBranchManager.tsx live; franchisee role + multi-tenant SaaS isolation + franchise agreement tracking + royalty computation DEFERRED per ADR-039 §8) |
| Support panel | 🟡 PARTIAL (AdminCrm.tsx + 8 CRM routes + AdminWhatsApp.tsx + 11 WhatsApp routes + support role live; customer 360 unified view + ticketing system + refund initiation workflow + auto-routing DEFERRED per ADR-041 §8) |
| Delivery dashboard | 🟡 PARTIAL (AdminDelivery.tsx + 8 sub-components + 10 admin delivery routes + aggregate KPIs + rider_locations GPS ingest live; live rider map + per-rider KPIs + rider_daily_summaries table + customer-facing live map DEFERRED per ADR-040 §8) |

### Phase 13 unlock

Phase 13 (AI and Automation) is now UNLOCKED. Dependencies satisfied through Phase 12. ADR-013/014/015 AI governance (shipped v1.9.0 Phase 2.6) + Phase 6 analytics registry + Phase 9 rider_locations + Phase 11 finance GL + Phase 12 customer/staff/rider/franchise/support/delivery surface provide the data + UI foundation for Phase 13's demand forecasting, inventory prediction, delivery optimization, support AI, marketing automation, fraud signals, and operational AI teams.

### Operator follow-ups

6 operator follow-ups remain open from prior phases (no code blockers):
- **FU-3** — Verify WhatsApp WABA template approval (Meta Business)
- **FU-4** — Finalize FBR tax registration for `tax_definitions.is_active=true`
- **FU-5** — Sign up transactional email provider (for ADR-039 §8.16 email receipts)
- **FU-7** — Confirm Phase 15 production phone numbers
- **FU-8** — Provision Mapbox or Google Maps API key (for ADR-040 §8.2 turn-by-turn nav)
- **FU-11** — Provision FCM project (for ADR-039 §8.2 + ADR-040 §8.4 push notifications)
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
