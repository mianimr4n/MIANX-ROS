# Telepizza Canonical Menu

**Manifest:** [`data/catalog/telepizza-canonical-menu.json`](../../data/catalog/telepizza-canonical-menu.json)  
**Status:** `BLOCKED_OWNER_EVIDENCE_REQUIRED`  
**Currency:** PKR  
**Baseline decision:** BFR-001 **HYBRID** — V1 base = verified Website/DB board-era; Google Maps Jul-13 = reference only  
**Freeze:** 13 public categories / 58 browse items / 3 toppings / 40 variants / 7 deals

> This document is generated from / validated against the single canonical JSON. Do not maintain a competing catalog file.

---

## 1. Evidence ranking

| Rank | Source | Status |
|---:|---|---|
| 1 | Owner structured menu-board **image files** | **MISSING from repo** |
| 2 | Approved extraction docs (`REAL_MENU_EXTRACTED.md`, `REAL-MENU-EXTRACTION.md`) | Present |
| 3 | Production API catalog | Verified 2026-07-18: 13 / 58 / 3 / 40 / 7; Dips on; Broast off |
| 4 | Migrations (`20260716160000`, modifier system, `20260718180000` draft sync) | Present |
| 5 | Website fallback (`menu-data.ts`) | Generated from canonical |
| 6 | Promo creatives (Eid / Iftar) | Temporary only — not evergreen |

---

## 2. Public categories (13)

1. Signature Pizzas  
2. Classic Pizzas  
3. Specialty Pizzas  
4. Burgers  
5. Sandwiches  
6. Wings  
7. Fries  
8. Wraps & Rolls  
9. Pasta  
10. Chicken & Sides  
11. Dips *(sauces — browse SKUs, not a separate sauce table)*  
12. Drinks *(includes water)*  
13. Deals  

**Hidden:** Toppings (modifier-only). **Discontinued category:** Broast (retired by owner sync; GM evidence retained as discontinued rows).

---

## 3. Sellable browse (58) — board-era hybrid prices

### Signature pizzas (4) — S 499 / M 950 / L 1570
Tele Special · Peri Peri · Bihari Kabab · Kababish

### Classic pizzas (6) — S 470 / M 890 / L 1470
Tikka · Bonfire · Chicken Supreme · Real Fajita · Mexicana · Cheese Lover

### Specialty pizzas (5)
| Code | Price |
|---|---|
| chicago-extreme | M 1199 / L 1899 |
| crown-crust | M 1199 / L 1799 |
| stuffed-crust | 1749 (size ambiguous on board) |
| tele-extreme | 1699 (size ambiguous on board) |
| sixteen-inch-incher | 2399 |

### Burgers (2)
| Code | Price | Flags |
|---|---:|---|
| zinger-burger | 450 | Multi-source conflict (promo 440 / GM 550) — BFR-018 |
| patty-burger | 299 | GM reference 350 |

### Sandwiches (4)
Crunchy 799 · Special / Baked Smoked / Sizzling 749

### Wings (5)
Fried & Crispy / BBQ / Creamo 599 · Oven Baked / Flaming 549

### Fries (3)
Loaded 650 · French 199 · Family 350

### Wraps & Rolls (4)
Jumbo 649 · Crunchy / Dynamite 399 · Behari Roll 799

### Pasta (2)
Crunchy 849 · Special/Flaming 749 *(naming ambiguous)*

### Chicken & Sides (6)
Tender Strips 590 · Crispy Box 670 · Chest 250 · Piece 220 · Nuggets / Hot Shots 449

### Dips / sauces (4)
Special Sauce · Bone Fire · Dip Sauce · Garlic Ranch — **50** each

### Drinks & water (6)
1.5L 210 · 1L 170 · 500ml 110 · 345ml 70 · Large Water 99 · Small Water 50

### Deals (7) — evergreen board
| Code | Price |
|---|---:|
| family-deal | 2250 |
| pizza-fest | 1680 |
| mega-offer | 3140 |
| pair-deal | 1999 |
| family-festival | 2350 |
| deal-for-two | 999 |
| knock-out-deal | 1440 |

Eid/Iftar promo prices are recorded as **temporary / hidden** in the JSON — they must not overwrite evergreen.

---

## 4. Toppings (3) — modifier-only

| Code | Pricing |
|---|---|
| extra-chicken | S 50 / M 100 / L 150 |
| extra-cheese | S 50 / M 100 / L 150 |
| extra-cheese-slice | flat **60** |

---

## 5. Broast investigation

| Finding | Detail |
|---|---|
| GM Link 4 | Quarter 750 · Half 1390 · Full 2590 · Extra dips 60 |
| Owner sync `20260716160000` | Broast category deactivated; SKUs `is_available=false` |
| Prod API 2026-07-18 | No broast in browse |
| Canonical action | Rows kept as `lifecycle: discontinued` + `OWNER_CONFIRMATION_REQUIRED` — **not** re-activated |

---

## 6. Modifiers (existing model)

Junction table: **`item_modifier_groups`** (alias only: `menu_item_modifier_groups`).

| Group | Evidence |
|---|---|
| crust | Schema ready; paid deltas **unverified** on boards |
| extra-chicken / extra-cheese | Board-verified via topping SKUs |
| extra-vegetables / extra-toppings | DB-R2 seed only — flagged |
| add-drinks / add-sides | Linked to catalog SKU prices |

Sauces = **Dips** browse SKUs. Drinks/water = **Drinks** category. No separate broast/sauce/drink tables.

---

## 7. Owner gaps (not sellable)

Recorded in JSON `ownerGapsNotInV1Sellable` — e.g. Malai Boti, grill/smash burgers, Alfredo pasta, GM jumbo wraps, telebar (BFR-007 V2). **Do not invent into sellable** without board confirmation.

---

## 8. Sync & website

| Surface | Rule |
|---|---|
| DB sync | `supabase/migrations/20260718180000_sync_canonical_menu_catalog.sql` — forward-only upsert; **do not apply to prod without owner approval** |
| Website | Live Supabase/API first; fallback = **generated** `menu-data.ts` from canonical |
| Quote / checkout | Server resolves catalog + modifiers; client money not trusted |
| Order history | Snapshots on `order_item_modifiers` preserved |

---

## 9. Owner approval checklist

- [ ] Check in structured menu-board image files (or confirm path to authoritative boards)
- [ ] Confirm whether Broast returns to browse or stays retired
- [ ] Resolve BFR-018 Zinger price (450 vs 440 vs 550)
- [ ] Confirm GM Jul-13 price era vs board hybrid (or Admin-driven updates)
- [ ] Confirm special-pasta naming; stuffed/tele-extreme sizes
- [ ] Approve or deactivate unverified crust/veg/meat modifier deltas
- [ ] Approve production apply of `20260718180000` (content-only)

Until boards are available and the above are signed, catalog completion remains **BLOCKED**.
