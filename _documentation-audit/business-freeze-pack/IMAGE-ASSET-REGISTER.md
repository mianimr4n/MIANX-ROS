# Image Asset Register

**Pack:** Telepizza V1 Business Freeze Pack  
**Date:** 2026-07-14  
**Standard:** Every **public** SKU requires hero (detail), card (grid), thumbnail (cart/search).

---

## Asset standards (target)

| Type | Use | Target size | Format | Naming |
|---|---|---:|---|---|
| Hero | Customizer / detail | 1200×800 | WebP + JPG fallback | `{slug}-hero.webp` |
| Card | Menu grid | 600×400 | WebP | `{slug}-card.webp` |
| Thumbnail | Cart / search | 200×200 | WebP | `{slug}-thumb.webp` |
| Category | Section header | 1600×400 | WebP | `cat-{slug}-hero.webp` |

**Current state:** 13 shared JPG placeholders for 58 SKUs — **not ERP-grade**.

---

## Shared placeholder inventory (current)

| File | Used by (count) | Quality |
|---|---:|---|
| `/images/menu-pizza.jpg` | 16 pizza items | 🔴 Generic |
| `/images/menu-burger.jpg` | 1 burger | 🔴 Generic |
| `/images/sides-platter.jpg` | 28 items | 🔴 Generic |
| `/images/pasta-dish.jpg` | 1 pasta | 🔴 Generic |
| `/images/desserts-drinks.jpg` | 6 drinks | 🔴 Generic |
| `/images/promos/family-deal.jpg` | 1 deal | 🟡 Specific |
| `/images/promos/pizza-fest.jpg` | 1 deal | 🟡 Specific |
| `/images/promos/pair-deal.jpg` | 1 deal | 🟡 Specific |
| `/images/promos/knock-out-deal.jpg` | 1 deal | 🟡 Specific |
| `/images/deals-section.jpg` | 3 deals | 🟡 Shared |
| `/images/hero-banner.jpg` | Home | 🟡 Marketing |
| `/images/telepizza-logo.png` | Brand | 🟢 Logo |
| `/images/app-mockup-bg.jpg` | Marketing | 🟡 |

---

## Current catalog — per SKU register (58 items)

Legend: `✅` final · `🟡` placeholder · `❌` missing · `➕` ADD when SKU created

| Slug | Name | Hero | Card | Thumb | Alt text | Owner OK |
|---|---|---|---|---|---|---|
| tele-special | Tele Special | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| peri-peri | Peri Peri | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| bihari-kabab | Bihari Kabab | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| kababish | Kababish | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| tikka | Tikka | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| bonfire | Bonfire | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| chicken-supreme | Chicken Supreme | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| real-fajita | Real Fajita | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| mexicana | Mexicana | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| cheese-lover | Cheese Lover | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| behari-kabab-pizza | Behari Kabab Pizza | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| crown-crust | Crown Crust | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| chicago-extreme | Chicago Extreme | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| stuffed-crust | Stuffed Crust | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| tele-extreme | Tele Extreme Pizza | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| sixteen-inch-incher | 16" Incher | 🟡 pizza | 🟡 | ❌ | ❌ | ⬜ |
| patty-burger | Patty Burger | 🟡 burger | 🟡 | ❌ | ❌ | ⬜ |
| crunchy-sandwich | Crunchy Sandwich | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| special-sandwich | Special Sandwich | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| baked-smoked-sandwich | Baked Smoked Sandwich | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| sizzling-sandwich | Sizzling Sandwich | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| fried-crispy-wings | Fried & Crispy Wings | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| bbq-wings | BBQ Wings | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| creamo-wings | Creamo Wings | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| oven-baked-wings | Oven Baked Wings | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| flaming-wings | Flaming Wings | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| loaded-fries | Loaded Fries | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| french-fries | French Fries | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| family-fries | Family Fries | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| jumbo-wrap | Tele Pizza Special Jumbo Wrap | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| crunchy-wrap | Crunchy Wrap | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| dynamite-wrap | Dynamite Wrap | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| behari-roll | Behari Roll | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| crunchy-pasta | Crunchy Pasta | 🟡 pasta | 🟡 | ❌ | ❌ | ⬜ |
| quarter-broast | Quarter Broast | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| half-broast | Half Broast | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| full-broast | Full Broast | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| broast-garlic-dip | Extra Garlic Dip | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| broast-mustard-dip | Extra Mustard Dip | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| chicken-tender-strips | Chicken Tender Strips | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| crispy-box | Crispy Box | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| fried-chicken-chest | Fried Chicken — Chest | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| fried-chicken | Fried Chicken | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| nuggets | Nuggets | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| hot-shots | Hot Shots | 🟡 sides | 🟡 | ❌ | ❌ | ⬜ |
| drink-1-5l | 1.5 Liter Drink | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| drink-1l | 1 Liter Drink | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| drink-500ml | 500 ml Drink | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| drink-345ml | 345 ml Drink | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| large-water | Large Water | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| small-water | Small Water | 🟡 drinks | 🟡 | ❌ | ❌ | ⬜ |
| family-deal | Family Deal | 🟡 promo | 🟡 | ❌ | ❌ | ⬜ |
| pizza-fest | Pizza Fest | 🟡 promo | 🟡 | ❌ | ❌ | ⬜ |
| mega-offer | Mega Offer | 🟡 deals | 🟡 | ❌ | ❌ | ⬜ |
| pair-deal | Pair Deal | 🟡 promo | 🟡 | ❌ | ❌ | ⬜ |
| family-festival | Family Festival | 🟡 deals | 🟡 | ❌ | ❌ | ⬜ |
| deal-for-two | Deal for 2 | 🟡 deals | 🟡 | ❌ | ❌ | ⬜ |
| knock-out-deal | Knock Out Deal | 🟡 promo | 🟡 | ❌ | ❌ | ⬜ |

---

## Pending SKUs (ADD — no assets yet)

When workbook marks **ADD**, create row here before catalog LOCKED.

| Planned slug | GM name | Hero | Card | Thumb | Priority |
|---|---|---|---|---|---|
| malai-boti | Malai Boti Pizza | ❌ | ❌ | ❌ | High |
| zinger-burger | Zinger Burger | ❌ | ❌ | ❌ | High (BFR-002) |
| smokehouse-burger | Smokehouse Burger | ❌ | ❌ | ❌ | High |
| *(+70 items)* | See workbook | ❌ | ❌ | ❌ | Per category |

---

## Category header images

| Category | Image | Status |
|---|---|---|
| Signature Pizzas | — | ❌ |
| Classic Pizzas | — | ❌ |
| Specialty Pizzas | — | ❌ |
| Burgers | — | ❌ |
| Broast | — | ❌ |
| Sandwiches | — | ❌ |
| Wings | — | ❌ |
| Fries | — | ❌ |
| Wraps & Rolls | — | ❌ |
| Pasta | — | ❌ |
| Chicken & Sides | — | ❌ |
| Drinks | — | ❌ |
| Deals | — | ❌ |
| Dips | — | ❌ N/A until category exists |
| Telebar | — | PLANNED_V2 (V2 assets) |

---

## Image gate (G4)

| Metric | Current | Target |
|---|---:|---:|
| Public SKUs with ✅ hero | 0 | 100% |
| Public SKUs with ✅ card | 0 | 100% |
| Public SKUs with ✅ thumb | 0 | 100% |
| Category headers | 0 | All V1 categories |
| Broken images on production | Unknown | 0 |

**Creative lead:** _________________ **Date:** _________

---

*Update this register when [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) adds SKUs.*
