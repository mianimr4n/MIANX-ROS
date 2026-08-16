# Documentation Map

**Status:** ACTIVE
**Audience:** Founder / Owner (super-admin) / Engineering

## Purpose
Owner-facing operating documentation for Telepizza ROS opening readiness.

## Current verified state
Verified against repository main `94e5d69` (Phase 12 closeout — PR #239 squash merge, 2026-08-16). Phase 12 (Customer and Staff Apps) is COMPLETE & SHIPPED as `v2.7.0`. All 12 phases (0 through 12) PASS AND CLOSED. All 41 ADRs (ADR-001 through ADR-041) Accepted v1.0 with standalone files under `docs/13-adr/`. Phase 13 (AI and Automation) is UNLOCKED. Production DB migration tip remains `20260821000000` (Phase 3 OTP baseline — unchanged through Phase 5/6/7/8/9/10/11/12 closeouts). Last verified date: **2026-08-16**.

## Phase release history

| Phase | Tag | PR | ADRs | Status |
| --- | --- | --- | --- | --- |
| Phase 5 — Order Lifecycle | `v2.0.0` | #232 | ADR-018 | ✅ COMPLETE |
| Phase 6 — Admin and ERP Core | `v2.1.0` | #233 | ADR-019/020/021/022 | ✅ COMPLETE |
| Phase 7 — POS System | `v2.2.0` | #234 | ADR-023/024/025/026 | ✅ COMPLETE |
| Phase 8 — Kitchen Dashboard | `v2.3.0` | #235 | ADR-027/028/029 | ✅ COMPLETE |
| Phase 9 — Rider and Delivery App | `v2.4.0` | #236 | ADR-030/031/032 | ✅ COMPLETE |
| Phase 10 — Inventory and Procurement | `v2.5.0` | #237 | ADR-033/034/035 | ✅ COMPLETE |
| Phase 11 — Finance and Reporting | `v2.6.0` | #238 | ADR-036/037/038 | ✅ COMPLETE |
| Phase 12 — Customer and Staff Apps | `v2.7.0` | #239 | ADR-039/040/041 | ✅ COMPLETE |
| Phase 13 — AI and Automation | — | — | — | 🔓 UNLOCKED |

## What is LIVE
- Website on Vercel (`telepizza-website`) — React + Vite SPA with 25+ customer pages + PWA manifest
- API on Render (`telepizza-api`) — Express + Supabase/Postgres, 350+ routes across 32 admin router modules + 4 rider routes + 2 kitchen routes
- PostgreSQL + Auth on Supabase — Production migrations through `20260821000000`
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, organization-owner, branch-manager, kitchen-manager, cashier, rider, support, host, waiter (ADR-019 RBAC)
- Phone-first auth (ADR-017) + order lifecycle (ADR-018) + loyalty wallet (ADR-021) + canonical single-price catalog (ADR-020)
- POS cashier workflow (ADR-023/024/025/026) + KDS (ADR-027/028/029) + delivery (ADR-030/031/032) + inventory (ADR-033/034/035) + finance (ADR-036/037/038) + customer/staff apps (ADR-039/040/041)

## What is DERIVED
- Executive Dashboard KPIs derived from live order/kitchen/delivery/finance/inventory APIs
- 25-module owner workspace analytics aggregation (sales, finance, executive, branch_comparison, etc.)
- Mianx.ai Operations Insights = deterministic rule summaries (not generative AI — Phase 13 will introduce generative AI agents)

## What is FOUNDATION (deferred for future activation)
- Native mobile app (iOS/Android via React Native/Expo) — web-first PWA serves mobile web for V1
- Service worker / offline cache / push notifications (Web Push + FCM + APNs)
- Online card payment gateway — Phase 7 ships cash-only + card_terminal/bank_manual/complimentary
- Realtime updates via Supabase Realtime channels
- `pos_sessions` table + multi-tender `payment_splits` + bank deposit slip
- Per-branch pricing + multi-timezone support
- `rider_daily_summaries` table + per-rider KPI dashboard + live rider map + auto-dispatch engine
- `franchisee` role + franchise agreement tracking + royalty computation + multi-tenant SaaS isolation
- Customer 360 unified view + ticketing system + refund initiation workflow
- Mobile-optimized staff UI + PWA-installable admin + kitchen handheld view
- Per-item prep ticks + KOT print format + fiscal printer + `kitchen_stations` + server-side SLA + auto-priority
- Dedicated `inventory_transfers` table + low-stock alerts + FIFO/WAC costing + `inventory_cost_history`
- Automated GL posting from kitchen/PO/invoice + multi-currency consolidation + bank reconciliation + dedicated `refunds` table + partial-refund API + `discounts` master table
- Autonomous AI workforce / background agent runtime (Phase 13 scope)
- Kubernetes, microservices, Prisma, native mobile apps, event bus (legacy archive claims — not Production)

Each FOUNDATION item above has an explicit trigger condition in the relevant ADR's "Deferred to future ADRs" section.

## What is UNAVAILABLE
- Private credentials, service-role keys, and private absolute evidence paths in Production UI
- Owner/Founder database roles (display labels only; authorization remains `super-admin` with `branch_id = null`)

## Known blockers
- Devices (POS/KDS/printer/rider/internet/UPS) not yet verified onsite at Royal Orchard
- Online payment provider not yet enabled in Production (cash-only + card_terminal/bank_manual/complimentary are live)
- Kitchen alerts notification channel not yet configured
- SOPs (5), staff training (7 roles), and role rehearsals (6 + end-to-end) not yet scheduled/approved
- Founder go/no-go decision not yet recorded
- Protected test order `TP-260727-000001` stays `pending` (Behari Roll) with no kitchen ticket until confirmation

## Owner decision required
Confirm opening-day payments, devices, SOPs, training, and rehearsal readiness for Royal Orchard before Phase 15 (Final Production Launch). Software readiness on `main` is not the same as restaurant Production-ready.

## Next implementation action
**Phase 13 (AI and Automation) is UNLOCKED.** Phase 13 scope: demand forecasting · inventory prediction · delivery optimization · support AI · marketing automation · fraud signals · Mianx.ai agents · operational AI teams. Engineering side is stable. Phase 13 audit + ADR drafting is the next major workstream.

## Source of truth
Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence outside Git.

## Last verified date
2026-08-16

## Related routes/files/services
- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Team Center: `/admin/ai-team`

## Acceptance criteria
- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
- Northern Bypass remains `coming-soon`
## Map
| Slot | Document |
| --- | --- |
| Governance | [PROJECT_STATUS.md](./00-governance/PROJECT_STATUS.md), [OPERATING_PRINCIPLES.md](./00-governance/OPERATING_PRINCIPLES.md), [DECISION_LOG.md](./00-governance/DECISION_LOG.md) |
| Architecture | [CURRENT_SYSTEM_MAP.md](./01-architecture/CURRENT_SYSTEM_MAP.md) |
| Domains | [DOMAIN_CAPABILITY_MATRIX.md](./02-domains/DOMAIN_CAPABILITY_MATRIX.md) |
| Data | [PRODUCTION_DATA_BASELINE.md](./03-data/PRODUCTION_DATA_BASELINE.md) |
| API | [API_CATALOG.md](./04-api/API_CATALOG.md) |
| Events | [ORDER_TO_DELIVERY_LIFECYCLE.md](./05-events/ORDER_TO_DELIVERY_LIFECYCLE.md) |
| Frontend | [DASHBOARD_ROUTE_MATRIX.md](./06-frontend/DASHBOARD_ROUTE_MATRIX.md) |
| Backend | [BACKEND_CAPABILITY_MATRIX.md](./07-backend/BACKEND_CAPABILITY_MATRIX.md) |
| Security | [RBAC_AND_ACCESS_MATRIX.md](./08-security/RBAC_AND_ACCESS_MATRIX.md) |
| Observability | [PRODUCTION_HEALTH_SIGNALS.md](./09-observability/PRODUCTION_HEALTH_SIGNALS.md) |
| DevOps | [RELEASE_AND_ROLLBACK_RUNBOOK.md](./10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md); [PRODUCTION_LOGS_AND_ALERTING.md](./10-devops/PRODUCTION_LOGS_AND_ALERTING.md) (RC5-OBS-01) |
| AI | [MIANX_AI_TEAM_OPERATING_MODEL.md](./11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md), [AGENT_REGISTRY.md](./11-ai/AGENT_REGISTRY.md) |
| Quality | [ACCEPTANCE_MATRIX.md](./12-quality/ACCEPTANCE_MATRIX.md) |
| Opening | [OPENING_READINESS_PLAN.md](./14-phases/OPENING_READINESS_PLAN.md), [OPENING_DAY_RUNBOOK.md](./15-runbooks/OPENING_DAY_RUNBOOK.md), [OPENING_OPERATIONS_M2.md](./ops/OPENING_OPERATIONS_M2.md) |
| Releases | [RELEASE_HISTORY.md](./17-releases/RELEASE_HISTORY.md) |
| Reference | [GLOSSARY_AND_DATA_STATES.md](./18-reference/GLOSSARY_AND_DATA_STATES.md) |
