# Test Results

## Unit (Vitest)

| File | Focus | Result |
| --- | --- | --- |
| `backend/api/tests/loyalty-depth.test.ts` | Eligibility, reward enums, liability honesty | PASS |
| `backend/api/tests/marketing-depth.test.ts` | Transition matrix, queue gate, template vars, providers | PASS |

Full backend suite: **79 files / 605 tests PASS** (`vitest run --pool=forks --maxWorkers=1`).

## Database static

| Suite | Result |
| --- | --- |
| `pnpm test:db` (798 tests including `tests/database/rc4-loyalty-marketing-depth.test.mjs`) | PASS |

## Gates

| Gate | Result |
| --- | --- |
| `pnpm check` | PASS |
| `pnpm rc1:gate` | PASS (0 blocking failures) |
| `git diff --check` | PASS |

## Playwright + axe

| Config | Spec | Result |
| --- | --- | --- |
| `playwright.rc4-loyalty-marketing-depth.config.ts` | `e2e/rc4/loyalty-marketing-depth.spec.ts` | **3 passed** |

Coverage:

- Admin loyalty rewards LIVE + tiers/liability honesty
- Admin marketing segments/templates + provider honesty (no fabricated delivery metrics)
- Cashier denied loyalty manage surface
- axe: **0 critical / 0 serious** (loyalty desktop+mobile, marketing desktop)

Reporter: `playwright-results.json` in this folder.
Screenshots: see `SCREENSHOT_INDEX.md`.
