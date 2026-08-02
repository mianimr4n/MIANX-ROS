# RC5 Baseline

**Status:** Planning baseline (post-RC4 certification and `v1.3.0` tag)
**Date:** 2026-08-02
**Authority:** Repository evidence after `RC4_CERTIFIED` and annotated tag `v1.3.0`

## Anchors

| Anchor | Value |
| --- | --- |
| RC4 certified repository SHA (certification merge) | `e40351b2793ffda6a62aec60f817eff3dd0352cf` |
| Released tag | `v1.3.0` — **created and pushed** (annotated git tag; no GitHub Release) |
| Released tag commit | `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` |
| Current repository main | `c1859117b24d6adbe2fb0633ea518538047cc120` (later than the release tag) |
| Production migration tip | `20260801180000` |
| Production application SHA (still applicable until next evidenced deploy) | `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291` |

Do **not** conflate: repository main, `v1.3.0` tag commit, and Production application SHA.

RC5 work began after RC4 certification at `e40351b`. The released baseline for docs and SemVer is tag `v1.3.0` @ `74b6b8e`. Production app code remains on `e5c6daf` until a later deploy moves the live SHA forward.

## RC5 slice status (repository)

| Slice | Status |
| --- | --- |
| RC5-OPS-01 | **Merged** on `main` |
| RC5-A11Y-01 | **Merged** on `main` (PR #169) |
| RC5-DOC-01 | **Current** (release & status documentation sync) |
| RC5-TEST-01 | **Next** per `RC5_ROADMAP.md` recommended order |
| Optional PERF / OBS / QA | Proposed only — not started |

Merged RC5 slices update repository `main`. They are **not** claimed as Production-deployed unless separate deployment evidence exists.

## Outstanding technical debt (evidenced)

| ID | Debt | Evidence |
| --- | --- | --- |
| TD-1 | Local privilege contract / AGENTS truth | **Addressed by RC5-OPS-01** (docs + static tests + fresh-local empirical). Residual: no live-DB privilege job in CI. |
| TD-2 | Free-plan Supabase backup posture (no PITR) | RC4 OPS-1 |
| TD-3 | Package.json versions diverge from `v*` tag convention | website `1.0.0`, API `0.1.0` vs tags `v1.2.0` / `v1.3.0` |
| TD-4 | No automated GitHub Release workflow | only `.github/workflows/ci.yml`; `v1.3.0` is tag-only |
| TD-5 | Stale operational docs citing older main SHAs | Targeted by **RC5-DOC-01** (`RELEASE_HISTORY`, `REPOSITORY_STATUS`, this baseline) |
| TD-6 | Merged feature branches still present locally/remotely | hygiene inventory in `docs/releases/RC4_RELEASE_NOTES.md` |

## Known limitations carried forward

Non-blocking items from RC4 certification remain in force unless closed with new evidence:

- OPS-1 … OPS-5 (see `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md`)
- Honest Analytics deferred modules
- Northern Bypass remains `coming-soon` unless separately authorized

## Proposed RC5 workstreams

> All items below are **proposed** unless marked merged above. They are not commitments beyond the roadmap’s recommended sequence, and they are not Production authorization.

| Stream | Proposed focus | Notes |
| --- | --- | --- |
| P-OPS | Local privilege contract honesty | **RC5-OPS-01 merged**; residual CI live-DB privilege job deferred |
| P-REL | Align release docs with `v1.3.0` / tip facts | **RC5-DOC-01 current**; tag already created — docs sync only |
| P-OBS | Deepen Render/Supabase log export and alerting beyond smoke JSON | Addresses OPS-3; optional |
| P-FIN | Finance / payroll operational hardening beyond Phase 2 foundation | Requires ADR + Founder priority |
| P-LOY | Loyalty/marketing provider send paths (currently constrained) | Requires provider + ADR |
| P-QA | Expand CI Playwright coverage for Owner critical paths | Optional; BM browser gate remains non-blocking today |
| P-SEC | Periodic secret rotation runbook drills; confirm no credentials in evidence packs | Ongoing |

Do **not** treat deferred streams as authorized delivery.

## Dependency and migration risks

| Risk | Impact | Mitigation (proposed) |
| --- | --- | --- |
| New migrations after `20260801180000` without Production cutover plan | Schema drift recurrence (`42703` / `42P01`) | Keep tip alignment evidence before certify |
| Analytics column naming regressions | Owner BI failures | Keep/expand contract tests (RC5-TEST-01) |
| Secret refresh without coordinated API redeploy | Auth/DB probe failures | Follow RC4 security closeout sequence |
| Local grant gap mistaken for product bugs | False defect reports | Migration-managed privileges (RC5-OPS-01 evidence) |

## Security requirements (baseline)

- No secrets, JWTs, passwords, dumps, or private env values in Git
- Founder-authorized Production changes only (migrations, SQL, redeploys, rotations)
- Post-change Owner authenticated smoke for Owner-critical modules
- Preserve RC4 evidence packs as audit artifacts

## Required quality gates (before any RC5 certify claim)

| Gate | Command / check |
| --- | --- |
| Typecheck | `pnpm check` |
| Tests | `pnpm test` |
| DB/static suites | `pnpm test:db` |
| RC1 quality gate | `pnpm rc1:gate` |
| Diff hygiene | `git diff --check` |
| CI on PR / main | GitHub Actions CI SUCCESS |
| Production claims | Repository evidence + acceptance artifacts only |

## Explicit non-claims

This baseline does not authorize Production mutation, schema changes, secret rotation, feature implementation, moving tags, or creating a GitHub Release.
