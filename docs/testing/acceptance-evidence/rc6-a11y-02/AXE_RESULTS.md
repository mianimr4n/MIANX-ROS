# RC6-A11Y-02 — Axe results

**Engine:** `@axe-core/playwright` · tags `wcag2a`, `wcag2aa`  
**Rule suppressions:** none  
**Date:** 2026-08-02

## Before → after

| Route/state | Before (C/S/M/m) | After (C/S/M/m) |
| --- | --- | --- |
| home desktop | 0/1/0/0 | **0/0/0/0** |
| home mobile | 0/1/0/0 | **0/0/0/0** |
| home mobile menu open | 0/1/0/0 | **0/0/0/0** |
| menu desktop | 1/1/0/0 | **0/0/0/0** |
| menu mobile | 1/1/0/0 | **0/0/0/0** |
| admin login | 0/0/0/0 | **0/0/0/0** |

## Suites

| Suite | Result |
| --- | --- |
| `pnpm test:e2e:a11y02` | 5 passed |
| `playwright.rc5-a11y-01` public home | 2 passed |
| Owner smoke (includes dashboard axe spot-check) | run with local stack |

## Honesty

Automated 0/0/0/0 on these routes ≠ full WCAG certification of the whole product. Cart-drawer compact controls and deep admin surfaces remain outside this certification claim.
