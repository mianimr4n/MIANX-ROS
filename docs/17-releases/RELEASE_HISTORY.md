# Release History

**Status:** ACTIVE
**Last verified date:** 2026-08-16

## Purpose
Owner-facing operating documentation for Telepizza ROS release and repository tip status.

---

## Canonical anchors (do not conflate)

| Concept | Canonical value |
| --- | --- |
| Latest released tag | `v2.7.0` (annotated + GitHub Release) |
| Released tag commit | `94e5d69dd8c6fdb69f3ffbc652f7e32790bca78a` |
| Repository main HEAD | `94e5d69` (Phase 12 closeout — PR #239 squash merge) |
| Production migration tip | `20260821000000` (Phase 3 OTP baseline — unchanged through Phase 5/6/7/8/9/10/11/12 closeouts) |
| Phase 13 (AI and Automation) | **UNLOCKED** |
| ADR index final state | 41 ADRs Accepted v1.0 (ADR-001 through ADR-041) |

---

## Phase release history (verified)

All releases since Phase 5 are **closeout-only**: no new migrations applied since Phase 3 OTP (`20260821000000`). Production DB tip is unchanged across Phases 5–12. Each release is shipped as an annotated tag + GitHub Release with full release notes under `docs/releases/v{X.Y.Z}_RELEASE_NOTES.md`.

| Phase | Tag | Date | PR | Head SHA | ADRs | GitHub Release |
| --- | --- | --- | --- | --- | --- | --- |
| Phase 5 — Order Lifecycle | `v2.0.0` | 2026-08-15 | #232 | `6aaccc6` | ADR-018 | ✅ |
| Phase 6 — Admin and ERP Core | `v2.1.0` | 2026-08-15 | #233 | `a30436d` | ADR-019/020/021/022 | ✅ |
| Phase 7 — POS System | `v2.2.0` | 2026-08-15 | #234 | `367fc94` | ADR-023/024/025/026 | ✅ |
| Phase 8 — Kitchen Dashboard | `v2.3.0` | 2026-08-15 | #235 | `2139910` | ADR-027/028/029 | ✅ |
| Phase 9 — Rider and Delivery App | `v2.4.0` | 2026-08-15 | #236 | `b596cf6` | ADR-030/031/032 | ✅ |
| Phase 10 — Inventory and Procurement | `v2.5.0` | 2026-08-15 | #237 | `8369cbf` | ADR-033/034/035 | ✅ |
| Phase 11 — Finance and Reporting | `v2.6.0` | 2026-08-16 | #238 | `4c97b6c` | ADR-036/037/038 | ✅ |
| Phase 12 — Customer and Staff Apps | `v2.7.0` | 2026-08-16 | #239 | `94e5d69` | ADR-039/040/041 | ✅ |

---

## Phase 12 closeout (current — v2.7.0)

- **PR #239** squash-merged as `94e5d69dd8c6fdb69f3ffbc652f7e32790bca78a` on 2026-08-16.
- All 6/6 CI checks PASS (CodeQL, Vercel Preview, Typecheck and test, Dependency Scan, Analyze, Owner Playwright).
- Annotated tag `v2.7.0` created on `94e5d69`.
- GitHub Release v2.7.0 published at https://github.com/mianimr4n/telepizza/releases/tag/v2.7.0 (Release ID 371313202) with full release notes body.
- 3 new ADRs accepted: ADR-039 (Customer Mobile & Franchise Portal Contract), ADR-040 (Rider Mobile App & Delivery Dashboard Contract), ADR-041 (Staff App & Support Panel Contract). All 41 ADRs (ADR-001..ADR-041) now Accepted v1.0.
- Closeout-only — no new migrations, no new code. Production DB tip remains `20260821000000`.
- `scripts/phase_12_verify.py` (705 lines, 278 checks across 10 categories) provided as future re-verification artifact. All 278 checks PASS.
- Phase 13 (AI and Automation) UNLOCKED.

### Phase 12 surface verification

| Surface | Code Location | Routes | Status |
| --- | --- | --- | --- |
| Customer mobile (web PWA) | `apps/website` (25+ customer pages + `site.webmanifest`) | ADR-017 OTP + ADR-018 orders + ADR-021 loyalty | ✅ LIVE |
| Franchise portal | `AdminBranchManager.tsx` (689 lines) + `getOwnerWorkspace` (25 modules) | `GET /api/v1/admin/reports/owner-workspace` | ✅ LIVE |
| Rider mobile + delivery dashboard | `AdminDelivery.tsx` (550 lines) + 8 sub-components (~3,500 lines) | 10 admin delivery routes + 4 rider-facing routes | ✅ LIVE |
| Staff app | `AdminShell.tsx` + 37 admin pages + 5 ops pages | 32 admin router modules (350+ routes) | ✅ LIVE |
| Support panel | `AdminCrm.tsx` (306 lines) + `AdminWhatsApp.tsx` + 11 WhatsApp routes | 8 CRM routes + 11 WhatsApp routes | ✅ LIVE |

---

## What is LIVE

### Customer Platform
- Website on Vercel (`telepizza-website`) — React + Vite SPA with 25+ customer pages + PWA manifest
- API on Render (`telepizza-api`) — Express + Supabase/Postgres
- PostgreSQL + Auth on Supabase — Production migrations through `20260821000000`
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, organization-owner, branch-manager, kitchen-manager, cashier, rider, support, host, waiter (ADR-019 RBAC)
- GitHub Actions CI (typecheck + 1096 backend tests + CodeQL + Vercel Preview + Dependency Scan + Analyze + Owner Playwright) on every PR and push to `main`
- Phone-first auth (ADR-017) via `/auth/otp/send` + `/auth/otp/verify` + `/auth/session` + `/auth/me`
- Order placement + tracking + receipts + guest read/cancel (ADR-018)
- Loyalty wallet + rewards (ADR-021)
- Branch-scoped menu with canonical single-price catalog (ADR-020)

### Admin and ERP Core
- 32 admin router modules totaling **350+ routes** — all branch-scoped via RLS
- 37 admin pages under `apps/website/client/src/pages/admin/` + 5 ops pages
- 24-month WhatsApp PII anonymization job (ADR-003/004)
- Audit log (ADR-012) — `audit_log` table + `AdminAuditLog` page + 5 routes

### POS System (Phase 7 — v2.2.0)
- Dine-in / takeaway / delivery order placement
- Cashier workflow + 4 payment methods (cash, card_terminal, bank_manual, complimentary)
- POS shifts + Z-Report + cash reconciliation (ADR-023/024/025/026)

### Kitchen Dashboard (Phase 8 — v2.3.0)
- 4-column KDS board + 6-state ticket lifecycle + KOT snapshot model + timers + priority (ADR-027/028/029)

### Rider and Delivery (Phase 9 — v2.4.0)
- Rider identity + manual dispatch + 6-state delivery lifecycle + POD + GPS ingest + COD reconciliation (ADR-030/031/032 + ADR-008/009/010)

### Inventory and Procurement (Phase 10 — v2.5.0)
- Stock master + versioned recipes + BOM + 8-state PO + 3-state GRN + 3-way match + supplier portal (ADR-033/034/035)

### Finance and Reporting (Phase 11 — v2.6.0)
- Branch GL + journal_entries + 4 financial-statement RPCs + cash reconciliation + COD reconciliation + tax definitions + AR + AP + COGS + 12 reports routes + 25-module analytics registry (ADR-036/037/038)

### Customer and Staff Apps (Phase 12 — v2.7.0)
- Customer mobile PWA + franchise portal + rider mobile + delivery dashboard + staff app + support panel (ADR-039/040/041)

---

## What is DERIVED
- Executive Dashboard KPIs derived from live order/kitchen/delivery/finance/inventory APIs
- 25-module owner workspace analytics aggregation
- Mianx.ai Operations Insights = deterministic rule summaries (not generative AI — Phase 13 will introduce generative AI agents)

---

## What is FOUNDATION (deferred for future activation)
- Native mobile app (iOS/Android via React Native/Expo)
- Service worker / offline cache / push notifications
- Online card payment gateway
- Realtime updates via Supabase Realtime channels
- `pos_sessions` table + multi-tender `payment_splits` + bank deposit slip
- Multi-timezone support
- Per-branch pricing
- `rider_daily_summaries` table + per-rider KPI dashboard + live rider map
- Auto-dispatch engine
- `franchisee` role + franchise agreement tracking + royalty computation
- Customer 360 unified view + ticketing system + refund initiation workflow
- Mobile-optimized staff UI + PWA-installable admin + kitchen handheld view
- Per-item prep ticks + KOT print format + fiscal printer + server-side SLA + auto-priority + `kitchen_stations`
- Dedicated `inventory_transfers` table + low-stock alerts + FIFO/WAC costing + `inventory_cost_history`
- Automated GL posting from kitchen/PO/invoice + multi-currency consolidation + inter-branch transfers + fiscal-year close + bank reconciliation + fixed-asset depreciation
- Dedicated `refunds` table + partial-refund API + `discounts` master table for non-coupon discounts

Each FOUNDATION item above has an explicit trigger condition in the relevant ADR's "Deferred to future ADRs" section.

---

## What is UNAVAILABLE
- Private credentials, service-service-role keys, and private absolute evidence paths in Production UI
- Owner/Founder database roles (display labels only; authorization remains `super-admin` with `branch_id = null` — `organization_owner` is the canonical Owner role since Phase 12)
- Kubernetes, microservices, Prisma, native mobile apps, event bus (legacy archive claims — not Production)
- Autonomous AI workforce / background agent runtime (Phase 13 scope)

---

## Operator Follow-ups (no code blockers)

6 Operator Follow-ups remain open — operational configuration items that the owner/operator must complete in Production:

| FU | Phase | Description |
| --- | --- | --- |
| FU-3 | Phase 2 | Configure WhatsApp WABA template approval + production mode |
| FU-4 | Phase 2 | Configure FBR tax registration + `chart_of_accounts` rows per branch |
| FU-5 | Phase 2 | Configure transactional email provider + delivery-pod storage bucket |
| FU-7 | Phase 3 | Configure `OTP_HMAC_SECRET` + final production phone numbers (Phase 15) |
| FU-8 | Phase 9 | Configure Mapbox/Google Maps API key for turn-by-turn rider navigation |
| FU-11 | Phase 11 | Configure `finance_account_mappings` rows for the 20 mapping purposes per branch |

---

## Known limitations (non-exhaustive)

- Closeout-only nature of Phases 5–12: many foundational capabilities are LIVE in Production but have explicit DEFERRED items documented in the relevant ADR's "Deferred to future ADRs" section. Each deferred item has a documented trigger condition.
- Northern Bypass remains `coming-soon` unless separately authorized.
- Phase 3 OTP provider setup (Meta WABA + Twilio Verify) is in progress in parallel with engineering phases — does not block Phase 13.

---

## Owner decision required

Confirm opening-day staffing, devices, and provider readiness for Royal Orchard before Phase 15 (Final Production Launch). Software readiness on `main` is not the same as restaurant Production-ready.

For Phase 13 kickoff: owner sign-off on AI provider boundary (ADR-013) + AI approval gate (ADR-014) + AI prompt retention (ADR-015) — all three Phase 2.6 ADRs are already Accepted v1.0 and provide the governance framework for Phase 13 AI agents.

---

## Next implementation action

**Phase 13 (AI and Automation) is UNLOCKED.** Phase 13 scope: demand forecasting · inventory prediction · delivery optimization · support AI · marketing automation · fraud signals · Mianx.ai agents · operational AI teams.

Engineering side is stable. Phase 13 audit + ADR drafting is the next major workstream.

---

## Source of truth
Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence packs. The authoritative repository status is [`docs/00-governance/REPOSITORY_STATUS.md`](../00-governance/REPOSITORY_STATUS.md); the authoritative project status is [`docs/00-governance/PROJECT_STATUS.md`](../00-governance/PROJECT_STATUS.md); the authoritative roadmap is [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md). Planning documents alone never override repository evidence.

---

## Related routes/files/services
- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Owner Workspace: `/admin` (Executive Dashboard) + `/admin/branch` (Owner Decision Queue) + `/admin/ai-team` (Team Center)
- Release notes: [`docs/releases/`](../releases/)
- ADR index: [`docs/00-governance/ADR_INDEX.md`](../00-governance/ADR_INDEX.md)
- Master roadmap: [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](../14-phases/TELEPIZZA-MASTER-ROADMAP.md)

---

## Acceptance criteria (living doc)

- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
- Northern Bypass remains `coming-soon`
- Distinguishes repository main, release tag commit, Production website SHA, Production API SHA, and migration tip
- All 41 ADRs listed as Accepted v1.0 with standalone files under `docs/13-adr/`
- Phase 13 explicitly marked UNLOCKED with dependencies satisfied

---

## Earlier release anchors (historical — pre-Phase 5)

The following tags and releases predate the Phase 5+ closeout cadence and are preserved for historical reference:

| Tag | Date | Notes |
| --- | --- | --- |
| `v1.0.0` | 2026-06 | Initial public website + cart foundation |
| `v1.5.0` | 2026-08-02 | RC6 Phase 1 closeout — Owner Command Center |
| `v1.5.1` | 2026-08-04 | Phase 1.1 professional readiness Production-certified (no GitHub Release) |
| `v1.6.0`–`v1.10.0` | 2026-07 — 2026-08 | Customer auth + OTP + order placement + tracking (Phases 2/3/4) |
| `v1.8.0` / `v1.8.1` / `v1.9.0` | 2026-08 | Phase 2.x polish waves (RBAC + audit + CRM + WhatsApp + supplier portal + OTP architecture ADR-016/017) |

The modern release cadence begins at Phase 5 (`v2.0.0`, 2026-08-15). All releases from `v2.0.0` onward are documented above with PR numbers, SHAs, ADRs, and GitHub Release links.
