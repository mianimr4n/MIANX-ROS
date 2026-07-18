# Menu Modifier Architecture (DB-R2)

**Status:** Implementation design — aligned with merged PR #63  
**Date:** 2026-07-18  
**Migration:** `20260718120000_product_modifier_system.sql` (+ `20260718130200_db_r2_modifier_owner_alignment.sql`)

---

## Naming reconciliation (locked)

| Spec / informal name | Canonical table | Decision |
|---|---|---|
| `modifier_groups` | `modifier_groups` | Keep |
| `modifier_options` | `modifier_options` | Keep |
| `menu_item_modifier_groups` | **`item_modifier_groups`** | Alias only — do not invent a second junction |
| `order_item_modifiers` | `order_item_modifiers` | Keep |

`selection_type`: DB uses `single` \| `multi` (`multi` ≡ owner wording **multiple**).

## Schema summary

### `modifier_groups`
`code` (unique), `name`, `selection_type`, `min_select`, `max_select`, `is_required`, `sort_order`, `is_active`, timestamps.

### `modifier_options`
`modifier_group_id`, `code` (unique within group), `name`, `price_delta`, optional `price_delta_by_size`, optional `linked_menu_item_id`, `is_active`, `sort_order`, timestamps.

### `item_modifier_groups` (≡ `menu_item_modifier_groups`)
`menu_item_id`, `modifier_group_id`, **`branch_id` nullable**, `is_available`, `is_active`, `sort_order`, optional min/max/required overrides.  
Unique: `(menu_item_id, modifier_group_id, branch_id)` with `NULLS NOT DISTINCT`.

### `branch_modifier_options`
Per-branch option availability. Absent row ⇒ available (default-open).

### `order_item_modifiers` (immutable snapshots)
`group_code`, `option_code`, `option_name` (display **name**), `quantity`, `unit_price`, `total_price`, plus `price_delta` (compat synonym of unit price). Nullable `modifier_option_id` (`ON DELETE SET NULL`).

## Topping migration strategy

1. Keep existing `product_type = 'topping'` rows (`extra-chicken`, `extra-cheese`, `extra-cheese-slice`).
2. Link them into modifier options via `linked_menu_item_id`.
3. Do **not** delete topping SKUs until post-apply verification confirms browse counts stay **13 / 58 / 3 / 40 / 7**.

## Pricing integrity (server-side)

1. Client money fields (`unitPrice`, extra prices) are **never trusted**.
2. Quote/create resolves live catalog + size tier → `price_delta` / `price_delta_by_size`.
3. Persist snapshots on `order_item_modifiers` (`unit_price`, `total_price`, codes, names).
4. Catalog price changes must not rewrite historical snapshot rows.

## RLS / grants (post-R0)

| Table | anon / authenticated | service_role |
|---|---|---|
| Catalog modifier tables + `branch_modifier_options` | SELECT (active / available policies) | full CRUD |
| `order_item_modifiers` | SELECT own / branch orders | full CRUD |
| Client DML | **none** | — |

## Seed groups

`size`, `crust`, `extra-chicken`, `extra-cheese`, `extra-vegetables`, `extra-toppings`, `add-drinks`, `add-sides` — pizza catalog items attached globally (`branch_id` NULL) except reusable `size` (variants remain size source for pizzas).
