# Agent Registry

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
- Opening Readiness Lead remains WAITING_ON_HUMAN until real Royal Orchard staff are assigned
- Protected test order `TP-260727-000001` stays `pending` until intentional confirmation

## Owner decision required
Assign named staff using canonical roles only. Do not invent Founder/Owner role codes.

## Next implementation action
Agents consume `opening-readiness-model.ts`. Keep exactly 14 agents with unique IDs.


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
## Fourteen operating agents
1. Mianx.ai Chief of Staff
2. Opening Readiness Lead
3. Branch Operations Agent
4. Order Control Agent
5. Kitchen Control Agent
6. Delivery Control Agent
7. POS & Cash Agent
8. Dine-in & Reservations Agent
9. Menu & Pricing Agent
10. Customer Support Agent
11. Inventory & Purchasing Agent
12. Finance & Payments Agent
13. Security & Access Agent
14. Reliability & Deployment Agent

## Source labels
LIVE_API · DERIVED_API · RELEASE_EVIDENCE · CONFIGURED_PLAN · FOUNDATION

## Status labels
COMPLETE · ACTIVE · BLOCKED · WAITING_ON_HUMAN · FOUNDATION · UNAVAILABLE
