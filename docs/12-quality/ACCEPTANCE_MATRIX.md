# Acceptance Matrix

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
- Real Royal Orchard staff, devices, payment provider verification, and Founder go/no-go remain Owner decisions
- Protected test order `TP-260727-000001` stays `pending` until intentional confirmation

## Owner decision required
Use `/admin/ai-team` Owner Decision Queue. Software percentage is not restaurant ready to open.

## Next implementation action
Founder reviews go/no-go evidence; keep Northern Bypass `coming-soon` unless separately authorized.

## Acceptance criteria
- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- Opening readiness percentage shows completed/total denominator
- No fake AI autonomy or background-working claims
- Northern Bypass remains `coming-soon` with separate authorization
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
## Foundation slice gates
| Gate | Required |
| --- | --- |
| Canonical docs exist and non-placeholder | PASS |
| AI Team route super-admin only | PASS |
| Exactly 14 agents | PASS |
| Countdown Asia/Karachi 14 Aug 2026 10:00 | PASS |
| Northern Bypass coming-soon | PASS |
| Website typecheck/build | PASS |
| No credentials / private paths committed | PASS |
| No Production mutations / no deploy | PASS |
