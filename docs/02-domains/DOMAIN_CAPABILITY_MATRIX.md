# Domain Capability Matrix

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
## Matrix
| Domain | Surface | State |
| --- | --- | --- |
| Executive ops | /admin/dashboard | LIVE (PASS WITH LIMITATIONS) |
| Branch ops | /admin/branch | LIVE |
| Orders | /admin/orders | LIVE |
| Kitchen board | /admin/kitchen-dashboard | LIVE |
| Kitchen ERP | /admin/kitchen | LIVE |
| Delivery | /admin/delivery | LIVE |
| POS | /admin/pos | LIVE |
| Live floor | /admin/floor | LIVE |
| Reservations | /admin/reservations | LIVE (query contract fixed PR #111) |
| Waitlist | /admin/waitlist | LIVE (query contract fixed PR #111) |
| WhatsApp Order Center | /admin/whatsapp | LIVE/DERIVED |
| Menu | /admin/menu | LIVE |
| Reports | /admin/reports | DERIVED/FOUNDATION mix |
| Finance | /admin/finance | operational totals LIVE; GL FOUNDATION |
| Settings | /admin/settings | LIVE/FOUNDATION mix |
| Mianx.ai Team | /admin/ai-team | ACTIVE command center (typed registry + verified APIs) |
| Inventory ledger | /admin/inventory | FOUNDATION |
| Purchasing settlement | /admin/purchasing | FOUNDATION |
