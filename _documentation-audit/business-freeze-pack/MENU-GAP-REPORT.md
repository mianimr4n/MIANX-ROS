# MENU Gap Report

**Pack:** Telepizza V1 Business Freeze Pack  
**Date:** 2026-07-14  
**Evidence:** `REAL-MENU-EXTRACTION.md` (printed menu, Google Maps, 2026-07-13)  
**Comparators:** Website static (`menu-data.ts`) ≡ Supabase production (58 slugs verified)

---

## Executive summary

| Gap type | Count | Severity |
|---|---:|---|
| Missing from Website/DB (V1 scope, excl. telebar) | **~30** | 🔴 High |
| Extra on Website/DB (not on printed menu) | **1–2** | 🟡 Review |
| Price mismatch (item exists, wrong price) | **53** | 🔴 High |
| Name / size label mismatch | **8+** | 🟡 Medium |
| Category missing entirely | **6+** | 🔴 High |
| Website live Supabase load | **Broken** | 🔴 Critical |

**V1 scope (BFR-007):** 88 food SKUs on printed menu (131 − 43 telebar `PLANNED_V2`).  
**Parity rule:** Printed Menu = Website = Database. Current V1 coverage: **58 / 88 ≈ 66%**, price accuracy **5 / 58 ≈ 9%** (broast only).

---

## 1. Category gap matrix

| Printed section (GM) | Website category | Static | DB | Website | Gap |
|---|---|---|---|---|---|
| Signature Pizza | Signature Pizzas | ✓ 4 | ✓ | ✓ | Prices + 9" vs 10" label |
| Classic Pizza | Classic Pizzas | ✓ 6 | ✓ | ✓ | Prices + size label |
| Specialty Pizza | Specialty Pizzas | ✓ 6 | ✓ | ✓ | Missing Malai Boti; extra Behari Kabab Pizza |
| Extra Topping | — | ✗ | ✗ | ✗ | **Category missing** |
| Injected Broast | Broast | ✓ 5 | ✓ | ✓ | ✅ Prices match |
| Grill Burgers | — | ✗ | ✗ | ✗ | **Category missing** (3 items) |
| Smash Beef Burgers | — | ✗ | ✗ | ✗ | **Category missing** (3 items) |
| Chicken Burgers | Burgers (1 only) | 1/4 | 1/4 | 1/4 | **3 burgers missing** |
| Appetizers | — | ✗ | ✗ | ✗ | **Category missing** (2 items) |
| Sandwich | Sandwiches | ✓ 4 | ✓ | ✓ | All prices stale |
| Wings | Wings | ✓ 5 | ✓ | ✓ | Names + prices stale |
| Fries | Fries | ✓ 3 | ✓ | ✓ | Prices stale |
| Wraps & Rolls | Wraps & Rolls | ✓ 4 | ✓ | ✓ | Wrong items/prices vs GM |
| Pasta | Pasta | 1/4 | 1/4 | 1/4 | **3 pasta missing** |
| Chicken & Sides | Chicken & Sides | ✓ 6 | ✓ | ✓ | Prices stale |
| Dips | — | ✗ | ✗ | ✗ | **Category missing** (4 items) |
| Deals | Deals | ✓ 7 | ✓ | ✓ | All prices stale; Zinger refs without SKU |
| Drinks (soft) | Drinks | ✓ 6 | ✓ | ✓ | Prices stale |
| telebar (9 subcats) | — | ✗ | ✗ | ✗ | **PLANNED_V2** — BFR-007; not V1 website |

---

## 2. Missing items (Printed → NOT in Website/DB)

### 2.1 Food — high priority

| # | Category | Item | GM price | Source |
|---|---|---|---:|---|
| M-01 | Specialty Pizza | Malai Boti | S 620 / M 1270 / L 1890 | Link 3 |
| M-02 | Extra Topping | Chicken topping | 50 / 100 / 150 | Link 3 |
| M-03 | Extra Topping | Cheese topping | 50 / 100 / 150 | Link 3 |
| M-04 | Extra Topping | Cheese Slice | 60 | Link 3 |
| M-05 | Grill Burgers | Smokehouse Burger | 650 | Link 4 |
| M-06 | Grill Burgers | Grill Boss Burger | 890 | Link 4 |
| M-07 | Grill Burgers | Chipotle Fire Burger | 890 | Link 4 |
| M-08 | Smash Beef | Classic Beef Burger | 690 | Link 4 |
| M-09 | Smash Beef | Signature Beef Burger | 1090 | Link 4 |
| M-10 | Smash Beef | Supreme Beef Burger | 1090 | Link 4 |
| M-11 | Chicken Burgers | Classic Crunch Burger | 450 | Link 2 |
| M-12 | Chicken Burgers | Big Boss Burger | 690 | Link 2 |
| M-13 | Chicken Burgers | Zinger Burger | 550 | Link 2 |
| M-14 | Appetizers | Paratha roll | 390 | Link 2 |
| M-15 | Appetizers | Mozzarella jalapeno sticks | 599 | Link 2 |
| M-16 | Pasta | SPECIAL | 899 | Link 2 |
| M-17 | Pasta | FLAMING | 899 | Link 2 |
| M-18 | Pasta | ALFREDO PASTA | 1100 | Link 2 |
| M-19 | Wraps | Wrap it Hot Grilled Jumbo | 950 | Link 4 |
| M-20 | Wraps | Jalapeno Kick Grilled Jumbo | 950 | Link 4 |
| M-21 | Wraps | Wrap it Hot (Grill) | 650 | Link 4 |
| M-22 | Wraps | Jalapeno Kick (Grill) | 650 | Link 4 |
| M-23 | Wraps | Lil Crunch Wrap | 400 | Link 4 |
| M-24 | Dips | Special Sauce | 50 | Link 1 |
| M-25 | Dips | Bone Fire | 50 | Link 1 |
| M-26 | Dips | Dip Sauce | 50 | Link 1 |
| M-27 | Dips | Garlic Ranch | 50 | Link 1 |

### 2.2 Telebar — **PLANNED_V2 (BFR-007 APPROVED)**

43 GM-verified items **excluded from V1 public gap count**. Stored for V2 module; optional draft DB rows with `availability = PLANNED_V2`.

| Subcategory | Count | V1 website | V2 module |
|---|---:|---|---|
| All telebar sections | 43 | Hidden | Enable via config |

---

## 3. Extra items (Website/DB → NOT on printed menu)

| Slug | Website name | Website price | Finding | Recommended action |
|---|---|---:|---|---|
| `behari-kabab-pizza` | Behari Kabab Pizza | 549 | Not on any GM photo; "Bihari Kabab" exists as Signature pizza only | **NEEDS_OWNER_CONFIRMATION** — Remove or reclassify |
| `jumbo-wrap` | Tele Pizza Special Jumbo Wrap | 649 | GM has different Jumbo Wraps @ 950 | **CORRECT or REMOVE** |

---

## 4. Price differences (item exists in both)

### 4.1 Signature pizzas (all 4 items — same tier)

| Variant | Website/DB | Printed (GM) | Δ |
|---|---:|---:|---:|
| 6" Small | 499 | 620 | +121 |
| 9"/10" Medium | 950 | 1250 | +300 |
| 12" Large | 1570 | 1890 | +320 |

**Size label:** Website = `9 inch Medium` · GM = `10" Medium`

### 4.2 Classic pizzas (all 6 items — same tier)

| Variant | Website/DB | Printed (GM) | Δ |
|---|---:|---:|---:|
| 6" Small | 470 | 600 | +130 |
| 9"/10" Medium | 890 | 1200 | +310 |
| 12" Large | 1470 | 1790 | +320 |

### 4.3 Specialty pizzas

| Item | Variant | Website/DB | GM | Δ |
|---|---|---:|---:|---:|
| Crown Crust | M / L | 1199 / 1799 | 1470 / 2099 | +271 / +300 |
| Chicago Extreme | M / L | 1199 / 1899 | 1470 / 2150 | +271 / +251 |
| Stuffed Crust | — | 1749 | 2050 | +301 |
| Tele Extreme | — | 1699 | 1950 | +251 |
| 16" Incher | — | 2399 | 2800 | +401 |

### 4.4 Non-pizza items (selected)

| Item | Website/DB | GM | Match |
|---|---:|---:|---|
| Patty Burger | 299 | 350 | ✗ |
| Crunchy Sandwich | 799 | 950 | ✗ |
| Special / Baked / Sizzling Sandwich | 749 | 930 | ✗ |
| Fried & Crispy / Hot BBQ / Creamo wings | 599 | 650 | ✗ |
| Oven Baked / Flaming wings | 549 | 600 | ✗ |
| Loaded / French / Family Fries | 650/199/350 | 790/250/390 | ✗ |
| Crunch / Dynamite wrap | 399 | 550 | ✗ |
| Behari Roll | 799 | 950 | ✗ |
| Crunchy Pasta | 849 | 980 | ✗ |
| Chicken Tender Strips | 590 | 750 | ✗ |
| Crispy Box | 670 | 790 | ✗ |
| Fried Chicken chest / piece | 250/220 | 300/280 | ✗ |
| Nuggets / Hot Shots | 449 | 490/499 | ✗ |
| All 6 drinks | see workbook | see GM | ✗ |
| All 7 deals | see workbook | see GM | ✗ |

### 4.5 Price matches ✅

| Item | Price | Notes |
|---|---:|---|
| Quarter Broast | 750 | ✅ |
| Half Broast | 1390 | ✅ |
| Full Broast | 2590 | ✅ |
| Extra Garlic Dip | 60 | ✅ |
| Extra Mustard Dip | 60 | ✅ |

---

## 5. Name / label mismatches

| Website slug | Website name | GM name | Issue |
|---|---|---|---|
| `bbq-wings` | BBQ Wings | Hot BBQ | Name mismatch |
| `crunchy-wrap` | Crunchy Wrap | Crunch | Name + price |
| `dynamite-wrap` | Dynamite Wrap | Dynamite | Name + price |
| `creamo-wings` | Creamo Wings | Creamo | Spelling review (caption: Cremo) |
| `baked-smoked-sandwich` | Baked Smoked Sandwich | Baked Smoked | Minor naming |
| All variant pizzas | 9 inch Medium | 10" MEDIUM | Size label |

---

## 6. Database-specific gaps

| Issue | Website query | Production schema | Impact |
|---|---|---|---|
| Column name | `display_order` | `sort_order` | Fetch error 42703 |
| View missing | `menu_items_with_pricing` | Not deployed | Fetch error PGRST205 |
| Live catalog | Expects Supabase rows | Always falls back to static | Silent degradation |
| Slug parity | 58 slugs | 58 slugs | ✅ Data sync OK |
| Full menu | 131 target | 58 rows | 🔴 Incomplete |

---

## 7. Deal composition gaps

Deals reference **Zinger Burger** but standalone Zinger SKU is absent:

| Deal | GM price | Zinger dependency |
|---|---:|---|
| Family Festival | 2850 | 5× Zinger |
| Deal for 2 | 1240 | 2× Zinger |
| Knock Out Deal | 1750 | 3× Zinger |

**Risk:** WhatsApp orders cannot price Zinger line items until BFR-002 resolved.

---

## 8. Resolution tracking

| Gap ID | Description | Owner action | Status |
|---|---|---|---|
| GAP-001 | ~30 missing V1 food items (excl. telebar) | ADD via workbook | OPEN |
| GAP-002 | 53 stale prices | UPDATE to GM or alternate canonical | OPEN |
| GAP-003 | `behari-kabab-pizza` extra item | BFR-003 | OPEN |
| GAP-004 | `jumbo-wrap` wrong item | BFR-004 | OPEN |
| GAP-005 | 9" vs 10" medium label | BFR-001 | OPEN |
| GAP-006 | Telebar 43 items | **PLANNED_V2** — BFR-007 APPROVED | CLOSED V1 |
| GAP-007 | Zinger in deals, no SKU | BFR-002 | OPEN |
| GAP-008 | Supabase schema mismatch | Tech fix post-freeze | OPEN |
| GAP-009 | Dips / toppings categories | ADD + UX model | OPEN |

---

## 9. Target state (zero gaps)

When this report is **closed**:

- Missing items = **0** (or explicitly `REMOVE_FROM_PUBLIC` with owner sign-off)
- Extra unverified items = **0**
- Price deltas = **0** against signed canonical list
- Website live load = Supabase (not silent fallback)
- Category count = owner-approved V1 set

**Next:** Complete [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) → update [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md).
