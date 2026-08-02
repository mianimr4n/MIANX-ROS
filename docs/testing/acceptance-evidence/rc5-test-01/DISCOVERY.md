# RC5-TEST-01 Discovery

**Baseline SHA:** `cb13f39170f6e3cb2b49938b073aff7fac39d83c`
**Branch:** `feature/rc5-test-01-analytics-schema-guards`
**Date:** 2026-08-02

## Original Production failure

PR #163 / cutover defect CUT-4: Analytics product module selected nonexistent `order_items.name` → PostgreSQL `42703`. Canonical fix: select `product_name`, aggregate by `menu_item_id`.

## Runtime Analytics surface reviewed

| Path | Role | `order_items` query? |
| --- | --- | --- |
| `backend/api/src/services/analytics/engine.ts` | Runtime engine / product top-items | **Yes** — `.from("order_items").select("menu_item_id, quantity, product_name")` |
| `backend/api/src/services/analytics/registry.ts` | Descriptive metric metadata | No executable select (formula/source strings only) |
| `backend/api/src/services/analytics/exports.ts` | CSV/Excel/PDF export of metric snapshots | No |
| `backend/api/src/services/analytics/types.ts` | Types | No |
| `backend/api/src/modules/admin/reports.ts` | HTTP wiring to AnalyticsService | No direct table query |
| `backend/api/src/app-dependencies.ts` | DI wiring | No |

Non-Analytics `order_items` usages (orders/kitchen) were noted and **excluded** from this guard (out of slice scope).

## Match classification

| Match | Class |
| --- | --- |
| `engine.ts` select `menu_item_id, quantity, product_name` | Valid corrected runtime contract |
| `engine.ts` `aggregateTopItemsByMenuItemId` | Valid aggregation by `menu_item_id` |
| Registry metric `name:` display labels | Unrelated legitimate `name` field (metric title) |
| Export CSV column `name` | Unrelated metric display name |
| Comment mentioning `order_items.name` as forbidden | Documentation in source — not a select |
| Historical evidence under `docs/testing/acceptance-evidence/rc4-*` | Test fixture / historical evidence (not scanned) |

## Registry decision

`registry.ts` exposes descriptive formula/authoritativeSource text including `product_name` / `menu_item_id` but does **not** query PostgREST. **Out of scope** for registry test extension (Phase 5).

## No runtime defect found

Committed Analytics runtime already uses the corrected contract. Slice is guard strengthening only.
