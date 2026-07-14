# Product Catalog (Canonical ERP Record)

**Pack:** Telepizza V1 Business Freeze Pack  
**Version:** `0.1-draft` (pre-lock)  
**Governance:** Mianx.ai — **single source of truth** after V1 sign-off  
**Rule:** Backend, POS, Kitchen, Rider modules read from this catalog + Supabase mirror.

---

## Field definitions

| Field | Description |
|---|---|
| **SKU** | Internal stock-keeping ID (= `slug` for V1) |
| **FREEZE_STATUS** | `DRAFT` · `REVIEW` · `LOCKED` · `REMOVED` · `PLANNED_V2` · `DEFERRED_V2` |
| **Tax** | PKR; tax class TBD at ERP phase — default `STANDARD` placeholder |
| **Availability** | `ACTIVE` · `COMING_SOON` · `HIDDEN` · `SEASONAL` |

## Verification matrix (per SKU)

| Column | V1 scope | When verified |
|---|---|---|
| Product Name | ✅ Required | Workbook sign-off |
| Category | ✅ Required | Workbook |
| Slug | ✅ Required | Tech parity test |
| Description | ✅ Required | GM text or owner edit |
| Variants | ✅ Required | Workbook |
| Prices | ✅ Required | BFR-001 canonical |
| Image | ✅ Required | Image register |
| Availability | ✅ Required | Owner |
| SEO | ✅ Required | Branding gate |
| WhatsApp | ✅ Required | Journey test TC-06 |
| POS | 🔜 Phase 4 | Post-lock |
| Kitchen | 🔜 Phase 5 | Post-lock |
| Rider | 🔜 Phase 6 | Post-lock |
| Database | ✅ Required | Supabase row exists |

**Symbols:** ✅ verified · ⬜ pending · 🔜 future phase · ❌ failed · N/A not applicable

---

## Catalog statistics

| Status | Count |
|---|---:|
| LOCKED | 0 |
| DRAFT (in static/DB) | 58 |
| DRAFT (ADD from GM) | 73 |
| REVIEW | 2 (`behari-kabab-pizza`, `jumbo-wrap`) |
| **Total evidence SKUs** | **131** + 2 review |

---

## 1. Signature Pizzas

**Variant tier (GM):** S 620 · M 1250 · L 1890 · **10" Medium**

| SKU | Name | Variants | GM price | DB | Web | Img | FREEZE | Name | Cat | Slug | Desc | Var | Price | Avail | SEO | WA | POS | Kit | Rider | DB |
|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tele-special | Tele Special | S/M/L | 620/1250/1890 | ⬜ | ⬜ | ⬜ | DRAFT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 | ⬜ |
| peri-peri | Peri Peri | S/M/L | 620/1250/1890 | ⬜ | ⬜ | ⬜ | DRAFT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 | ⬜ |
| bihari-kabab | Bihari Kabab | S/M/L | 620/1250/1890 | ⬜ | ⬜ | ⬜ | DRAFT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 | ⬜ |
| kababish | Kababish | S/M/L | 620/1250/1890 | ⬜ | ⬜ | ⬜ | DRAFT | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 | ⬜ |

---

## 2. Classic Pizzas

**Tier:** S 600 · M 1200 · L 1790

| SKU | Name | GM price | FREEZE | DB | Web | POS | Kit | Rider |
|---|---|---:|---|---|---|---|---|---|
| tikka | Tikka | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |
| bonfire | Bonfire | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |
| chicken-supreme | Chicken Supreme | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |
| real-fajita | Real Fajita | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |
| mexicana | Mexicana | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |
| cheese-lover | Cheese Lover | 600/1200/1790 | DRAFT | ⬜ | ⬜ | 🔜 | 🔜 | 🔜 |

---

## 3. Specialty Pizzas

| SKU | Name | Variants | GM Rs | FREEZE | Notes |
|---|---|---|---:|---|---|
| chicago-extreme | Chicago Extreme | M/L | 1470/2150 | DRAFT | |
| crown-crust | Crown Crust | M/L | 1470/2099 | DRAFT | |
| malai-boti | Malai Boti | S/M/L | 620/1270/1890 | DRAFT | ADD — not in DB yet |
| stuffed-crust | Stuffed Crust | — | 2050 | DRAFT | |
| tele-extreme | Tele Extreme Pizza | — | 1950 | DRAFT | |
| sixteen-inch-incher | 16" Incher | 16" | 2800 | DRAFT | |
| behari-kabab-pizza | Behari Kabab Pizza | — | 549 web | **REVIEW** | BFR-003 — not on GM |

---

## 4. Addons — Extra Topping

| SKU | Name | Variants | GM Rs | FREEZE | BFR-012 |
|---|---|---|---:|---|---|
| extra-chicken-topping | Chicken topping | S/M/L | 50/100/150 | DRAFT | UX model |
| extra-cheese-topping | Cheese topping | S/M/L | 50/100/150 | DRAFT | UX model |
| cheese-slice | Cheese Slice | — | 60 | DRAFT | UX model |

---

## 5. Broast

| SKU | Name | GM Rs | FREEZE | DB | Web | Price ✅ |
|---|---|---:|---|---|---|---|
| quarter-broast | Quarter Broast | 750 | DRAFT | ⬜ | ⬜ | GM match |
| half-broast | Half Broast | 1390 | DRAFT | ⬜ | ⬜ | GM match |
| full-broast | Full Broast | 2590 | DRAFT | ⬜ | ⬜ | GM match |
| broast-garlic-dip | Extra Garlic Dip | 60 | DRAFT | ⬜ | ⬜ | GM match |
| broast-mustard-dip | Extra Mustard Dip | 60 | DRAFT | ⬜ | ⬜ | GM match |

---

## 6. Burgers (Grill + Smash + Chicken)

| SKU | Name | Category | GM Rs | FREEZE | In DB |
|---|---|---|---:|---|---|
| smokehouse-burger | Smokehouse Burger | Grill Burgers | 650 | DRAFT | ✗ |
| grill-boss-burger | Grill Boss Burger | Grill Burgers | 890 | DRAFT | ✗ |
| chipotle-fire-burger | Chipotle Fire Burger | Grill Burgers | 890 | DRAFT | ✗ |
| classic-beef-burger | Classic Beef Burger | Smash Beef | 690 | DRAFT | ✗ |
| signature-beef-burger | Signature Beef Burger | Smash Beef | 1090 | DRAFT | ✗ |
| supreme-beef-burger | Supreme Beef Burger | Smash Beef | 1090 | DRAFT | ✗ |
| classic-crunch-burger | Classic Crunch Burger | Chicken Burgers | 450 | DRAFT | ✗ |
| big-boss-burger | Big Boss Burger | Chicken Burgers | 690 | DRAFT | ✗ |
| zinger-burger | Zinger Burger | Chicken Burgers | 550 | DRAFT | ✗ BFR-002 |
| patty-burger | Patty Burger | Chicken Burgers | 350 | DRAFT | ✓ web 299 |

---

## 7. Appetizers

| SKU | Name | GM Rs | FREEZE |
|---|---|---:|---|
| paratha-roll | Paratha roll | 390 | DRAFT |
| mozzarella-jalapeno-sticks | Mozzarella jalapeno sticks | 599 | DRAFT |

---

## 8. Sandwiches · Wings · Fries

| SKU | Name | Cat | GM Rs | FREEZE | Web Rs |
|---|---|---|---:|---|---:|
| special-sandwich | Special Sandwich | Sandwich | 930 | DRAFT | 749 |
| baked-smoked-sandwich | Baked Smoked | Sandwich | 930 | DRAFT | 749 |
| sizzling-sandwich | Sizzling | Sandwich | 930 | DRAFT | 749 |
| crunchy-sandwich | Crunchy Sandwich | Sandwich | 950 | DRAFT | 799 |
| fried-crispy-wings | Fried & Crispy | Wings | 650 | DRAFT | 599 |
| bbq-wings | Hot BBQ | Wings | 650 | DRAFT | 599 |
| creamo-wings | Creamo | Wings | 650 | DRAFT | 599 |
| oven-baked-wings | Oven Baked | Wings | 600 | DRAFT | 549 |
| flaming-wings | Flaming | Wings | 600 | DRAFT | 549 |
| loaded-fries | Loaded Fries | Fries | 790 | DRAFT | 650 |
| french-fries | French Fries | Fries | 250 | DRAFT | 199 |
| family-fries | Family Fries | Fries | 390 | DRAFT | 350 |

---

## 9. Wraps & Rolls

| SKU | Name | GM Rs | FREEZE | Notes |
|---|---|---:|---|---|
| behari-roll | Behari Roll (4 pc) | 950 | DRAFT | |
| crunchy-wrap | Crunch (GM name) | 550 | DRAFT | rename |
| dynamite-wrap | Dynamite | 550 | DRAFT | rename |
| wrap-it-hot-jumbo | Wrap it Hot Grilled Jumbo | 950 | DRAFT | ADD |
| jalapeno-kick-jumbo | Jalapeno Kick Grilled Jumbo | 950 | DRAFT | ADD |
| wrap-it-hot | Wrap it Hot (Grill) | 650 | DRAFT | ADD |
| jalapeno-kick-wrap | Jalapeno Kick (Grill) | 650 | DRAFT | ADD |
| lil-crunch-wrap | Lil Crunch Wrap | 400 | DRAFT | ADD |
| jumbo-wrap | Tele Pizza Special Jumbo Wrap | 649 web | **REVIEW** | BFR-004 |

---

## 10. Pasta

| SKU | Name | GM Rs | FREEZE | In DB |
|---|---|---:|---|---|
| crunchy-pasta | CRUNCHY | 980 | DRAFT | ✓ |
| special-pasta | SPECIAL | 899 | DRAFT | ✗ |
| flaming-pasta | FLAMING | 899 | DRAFT | ✗ |
| alfredo-pasta | ALFREDO PASTA | 1100 | DRAFT | ✗ |

---

## 11. Chicken & Sides

| SKU | Name | GM Rs | FREEZE |
|---|---|---:|---|
| crispy-box | Crispy Box | 790 | DRAFT |
| chicken-tender-strips | Chicken Tender Strips | 750 | DRAFT |
| fried-chicken-chest | Fried Chicken (Chest) | 300 | DRAFT |
| fried-chicken | Fried Chicken | 280 | DRAFT |
| nuggets | Nuggets (10 pcs) | 490 | DRAFT |
| hot-shots | Hot Shots (10 pcs) | 499 | DRAFT |

---

## 12. Dips

| SKU | Name | GM Rs | FREEZE |
|---|---|---:|---|
| dip-special-sauce | Special Sauce | 50 | DRAFT |
| dip-bone-fire | Bone Fire | 50 | DRAFT |
| dip-sauce | Dip Sauce | 50 | DRAFT |
| dip-garlic-ranch | Garlic Ranch | 50 | DRAFT |

---

## 13. Deals

| SKU | Name | GM Rs | Composition (GM) | FREEZE | Zinger dep |
|---|---|---:|---|---|---|
| family-deal | Family Deal | 2650 | 1L pizza + 10 wings + 1.5L drink | DRAFT | |
| pizza-fest | Pizza Fest | 2020 | 1L pizza + 1.5L drink | DRAFT | |
| mega-offer | Mega Offer | 3799 | 2L pizza + 1.5L drink | DRAFT | |
| pair-deal | Pair Deal | 2600 | 2M pizza + 1.5L drink | DRAFT | |
| family-festival | Family Festival | 2850 | 5 Zinger + 1.5L drink | DRAFT | BFR-002 |
| deal-for-two | Deal for 2 | 1240 | 2 Zinger + 2×345ml | DRAFT | BFR-002 |
| knock-out-deal | Knock Out Deal | 1750 | 3 Zinger + 1L drink | DRAFT | BFR-002 |

---

## 14. Drinks

| SKU | Name | GM Rs | FREEZE |
|---|---|---:|---|
| drink-1-5l | 1.5 Liter | 250 | DRAFT |
| drink-1l | 1 Liter | 200 | DRAFT |
| drink-500ml | 500 ml | 140 | DRAFT |
| drink-345ml | 345 ml | 90 | DRAFT |
| large-water | Large Water | 130 | DRAFT |
| small-water | Small Water | 70 | DRAFT |

---

## 15. telebar (BFR-007 — **APPROVED: V2 only**)

**FREEZE_STATUS:** `PLANNED_V2` for all 43 SKUs.  
**V1 rule:** Not rendered on public website. May exist as draft rows in database for future module enable.  
**V2 enable:** Configuration + sign-off amendment — no catalog redesign.

| Subcategory | SKUs | Price range | Count |
|---|---|---:|---:|
| Welcome Drinks | telebar-mint-margarita, telebar-fresh-lime | 300–350 | 2 |
| Classic Mojitos | 6 flavours | 350–520 | 6 |
| Smoothie | 5 flavours | 599–699 | 5 |
| Matcha | 6 flavours | 799–899 | 6 |
| Frappe | 4 flavours | 590–650 | 4 |
| Shakes | 6 flavours | 499–699 | 6 |
| Special Mocktails | 6 flavours | 399–599 | 6 |
| Iced Coffee | 5 drinks | 450–599 | 5 |
| Sweet Endings | 3 desserts | 350–580 | 3 |

*Full names + prices: `REAL-MENU-EXTRACTION.md` §3.19–3.27. Expand to individual ERP rows in V2 telebar module cycle.*

---

## SKU detail template (use when locking)

```yaml
sku: example-slug
name: Display Name
category: Category Name
description: |
  Exact GM text or owner-approved copy.
variants:
  - label: "10 inch Medium"
    price_pkr: 1250
    sort_order: 2
base_price_pkr: null  # or single price
tax_class: STANDARD  # TBD ERP
availability: ACTIVE
images:
  hero: /images/example-slug-hero.webp
  card: /images/example-slug-card.webp
  thumb: /images/example-slug-thumb.webp
seo:
  title: Tele Special Pizza | Telepizza Multan
  description: ...
whatsapp:
  line_format: "1x Tele Special (10\" Medium) — Rs 1250"
pos: { plu: null, kitchen_routing: null }      # Phase 4
kitchen: { prep_station: pizza, ticket_name: null }  # Phase 5
rider: { fragile: false, bag_type: standard }       # Phase 6
database:
  table: menu_items
  category_slug: signature-pizzas
freeze_status: LOCKED
decision_refs: [BFR-001]
locked_at: null
locked_by: null
```

---

## Catalog gate (G3)

**Pass criteria:**

- [ ] Every V1 public SKU has `FREEZE_STATUS = LOCKED`
- [ ] All LOCKED SKUs: Name · Cat · Slug · Desc · Var · Price · Avail · DB = ✅
- [ ] Image + SEO + WhatsApp = ✅ for LOCKED SKUs
- [ ] REVIEW and REMOVED SKUs documented in Decision Register
- [ ] `DEFERRED_V2` SKUs not rendered on website

**Catalog version at lock:** `v1.0.0`  
**Menu authority:** _________________ **Date:** _________

---

*This file becomes immutable at git tag `v1.0-business-locked`. Amendments via Decision Register only.*
