# Release History

**Status:** ACTIVE
**Last verified date:** 2026-08-02

## Purpose

Owner-facing operating documentation for Telepizza ROS release and repository tip status.

## Canonical anchors (do not conflate)

| Concept | Canonical value |
| --- | --- |
| Current verified repository main | `c1859117b24d6adbe2fb0633ea518538047cc120` |
| Latest released tag | `v1.3.0` (annotated git tag; no GitHub Release) |
| Released tag commit | `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` |
| Production application SHA | `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291` (still applicable until a newer Production deploy is evidenced) |
| Production migration tip | `20260801180000` |

## Current verified state

Verified **2026-08-02** against repository main `c1859117b24d6adbe2fb0633ea518538047cc120`.

### RC4 release

- RC4 is **certified**, security-closeout **complete**, and **released** as annotated tag `v1.3.0` at `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`.
- Release mechanism: annotated git tag only. **No** GitHub Release exists for `v1.3.0`.
- Evidence: `docs/releases/RC4_RELEASE_NOTES.md`, `docs/testing/acceptance-evidence/rc4-final-certification/`, `docs/testing/acceptance-evidence/rc4-production-cutover/`.

### RC5 repository work (merged on main — not claimed Production-deployed)

| Slice | Status on repository main | Notes |
| --- | --- | --- |
| RC5-OPS-01 | Merged | Local privilege contract / AGENTS truth |
| RC5-A11Y-01 | Merged (PR #169 → `c185911…`) | Public marketing home accessibility |
| RC5-DOC-01 | Current planned / in progress | Release & status documentation sync |
| RC5-TEST-01 | Next after DOC-01 | Analytics schema regression guards (roadmap order 4) |

These RC5 merges update repository `main`. They are **not** claimed as the live Production application tip unless separate deployment evidence exists.

## What is LIVE

- Website on Vercel (`telepizza-website`)
- API on Render (`telepizza-api`)
- PostgreSQL + Auth on Supabase
- Royal Orchard branch status = `operating`
- Northern Bypass branch status = `coming-soon`
- Canonical staff roles: super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter
- Production application tip (evidenced): `e5c6daf…`
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
- GitHub Release UI for `v1.3.0` (tag exists; Release object does not)

## Known limitations (non-exhaustive)

- Non-blocking RC4 ops limitations remain in `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md` (OPS-1…OPS-5 as documented).
- Northern Bypass remains `coming-soon` unless separately authorized.
- Repository `main` can be ahead of Production application SHA; do not treat them as identical.

## Owner decision required

Confirm opening-day staffing, devices, and provider readiness for Royal Orchard before 14 August 2026 10:00 Asia/Karachi. Software readiness on `main` is not the same as restaurant Production-ready.

## Next implementation action

1. Complete **RC5-DOC-01** (this documentation sync).
2. Proceed to roadmap-defined **RC5-TEST-01** (Analytics schema regression guards).

RC4 certification/release and opening-readiness branch framing are **not** the current active engineering task.

## Source of truth

Repository evidence under `docs/`, `apps/website`, `backend/api`, `supabase/`, plus Production smoke evidence outside Git. Planning documents alone never override repository evidence.

## Related routes/files/services

- Website: `apps/website`
- API: `backend/api`
- Admin: `/admin/*`
- Team Center: `/admin/ai-team`
- Release notes: `docs/releases/RC4_RELEASE_NOTES.md`
- RC5 planning: `docs/planning/RC5_ROADMAP.md`

## Acceptance criteria (living doc)

- Documentation states LIVE/DERIVED/FOUNDATION/UNAVAILABLE honestly
- No claim of unverified Kubernetes/microservices/Prisma/mobile/event-bus in Production
- Northern Bypass remains `coming-soon`
- Distinguishes repository main, release tag commit, and Production application SHA

## Recent release and RC5 merges (selected)

| Change | Notes |
| --- | --- |
| Tag `v1.3.0` | Annotated tag at `74b6b8e…` (RC4 closeout tip); no GitHub Release |
| PR #166 | RC4 release closeout docs |
| PR #164 | RC4 final certification (`e40351b…`) |
| PR #168 | RC5-OPS-01 privilege contract / AGENTS truth |
| PR #169 | RC5-A11Y-01 public home accessibility → main `c185911…` |
| Earlier | Admin ERP through PR #133; Executive Dashboard v1 (PR #100) — see governance status |
