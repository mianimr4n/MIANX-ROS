# RC4-9 Known Limitations

1. Modifier/add-on ingredient effects are schema-only — kitchen consume uses base recipe lines.
2. COGS GL posting DEFERRED (event seam only).
3. FIFO/WAC not implemented — costing uses `cost_price` field.
4. Payment refund without order/kitchen cancel does not auto-restore stock.
5. Variant recipes: each size is a separate `menu_items` row (canonical menu); no deprecated variant BOM.
6. Playwright/axe not executed in this environment without local stack.
7. Migration not applied to Production.
8. Free-text historical inventory units outside supported families cannot activate until units normalized.
9. `unmappedRecipeProducts` KPI still approximates from catalog size unless missing-recipe API is wired into KPI builder.
