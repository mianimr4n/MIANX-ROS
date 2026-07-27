# Opening Readiness Plan

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
- Orders/Kitchen/Delivery truth alignment is complete on `feature/opening-readiness-final` (verified)
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
## Target
**14 August 2026 · 10:00 AM · Asia/Karachi** — Royal Orchard.

## Software completion versus restaurant opening readiness

**Software delivery completion** may reach 100% when opening-scope pages exist, navigation works, data states are honest, and responsive/accessibility tests pass.

**Restaurant opening readiness** is operational. It cannot become 100% until real people, devices, payments, notifications, training, and Founder go/no-go are verified.

Do not claim restaurant ready to open, staff ready, payment ready, devices ready, notifications ready, training complete, or Founder go-live approved without verified evidence.

## Opening readiness percentage contract

- Only `requiredForOpening=true` and `contributesToPercentage=true` items enter the denominator.
- COMPLETE earns credit. ACTIVE, WAITING_ON_HUMAN, BLOCKED, ERROR, OFFLINE, FOUNDATION, and UNAVAILABLE do not.
- Display must show completed/total, e.g. `Opening readiness: 4 of 18 required checks complete — 22%`.
- API ERROR/OFFLINE must not retain a misleading LIVE percentage.
- Optional ERP foundation items must not reduce the operational opening percentage unless classified required for launch.
- Source model: `apps/website/client/src/lib/opening-readiness-model.ts` shared by `/admin/ai-team`, `/admin/dashboard`, `/admin/branch`.

## Required Owner decisions

1. Assign real Royal Orchard operating staff (canonical roles only — no Founder/Owner role codes)
2. Configure floor and tables
3. Approve booking policy
4. Decide payment methods and verify provider/terminal
5. Configure notification channels (do not claim WhatsApp Connected)
6. Verify onsite POS/KDS/printer/rider devices
7. Verify internet and UPS contingency
8. Schedule staff training and full rehearsal
9. Review final go/no-go evidence
10. Authorize opening
11. Keep Northern Bypass coming-soon unless separately authorized

## Already complete (verified)
- Decision Log append-only (PR #102)
- Reservations/waitlist query contract (PR #111) Production smoke PASS
- Owner documentation foundation + Mianx.ai Team Center
- Order/Kitchen/Delivery operational truth alignment
- Owner readiness command center model + Decision Queue (this slice)

## Next on the same branch
1. Full opening-scope Production smoke (read-only)
2. Single PR when Founder authorizes
