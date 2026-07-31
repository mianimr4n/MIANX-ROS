# RC4-9 Recipe Model

## Tables

| Table | Role |
| --- | --- |
| `inventory_recipes` | Versioned header: branch, menu_item, version, status (`draft\|active\|inactive`), yield_factor |
| `inventory_recipe_lines` | Ingredients: quantity, unit, waste_factor |
| `inventory_recipe_modifier_effects` | Optional add/remove deltas (schema only; consume path base-only) |
| `menu_item_inventory_components` | Runtime BOM synced on activate (kitchen RPC reads this) |

## Rules

- Branch-scoped (inventory items are branch-scoped)
- One **active** recipe per `(branch_id, menu_item_id)`
- Activate converts line qty → inventory item unit and upserts BOM for that branch
- Active recipes are locked for edit (duplicate → new draft version)
