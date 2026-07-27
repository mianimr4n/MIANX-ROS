# Project Status

**Status:** ACTIVE Owner summary

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
- Real Royal Orchard staff accounts, devices, payment provider, and Founder go/no-go remain WAITING_ON_HUMAN / FOUNDATION
- Protected test order `TP-260727-000001` stays `pending` (Behari Roll) with no kitchen ticket until confirmation

## Owner decision required
Confirm opening-day staffing, devices, and provider readiness for Royal Orchard before 14 August 2026 10:00 Asia/Karachi. Use `/admin/ai-team` Owner Decision Queue.

## Next implementation action
Run opening-scope Production smoke (read-only) after Founder review of the Owner command center.

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
## Opening mission
Royal Orchard targets official opening **14 August 2026, 10:00 AM Asia/Karachi**. Northern Bypass remains **coming-soon** and must not inherit Royal Orchard launch state.

## Delivery markers (verified)
| Item | State |
| --- | --- |
| PR #102 Decision Log append-only | Merged on main |
| PR #111 reservations/waitlist query contract | Merged, deployed, Production smoked PASS |
| Executive Dashboard v1 | Released (PASS WITH LIMITATIONS) |
| Protected test order | TP-260727-000001 pending |

## Data-state vocabulary
LOADING · LIVE · DERIVED · EMPTY · STALE · OFFLINE · ERROR · FOUNDATION · UNAVAILABLE
