# Project Status

**Status:** ACTIVE Owner summary

## Purpose
Owner-facing operating documentation for Telepizza ROS opening readiness.

## Current verified state
Verified against repository main `36c5848` (includes PR #113 Opening Operations M1–M4, PR #114 Foundation Stabilization/CI, PR #115 Admin ERP zero-fake-data audit, PR #116–#118 staff-assignment FK fix and Settings save/delete + notification-status-preserve + device-soft-remove fixes, PR #119 Organization/Branch settings APIs, PR #120 Menu/Delivery settings APIs). Last verified date: **2026-07-29**.

## What is LIVE
- Website on Vercel (`telepizza-website`)
- API on Render (`telepizza-api`)
- PostgreSQL + Auth on Supabase; Opening Operations M1–M4 migrations applied to Production
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter
- Royal Orchard staff assignments: 7/7 canonical roles assigned (Owner Decision Queue item #1 — complete)
- GitHub Actions CI (typecheck + full test suite) on every PR and push to `main`
- Organization profile and Branch profile settings — real read/write APIs, no longer Foundation/read-only
- Notification channels: Customer orders, Rider dispatch, Escalation — configured and ACTIVE (Kitchen alerts still pending)

## What is DERIVED
- Executive Dashboard KPIs derived from live order/kitchen/delivery APIs
- Mianx.ai Operations Insights = deterministic rule summaries (not generative AI)
- Opening Readiness panel — reads live probe status; never shows fake COMPLETE for unverified items

## What is FOUNDATION
- Inventory ledger, purchasing settlement, full GL/finance ledger, analytics warehouse
- HR module (attendance, leave, payroll, training center, employee documents) — staff table + roles exist, no directory/attendance/payroll APIs
- WhatsApp provider integration (order-derived view only, no live conversation storage)
- Autonomous AI workforce / background agent runtime
- Kubernetes, microservices, Prisma, native mobile apps, event bus (legacy archive claims — not Production)

## What is UNAVAILABLE
- Private credentials, service-role keys, and private absolute evidence paths in Production UI
- Owner/Founder database roles (display labels only; authorization remains `super-admin` with `branch_id = null`)

## Known blockers
- Devices (POS/KDS/printer/rider/internet/UPS) not yet verified onsite at Royal Orchard
- Payment methods not enabled; payment provider not verified in Production
- Kitchen alerts notification channel not yet configured
- SOPs (5), staff training (7 roles), and role rehearsals (6 + end-to-end) not yet scheduled/approved
- Founder go/no-go decision not yet recorded
- Protected test order `TP-260727-000001` stays `pending` (Behari Roll) with no kitchen ticket until confirmation

## Owner decision required
Confirm opening-day payments, devices, SOPs, training, and rehearsal readiness for Royal Orchard before 14 August 2026 10:00 Asia/Karachi, then record the Founder go/no-go decision. Use `/admin/branch` Owner Decision Queue.

## Next implementation action
Owner to work through remaining Owner Decision Queue items onsite/on-branch (devices, payments, SOPs, training, rehearsals); engineering side is stable pending any new findings.

## Source of truth
Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence outside Git.

## Last verified date
2026-07-29

## Related routes/files/services
- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Owner Decision Queue: `/admin/branch`
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
| PR #113 Opening Operations M1–M4 | Merged, migrations applied to Production |
| PR #114 Foundation Stabilization & CI gate | Merged |
| PR #115 Admin ERP zero-fake-data audit (15 modules) | Merged |
| PR #116–#118 Staff-assignment FK fix + Settings save/delete fixes | Merged |
| PR #119 Organization & Branch settings APIs | Merged |
| PR #120 Menu & Delivery settings APIs | Merged |
| Executive Dashboard v1 | Released (PASS WITH LIMITATIONS) |
| Protected test order | TP-260727-000001 pending |

## Data-state vocabulary
LOADING · LIVE · DERIVED · EMPTY · STALE · OFFLINE · ERROR · FOUNDATION · UNAVAILABLE

