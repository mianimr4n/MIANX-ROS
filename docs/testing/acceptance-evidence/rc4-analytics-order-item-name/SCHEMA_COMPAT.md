# Analytics order item name — schema compatibility note

**Branch:** `fix/analytics-order-item-name-schema`  
**Production error:** `42703 column order_items.name does not exist` via `ANALYTICS_ORDER_ITEMS_READ_FAILED`  
**Source:** `backend/api/src/services/analytics/engine.ts` product module select

## Canonical schema

From `supabase/migrations/20260713190000_foundation_schema.sql`, `public.order_items` includes:

- `menu_item_id` (FK → `menu_items`)
- `product_name varchar(150) not null` — **sold-item display name snapshot at order time**
- `variant_name varchar(100)`
- `quantity`, `unit_price`, `total_price`, …

There is **no** `order_items.name` column.

Order write paths (`backend/api/src/services/orders/supabase.ts`, kitchen tickets, management) read/write `product_name`. Canonical menu comment (`20260725130000`) also refers to name/price **snapshots** on `order_items`.

## Why `order_items.name` was invalid

Analytics product module selected `menu_item_id, quantity, name`. The `name` field does not exist on `order_items` (likely confused with menu item name or a generic “name” field). Production PostgREST returned 42703.

## Expected relation / label source

| Purpose | Source |
| --- | --- |
| Aggregation key (formula) | `order_items.menu_item_id` (unchanged registry: `GROUP BY order_items.menu_item_id SUM(quantity)`) |
| Display label | `order_items.product_name` snapshot (survives menu SKU rename/delete) |
| Missing/blank snapshot | Honest label `Unavailable item name` — not fabricated from live menu |

Prefer snapshot over joining `menu_items` so deleted menu rows do not blank historical labels and no N+1 join is required.

## Why local tests missed it

Existing Analytics API tests mock `AnalyticsService` and do not exercise the product-module Supabase select. Schema static tests covered Analytics foundation tables, not the engine’s `order_items` column list.
