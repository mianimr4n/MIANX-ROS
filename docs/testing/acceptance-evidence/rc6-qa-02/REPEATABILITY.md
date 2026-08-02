# RC6-QA-02 — Repeatability

**Command:** `pnpm test:e2e:owner`  
**Env:** `D3_E2E_BASE_URL=http://localhost:3000`, `D3_E2E_API_URL=http://127.0.0.1:4000`  
**Fixture:** existing local `pnpm local:seed` handover (gitignored)  
**Date:** 2026-08-02

## Three consecutive focused runs

| Run | Result | Duration (wall) | Notes |
| --- | --- | --- | --- |
| 1 | PASS (7/7) | 31333 ms | Login, dashboard, 6 ops paths, refresh, logout gate, axe, guard |
| 2 | PASS (7/7) | 32736 ms | Same |
| 3 | PASS (7/7) | 34543 ms | Same |

## Success criteria

| Criterion | Met? |
| --- | --- |
| Three consecutive focused greens | Yes |
| No order dependency beyond serial describe | Yes |
| No stale session dependency across runs | Yes (fresh context each test) |
| No leaked Owner credentials in Git | Yes (gitignored handover only) |
| No orphaned services breaking next run | Yes (local stack left running for operator; CI cleans always) |
| No Production mutation | Yes |
| No flaky retry-only pass | Yes (local retries = 0) |

## Earlier fix iterations (not counted as greens)

1. Reports page dual-`h1` → switched to role+name heading selector  
2. Post-logout URL is not always `/admin/login` → assert Staff access required **or** login form
