# RC5 Baseline

**Status:** Planning baseline (post-RC4 certification)  
**Date:** 2026-08-02  
**Authority:** Repository evidence after `RC4_CERTIFIED`

## Anchors

| Anchor | Value |
| --- | --- |
| Starting / certified repository SHA | `e40351b2793ffda6a62aec60f817eff3dd0352cf` |
| Production migration tip | `20260801180000` |
| Production application SHA (still applicable until next deploy) | `e5c6daf0ba57f6a601f6a902821d41bfc5b3a291` |
| Recommended unpushed release tag | `v1.3.0` @ `e40351b` (requires separate approval) |

RC5 work **starts from** `e40351b`. Production app code may remain on `e5c6daf` until a later deploy moves the live SHA forward (for example after a docs-only main tip or a new application merge).

## Outstanding technical debt (evidenced)

| ID | Debt | Evidence |
| --- | --- | --- |
| TD-1 | Local privilege contract / AGENTS truth | **Addressed by RC5-OPS-01** (docs + static tests + fresh-local empirical). Residual: no live-DB privilege job in CI. |
| TD-2 | Free-plan Supabase backup posture (no PITR) | RC4 OPS-1 |
| TD-3 | Package.json versions diverge from `v*` tag convention | website `1.0.0`, API `0.1.0` vs tag `v1.2.0` / proposed `v1.3.0` |
| TD-4 | No automated GitHub Release workflow | only `.github/workflows/ci.yml` |
| TD-5 | Stale operational docs still citing older main SHAs in places | e.g. `docs/17-releases/RELEASE_HISTORY.md` last verified 2026-07-28 |
| TD-6 | Merged feature branches still present locally/remotely | hygiene inventory in `docs/releases/RC4_RELEASE_NOTES.md` |

## Known limitations carried forward

Non-blocking items from RC4 certification remain in force unless closed with new evidence:

- OPS-1 … OPS-5 (see `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md`)
- Honest Analytics deferred modules
- Northern Bypass remains `coming-soon` unless separately authorized

## Proposed RC5 workstreams

> All items below are **proposed**. They are not commitments, approved scope, or implementation authorization.

| Stream | Proposed focus | Notes |
| --- | --- | --- |
| P-OPS | Encode public schema grants into migrations; reduce local/prod grant drift | Closes TD-1 / OPS-2 |
| P-REL | Align release docs + optional `v1.3.0` tag after Founder approval; refresh `RELEASE_HISTORY` | Closeout follow-on |
| P-OBS | Deepen Render/Supabase log export and alerting beyond smoke JSON | Addresses OPS-3 |
| P-FIN | Finance / payroll operational hardening beyond Phase 2 foundation | Requires ADR + Founder priority |
| P-LOY | Loyalty/marketing provider send paths (currently constrained) | Requires provider + ADR |
| P-QA | Expand CI Playwright coverage for Owner critical paths | Optional; BM browser gate remains non-blocking today |
| P-SEC | Periodic secret rotation runbook drills; confirm no credentials in evidence packs | Ongoing |

Do **not** treat this table as a roadmap commitment.

## Dependency and migration risks

| Risk | Impact | Mitigation (proposed) |
| --- | --- | --- |
| New migrations after `20260801180000` without Production cutover plan | Schema drift recurrence (`42703` / `42P01`) | Keep tip alignment evidence before certify |
| Analytics column naming regressions | Owner BI failures | Keep contract tests on `product_name` / `menu_item_id` |
| Secret refresh without coordinated API redeploy | Auth/DB probe failures | Follow RC4 security closeout sequence |
| Local grant gap mistaken for product bugs | False defect reports | Document grants in migrations (P-OPS) |

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

This baseline does not authorize Production mutation, schema changes, secret rotation, or feature implementation.
