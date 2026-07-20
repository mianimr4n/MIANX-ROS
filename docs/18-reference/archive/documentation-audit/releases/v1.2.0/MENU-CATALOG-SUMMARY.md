# MENU CATALOG SUMMARY — v1.2.0

**Exported:** 2026-07-15  
**Source:** `GET https://telepizza-api.onrender.com/api/v1/menu/catalog`  
**Machine export:** `MENU-CATALOG-SUMMARY.json`

---

## Meta

| Metric | Value |
|---|---:|
| categoryCount | 13 |
| itemCount | 58 |
| toppingCount | 3 |
| variantCount | 40 |
| dealCount | 7 |

---

## Public categories (13)

1. Signature Pizzas (`signature-pizzas`)
2. Classic Pizzas (`classic-pizzas`)
3. Specialty Pizzas (`specialty-pizzas`)
4. Burgers (`burgers`)
5. Broast (`broast`)
6. Sandwiches (`sandwiches`)
7. Wings (`wings`)
8. Fries (`fries`)
9. Wraps & Rolls (`wraps-rolls`)
10. Pasta (`pasta`)
11. Chicken & Sides (`chicken-sides`)
12. Drinks (`drinks`)
13. Deals (`deals`)

**Not public:** Toppings (`toppings`) — internal only.

---

## Internal toppings (3)

| Slug | Name | Pricing |
|---|---|---|
| `extra-chicken` | Extra Chicken | Small 50 / Medium 100 / Large 150 |
| `extra-cheese` | Extra Cheese | Small 50 / Medium 100 / Large 150 |
| `extra-cheese-slice` | Extra Cheese Slice | Flat **60** (no size variants) |

---

## Deals (7)

- Family Deal (`family-deal`)
- Pair Deal (`pair-deal`)
- Pizza Fest (`pizza-fest`)
- Deal for 2 (`deal-for-two`)
- Family Festival (`family-festival`)
- Knock Out Deal (`knock-out-deal`)
- Mega Offer (`mega-offer`)

---

## Behari rule (BFR-003)

| Field | Value |
|---|---|
| Slug | `behari-kabab-pizza` |
| Name | Behari Kabab Pizza |
| Category | Specialty Pizzas |
| Price | **549** |
| Badge | **Starting Price** |
| Variants | **0** (do not invent sizes) |
| Website copy | Starting from Rs 549 |

---

## Customer browse rules

- Menu shows **58** items across **13** categories.
- Topping SKUs must **not** appear as searchable standalone cards.
- Pizza customizer loads toppings from `data.toppings` (or equivalent filtered live catalog).
- Cart / WhatsApp represent toppings as **modifier lines** under the pizza.
