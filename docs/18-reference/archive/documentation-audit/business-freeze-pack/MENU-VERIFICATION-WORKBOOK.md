# Menu Verification Workbook

**Pack:** Telepizza V1 Business Freeze Pack  
**Evidence:** `REAL-MENU-EXTRACTION.md` (Google Maps printed menu, 2026-07-13)  
**Instructions:** For each row, owner marks **Action** → `KEEP` · `UPDATE` · `REMOVE` · `ADD` · `DEFER_V2` · `REVIEW`  
**Sign-off:** Initials + date in last column when row is final.

**Legend**

| In Static/DB | Meaning |
|---|---|
| ✓ | Slug exists in `menu-data.ts` and Supabase |
| ✗ | Missing |
| ~ | Exists but name/price/variant wrong |

**V1 baseline (BFR-001 pending):** Structured menu-board = permanent baseline. GM Jul 2026 = logged conflicts only. Promo prices (EC-003–006) do not replace baseline.

---

## Summary

| Category | GM items | In catalog | Price match | Owner complete |
|---|---:|---:|---:|---:|
| Signature Pizza | 4 | 4 | 0 | 0 |
| Classic Pizza | 6 | 6 | 0 | 0 |
| Specialty Pizza | 6 | 5+1 extra | 0 | 0 |
| Extra Topping | 3 | 0 | — | 0 |
| Broast | 5 | 5 | 5 | 0 |
| Grill Burgers | 3 | 0 | — | 0 |
| Smash Beef | 3 | 0 | — | 0 |
| Chicken Burgers | 4 | 1 | 0 | 0 |
| Appetizers | 2 | 0 | — | 0 |
| Sandwich | 4 | 4 | 0 | 0 |
| Wings | 5 | 5 | 0 | 0 |
| Fries | 3 | 3 | 0 | 0 |
| Wraps & Rolls | 8 | 4 | 0 | 0 |
| Pasta | 4 | 1 | 0 | 0 |
| Chicken & Sides | 6 | 6 | 0 | 0 |
| Dips | 4 | 0 | — | 0 |
| Deals | 7 | 7 | 0 | 0 |
| Drinks | 6 | 6 | 0 | 0 |
| telebar | 43 | 0 | PLANNED_V2 | N/A V1 |
| **Extra in catalog** | — | 2 | — | 0 |
| **TOTAL** | **131** | **58** | **5** | **0** |

---

## 1. Signature Pizza

Tier: **S 620 · M 1250 · L 1890** (GM 10" Medium)

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Tele Special | S / M / L | 620 / 1250 / 1890 | tele-special | 499 / 950 / 1570 | ✓ | UPDATE price + 10" label | | |
| Peri Peri | S / M / L | 620 / 1250 / 1890 | peri-peri | 499 / 950 / 1570 | ✓ | UPDATE | | |
| Bihari Kabab | S / M / L | 620 / 1250 / 1890 | bihari-kabab | 499 / 950 / 1570 | ✓ | UPDATE | | |
| Kababish | S / M / L | 620 / 1250 / 1890 | kababish | 499 / 950 / 1570 | ✓ | UPDATE | | |

---

## 2. Classic Pizza

Tier: **S 600 · M 1200 · L 1790**

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Tikka | S / M / L | 600 / 1200 / 1790 | tikka | 470 / 890 / 1470 | ✓ | UPDATE | | |
| Bonfire | S / M / L | 600 / 1200 / 1790 | bonfire | 470 / 890 / 1470 | ✓ | UPDATE | | |
| Chicken Supreme | S / M / L | 600 / 1200 / 1790 | chicken-supreme | 470 / 890 / 1470 | ✓ | UPDATE | | |
| Real Fajita | S / M / L | 600 / 1200 / 1790 | real-fajita | 470 / 890 / 1470 | ✓ | UPDATE | | |
| Mexicana | S / M / L | 600 / 1200 / 1790 | mexicana | 470 / 890 / 1470 | ✓ | UPDATE | | |
| Cheese Lover | S / M / L | 600 / 1200 / 1790 | cheese-lover | 470 / 890 / 1470 | ✓ | UPDATE | | |

---

## 3. Specialty Pizza

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Chicago Extreme | M / L | 1470 / 2150 | chicago-extreme | 1199 / 1899 | ✓ | UPDATE | | |
| Crown Crust | M / L | 1470 / 2099 | crown-crust | 1199 / 1799 | ✓ | **SUPPORTED** — board + poster | | |
| Malai Boti | S / M / L | 620 / 1270 / 1890 | malai-boti | — | ✗ | ADD | | |
| Stuffed Crust | — | 2050 | stuffed-crust | 1749 | ✓ | UPDATE | | |
| Tele Extreme Pizza | — | 1950 | tele-extreme | 1699 | ✓ | UPDATE | | |
| 16" Incher | 16" | 2800 | sixteen-inch-incher | 2399 | ✓ | UPDATE | | |
| Behari Kabab Pizza | — | — | behari-kabab-pizza | 549 | ✓ | **KEEP** — BFR-003 price/variants pending | | |

---

## 4. Extra Topping

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Chicken topping | S / M / L | 50 / 100 / 150 | extra-chicken-topping | — | ✗ | ADD (BFR-012) | | |
| Cheese topping | S / M / L | 50 / 100 / 150 | extra-cheese-topping | — | ✗ | ADD (BFR-012) | | |
| Cheese Slice | — | 60 | cheese-slice | — | ✗ | ADD (BFR-012) | | |

---

## 5. Broast ✅ (prices match)

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Quarter Broast | — | 750 | quarter-broast | 750 | ✓ | KEEP | | |
| Half Broast | — | 1390 | half-broast | 1390 | ✓ | KEEP | | |
| Full Broast | — | 2590 | full-broast | 2590 | ✓ | KEEP | | |
| Extra Garlic Dip | — | 60 | broast-garlic-dip | 60 | ✓ | KEEP | | |
| Extra Mustard Dip | — | 60 | broast-mustard-dip | 60 | ✓ | KEEP | | |

---

## 6. Grill Burgers (NEW on menu)

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Smokehouse Burger | — | 650 | smokehouse-burger | — | ✗ | ADD | | |
| Grill Boss Burger | — | 890 | grill-boss-burger | — | ✗ | ADD | | |
| Chipotle Fire Burger | — | 890 | chipotle-fire-burger | — | ✗ | ADD | | |

---

## 7. Smash Beef Burgers (NEW)

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Classic Beef Burger | — | 690 | classic-beef-burger | — | ✗ | ADD | | |
| Signature Beef Burger | — | 1090 | signature-beef-burger | — | ✗ | ADD | | |
| Supreme Beef Burger | — | 1090 | supreme-beef-burger | — | ✗ | ADD | | |

---

## 8. Chicken Burgers

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Classic Crunch Burger | — | 450 | classic-crunch-burger | — | ✗ | ADD | | |
| Big Boss Burger | — | 690 | big-boss-burger | — | ✗ | ADD | | |
| Zinger Burger | 450 board / 440 poster / 550 GM | — | zinger-burger | — | ✗ | **HOLD** — BFR-018 | | |
| Patty Burger | — | 350 | patty-burger | 299 | ✓ | UPDATE | | |

---

## 9. Appetizers

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Paratha roll | — | 390 | paratha-roll | — | ✗ | ADD | | |
| Mozzarella jalapeno sticks | — | 599 | mozzarella-jalapeno-sticks | — | ✗ | ADD | | |

---

## 10. Sandwich

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Special Sandwich | — | 930 | special-sandwich | 749 | ✓ | **SUPPORTED @ 749** baseline | | |
| Baked Smoked | — | 930 | baked-smoked-sandwich | 749 | ✓ | UPDATE name+price | | |
| Sizzling | — | 930 | sizzling-sandwich | 749 | ✓ | UPDATE | | |
| Crunchy Sandwich | — | 950 | crunchy-sandwich | 799 | ✓ | UPDATE | | |

---

## 11. Wings

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Fried & Crispy | — | 650 | fried-crispy-wings | 599 | ✓ | UPDATE | | |
| Hot BBQ | — | 650 | bbq-wings | 599 | ~ | UPDATE name+price | | |
| Creamo | — | 650 | creamo-wings | 599 | ✓ | UPDATE (BFR-010 spelling) | | |
| Oven Baked | — | 600 | oven-baked-wings | 549 | ✓ | UPDATE | | |
| Flaming | — | 600 | flaming-wings | 549 | ✓ | UPDATE | | |

---

## 12. Fries

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Loaded Fries | — | 790 | loaded-fries | 650 | ✓ | UPDATE | | |
| French Fries | — | 250 | french-fries | 199 | ✓ | UPDATE | | |
| Family Fries | — | 390 | family-fries | 350 | ✓ | UPDATE | | |

---

## 13. Wraps & Rolls

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Behari Roll (4 pc) | — | 950 | behari-roll | 799 | ✓ | UPDATE | | |
| Crunch | — | 550 | crunchy-wrap | 399 | ~ | UPDATE name+price | | |
| Dynamite | — | 550 | dynamite-wrap | 399 | ~ | UPDATE name+price | | |
| Wrap it Hot Grilled Jumbo | — | 950 | wrap-it-hot-jumbo | — | ✗ | ADD | | |
| Jalapeno Kick Grilled Jumbo | — | 950 | jalapeno-kick-jumbo | — | ✗ | ADD | | |
| Wrap it Hot (Grill) | — | 650 | wrap-it-hot | — | ✗ | ADD | | |
| Jalapeno Kick (Grill) | — | 650 | jalapeno-kick-wrap | — | ✗ | ADD | | |
| Lil Crunch Wrap | — | 400 | lil-crunch-wrap | — | ✗ | ADD | | |
| Tele Pizza Special Jumbo Wrap | — | — | jumbo-wrap | 649 | ✓ | **REVIEW** BFR-004 | | |

---

## 14. Pasta

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| CRUNCHY | — | 980 | crunchy-pasta | 849 | ✓ | **SUPPORTED @ 849** baseline | | |
| SPECIAL | — | 899 | special-pasta | — | ✗ | ADD | | |
| FLAMING | — | 899 | flaming-pasta | — | ✗ | ADD | | |
| ALFREDO PASTA | — | 1100 | alfredo-pasta | — | ✗ | ADD | | |

---

## 15. Chicken & Sides

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Crispy Box | — | 790 | crispy-box | 670 | ✓ | UPDATE | | |
| Chicken Tender Strips | — | 750 | chicken-tender-strips | 590 | ✓ | UPDATE | | |
| Fried Chicken (Chest) | — | 300 | fried-chicken-chest | 250 | ✓ | UPDATE | | |
| Fried Chicken | — | 280 | fried-chicken | 220 | ✓ | UPDATE | | |
| Nuggets (10 pcs) | — | 490 | nuggets | 449 | ✓ | UPDATE | | |
| Hot Shots (10 pcs) | — | 499 | hot-shots | 449 | ✓ | UPDATE | | |

---

## 16. Dips

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| Special Sauce | — | 50 | dip-special-sauce | — | ✗ | ADD | | |
| Bone Fire | — | 50 | dip-bone-fire | — | ✗ | ADD | | |
| Dip Sauce | — | 50 | dip-sauce | — | ✗ | ADD | | |
| Garlic Ranch | — | 50 | dip-garlic-ranch | — | ✗ | ADD | | |

---

## 17. Deals

| Item | Baseline (board) | Promo evidence | GM Rs | Slug | Web Rs | Action | Owner | Sign-off |
|---|---|---:|---:|---|---:|---|---|---|
| Family Deal | **2250** | promo 2199 | 2650 | family-deal | 2250 | KEEP baseline · EC-005 | | |
| Pizza Fest | **1680** | promo 1649 | 2020 | pizza-fest | 1680 | KEEP baseline · EC-003 | | |
| Mega Offer | 3140 | — | 3799 | mega-offer | 3140 | BFR-014 | | |
| Pair Deal | **1999** | promo 2099 | 2600 | pair-deal | 1999 | KEEP baseline · EC-004 | | |
| Family Festival | 2350 | — | 2850 | family-festival | 2350 | BFR-014 + BFR-018 | | |
| Deal for 2 | 999 | — | 1240 | deal-for-two | 999 | BFR-014 + BFR-018 | | |
| Knock Out Deal | **1440** | promo 1390 | 1750 | knock-out-deal | 1440 | KEEP baseline · EC-006 | | |

---

## 18. Drinks (soft drinks & water)

| Item | Variant | GM Rs | Slug | Web Rs | Static | Action (suggested) | Owner action | Sign-off |
|---|---|---:|---|---:|---|---|---|---|
| 1.5 Liter | — | 250 | drink-1-5l | 210 | ✓ | UPDATE | | |
| 1 Liter | — | 200 | drink-1l | 170 | ✓ | UPDATE | | |
| 500 ml | — | 140 | drink-500ml | 110 | ✓ | UPDATE | | |
| 345 ml | — | 90 | drink-345ml | 70 | ✓ | UPDATE | | |
| Large Water | — | 130 | large-water | 99 | ✓ | UPDATE | | |
| Small Water | — | 70 | small-water | 50 | ✓ | UPDATE | | |

---

## 19. telebar — **PLANNED_V2 (BFR-007 APPROVED)**

**V1:** Not on public website. **V2:** Separate module; enable via configuration.

| Section | Items | V1 action | V2 status |
|---|---:|---|---|
| Welcome Drinks | 2 | Skip public | PLANNED_V2 |
| Classic Mojitos | 6 | Skip public | PLANNED_V2 |
| Smoothie | 5 | Skip public | PLANNED_V2 |
| Matcha | 6 | Skip public | PLANNED_V2 |
| Frappe | 4 | Skip public | PLANNED_V2 |
| Shakes | 6 | Skip public | PLANNED_V2 |
| Special Mocktails | 6 | Skip public | PLANNED_V2 |
| Iced Coffee | 5 | Skip public | PLANNED_V2 |
| Sweet Endings | 3 | Skip public | PLANNED_V2 |
| **Total** | **43** | **N/A V1 sign-off** | Draft in DB optional |

*Line-item detail preserved in `REAL-MENU-EXTRACTION.md` §3.19–3.27 and `PRODUCT-CATALOG.md` §15.*

---

## Category sign-off blocks

| Category | Rows complete | Menu authority | Date |
|---|---:|---|---|
| Signature Pizza | 0 / 4 | | |
| Classic Pizza | 0 / 6 | | |
| Specialty Pizza | 0 / 7 | | |
| Extra Topping | 0 / 3 | | |
| Broast | 0 / 5 | | |
| Grill + Smash + Chicken Burgers | 0 / 10 | | |
| Appetizers | 0 / 2 | | |
| Sandwich | 0 / 4 | | |
| Wings | 0 / 5 | | |
| Fries | 0 / 3 | | |
| Wraps & Rolls | 0 / 9 | | |
| Pasta | 0 / 4 | | |
| Chicken & Sides | 0 / 6 | | |
| Dips | 0 / 4 | | |
| Deals | 0 / 7 | | |
| Drinks | 0 / 6 | | |
| telebar | PLANNED_V2 — V2 cycle | N/A | BFR-007 ✓ |

---

## Workbook gate (G1)

**Pass:** Every row has Owner action ≠ blank; all `REVIEW` rows resolved via Decision Register.

**Menu authority:** _________________ **Date:** _________

---

*Propagated SKUs → [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md)*
