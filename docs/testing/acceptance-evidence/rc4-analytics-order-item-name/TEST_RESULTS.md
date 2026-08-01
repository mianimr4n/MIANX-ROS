# Analytics order_items.name hotfix — test results

**Branch:** `fix/analytics-order-item-name-schema`  
**Base:** `origin/main` @ `538c289`

## Commands

| Command | Result |
| --- | --- |
| `pnpm check` | **PASS** |
| `pnpm test` | **PASS** — db 800 + backend 619 |
| `pnpm test:db` | **PASS** |
| `git diff --check` | **PASS** |
| Targeted Vitest (`analytics-order-items-schema`, `analytics-api`, `analytics-registry`) | **PASS** (13) |
| `pnpm rc1:gate` | **FAIL** — local API `127.0.0.1:4000` ECONNREFUSED (auth/KDS matrix); not caused by this diff |
| Playwright `playwright.rc4-analytics-bi.config.ts` | **FAIL / not run against live stack** — local Supabase/API/website not up |

## Fix summary

- Select `order_items.product_name` (canonical order-time snapshot), never `order_items.name`
- Aggregate by `menu_item_id`; honest `Unavailable item name` when snapshot blank
- No migration; no Production SQL; no deploy

## Axe / browser

Deferred until local stack is available; static + unit regression covers the 42703 root cause.
