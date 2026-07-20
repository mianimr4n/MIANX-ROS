# Brand, Menu & Database Verification Report

**Agent:** Telepizza Brand, Menu, and Database Verification Agent (Mianx.ai governance)  
**Branch inspected:** `audit/brand-menu-database-verification` (from `main` @ `6a4eff8`)  
**Stage:** 1 — Inspection only (no code, migration, or production data changes)  
**Date:** 2026-07-14  
**Production Supabase project:** `pyeowxvacgypohrbvgee` (read-only anon queries)

---

## Executive summary

| Area | Status | Severity |
|---|---|---|
| Branding consistency | Mostly aligned; several **unsupported marketing claims** on About/Home | Medium |
| Static fallback menu (`menu-data.ts`) | **58 items / 13 categories / 34 variants** — internally consistent | OK |
| Supabase production catalog | **Same 58 slugs** as static fallback; counts match owner-confirmed facts | OK (incomplete vs full evidence) |
| Website Supabase integration | **Broken** — queries non-existent columns/view; always activates static fallback when env vars set | **Critical** |
| Evidence completeness | `REAL-MENU-EXTRACTION.md` documents **131 priced entries / 24 sections** — **~73 items not in DB or website** | High |
| Price accuracy vs latest evidence | Static/DB prices match **older** evidence (`REAL_MENU_EXTRACTED.md`); **conflict** with newer Google Maps extraction | High |

**Confirmed runtime defects (production, 2026-07-14):**

1. `column menu_categories.display_order does not exist` — schema uses `sort_order`.
2. `Could not find the table 'public.menu_items_with_pricing' in the schema cache` — view not deployed.
3. Website `menu-catalog.ts` uses **both** defective identifiers → Supabase fetch **always fails** → static fallback banner shown.

**Slug parity:** Production and static fallback share **identical 58 slugs** (verified by read-only REST query).

---

## A. Branding inventory

### Official identity

| Field | Value in codebase / site | Evidence source | Confidence | Conflicts |
|---|---|---|---|---|
| Business name | **Telepizza** / **Telepizza Pakistan** | Navbar, Footer, `index.css` | VERIFIED | Global Telepizza (Spain) history on About page — separate corporate entity |
| Legal entity on site | Not stated | — | UNVERIFIED | — |
| Tagline (printed menu) | **"Love At First Bite"** | `REAL-MENU-EXTRACTION.md` §1 (Link 1 menu photo) | VERIFIED | Not used on website |
| Tagline (website) | "Pakistan's boldest pizza experience" | Footer, About hero | UNVERIFIED marketing copy | No menu/photo evidence |

### Logo files

| File | Location | Used on site |
|---|---|---|
| `telepizza-logo.png` | `apps/website/client/public/images/` | Navbar, Footer (`handleLogoError` SVG fallback) |
| `Logo.jpg` | Repository root | Not referenced in website build |
| Inline SVG fallbacks | `apps/website/client/src/lib/image-fallback.ts` | Broken image recovery |

**Note:** `assets/brand/` and `assets/menu/` referenced in audit scope — **not present** on current `main` branch tree. Website uses `client/public/images/` instead.

### Colors (official palette in `index.css`)

| Token | Hex | Role |
|---|---|---|
| `--color-brand-red` | `#E31E24` | Primary |
| `--color-brand-red-dark` | `#B5121B` | Primary dark |
| `--color-brand-red-light` | `#F04B50` | Primary light |
| `--color-brand-gold` | `#F5B800` | Secondary accent |
| `--color-brand-charcoal` | `#1F1F1F` | Text / dark surfaces |
| `--color-brand-cream` | `#FFF7F3` | Background |
| `--color-brand-orange` | `#FF6B35` | Accent |

Navbar comment references `#D22630` (older Flame & Crust note) — **conflicts** with official `#E31E24` in theme tokens. Site renders using CSS variables (`brand-red`).

### Typography

| Role | Font | Source |
|---|---|---|
| Display | Poppins | `index.css` `--font-display` |
| Body | DM Sans | `--font-body` |
| Accent / UI | Space Grotesk | `--font-accent` |

### Branches

| Branch | Status | Phone | Address | Hours (website) | DB `branches.opening_hours` |
|---|---|---|---|---|---|
| Royal Orchard | operating | **0304-1110495** | Royal Orchard Main Business Plaza, Musa Wala, Multan, 60000 | **10:00 AM – 2:30 AM** | `{"daily":"10:00 AM - 2:30 AM"}` |
| Northern Bypass Road | coming-soon | "Coming Soon" | Northern Bypass Road, Multan | Coming Soon | `{"daily":"Coming Soon"}` |

**Phone evidence:** `0304-1110495` printed on menu Link 1 (`REAL-MENU-EXTRACTION.md`) — **VERIFIED**.

**Hours evidence:** Website/DB hours **not printed** on extracted menu photos — **UNVERIFIED** against photo evidence (may be correct from operations; needs owner confirmation).

### Social links (Footer)

| Platform | URL |
|---|---|
| Facebook | `https://www.facebook.com/telepizza.pk/` |
| Instagram | `https://www.instagram.com/telepizzapakistan/` |
| TikTok | `https://www.tiktok.com/@telepizzapakistan` |

### Unsupported or conflicting statements

| Claim | Location | Issue | Decision |
|---|---|---|---|
| Google Rating **4.3**, **642+ Reviews** | `About.tsx` stats | No dated evidence in repo | NEEDS_OWNER_CONFIRMATION |
| **10K+** Happy Customers / month | `About.tsx` | No evidence | NEEDS_OWNER_CONFIRMATION |
| **Late Night Delivery Every Day** until 2:30 AM | `About.tsx` | Hours not on menu photos | NEEDS_OWNER_CONFIRMATION |
| "fast delivery service" | `About.tsx` story | No time SLA evidence | UNVERIFIED |
| "Track your order in real-time" (app teaser) | `Home.tsx` | Apps marked Coming Soon; tracking page uses optional API | MARK_COMING_SOON |
| "No fake deals or invented savings" | `Home.tsx` Why Telepizza | Deals reference **Zinger Burger** items not in public catalog | CONFLICTED |
| Mianx.ai / AI ecosystem powered | `About.tsx` | Platform roadmap claim | KEEP (platform; not customer menu claim) |
| Madrid / Food Delivery Brands global history | `About.tsx` | Corporate history | KEEP with caveat (global brand, not PK menu) |
| Opening date Oct 13, 2022 | `About.tsx` | Not in menu evidence | NEEDS_OWNER_CONFIRMATION |
| `behari-kabab-pizza` "Starting Price" Rs 549 | static + DB | **Not on** Google Maps menu photos (`REAL-MENU-EXTRACTION.md` §7) | NEEDS_OWNER_CONFIRMATION |
| Deal bundles naming **Zinger Burger** | static + DB deals | Zinger **not** a standalone catalog item; price ambiguous (450/440/550 across sources) | NEEDS_OWNER_CONFIRMATION |

**No evidence found** in website for: free delivery, 30-minute delivery, or fabricated discount coupons (`VERIFIED_COUPON_CODES` is empty — correct).

---

## B. Evidence menu inventory

### Evidence source hierarchy

| Source | Date | Items | Price era | Notes |
|---|---|---:|---|---|
| `REAL-MENU-EXTRACTION.md` | 2026-07-13 | **131** priced entries, **24** sections | **Current printed menu** (Google Maps photos) | Primary for completeness |
| `_documentation-audit/evidence/REAL_MENU_EXTRACTED.md` | 2026-07-12 | ~50 core + promos | **Older** — matches `menu-data.ts` | Secondary; conflicts with Google Maps |
| `menu-data.ts` / Supabase production | 2026-07-14 | **58** items | Aligns with REAL_MENU_EXTRACTED | Subset of full restaurant menu |

### B.1 — Current catalog (58 items): static ≡ production ≡ website fallback

All 58 slugs are **identical** in static fallback and Supabase production. When Supabase env vars are set, website **still renders these 58** via fallback (not live query).

**Category distribution (static / production):**

| Category | Items |
|---|---:|
| Signature Pizzas | 4 |
| Classic Pizzas | 6 |
| Specialty Pizzas | 6 |
| Burgers | **1** |
| Broast | 5 |
| Sandwiches | 4 |
| Wings | 5 |
| Fries | 3 |
| Wraps & Rolls | 4 |
| Pasta | **1** |
| Chicken & Sides | 6 |
| Drinks | 6 |
| Deals | 7 |

#### Representative catalog rows (full 58-item matrix follows same pattern)

| Category | Item | Variant | Price (static/DB) | Evidence (latest GM) | Confidence | Static | Supabase | Website render |
|---|---|---|---:|---|---|---|---|---|
| Signature Pizzas | Tele Special | 6" / 9" / 12" | 499 / 950 / 1570 | 620 / 1250 / 1890 | **CONFLICTED** | ✓ | ✓ | ✓ (fallback) |
| Signature Pizzas | Peri Peri | variants | same as above | same | CONFLICTED | ✓ | ✓ | ✓ |
| Classic Pizzas | Tikka | variants | 470 / 890 / 1470 | 600 / 1200 / 1790 | CONFLICTED | ✓ | ✓ | ✓ |
| Specialty Pizzas | Crown Crust | M / L | 1199 / 1799 | 1470 / 2099 | CONFLICTED | ✓ | ✓ | ✓ |
| Specialty Pizzas | Behari Kabab Pizza | base | 549 | Not on GM photos | UNVERIFIED | ✓ | ✓ | ✓ |
| Burgers | Patty Burger | — | 299 | GM: 350; older evidence: 299 | CONFLICTED | ✓ | ✓ | ✓ |
| Burgers | Zinger Burger | — | — | GM: 550; older: 450/440 | **CONFLICTED** — correctly **absent** from catalog | ✗ | ✗ | ✗ |
| Pasta | Crunchy Pasta | — | 849 | GM: 980 | CONFLICTED | ✓ | ✓ | ✓ |
| Pasta | Special / Flaming / Alfredo | — | — | GM: 899 / 899 / 1100 | VERIFIED missing | ✗ | ✗ | ✗ |
| Broast | Quarter / Half / Full | — | 750 / 1390 / 2590 | GM: same | VERIFIED | ✓ | ✓ | ✓ |
| Deals | Family Festival | — | 2350 | GM: 2850 | CONFLICTED | ✓ | ✓ | ✓ |
| Deals | Knock Out Deal | — | 1440 | GM: 1750 | CONFLICTED | ✓ | ✓ | ✓ |
| Wraps | jumbo-wrap ("Tele Pizza Special Jumbo Wrap") | — | 649 | GM: **no such item**; real Jumbo Wraps at 950 | UNVERIFIED / likely wrong item | ✓ | ✓ | ✓ |
| Wings | BBQ Wings | — | 599 | GM: "Hot BBQ" 650 | CONFLICTED name+price | ✓ | ✓ | ✓ |

#### Full static/production slug list (58)

`baked-smoked-sandwich`, `bbq-wings`, `behari-kabab-pizza`, `behari-roll`, `bihari-kabab`, `bonfire`, `broast-garlic-dip`, `broast-mustard-dip`, `cheese-lover`, `chicago-extreme`, `chicken-supreme`, `chicken-tender-strips`, `creamo-wings`, `crispy-box`, `crown-crust`, `crunchy-pasta`, `crunchy-sandwich`, `crunchy-wrap`, `deal-for-two`, `drink-1-5l`, `drink-1l`, `drink-345ml`, `drink-500ml`, `dynamite-wrap`, `family-deal`, `family-festival`, `family-fries`, `flaming-wings`, `french-fries`, `fried-chicken`, `fried-chicken-chest`, `fried-crispy-wings`, `full-broast`, `half-broast`, `hot-shots`, `jumbo-wrap`, `kababish`, `knock-out-deal`, `large-water`, `loaded-fries`, `mega-offer`, `mexicana`, `nuggets`, `oven-baked-wings`, `pair-deal`, `patty-burger`, `peri-peri`, `pizza-fest`, `quarter-broast`, `real-fajita`, `sixteen-inch-incher`, `sizzling-sandwich`, `small-water`, `special-sandwich`, `stuffed-crust`, `tele-extreme`, `tele-special`, `tikka`

### B.2 — Evidence items NOT in catalog (73+ entries from `REAL-MENU-EXTRACTION.md`)

These are **verified on printed menu** but **missing** from static/DB/website. Grouped by section; all confidence **VERIFIED** on photos unless noted.

| Section | Missing items (examples) | Should appear? |
|---|---|---|
| Extra Toppings | Chicken/Cheese S/M/L; Cheese Slice 60 | NEEDS_OWNER_CONFIRMATION (addon UX) |
| Grill Burgers (3) | Smokehouse 650, Grill Boss 890, Chipotle Fire 890 | ADD when catalog expanded |
| Smash Beef Burgers (3) | Classic/Signature/Supreme 690–1090 | ADD |
| Chicken Burgers | Classic Crunch 450, Big Boss 690, **Zinger 550** | Zinger: **NEEDS_OWNER_CONFIRMATION** |
| Appetizers | Paratha roll 390, Mozzarella sticks 599 | ADD |
| Pasta | Special 899, Flaming 899, Alfredo 1100 | ADD |
| Wraps (GM names) | Wrap it Hot Grilled Jumbo 950, Jalapeno Kick 950, Lil Crunch 400, etc. | CORRECT naming vs `jumbo-wrap` |
| Dips (4) | Special Sauce, Bone Fire, Dip Sauce, Garlic Ranch @ 50 | ADD or hide in customizer only |
| telebar (all) | 27+ beverages/desserts across 9 sub-sections | NEEDS_OWNER_CONFIRMATION for website scope |
| Specialty | Malai Boti pizza (S/M/L) | ADD |
| Deals (GM prices) | All 7 deals at **higher** GM prices | CORRECT prices if GM is canonical |

**Temporary promotions (must NOT enter permanent catalog without review):**

- Eid Celebration deals, Iftar Special Tele Special @ 799 (5–7 PM), standalone promo posters — classified **TEMPORARY** in `REAL_MENU_EXTRACTED.md`.

---

## C. Category reconciliation

| Category | REAL-MENU-EXTRACTION (24 sections) | REAL_MENU_EXTRACTED | Static / Supabase (13) | Website Menu page | Homepage |
|---|---|---|---|---|
| Signature Pizzas | ✓ | ✓ | ✓ | ✓ (fallback) | Featured subset |
| Classic Pizzas | ✓ | ✓ | ✓ | ✓ | — |
| Specialty Pizzas | ✓ | ✓ | ✓ | ✓ | ✓ |
| Extra Toppings | ✓ | partial | ✗ | ✗ | ✗ |
| Injected Broast | ✓ (as Broast) | ✗ | ✓ as **Broast** | ✓ | ✓ |
| Grill Burgers | ✓ | ✗ | ✗ | ✗ | ✗ |
| Smash Beef Burgers | ✓ | ✗ | ✗ | ✗ | ✗ |
| Chicken Burgers | ✓ | ✓ (incl. Zinger) | **Burgers (1 only)** | ✓ | Patty only |
| Sandwiches | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wings | ✓ | ✓ | ✓ | ✓ | ✗ |
| Fries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Wraps & Rolls | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pasta | ✓ (4 items) | ✓ (2–3) | **Pasta (1)** | ✓ | ✓ (1 item) |
| Chicken & Sides | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dips | ✓ | ✓ | ✗ | ✗ | ✗ |
| Drinks | ✓ | ✓ | ✓ | ✓ | ✗ |
| Deals | ✓ | ✓ | ✓ | ✓ | ✓ |
| telebar (9 subcats) | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## D. Item reconciliation summary

| Issue type | Count | Examples |
|---|---:|---|
| Missing from database | **73+** | Grill burgers, Zinger (standalone), telebar, Malai Boti, extra pasta |
| Missing from static fallback | Same as DB | Catalogs are in sync |
| Missing from website live query | N/A — query fails; fallback shows 58 | — |
| Duplicated | 0 slug duplicates | — |
| Incorrectly categorized | 1+ | `jumbo-wrap` name vs GM "Wrap it Hot Grilled Jumbo" |
| Incorrect price vs GM evidence | **~40+** among the 58 | All signature/classic pizzas, most deals, sandwiches |
| Incorrect size label | All variant pizzas | **9 inch Medium** in DB vs **10" Medium** on GM |
| Unavailable without evidence | 1 | `behari-kabab-pizza` @ 549 |
| Fabricated (not on GM) | 1 suspected | `behari-kabab-pizza` |
| Temporary promotion in catalog | 0 explicit | Eid/Iftar **not** seeded |
| Conflicting evidence preserved | 3+ | Zinger 440/450/550; Patty 299/350; GM vs REAL_MENU_EXTRACTED prices |

---

## E. Explicit investigations

### Burgers — why only one permanent item?

| Source | Burger items |
|---|---|
| Production / static | **Patty Burger only** (Rs 299) |
| REAL_MENU_EXTRACTED | Zinger (450 **vs** 440 conflict), Patty 299 |
| REAL-MENU-EXTRACTION | Classic Crunch 450, Big Boss 690, Zinger **550**, Patty **350**, plus Grill (3) + Smash Beef (3) |

**Conclusion:** Catalog intentionally mirrors **older subset** synced from `menu-data.ts`. GM photos show **7+ burger products**. Zinger omitted — **correct per governance rule** (ambiguous permanent price). Patty price **conflicts** across sources.

### Pasta — why only one permanent item?

| Source | Pasta items |
|---|---|
| Production / static | **Crunchy Pasta** (849) |
| REAL-MENU-EXTRACTION | Crunchy **980**, Special 899, Flaming 899, Alfredo 1100 |
| REAL_MENU_EXTRACTED | Crunchy 849; Special/Flaming 749 (ambiguous wording) |

**Conclusion:** Single-item pasta category is a **sync artifact**, not full restaurant menu. GM shows **4 pasta lines**.

### Pizza variants and sizes

- DB variants: **34** total across pizzas with `6 inch Small` / `9 inch Medium` / `12 inch Large` labels.
- GM: **6" / 10" / 12"** with **higher prices** (e.g. Signature 620/1250/1890).
- **Every shared pizza price differs** between catalog and GM (documented in `REAL-MENU-EXTRACTION.md` §7).

### Broast

- 5 items in catalog (quarter/half/full + 2 extra dips) — **prices match GM** (750/1390/2590).
- Categorized as `Broast` on website; DB `product_type` = `side` for broast rows.

### Deals

- All 7 deals present in catalog.
- **All deal prices in catalog are lower** than GM printed prices (e.g. Family Deal 2250 vs GM 2650).
- Three deals reference **Zinger Burger** in description without standalone Zinger SKU.

### Zinger Burger conflict

| Price | Source | Status |
|---:|---|---|
| 440 | Promo poster | CONFLICTED |
| 450 | Structured board (older) | CONFLICTED |
| 550 | GM Link 2 (2026-07-13) | VERIFIED latest photo |

**Catalog:** No standalone Zinger — **KEEP** until owner picks canonical price. Deals mentioning Zinger remain **NEEDS_OWNER_CONFIRMATION**.

### Branch opening hours

- Website & `BranchContext`: `10:00 AM – 2:30 AM`
- DB seed: same in `opening_hours` JSON
- **Not printed** on menu photos — NEEDS_OWNER_CONFIRMATION

### Phone number

**0304-1110495** — consistent across menu photo, website, Footer, Cart WhatsApp flow, DB seed.

### Customer ratings / delivery promises / app claims

| Claim | Verdict |
|---|---|
| 4.3 Google / 642 reviews | UNVERIFIED — NEEDS_OWNER_CONFIRMATION |
| 10K+ customers/month | UNVERIFIED |
| Free delivery | Not claimed on site — OK |
| 30-minute delivery | Not found — OK |
| App availability | Correctly marked **Coming Soon** on Home |
| Northern Bypass branch | Correctly **Coming Soon** |

### Images

- Product photos: mostly **category placeholders** (`/images/menu-pizza.jpg`, etc.) — not item-specific photography.
- DB `image_url` values reference **old hashed filenames** (`menu-pizza_f729e710.jpg`) in seed migrations; website static uses **renamed** paths (`menu-pizza.jpg`). Production rows may still store old paths — **needs spot-check** (not destructively verified here).
- Deal promos use dedicated assets under `/images/promos/`.
- **No invented URLs** in `menu-catalog.ts` placeholder logic — uses existing bundled assets only.

---

## F. Technical defect report

### F.1 Schema vs frontend (`menu-catalog.ts`)

| Expected by website | Production reality | Error |
|---|---|---|
| `menu_categories.display_order` | `menu_categories.sort_order` | `42703 column does not exist` |
| `menu_items_with_pricing` view | **View not deployed** | `PGRST205 Could not find table` |
| `menu_items.display_order` in view select | No view; items table has no `display_order` | Would fail even if view existed |
| Variants as JSON in view | Variants in `menu_item_variants` table | Backend joins correctly; website does not |

### F.2 Backend API (reference — correct pattern)

`backend/api/src/services/catalog/supabase.ts` uses:

- `menu_categories.sort_order` ✓
- Direct `menu_items` + nested `menu_item_variants` + `menu_categories` ✓
- No dependency on `menu_items_with_pricing` ✓

### F.3 Environment & fallback behavior

| Variable | Purpose | If missing |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser Supabase client | Static catalog immediately |
| `VITE_SUPABASE_ANON_KEY` | Anon auth | Static catalog immediately |
| Both set (Vercel production) | Attempt Supabase fetch | **Fails** → `MenuCatalogContext` sets `usingFallback=true`, shows error banner |

**Homepage (`Home.tsx`):** imports `menu-data.ts` **directly** — never uses `MenuCatalogContext`. Always static subset.

**Menu page (`Menu.tsx`):** uses `useMenuCatalog()` — renders fallback when Supabase broken.

### F.4 Database tests (existing)

`tests/database/foundation-migrations.test.mjs` — static SQL assertions for:

- Table existence in `20260713190000_foundation_schema.sql`
- RLS policies
- Seed slugs in `20260713191000_seed_foundation_data.sql`
- Broast slugs in `20260714100000_sync_verified_menu_catalog.sql`

**Gap:** No test asserts `sort_order` vs `display_order` or view existence. No production parity test for 58 slugs.

### F.5 Proposed Stage 2 fixes (not applied)

| Fix | Target |
|---|---|
| Replace `display_order` → `sort_order` in all Supabase client queries | `apps/website/client/src/lib/menu-catalog.ts` |
| Query `menu_items` + `menu_item_variants` + `menu_categories` (mirror backend) **OR** add `menu_items_with_pricing` view migration | `menu-catalog.ts` and/or `supabase/migrations/` |
| Align `image_url` paths in DB with `public/images/` | seed migration |
| Optional: wire `Home.tsx` to `MenuCatalogContext` | homepage consistency |
| Price/size update migration | **Blocked on owner decision** (GM vs older evidence) |

---

## G. Final reconciliation totals

| Source | Categories | Items | Variants |
|---|---:|---:|---:|
| **Original evidence** (`REAL-MENU-EXTRACTION.md`) | 24 sections | 131 priced entries | Shared pizza tiers + per-item variants (≈43+ distinct variant rows for pizzas alone) |
| **Secondary evidence** (`REAL_MENU_EXTRACTED.md`) | ~12 core + promos | ~50 core items | Pizza S/M/L + specialty |
| **Static fallback** (`menu-data.ts`) | 13 | 58 | 34 |
| **Supabase production** (read-only 2026-07-14) | 13 active | 58 active | 34 active |
| **Website live rendering** (Supabase env configured) | 13 | 58 | 34 (via **static fallback**, not live Supabase) |
| **Website homepage** (curated) | subset | ~15–20 featured IDs | varies |

---

## H. Decision register

| ID | Subject | Decision | Rationale |
|---|---|---|---|
| D-001 | `display_order` in website queries | **CORRECT** | Production uses `sort_order` only |
| D-002 | `menu_items_with_pricing` view | **ADD** (migration) **or** **CORRECT** frontend to use tables | View absent in production |
| D-003 | 58-item catalog slug set | **KEEP** | Static ≡ production parity |
| D-004 | Pizza prices (catalog vs GM) | **NEEDS_OWNER_CONFIRMATION** | GM shows higher prices on all shared items |
| D-005 | Pizza medium size label 9" vs 10" | **CORRECT** (if GM canonical) | GM prints 10" Medium |
| D-006 | Standalone Zinger Burger | **NEEDS_OWNER_CONFIRMATION** | 440/450/550 conflict; rule: do not add until resolved |
| D-007 | `behari-kabab-pizza` | **NEEDS_OWNER_CONFIRMATION** | Not on GM photos; may be outdated promo |
| D-008 | `jumbo-wrap` naming/price | **NEEDS_OWNER_CONFIRMATION** | GM Jumbo Wraps differ (950) |
| D-009 | Missing GM categories (telebar, grill, etc.) | **ADD** (phased) | 73+ verified items absent |
| D-010 | Eid/Iftar promotions | **TEMPORARY_PROMOTION_ONLY** | Do not seed as permanent |
| D-011 | About page stats (4.3★, 10K+) | **NEEDS_OWNER_CONFIRMATION** or **REMOVE_FROM_PUBLIC_VIEW** | No evidence |
| D-012 | Tagline "Love At First Bite" | **ADD** (optional) | Verified on menu; not on site |
| D-013 | Deals referencing Zinger without SKU | **NEEDS_OWNER_CONFIRMATION** | Checkout accuracy |
| D-014 | Homepage static-only menu | **CORRECT** (Stage 2) | Use shared catalog provider |
| D-015 | Broast 5-item set | **KEEP** | Prices match GM |
| D-016 | Burgers/Pasta single-item categories | **ADD** missing GM items (post-confirmation) | Incomplete vs restaurant |

---

## Files requiring modification (Stage 2 — pending approval)

| File | Reason |
|---|---|
| `apps/website/client/src/lib/menu-catalog.ts` | `sort_order`; remove/fix view dependency |
| `apps/website/client/src/pages/Home.tsx` | Optional: shared catalog |
| `apps/website/client/src/data/menu-data.ts` | Price/size updates after owner decision |
| `supabase/migrations/` | Optional view; price sync; image path normalization |
| `apps/website/client/src/pages/About.tsx` | Unverified stats |
| `tests/database/` or new `apps/website` tests | Schema parity + slug sync tests |

---

## Proposed tests (Stage 2)

1. **Schema contract test:** website catalog module must only reference columns that exist in `foundation_schema.sql` (`sort_order`, not `display_order`).
2. **Slug parity test:** static `menu-data.ts` slugs === production REST export.
3. **Mapping test:** Supabase row → `MenuItem` preserves variant labels and `id=slug`.
4. **Fallback test:** simulated Supabase 42703 error → static catalog + `usingFallback=true`.
5. **Price spot-check test:** broast items match GM evidence (regression guard).

---

## Questions requiring owner confirmation

1. **Canonical price list:** Google Maps extraction (2026-07-13, 131 items) **or** uploaded-board extraction (2026-07-12, matches current DB)?
2. **Zinger Burger:** Which price is permanent (440 / 450 / 550)? Should standalone item be added?
3. **Behari Kabab Pizza** at Rs 549 — keep, reprice, or remove from public menu?
4. **`jumbo-wrap`** — rename/reprice to match GM Jumbo Wraps (950), or remove?
5. **About page metrics** — source for 4.3★ / 642 reviews / 10K+ monthly customers?
6. **Opening hours** 10:00 AM – 2:30 AM — confirm for Royal Orchard?
7. **Website scope:** Should telebar (~40+ beverages) appear on customer website now or Phase 2+?
8. **Deals with Zinger** — how should WhatsApp orders price Zinger components until SKU exists?

---

## Stage 1 stop statement

- **No code modified**
- **No migrations applied**
- **No production data changed**
- **No commit / push**

Awaiting approval before Stage 2 (corrective implementation).
