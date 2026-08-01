# Analytics schema hotfix — deploy + smoke evidence

**Date:** 2026-08-02 (Asia/Karachi)
**PR:** [#163](https://github.com/mianimr4n/telepizza/pull/163) — `fix(analytics): use canonical order item name source`
**Authorization:** `DEPLOY_ANALYTICS_SCHEMA_HOTFIX`
**Decision:** `PRODUCTION_MIGRATION_AND_SMOKE_COMPLETE`

## Production failure (pre-fix)

PostgreSQL `42703 column order_items.name does not exist`
Source: `backend/api/src/services/analytics/engine.ts` (product / Owner BI)

## Canonical fix (deployed)

- Select/label from `order_items.product_name` (order-time snapshot)
- Aggregate by `order_items.menu_item_id`
- Blank snapshot → honest `Unavailable item name`
- Includes already-merged health-probe fix from main (`#162`)

## SHAs

| Item | SHA |
| --- | --- |
| Authorized / PR merge / `origin/main` | `2f0e4326310e1036cc23a94d5573dd4d774eaf0f` |
| Deployed Production API (`/healthz.gitSha`) | `2f0e4326310e1036cc23a94d5573dd4d774eaf0f` |
| GitHub deployment `main - telepizza-api` | `5708862569` → success → `https://telepizza-api.onrender.com` |
| Render deploy | `dep-d9n75v15efls73a4j5hg` (auto on merge) |

`origin/main` re-checked after deploy/smoke: **unchanged** at authorized SHA.

## Scope confirmation

| Action | Status |
| --- | --- |
| Deploy API/application from PR #163 merge SHA | DONE (Render auto-deploy on merge; verified live) |
| Database migration | **NOT performed** |
| SQL Editor / ad-hoc Production SQL | **NOT performed** |
| Schema mutation | **NOT performed** |
| Unrelated feature deploy | **NOT performed** |

## Health / readiness

| Check | Result |
| --- | --- |
| `GET /healthz` | `ok: true`, `gitSha` = authorized, DB connectivity `ok` |
| `GET /readyz` | `ok: true`, `issues: []`, `safetyBlockers: []` |
| Deployed SHA matches authorized | YES |

## Local gates (pre-merge)

| Gate | Result |
| --- | --- |
| `pnpm check` / `pnpm test` / `pnpm test:db` | PASS |
| `pnpm rc1:gate` | PASS |
| Playwright Analytics + axe | PASS (0 critical / 0 serious) |
| `git diff --check` | PASS |

## Production Analytics smoke

Evidence JSON: `analytics-hotfix-prod-smoke.json`
Runner: `_run_analytics_hotfix_smoke.mjs` (Owner Google session via CDP)

| Check | Result |
| --- | --- |
| `/auth/me` | 200 |
| Analytics workspace | 200 |
| Executive / sales / product / finance modules | 200 |
| Drill-down `product.top_items`, `sales.gross_sales` | 200 |
| `/admin/reports` UI loads Analytics copy | YES |
| Period + branch controls present | YES |
| Frontend uncaught errors | 0 |
| Logout clears session | YES |
| HR employees + supplier invoices still healthy | 200 |
| Dashboard operations | 200 |

### Schema / log review (targeted)

| Signature | Observed in Analytics smoke |
| --- | --- |
| `order_items.name does not exist` | **NONE** |
| PostgreSQL `42703` | **NONE** |
| PostgreSQL `42P01` | **NONE** |
| `due_date` 42703 | **NONE** |
| `employee_number` 42703 | **NONE** |
| Analytics API 5xx | **NONE** |
| schema-cache errors | **NONE** |

Render dashboard log API key was not available in this session; schema regression check was performed via authenticated Production API probes + UI DOM scan (no `42703`/`order_items.name` surfaces).

## Confirmation

- No migration applied for this hotfix
- No ad-hoc Production SQL
- Deployed SHA verified equal to authorized main SHA `2f0e432`
