# Mianx.ai Team Operating Model

**Status:** ACTIVE

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
- Owner Decision Queue items for real staff, devices, payments, training, and Founder go/no-go
- Protected test order `TP-260727-000001` stays `pending` until intentional confirmation

## Owner decision required
Clear WAITING_ON_HUMAN items in `/admin/ai-team`. No fake AI autonomy — agents report verified readiness signals only.

## Next implementation action
Founder assigns named Royal Orchard staff with canonical roles; keep Northern Bypass coming-soon.

## No fake AI autonomy
- Exactly 14 agents
- Status derives from the shared opening-readiness model and live APIs
- No background-working animation without an executing task
- CONFIGURED_PLAN and FOUNDATION items are never labeled LIVE


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
## Model
Mianx.ai Team Center is an Owner command surface that coordinates opening readiness using a typed fourteen-agent registry plus verified APIs.

## Honesty rules
- No fake chat transcripts
- No claim of autonomous background agents
- FOUNDATION agents explain missing dependencies
- LIVE only from successful live API responses
- Status → Problem → Next Action on every card

## Route
`/admin/ai-team` (super-admin)
