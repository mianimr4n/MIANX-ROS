# Release History

**Status:** ACTIVE
**Last verified date:** 2026-08-03

## Purpose

Owner-facing operating documentation for Telepizza ROS release and repository tip status.

## Canonical anchors (do not conflate)

| Concept | Canonical value |
| --- | --- |
| Current verified repository main | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Latest released tag | `v1.4.0` (annotated git tag; no GitHub Release) — Phase 1 closeout targets `v1.5.0` |
| Released tag commit | `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` |
| Prior released tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` |
| Production website SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` (Vercel `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D`) |
| Production API SHA (observed) | `b14163ccbc82fca0b2856ea137bddb746ed5716b` (`/healthz`/`/readyz`; Phase 1 did not intentionally deploy backend) |
| Production migration tip | `20260801180000` |
| Prior website rollback target | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` (`bf5912c…`) — not executed |

## Current verified state

Verified **2026-08-03** against repository main `b14163ccbc82fca0b2856ea137bddb746ed5716b` (RC6 Phase 1 Production website runtime; Owner smoke PASS).

### RC4 release

- RC4 is **certified**, security-closeout **complete**, and **released** as annotated tag `v1.3.0` at `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`.
- Release mechanism: annotated git tag only. **No** GitHub Release exists for `v1.3.0`.
- Evidence: `docs/releases/RC4_RELEASE_NOTES.md`, `docs/testing/acceptance-evidence/rc4-final-certification/`, `docs/testing/acceptance-evidence/rc4-production-cutover/`.

### RC5 repository + Production website

| Slice | Status | Notes |
| --- | --- | --- |
| RC5-OPS-01 | Merged #168 → `e5963a6…` | Local privilege contract / AGENTS truth |
| RC5-A11Y-01 | Merged #169 → `c185911…` | Public marketing home accessibility |
| RC5-DOC-01 | Merged #170 → `cb13f39…` | Release & status documentation sync |
| RC5-TEST-01 | Merged #171 → `11aa195…` | Analytics schema regression guards |
| RC5-PERF-01 | Merged #172 → `fb7737c…` | Entry bundle residual reduction |
| RC5-OBS-01 | Merged #173 → `795efee…` | Operator log/alerting runbook |
| RC5-QA-01 | Merged #174 → `152ce40…` | CI Owner Playwright (PASS WITH DOCUMENTED LIMITATION) |
| Production website cutover | **Complete** | Same SHA; smoke + Owner attestation `2026-08-02T10:23:52Z` |

Evidence: `docs/testing/acceptance-evidence/rc5-*/`, `docs/testing/acceptance-evidence/rc5-production-cutover/`, `docs/testing/acceptance-evidence/rc5-final-closeout/`.

Do **not** infer Production deployment from merge history alone — website cutover is separately evidenced.

### RC6 Phase 1 (Owner Command Center)

| Item | Status |
| --- | --- |
| DASH-00…08 + QA-03 | Merged through #190 → `bf5912c…` |
| QA-04 logout bounce fix | Merged #191 → `b14163c…` |
| Production website | **Verified** at `b14163c…` / `dpl_Hi35GYu…` |
| Phase 1 closeout + `v1.5.0` | In progress — `docs/testing/acceptance-evidence/rc6-phase1-closeout/` |
| Phase 2 runtime | **Not started** |
| Planning evidence | `docs/planning/RC6_*.md` |


## What is LIVE

- Website on Vercel (`telepizza-website`) at SHA `b14163c…`
- API on Render (`telepizza-api`) — observed `gitSha` `b14163c…`
- PostgreSQL + Auth on Supabase
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter
- Production database migrations through `20260801180000`

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
- GitHub Release UI for `v1.3.0` / `v1.4.0` (tags exist; Release objects do not)
- (superseded) “Proposed `v1.4.0` not created” — tag now exists @ `96f1e80…`

## Known limitations (non-exhaustive)

- Non-blocking RC4 ops limitations remain in `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md` (OPS-1…OPS-5 as documented).
- RC5 residuals: alerts `PROPOSED_NOT_ENABLED`; bulk log export not claimed; APM not implemented; `/admin/reports` CI deferred; branch protection unchanged; moderate a11y advisories — see `rc5-final-closeout/RESIDUAL_LIMITATIONS.md`.
- Northern Bypass remains `coming-soon` unless separately authorized.

## Owner decision required

Confirm opening-day staffing, devices, and provider readiness for Royal Orchard before 14 August 2026 10:00 Asia/Karachi. Software readiness on `main` is not the same as restaurant Production-ready.

## Next implementation action

1. Complete **RC6-DOC-01** living status honesty (this slice).
2. Next planned: **RC6-UI-01** Admin status-label honesty (application labels — not DOC-01).
3. Product-depth streams (finance/loyalty send/Analytics worker/PITR) remain Founder-gated.

## Source of truth

Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence packs. Planning documents alone never override repository evidence.

## Related routes/files/services

- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Team Center: `/admin/ai-team`
- Release notes: `docs/releases/RC4_RELEASE_NOTES.md`
- RC5 planning: `docs/planning/RC5_ROADMAP.md`
- RC5 closeout: `docs/testing/acceptance-evidence/rc5-final-closeout/`

## Acceptance criteria (living doc)

- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
- Northern Bypass remains `coming-soon`
- Distinguishes repository main, release tag commit, Production website SHA, Production API SHA, and migration tip

## Recent release and RC5 merges (selected)

| Change | Notes |
| --- | --- |
| Tag `v1.3.0` | Annotated tag at `74b6b8e…` (RC4 closeout tip); no GitHub Release |
| PR #166 | RC4 release closeout docs |
| PR #164 | RC4 final certification (`e40351b…`) |
| PR #168–#174 | RC5 OPS → QA complete on `main` |
| Vercel `dpl_7xaV34uy…` | Production website at `152ce40…` |
| Earlier | Admin ERP through PR #133; Executive Dashboard v1 (PR #100) — see governance status |
