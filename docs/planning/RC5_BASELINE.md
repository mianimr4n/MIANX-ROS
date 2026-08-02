# RC5 Baseline

**Status:** Living baseline (RC5 repository complete + Production website cutover evidenced)
**Date:** 2026-08-02
**Authority:** Repository evidence after `RC4_CERTIFIED`, annotated tag `v1.3.0`, RC5 slice merges #168–#174, and `rc5-production-cutover/`

## Anchors

| Anchor | Value |
| --- | --- |
| RC4 certified repository SHA (certification merge) | `e40351b2793ffda6a62aec60f817eff3dd0352cf` |
| Released tag | `v1.3.0` — **created and pushed** (annotated git tag; no GitHub Release) |
| Released tag commit | `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` |
| Current repository main | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Production website SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` (`dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r`) |
| Production API SHA (observed) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Production migration tip | `20260801180000` |
| Prior website rollback target | `dpl_FriiC2PsK3bEYrXbXLVuNSXv3G3y` (`795efee…`) — not executed |

Do **not** conflate: repository main, `v1.3.0` tag commit, Production website deployment, Production API deployment, and migration tip.

RC5 work began after RC4 certification at `e40351b`. The last annotated SemVer release remains `v1.3.0` @ `74b6b8e` until Founder authorizes a later tag (recommended candidate `v1.4.0` — not created by closeout docs).

## RC5 slice status (repository)

| Slice | Status |
| --- | --- |
| RC5-OPS-01 | **Merged** #168 → `e5963a6…` |
| RC5-A11Y-01 | **Merged** #169 → `c185911…` |
| RC5-DOC-01 | **Merged** #170 → `cb13f39…` |
| RC5-TEST-01 | **Merged** #171 → `11aa195…` |
| RC5-PERF-01 | **Merged** #172 → `fb7737c…` |
| RC5-OBS-01 | **Merged** #173 → `795efee…` |
| RC5-QA-01 | **Merged** #174 → `152ce40…` (PASS WITH DOCUMENTED LIMITATION) |
| Production website cutover | **Complete** — evidence under `rc5-production-cutover/` |

## Outstanding technical debt (evidenced)

| ID | Debt | Evidence |
| --- | --- | --- |
| TD-1 | Local privilege contract / AGENTS truth | **Addressed by RC5-OPS-01**. Residual: no live-DB privilege job in CI. |
| TD-2 | Free-plan Supabase backup posture (no PITR) | RC4 OPS-1 |
| TD-3 | Package.json versions diverge from `v*` tag convention | website `1.0.0`, API `0.1.0` vs tags `v1.2.0` / `v1.3.0` |
| TD-4 | No automated GitHub Release workflow | only `.github/workflows/ci.yml`; `v1.3.0` is tag-only |
| TD-5 | Stale operational docs citing older main SHAs | **Addressed by RC5-DOC-01 + final closeout** |
| TD-6 | Merged feature branches still present locally/remotely | hygiene inventory in `docs/releases/RC4_RELEASE_NOTES.md` |

## Known limitations carried forward

Non-blocking items from RC4 certification remain in force unless closed with new evidence:

- OPS-1 … OPS-5 (see `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md`)
- Honest Analytics deferred modules
- Northern Bypass remains `coming-soon` unless separately authorized
- RC5 residuals: see `docs/testing/acceptance-evidence/rc5-final-closeout/RESIDUAL_LIMITATIONS.md`

## Proposed RC5 workstreams (historical planning)

> Items below were **proposed** at planning time. Status column reflects repository evidence after closeout.

| Stream | Focus | Status |
| --- | --- | --- |
| P-OPS | Local privilege contract honesty | **Done** (RC5-OPS-01); residual CI live-DB privilege job deferred |
| P-REL | Align release docs with tip facts | **Done** (DOC-01 + final closeout) |
| P-OBS | Log export / alerting path | **Done** as runbook + operator proof; alerts not enabled |
| P-QA | CI Playwright Owner paths | **Done** (QA-01) with documented limitations |
| P-FIN / P-LOY | Product depth | Still Founder-gated / deferred |
| P-SEC | Secret rotation drills | Ongoing hygiene — not an RC5 release blocker |

## Dependency and migration risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| New migrations after `20260801180000` without Production cutover plan | Schema drift | Tip alignment evidence before certify; RC5 cutover migrations were **NONE** |
| Analytics column naming regressions | Owner BI failures | RC5-TEST-01 guards |
| Secret refresh without coordinated API redeploy | Auth/DB probe failures | Follow RC4 security closeout sequence |
| Local grant gap mistaken for product bugs | False defects | Migration-managed privileges (OPS-01) |

## Security requirements (baseline)

- No secrets, JWTs, passwords, dumps, or private env values in Git
- Founder-authorized Production changes only (migrations, SQL, redeploys, rotations)
- Post-change Owner authenticated smoke for Owner-critical modules
- Preserve RC4/RC5 evidence packs as audit artifacts

## Required quality gates

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

This baseline does not authorize Production mutation, schema changes, secret rotation, feature implementation, moving tags, or creating a GitHub Release. Proposed `v1.4.0` is recommendation-only until Founder executes tagging.
