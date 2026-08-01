# Analytics order_items.name hotfix — test results

**Branch:** `fix/analytics-order-item-name-schema`  
**Date:** 2026-08-02

| Gate | Result | Notes |
| --- | --- | --- |
| `pnpm check:website` (tsc) | PASS | |
| `pnpm exec tsc --noEmit` (backend) | PASS | |
| `pnpm test:db` | PASS | 800 tests incl. updated `rc4-analytics-bi` contract |
| `pnpm test:backend` | PASS | 619 tests (+6 schema/aggregation) |
| `git diff --check` | PASS | |
| Analytics Vitest (`analytics-order-items-schema`) | PASS | 6/6 |
| `pnpm rc1:gate` | FAIL (env) | Local Docker/Supabase `:54321` unavailable — auth/KDS refuse connect |
| Playwright `playwright.rc4-analytics-bi.config.ts` | FAIL (env) | Needs local API+website+Supabase seed; Chromium installed afterward |

No Production SQL. No migration added (query/select fix only).
