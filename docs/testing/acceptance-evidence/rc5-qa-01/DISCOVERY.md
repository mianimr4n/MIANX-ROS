# RC5-QA-01 — Discovery

| Field | Value |
| --- | --- |
| Slice | RC5-QA-01 — CI Playwright for Owner critical paths |
| Baseline SHA | `795efeeba4d2eb776e0853742479ea13d9645956` |
| Branch | `feature/rc5-qa-01-ci-owner-playwright` |
| Date | 2026-08-02 |

## Pre-slice CI gap

- `.github/workflows/ci.yml` ran only `pnpm check` + `pnpm test`.
- No Chromium Owner smoke in required CI.
- BM browser gate (`rc1:test:browser`) remains separate and non-blocking per existing policy.

## Acceptance criteria (scope)

| ID | Criterion | Disposition |
| --- | --- | --- |
| G-01 | Deterministic ephemeral/local credentials only | Implemented — local Supabase seed + gitignored handover |
| G-02 | Failure blocks or labeled non-blocking | Job fails on Playwright failure; **no** `continue-on-error`; branch protection out of PR |
| G-03 | Flake + retry policy documented | Local retries 0; CI retries 1; see `FLAKE_AND_RETRY_POLICY.md` |
| G-04 | Does not replace `pnpm rc1:gate` | Existing gates unchanged; Owner job is additive |

## Deferred

- `/admin/reports` — deferred until login + dashboard suite is stable in CI.
- Cross-browser matrix — out of scope.
- Production authenticated smoke — out of scope (never used).

## Files introduced / changed

- `playwright.rc5-qa-01.config.ts`
- `e2e/rc5/owner-critical-smoke.spec.ts`
- `e2e/rc5/owner-smoke-readonly.guard.spec.ts`
- `scripts/rc5/wait-http.mjs`
- `scripts/rc5/assert-local-e2e-targets.mjs`
- `scripts/rc5/run-with-local-env.mjs`
- `scripts/rc5/mask-local-secrets.mjs`
- `.github/workflows/ci.yml` (`owner-playwright` job)
- `package.json` (`test:e2e:owner`)
- `.gitignore` (`playwright-report-rc5-qa-01/`)
- `docs/testing/acceptance-evidence/rc5-qa-01/*`
