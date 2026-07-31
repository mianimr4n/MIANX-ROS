# RC4-9 Costing Source Map

| Field | Value |
| --- | --- |
| Source | `inventory_items.cost_price` |
| Method | Last purchase / standard cost field (not FIFO/WAC) |
| State labels | LIVE / DERIVED / UNAVAILABLE / DEFERRED |
| Recipe estimate | DERIVED when all lines have cost_price; else UNAVAILABLE |
| Formula | `sum(convert(qty × waste / yield → item.unit) × cost_price)` |
| As-of | Timestamp when estimate computed in API response |
| Branch scope | Ingredient branch must match recipe branch |

FIFO/WAC: **not implemented** (DEFERRED).
