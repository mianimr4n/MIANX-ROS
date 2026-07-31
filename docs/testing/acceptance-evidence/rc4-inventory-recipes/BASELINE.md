# RC4-9 Baseline

| Field | Value |
| --- | --- |
| Branch | `feature/rc4-inventory-recipes` |
| Base | `origin/main` @ `9d41f3a` |
| Pre-existing | `menu_item_inventory_components` + `kitchen_ticket_set_preparing_atomic` (REQ-KIT-012) |
| Gap | No admin recipe CRUD, no versioning UI, no linked reverse, no COGS seam, UI said Phase 2 |

## Source map (audit)

- Consume trigger already: kitchen → **preparing** only
- Negative stock: forbidden
- Unit conversion: none (added in RC4-9)
- Finance: journal/postings exist; no COGS mapping purpose
- Order complete / kitchen ready: must **not** also consume

Note: User baseline listed RC4-1/4/5 as complete; repository `main` tip remains RC4-6 only.
