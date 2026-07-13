# REAL-MENU-EXTRACTION

Extraction of the real Telepizza (Royal Orchard Multan) menu from four Google Maps photo links, performed 2026-07-13. All data below is transcribed only from what is visibly printed on the menu photos. No prices or descriptions were taken from the website or repository documentation.

---

## 1. Menu Extraction Summary

- **Sources processed:** 4 of 4 Google Maps links. Each link resolves to one distinct menu photo on the Telepizza (Royal Orchard, Multan) Google Maps listing.
- **Items extracted:** 131 distinct priced entries across 24 printed sections.
- **Cross-link price conflicts:** 0 (the four photos cover non-overlapping categories; no item name+size appears with two different prices).
- **Unreadable entries:** 0 items fully unreadable; 1 entry flagged for manual review (photo caption vs printed name, see Section 6).
- **Website comparison:** Every shared item's price differs between the real menu and `apps/website/client/src/data/menu-data.ts` — the website's prices are consistently lower (older price list). The website also labels Medium pizzas as 9 inch; the real menu prints **10" Medium**. Details in Sections 7 and 8.
- **Contact printed on menu (Link 1):** 0304-1110495, Royal Orchard Multan. Slogan: "Love At First Bite".

### Spelling inconsistencies flagged (exact spellings preserved in tables)

| Printed spelling | Where | Note |
|---|---|---|
| Creamo | Link 1, Wings | Google Maps photo *caption* for the same shop spells it "Cremo Wings"; menu print is "Creamo" |
| Choclate Shake | Link 2, Shakes | Likely "Chocolate" |
| andcsauce | Link 2, Zinger Burger description | Likely "and sauce" |
| tomoyo sauce | Link 2, Patty Burger description | Likely "tomato" or "mayo" sauce |
| Bihari Kabab (pizza) vs Behari Roll (roll) | Link 3 vs Link 1 | Two romanizations used on the same brand's menus |
| Bone Fire (dip) | Link 1, Dips | Likely "Bonfire" (a Bonfire pizza/sauce exists on Link 3) |
| 1. Liter | Link 1, Drinks | Printed with a stray period; means 1 Liter |
| Lotus three milk Cake | Link 2, Sweet Endings | Likely "Lotus Tres Leches / three-milk cake"; transcribed as printed |

---

## 2. Source Register

| # | Short link | Resolved photo | Photo content | Photo size |
|---|---|---|---|---|
| 1 | https://maps.app.goo.gl/JTZ2iYpLgTHC2w4w9 | Google Maps photo `CIABIhAkOQvSA2jzTdRF-UBrUvid` | Deals, Sandwich, Wings, Fries, Behari Roll, Wrap, Crispy Box, Chicken Tender Strips, Dips, Fried's, Drinks | 1600×1023 |
| 2 | https://maps.app.goo.gl/hPKKJq6QD9TWrdev9 | Google Maps photo `CIABIhABzakiTB8hwvOL8gB9mmBP` | Burgers, Paratha roll, Mozzarella jalapeno sticks, Pasta, "telebar" beverages & desserts | 2560×1810 |
| 3 | https://maps.app.goo.gl/LiyqtGfnHbg5fVxh9 | Google Maps photo `CIABIhC-v6pMInI9JKwTVUEEVPYY` | Pizzas: Signature, Classic, specialty pizzas, Extra Topping | 1600×1023 |
| 4 | https://maps.app.goo.gl/u7F5HkrxRVJnUvcz9 | Google Maps photo `CIABIhDmLTFpMGOFgOm3fLWfqLCe` | Injected Broast, Grill Burgers, Smash Beef Burgers, Jumbo Wraps, Grill Wraps | 2560×1810 |

All four photos belong to the same Google Maps place: Telepizza, Royal Orchard, Multan (`0x393b35b86e6b36f1:0x340e96d98b9eed61`).

---

## 3. Complete Categorized Menu

All prices in Rs (PKR) exactly as printed. "—" means not shown on the menu.

### 3.1 Pizza — SIGNATURE (Link 3)

Section-level size pricing printed once for all Signature pizzas: **6" Small 620 · 10" Medium 1250 · 12" Large 1890**

| Item | Description (as printed) | Small 6" | Medium 10" | Large 12" | Source |
|---|---|---|---|---|---|
| Tele Special | Special Chicken With Special Sauce, Topped With Olive, Mushroom & Capsicum. | 620 | 1250 | 1890 | Link 3 |
| Peri Peri | Peri Peri Sauce with Tikka Chicken Topped with Kabab, Sausages & Tomato | 620 | 1250 | 1890 | Link 3 |
| Bihari Kabab | Garlic sauce with tikka chicken topped kabab slice, onion & mushroom. | 620 | 1250 | 1890 | Link 3 |
| Kababish | Special Sauce With Fajita Chicken Topped With Kabab Mushroom & Capsicum | 620 | 1250 | 1890 | Link 3 |

### 3.2 Pizza — CLASSIC (Link 3)

Section-level size pricing: **6" Small 600 · 10" Medium 1200 · 12" Large 1790**

| Item | Description (as printed) | Small 6" | Medium 10" | Large 12" | Source |
|---|---|---|---|---|---|
| Tikka | Tikka Sauce With Tikka Chicken Topped With Olive & Onion | 600 | 1200 | 1790 | Link 3 |
| Bonfire | Bonfire Sauce With Fajita Chicken Topped With Jalapeno, Mushroom & Tomato | 600 | 1200 | 1790 | Link 3 |
| Chicken Supreme | Original Red Base Sauce Three Types of Chicken Topped with Olive, Mushroom Jalapeno & Capsicum | 600 | 1200 | 1790 | Link 3 |
| Real Fajita | Fajita Sauce With Fajita Chicken Topped With Onion & Capsicum | 600 | 1200 | 1790 | Link 3 |
| Mexicana | Special Sauce With Smoked Chicken Topped With Sausages, Black Olive, Tomato & Capsicum | 600 | 1200 | 1790 | Link 3 |
| Cheese Lover | Original Red Base Sauce Loaded With Mozzarella Cheese | 600 | 1200 | 1790 | Link 3 |

### 3.3 Pizza — Specialty (Link 3; Maps tab labels this photo section "SPECIALS")

| Item | Description (as printed) | Variant | Price | Source |
|---|---|---|---|---|
| Chicago Extreme | Double Layers Extreme Pizza with our 2 Premium Sauces & Lots of Cheese & Chicken | M | 1470 | Link 3 |
| Chicago Extreme | 〃 | L | 2150 | Link 3 |
| Crown Crust | Any Flavour Of Your Choice With Chicken Stuffing on The Edges & Tele Pizza Signature Sauce. | M | 1470 | Link 3 |
| Crown Crust | 〃 | L | 2099 | Link 3 |
| Malai Boti | Malai boti sauce topped with malai boti chicken and cheese with olives,tomato and capsicum | S | 620 | Link 3 |
| Malai Boti | 〃 | M | 1270 | Link 3 |
| Malai Boti | 〃 | L | 1890 | Link 3 |
| Stuffed Crust | Any flavour of your choice with kabab stuffing on the edges. | — | 2050 | Link 3 |
| Tele Extreme Pizza | 2 of our premium sauces with loaded chicken & lots of cheese. | — | 1950 | Link 3 |
| 16" Incher | (no description printed) | 16" | 2800 | Link 3 |

### 3.4 Extra Topping (Link 3)

| Item | S | M | L | Source |
|---|---|---|---|---|
| Chicken | 50 | 100 | 150 | Link 3 |
| Cheese | 50 | 100 | 150 | Link 3 |
| Cheese Slice | 60 | — | — | Link 3 |

### 3.5 Injected Broast (Link 4)

| Item | Deal contents (as printed) | Price | Source |
|---|---|---|---|
| Quarter Broast | 1 Leg & 1 Thigh OR 1 Wing & 1 Chest, 1 Bun, Fries, (1 Dip) Garlic Dip OR Mustard Dip | 750 | Link 4 |
| Half Broast | 1 Leg, 1 Thigh, 1 wing, 1 chest, 1 Bun, Fries, (3 Dips) 1 Garlic Dip, 1 Mustard Dip & 1 Tangy Dip | 1390 | Link 4 |
| Full Broast | 2 Legs, 2 Thighs, 2 wings, 2 chests, 2 Buns, Fries, (6 Dips) 2 Garlic Dips, 2 Mustard Dips & 2 Tangy Dips | 2590 | Link 4 |
| Extra Dips — Garlic Sauce | — | 60 | Link 4 |
| Extra Dips — Mustard Sauce | — | 60 | Link 4 |

### 3.6 Grill Burgers (Link 4; marked "NEW")

| Item | Description (as printed) | Price | Source |
|---|---|---|---|
| Smokehouse Burger | Flame-grilled chicken fillet, fresh lettuce, a slice of cheese, crispy shallots, and two secret sauces | 650 | Link 4 |
| Grill Boss Burger | Two charcoal-grilled chicken fillets, fresh lettuce, one slice of cheese, crispy shallots, and two secret sauces. | 890 | Link 4 |
| Chipotle Fire Burger | Two double flame-grilled chicken fillets, fresh lettuce, one slice of cheese, crispy shallots, one chipotle sauce, and one secret sauce | 890 | Link 4 |

### 3.7 Smash Beef Burgers (Link 4; marked "NEW")

| Item | Description (as printed) | Price | Source |
|---|---|---|---|
| Classic Beef Burger | One juicy beef patty, a slice of cheese, fresh lettuce, caramelised onions, and two secret sauces | 690 | Link 4 |
| Signature Beef Burger | Two juicy beef patties, two cheese slices, fresh lettuce, caramelised onions, and two secret sauces | 1090 | Link 4 |
| Supreme Beef Burger | Two juicy beef patties, two cheese slices, fresh lettuce, caramelised onions, jalapeños, & two secret sauces | 1090 | Link 4 |

### 3.8 Chicken Burgers (Link 2; cards printed without a section header)

| Item | Description (as printed) | Price | Source |
|---|---|---|---|
| Classic Crunch Burger | Tender chicken chest fillet, crispy-coated with spices, served with iceberg and our signature sauce | 450 | Link 2 |
| Big Boss Burger | Big and juicy crispy chicken chest fillet with fresh iceberg, signature sauce, and bold spices. | 690 | Link 2 |
| Zinger Burger | Chicken thigh coated with fine flour, mixed with continental spices, iceberg, andcsauce | 550 | Link 2 |
| Patty Burger | 1 chicken patty mixed with continental spices, iceberg lettuce and tomoyo sauce | 350 | Link 2 |

### 3.9 Appetizers / Snacks (Link 2)

| Item | Description (as printed) | Price | Source |
|---|---|---|---|
| Paratha roll | Soft, flaky paratha filled with tender chicken, caramelised onions, and a rich, tangy sauce | 390 | Link 2 |
| Mozzarella jalapeno sticks | 4 Crispy golden sticks made with chicken, filled with mozzarella cheese and spicy jalapeños, served with a rich dip | 599 | Link 2 |

### 3.10 Sandwich (Link 1; header note: "served with dip sauce & fries")

| Item | Price | Source |
|---|---|---|
| Special Sandwich | 930 | Link 1 |
| Baked Smoked | 930 | Link 1 |
| Sizzling | 930 | Link 1 |
| Crunchy Sandwich | 950 | Link 1 |

### 3.11 Wings (Link 1)

| Item | Price | Source |
|---|---|---|
| Fried & Crispy | 650 | Link 1 |
| Hot BBQ | 650 | Link 1 |
| Creamo | 650 | Link 1 |
| Oven Baked | 600 | Link 1 |
| Flaming | 600 | Link 1 |

### 3.12 Fries (Link 1)

| Item | Price | Source |
|---|---|---|
| Loaded Fries | 790 | Link 1 |
| French Fries | 250 | Link 1 |
| Family Fries | 390 | Link 1 |

### 3.13 Wraps & Rolls

| Item | Category header on flyer | Description / contents (as printed) | Price | Source |
|---|---|---|---|---|
| Behari Roll (4 Piece) | Behari Roll | special chicken with special sauce, wrapped in a crispy tortilla baked with lots of cheese, mushroom & olives on top served with dip sauce & fries | 950 | Link 1 |
| Crunch | WRAP | — | 550 | Link 1 |
| Dynamite | WRAP | — | 550 | Link 1 |
| Wrap it Hot Grilled Jumbo | JUMBO WRAPS | — | 950 | Link 4 |
| Jalapeno Kick Grilled | JUMBO WRAPS | — | 950 | Link 4 |
| Wrap it Hot | GRILL WRAPS | Grilled chicken wrapped in a warm tortilla with fresh vegetables, crispy fries, jalapeños, and our signature sauce. | 650 | Link 4 |
| Jalapeno Kick | GRILL WRAPS | Grilled chicken wrapped in a warm tortilla with fresh vegetables, crispy fries, jalapeños, and chipotle sauce. | 650 | Link 4 |
| Lil Crunch Wrap | (standalone card, marked NEW) | — | 400 | Link 4 |

### 3.14 Pasta (Link 2)

| Item | Price | Source |
|---|---|---|
| CRUNCHY | 980 | Link 2 |
| SPECIAL | 899 | Link 2 |
| FLAMING | 899 | Link 2 |
| ALFREDO PASTA (marked NEW) | 1100 | Link 2 |

### 3.15 Chicken & Sides (Link 1)

| Item | Section header | Description / contents (as printed) | Price | Source |
|---|---|---|---|---|
| Crispy Box | Crispy Box | 3 Pcs Crispy Chicken, 1 Garlic Ranch (1 Chest, 1 Drum, 1 Wing) | 790 | Link 1 |
| Chicken Tender Strips | Chicken Tender Strips | 5 Pcs of juicy chicken tender strips with blend of spices and served with secret delicious dip sauce | 750 | Link 1 |
| Fried Chicken(Chest) | Fried's | — | 300 | Link 1 |
| Fried Chicken | Fried's | — | 280 | Link 1 |
| Nuggets (10 Pieces) | Fried's | — | 490 | Link 1 |
| Hot Shots(10 Pieces) | Fried's | — | 499 | Link 1 |

### 3.16 Dips (Link 1)

Printed as one price for the section: **Rs 50 each**

| Item | Price | Source |
|---|---|---|
| Special Sauce | 50 | Link 1 |
| Bone Fire | 50 | Link 1 |
| Dip Sauce | 50 | Link 1 |
| Garlic Ranch | 50 | Link 1 |

### 3.17 Deals (Link 1)

| Item | Deal contents (as printed) | Price | Source |
|---|---|---|---|
| Family Deal | 1 Large Pizza, 10 Pcs Wings, 1.5 Liter Drink | 2650 | Link 1 |
| Pizza Fest | 1 Large Pizza, 1.5 Liter Drink | 2020 | Link 1 |
| Mega Offer | 2 Large Pizza, 1.5 Liter Drink | 3799 | Link 1 |
| Pair Deal | 2 Medium Pizza, 1.5 Liter Drink | 2600 | Link 1 |
| Family Festival | 5 Zinger Burger, 1.5 Drink | 2850 | Link 1 |
| Deal for 2 | 2 Zinger Burger, 2 Drink 345ml | 1240 | Link 1 |
| Knock Out Deal | 3 Zinger Burger, 1 Liter Drink | 1750 | Link 1 |

### 3.18 Drinks — soft drinks & water (Link 1)

| Item | Price | Source |
|---|---|---|
| 1.5 Liter | 250 | Link 1 |
| 1. Liter | 200 | Link 1 |
| 500 ml | 140 | Link 1 |
| 345 ml | 90 | Link 1 |
| Large Water | 130 | Link 1 |
| Small Water | 70 | Link 1 |

Coca-Cola and Sprite logos are printed under this section (no prices attached to the logos).

### 3.19 telebar — Welcome Drinks (Link 2)

| Item | Price | Source |
|---|---|---|
| Mint Margarita | 350 | Link 2 |
| Fresh Lime | 300 | Link 2 |

### 3.20 telebar — Classic Mojitos (Link 2)

| Item | Price | Source |
|---|---|---|
| Passion Fruit | 520 | Link 2 |
| Kiwi Coconut | 520 | Link 2 |
| Strawberry | 520 | Link 2 |
| Tropical Blue | 440 | Link 2 |
| Mango Coconut | 520 | Link 2 |
| Classic Mojito | 350 | Link 2 |

### 3.21 telebar — Smoothie (Link 2)

| Item | Price | Source |
|---|---|---|
| Kiwi Smoothie | 699 | Link 2 |
| Passion fruit | 699 | Link 2 |
| Mango Banana | 599 | Link 2 |
| Tropical Smoothie | 650 | Link 2 |
| Mango Smoothie | 599 | Link 2 |

### 3.22 telebar — Matcha (Link 2)

| Item | Price | Source |
|---|---|---|
| Telespecial | 799 | Link 2 |
| BlueBerry | 899 | Link 2 |
| Rose | 850 | Link 2 |
| Coconut | 799 | Link 2 |
| Strawberry | 799 | Link 2 |
| Mango | 799 | Link 2 |

### 3.23 telebar — Frappe (Link 2)

| Item | Price | Source |
|---|---|---|
| Chocolate | 590 | Link 2 |
| Cookies & Cream | 590 | Link 2 |
| Caramel | 650 | Link 2 |
| Vanilla | 650 | Link 2 |

### 3.24 telebar — Shakes (Link 2)

| Item | Price | Source |
|---|---|---|
| Lotus Shake | 699 | Link 2 |
| Salted Caramel | 650 | Link 2 |
| Oreo Shake | 650 | Link 2 |
| Strawberry | 650 | Link 2 |
| Classic Shake | 499 | Link 2 |
| Choclate Shake | 550 | Link 2 |

### 3.25 telebar — Special Mocktails (Link 2)

| Item | Price | Source |
|---|---|---|
| Pina Colada | 550 | Link 2 |
| Sunset Paradise | 570 | Link 2 |
| Peach Mango | 399 | Link 2 |
| Peach Ice Tea | 450 | Link 2 |
| Mango Lime | 599 | Link 2 |
| Strawberry Daiquiri | 550 | Link 2 |

### 3.26 telebar — Iced Coffee (Link 2)

| Item | Price | Source |
|---|---|---|
| Latte Over Iced | 450 | Link 2 |
| Iced Caramel Latte | 599 | Link 2 |
| Iced Mocha | 599 | Link 2 |
| Iced coffee | 450 | Link 2 |
| Over Ice Spanish Latte | 450 | Link 2 |

### 3.27 telebar — Sweet Endings / Desserts (Link 2)

| Item | Note (as printed) | Price | Source |
|---|---|---|---|
| Molten Lava Cake | ICECREAM SCOOP RS. 99 | 399 | Link 2 |
| Lotus three milk Cake | — | 580 | Link 2 |
| Chocolate Brownie | ICECREAM SCOOP RS. 99 | 350 | Link 2 |

Footer printed on Link 2: "Now delivering drinks & desserts to your doorstep!"

---

## 4. Price-Conflict Table (across the four links)

No item appears with two different printed prices across the four photos — the photos cover disjoint categories.

| Item | Link A price | Link B price | Status |
|---|---|---|---|
| *(none found)* | — | — | — |

Related observation (not a conflict): "Zinger Burger" is priced only on Link 2 (Rs 550); Link 1 references Zinger Burgers inside deal contents without a standalone price.

## 5. Duplicate-Item Table

No item is printed with name + size + price in more than one link, so no merges were needed.

| Item | Links | Merge decision |
|---|---|---|
| Zinger Burger | Link 2 (priced 550); Link 1 (deal contents only, unpriced) | Kept single entry from Link 2; deals kept separately |
| Wrap it Hot / Jalapeno Kick | Link 4 only, but printed twice (JUMBO WRAPS grilled-jumbo variants at 950; GRILL WRAPS regular at 650) | Kept as four distinct entries — the flyer prices them as separate products |

## 6. Unreadable-Item Table

| Entry | Issue | Status |
|---|---|---|
| Wings "Creamo" (Link 1) | Menu print reads "Creamo"; the Google Maps gallery caption for the shop's photo of the same product reads "Cremo Wings" | Needs manual review (spelling only — price Rs 650 is clearly printed) |

Everything else was legible at full photo resolution. No prices were partially visible or guessed.

## 7. Website Items NOT Found in the Real Menu

Compared against `apps/website/client/src/data/menu-data.ts` (comparison only — no code was modified).

| Website item (id) | Website price | Finding |
|---|---|---|
| Behari Kabab Pizza (`behari-kabab-pizza`), "Starting Price" 549 | 549 | Not printed anywhere on the four photos. "Bihari Kabab" exists only as a Signature pizza (620/1250/1890). Owner confirmation needed |
| Tele Pizza Special Jumbo Wrap (`jumbo-wrap`) | 649 | No such item. JUMBO WRAPS on Link 4 are "Wrap it Hot Grilled Jumbo" and "Jalapeno Kick Grilled", both Rs 950 |
| BBQ Wings (`bbq-wings`) | 599 | Real menu name is "Hot BBQ" (Rs 650) — name mismatch, likely same product |
| Crunchy Wrap (`crunchy-wrap`) / Dynamite Wrap (`dynamite-wrap`) | 399 / 399 | Real menu prints them as "Crunch" and "Dynamite" under WRAP, both Rs 550 — name and price mismatch |

Additionally, **every single shared item has a stale price on the website.** Full price deltas (website → real menu):

| Item | Website | Real menu | Source |
|---|---|---|---|
| Signature pizzas S/M/L | 499 / 950 / 1570 | 620 / 1250 / 1890 | Link 3 |
| Classic pizzas S/M/L | 470 / 890 / 1470 | 600 / 1200 / 1790 | Link 3 |
| Medium size label | "9 inch Medium" | **10" MEDIUM** | Link 3 |
| Crown Crust M/L | 1199 / 1799 | 1470 / 2099 | Link 3 |
| Chicago Extreme M/L | 1199 / 1899 | 1470 / 2150 | Link 3 |
| Stuffed Crust | 1749 | 2050 | Link 3 |
| Tele Extreme Pizza | 1699 | 1950 | Link 3 |
| 16" Incher | 2399 | 2800 | Link 3 |
| Patty Burger | 299 | 350 | Link 2 |
| Crunchy Sandwich | 799 | 950 | Link 1 |
| Special / Baked Smoked / Sizzling Sandwich | 749 each | 930 each | Link 1 |
| Fried & Crispy / Hot BBQ / Creamo wings | 599 each | 650 each | Link 1 |
| Oven Baked / Flaming wings | 549 each | 600 each | Link 1 |
| Loaded Fries / French Fries / Family Fries | 650 / 199 / 350 | 790 / 250 / 390 | Link 1 |
| Wrap Crunch / Dynamite | 399 / 399 | 550 / 550 | Link 1 |
| Behari Roll | 799 | 950 | Link 1 |
| Crunchy Pasta | 849 | 980 | Link 2 |
| Chicken Tender Strips | 590 | 750 | Link 1 |
| Crispy Box | 670 | 790 | Link 1 |
| Fried Chicken (Chest) / Fried Chicken | 250 / 220 | 300 / 280 | Link 1 |
| Nuggets / Hot Shots (10 pcs) | 449 / 449 | 490 / 499 | Link 1 |
| Drinks 1.5L / 1L / 500ml / 345ml | 210 / 170 / 110 / 70 | 250 / 200 / 140 / 90 | Link 1 |
| Large / Small Water | 99 / 50 | 130 / 70 | Link 1 |
| Family Deal | 2250 | 2650 | Link 1 |
| Pizza Fest | 1680 | 2020 | Link 1 |
| Mega Offer | 3140 | 3799 | Link 1 |
| Pair Deal | 1999 | 2600 | Link 1 |
| Family Festival | 2350 | 2850 | Link 1 |
| Deal for 2 | 999 | 1240 | Link 1 |
| Knock Out Deal | 1440 | 1750 | Link 1 |

## 8. Real Menu Items MISSING From the Website

| Category | Missing items (real price) | Source |
|---|---|---|
| Specialty Pizza | Malai Boti (S 620 / M 1270 / L 1890) | Link 3 |
| Extra Topping | Chicken 50/100/150 · Cheese 50/100/150 · Cheese Slice 60 | Link 3 |
| Injected Broast | Quarter 750 · Half 1390 · Full 2590 · Extra Dips Garlic 60 / Mustard 60 | Link 4 |
| Grill Burgers | Smokehouse 650 · Grill Boss 890 · Chipotle Fire 890 | Link 4 |
| Smash Beef Burgers | Classic 690 · Signature 1090 · Supreme 1090 | Link 4 |
| Chicken Burgers | Classic Crunch 450 · Big Boss 690 · Zinger 550 | Link 2 |
| Appetizers | Paratha roll 390 · Mozzarella jalapeno sticks 599 | Link 2 |
| Pasta | Special 899 · Flaming 899 · Alfredo 1100 | Link 2 |
| Wraps | Wrap it Hot Grilled Jumbo 950 · Jalapeno Kick Grilled 950 · Wrap it Hot 650 · Jalapeno Kick 650 · Lil Crunch Wrap 400 | Link 4 |
| Dips | Special Sauce 50 · Bone Fire 50 · Dip Sauce 50 · Garlic Ranch 50 | Link 1 |
| Welcome Drinks | Mint Margarita 350 · Fresh Lime 300 | Link 2 |
| Classic Mojitos | Passion Fruit 520 · Kiwi Coconut 520 · Strawberry 520 · Tropical Blue 440 · Mango Coconut 520 · Classic Mojito 350 | Link 2 |
| Smoothies | Kiwi 699 · Passion fruit 699 · Mango Banana 599 · Tropical 650 · Mango 599 | Link 2 |
| Matcha | Telespecial 799 · BlueBerry 899 · Rose 850 · Coconut 799 · Strawberry 799 · Mango 799 | Link 2 |
| Frappe | Chocolate 590 · Cookies & Cream 590 · Caramel 650 · Vanilla 650 | Link 2 |
| Shakes | Lotus 699 · Salted Caramel 650 · Oreo 650 · Strawberry 650 · Classic 499 · Choclate 550 | Link 2 |
| Special Mocktails | Pina Colada 550 · Sunset Paradise 570 · Peach Mango 399 · Peach Ice Tea 450 · Mango Lime 599 · Strawberry Daiquiri 550 | Link 2 |
| Iced Coffee | Latte Over Iced 450 · Iced Caramel Latte 599 · Iced Mocha 599 · Iced coffee 450 · Over Ice Spanish Latte 450 | Link 2 |
| Desserts | Molten Lava Cake 399 (+ ice cream scoop 99) · Lotus three milk Cake 580 · Chocolate Brownie 350 (+ ice cream scoop 99) | Link 2 |

The website's current data covers roughly the Link 1 + Link 3 menu set (at older prices) and misses the entire Link 2 (burgers/pasta/telebar) and Link 4 (broast/grill burgers/wraps) menus.
