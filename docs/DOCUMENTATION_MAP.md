# Documentation Map

**Status:** ACTIVE
**Audience:** Founder / Owner (super-admin) / Engineering

## Purpose
Owner-facing operating documentation for Telepizza ROS opening readiness.

## Current verified state
Verified against repository main `17cc5e9cee8f65eb5c10fcc069ea3b863931a8b8` (includes PR #102 Decision Log append-only classification and PR #111 reservations/waitlist query-contract fix). Last verified date: **2026-07-28**.

## What is LIVE
- Website on Vercel (`telepizza-website`)
- API on Render (`telepizza-api`)
- PostgreSQL + Auth on Supabase
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter

## What is DERIVED
- Executive Dashboard KPIs derived from live order/kitchen/delivery APIs
- Mianx.ai Operations Insights = deterministic rule summaries (not generative AI)

## What is FOUNDATION
- Inventory ledger, purchasing settlement, full GL/finance ledger, analytics warehouse
- Autonomous AI workforce / background agent runtime
- Kubernetes, microservices, Prisma, native mobile apps, event bus (legacy archive claims — not Production)

## What is UNAVAILABLE
- Private credentials, service-role keys, and private absolute evidence paths in Production UI
- Owner/Founder database roles (display labels only; authorization remains `super-admin` with `branch_id = null`)

## Known blockers
- Orders/Kitchen/Delivery truth alignment remains a follow-on on `feature/opening-readiness-final`
- Protected test order `TP-260727-000001` stays `pending` (Behari Roll) with no kitchen ticket until confirmation

## Owner decision required
Confirm opening-day staffing, devices, and provider readiness for Royal Orchard before 14 August 2026 10:00 Asia/Karachi.

## Next implementation action
Continue opening-readiness work on the same branch: OMS/KDS/delivery truth, RBAC wording, full opening dashboard completion.

## Source of truth
Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence outside Git.

## Last verified date
2026-07-28

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
| DevOps | [RELEASE_AND_ROLLBACK_RUNBOOK.md](./10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md) |
| AI | [MIANX_AI_TEAM_OPERATING_MODEL.md](./11-ai/MIANX_AI_TEAM_OPERATING_MODEL.md), [AGENT_REGISTRY.md](./11-ai/AGENT_REGISTRY.md) |
| Quality | [ACCEPTANCE_MATRIX.md](./12-quality/ACCEPTANCE_MATRIX.md) |
| Opening | [OPENING_READINESS_PLAN.md](./14-phases/OPENING_READINESS_PLAN.md), [OPENING_DAY_RUNBOOK.md](./15-runbooks/OPENING_DAY_RUNBOOK.md) |
| Releases | [RELEASE_HISTORY.md](./17-releases/RELEASE_HISTORY.md) |
| Reference | [GLOSSARY_AND_DATA_STATES.md](./18-reference/GLOSSARY_AND_DATA_STATES.md) |
