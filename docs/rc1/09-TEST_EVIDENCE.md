# RC1 Test Evidence

## Backend

| Item | Value |
| --- | --- |
| Framework | Vitest |
| Location | `backend/api/tests/` |
| Files | 31 |
| Gate execution | 235 tests (single-worker invocation inside `rc1:gate`) |

## Website static

| Item | Value |
| --- | --- |
| Location | `tests/website/*.test.mjs` |
| Total suites | 38 |
| Admin suites in gate | 17 |
| Auth foundation | Corrected for `onAuthStateChange` (Commit F) |

## Permanent RC1 harnesses

| Script | Purpose | Gate |
| --- | --- | --- |
| `scripts/rc1-quality-gate.mjs` | Orchestrator | `pnpm rc1:gate` |
| `scripts/rc1/lib/fixtures.mjs` | Fixture password resolution | shared |
| `scripts/rc1/auth-branch-matrix.mjs` | AuthZ / branch isolation | blocking |
| `scripts/rc1/kds-auth.mjs` | Kitchen API + UI deny | blocking |
| `scripts/rc1/bm-landing.mjs` | BM browser smoke | optional / SKIP |

## Package scripts

`rc1:gate`, `rc1:test:static`, `rc1:test:auth`, `rc1:test:kds`, `rc1:test:browser`

## Playwright

No dedicated `playwright.config` project. Harnesses use Playwright Chromium ad-hoc.

## Known flaky / mitigated

| Issue | Handling |
| --- | --- |
| Vitest worker crash after heavy build | Gate runs tests before build + maxWorkers=1 |
| BM browser `ERR_INSUFFICIENT_RESOURCES` | Non-blocking SKIP |
| KDS UI email selector timeout | Intermittent; re-run / not claimed as product auth defect when `apiOk` |

## Local-only / ignored

`scripts/_tmp_*.mjs` — not part of RC1 committed verification layer.
