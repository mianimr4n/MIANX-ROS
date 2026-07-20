# Master Data Freeze

**Governance:** Mianx.ai  
**Status:** `DRAFT` — becomes database schema source after owner sign-off + category LOCK cycles  
**Upstream:** [BUSINESS-CONSTITUTION.md](./BUSINESS-CONSTITUTION.md) · [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md)  
**Downstream:** Supabase migrations · Website · POS · Kitchen · ERP

---

## Purpose

Permanently define every **master data entity** before building systems.  
When an entity is `LOCKED` here, its shape in the database is fixed for V1.

### Evidence → master data (V1)

| Source | Master data rule |
|---|---|
| Structured menu-board images | **V1 baseline** (BFR-001 pending approve) |
| `menu-data.ts` / current DB | Aligned to structured baseline today |
| GM Jul 2026 | Conflict log only — no silent overwrite |
| Promo posters | `promo_price` metadata — not canonical until owner + CR |
| Owner dashboard (post-launch) | Operational updates + audit log |

### Canonical contact (locked)

| Field | Value |
|---|---|
| Order phone | **0304-1110495** |
| WhatsApp intl | **923041110495** |
| Alternate 0304-1111795 | **DO NOT PUBLISH** (EC-001) |

### SKU holds & promo conflicts

| SKU / deal | Master data status |
|---|---|
| `zinger-burger` | **HOLD** — BFR-018; no standalone row until owner confirms |
| `behari-kabab-pizza` | **KEEP** — price/variants TBD (BFR-003) |
| `crown-crust` | SUPPORTED — baseline on board + poster |
| `crunchy-pasta` | Baseline **849** |
| `special-sandwich` | Baseline **749** |
| `pizza-fest` | Baseline **1680**; promo 1649 logged |
| `pair-deal` | Baseline **1999**; promo 2099 logged |
| `family-deal` | Baseline **2250**; promo 2199 logged |
| `knock-out-deal` | Baseline **1440**; promo 1390 logged |

---

## Entity registry

| Entity | Table / store | V1 count (target) | Locked | Source doc |
|---|---|---:|---|---|
| Categories | `menu_categories` | 13–16 | 0 | Workbook |
| Products | `menu_items` | 88 food | 0 | PRODUCT-CATALOG |
| Variants | `menu_item_variants` | TBD | 0 | Workbook |
| Sizes | variant labels | 6/10/12" pizzas | 0 | BFR-015 |
| Crusts | customizer / metadata | specialty only | 0 | Catalog |
| Sauces | item descriptions | per pizza | 0 | GM text |
| Toppings | customizer addons | 3 tiers + slice | 0 | BFR-012 |
| Deals | `menu_items` (deals cat) | 7 max | 0 | BFR-014 |
| Add-ons | customizer JSON | pizza only V1 | 0 | BFR-012 |
| Combos | deal bundle rules | 7 | 0 | Catalog |
| Availability | `is_available` | per SKU | 0 | Owner |
| Images | `image_url` + register | per SKU | 0 | IMAGE-ASSET-REGISTER |
| SEO | meta per route/SKU | TBD | 0 | BRANDING |
| Slugs | unique keys | = SKU count | 0 | PRODUCT-CATALOG |
| Display order | `sort_order` | per category | 0 | Owner preference |
| Branches | `branches` | 2 (1 operating) | 0 | CONSTITUTION |
| Telebar SKUs | draft only | 43 | PLANNED_V2 | BFR-007 |

---

## Schema contract (Supabase V1)

Aligned with `supabase/migrations/20260713190000_foundation_schema.sql`:

| Column | Entity | Rule |
|---|---|---|
| `menu_categories.slug` | Category | Unique, kebab-case |
| `menu_categories.sort_order` | Display order | **Not** `display_order` |
| `menu_categories.is_active` | Availability | false = hidden |
| `menu_items.slug` | Product | Unique; = website `id` |
| `menu_items.base_price` | Single-price items | Null if variants exist |
| `menu_item_variants.label` | Size / variant | Owner-approved text |
| `menu_item_variants.price` | PKR integer | From **structured baseline** (BFR-001) — not promo/GM silent override |
| `menu_item_variants.sort_order` | Variant order | S < M < L |
| `menu_items.image_url` | Image | Path from asset register |
| `menu_items.metadata` | Crusts, deal bundle | JSON — document shape below |

### Deal bundle metadata (draft shape)

```json
{
  "type": "deal",
  "components": [
    { "sku": "zinger-burger", "qty": 5, "note": "BFR-002 dependency" }
  ],
  "includes_drink": "1.5L"
}
```

### Pizza customizer addons (BFR-012 = CUSTOMIZER_ONLY)

```json
{
  "addons": [
    { "id": "extra-cheese", "label": "Extra Cheese", "prices": { "S": 50, "M": 100, "L": 150 } },
    { "id": "extra-chicken", "label": "Extra Chicken", "prices": { "S": 50, "M": 100, "L": 150 } },
    { "id": "cheese-slice", "label": "Cheese Slice", "price": 60 }
  ]
}
```

---

## Freeze phases (per entity type)

| Phase | Entities | Trigger |
|---|---|---|
| MD-1 | Categories + slugs + sort_order | Brand + menu sign-off |
| MD-2 | Products + descriptions | Category workbook LOCK |
| MD-3 | Variants + sizes + prices | BFR-001 + BFR-015 approved |
| MD-4 | Toppings / addons (customizer) | BFR-012 approved |
| MD-5 | Deals + combos | BFR-014 active list |
| MD-6 | Images + SEO | Image register complete |
| MD-7 | Branches + availability | CONSTITUTION locked |
| MD-8 | Telebar draft rows | V2 module only |

---

## Category freeze tracker

| Category | Products | Variants | DB | Web | Images | MD status |
|---|---:|---:|---|---|---|---|
| Signature Pizza | 4 | 12 | ⬜ | ⬜ | ⬜ | DRAFT |
| Classic Pizza | 6 | 18 | ⬜ | ⬜ | ⬜ | DRAFT |
| Specialty Pizza | 6–7 | TBD | ⬜ | ⬜ | ⬜ | DRAFT |
| Extra Toppings | customizer | 3 | ⬜ | ⬜ | N/A | DRAFT |
| Broast | 5 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Burgers | 10 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Sandwiches | 4 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Wraps | 8–9 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Wings | 5 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Fries | 3 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Pasta | 4 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Chicken & Sides | 6 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Dips | 4 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Drinks | 6 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| Deals | 7 | 0 | ⬜ | ⬜ | ⬜ | DRAFT |
| telebar | 43 | 0 | PLANNED_V2 | hidden | V2 | PLANNED_V2 |

---

## Master data lock gate

**PASS when:**

- [ ] Every V1 public entity row = `LOCKED` in [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md)
- [ ] Slug parity test: MASTER-DATA ↔ `menu-data.ts` ↔ Supabase
- [ ] No `DRAFT` products on public website
- [ ] `IMPLEMENTATION-LOCK.md` = LOCKED
- [ ] Export snapshot: `master-data-v1.0.json` (future automation)

**Version:** `master-data-v1.0.0`  
**Lock date:** _pending_

---

## Export format (future CI)

```json
{
  "version": "v1.0.0",
  "constitution_ref": "BUSINESS-CONSTITUTION.md",
  "categories": [],
  "products": [],
  "variants": [],
  "addons": [],
  "deals": [],
  "branches": []
}
```

*Generated from PRODUCT-CATALOG + migrations after full freeze.*

---

*Workflow position: Step 04 — after Menu Freeze, before Database Build*
