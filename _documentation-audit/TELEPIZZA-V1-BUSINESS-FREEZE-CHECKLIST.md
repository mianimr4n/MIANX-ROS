# Telepizza V1 Business Freeze Checklist

> **Superseded by ERP-grade pack:** Use [`business-freeze-pack/`](./business-freeze-pack/README.md) — start with [MASTER-BUSINESS-FREEZE-CHECKLIST.md](./business-freeze-pack/MASTER-BUSINESS-FREEZE-CHECKLIST.md).  
> This file remains as the initial scaffold; the pack is the operational master.

**Governance:** Mianx.ai  
**Purpose:** Single master gate before Backend (Phase 2), ERP, POS, Kitchen, Rider, Admin, or AI Workforce.  
**Rule:** No checkbox in a **Required** section may remain open when declaring **Version 1.0 Business Locked**.

**Status legend**

| Symbol | Meaning |
|---|---|
| `[ ]` | Not started / not verified |
| `[~]` | Partial — work exists but not owner-verified or not parity-complete |
| `[x]` | Verified complete with evidence |
| `🔴` | Blocker — must resolve before freeze |
| `🟡` | In progress / needs owner input |
| `🟢` | Done |

**As of:** 2026-07-14 (baseline from Stage 1 inspection)

---

## 0. Freeze gate definition

**Version 1.0 Business Locked** requires ALL of the following:

1. **Printed Menu = Website = Database** — every permanent item, variant, and price owner-signed.
2. **No unsupported public claims** — marketing copy backed by evidence or removed.
3. **Image library complete** — every public menu item has hero, card, and thumbnail assets.
4. **Customer journey verified** — Home → Menu → Customize → Cart → Checkout → WhatsApp → Confirmation.
5. **Production verified** — live site loads canonical catalog (not silent fallback due to schema bugs).
6. **Owner sign-off** — named approver + date at bottom of this document.

**Explicitly OUT OF SCOPE until gate passes:**

- Authentication, customer accounts, orders API
- Kitchen, Rider, POS, ERP, Admin panel
- AI workforce agents

---

## 1. Source reports index

Use these audits as evidence inputs. This checklist is the **execution tracker**; reports are **findings**.

| Report | Path | Role |
|---|---|---|
| Brand / Menu / DB Verification (latest) | `_documentation-audit/reports/BRAND-MENU-DATABASE-VERIFICATION.md` | Primary technical + catalog reconciliation |
| Real menu extraction (Google Maps Jul 2026) | `REAL-MENU-EXTRACTION.md` | Canonical printed menu evidence (131 items) |
| Older board extraction | `_documentation-audit/evidence/REAL_MENU_EXTRACTED.md` | Secondary; matches current DB prices |
| Business decision register | `_documentation-audit/reports/BUSINESS-DECISION-REGISTER-20260712-113849.md` | Open business decisions |
| Business open decisions | `_documentation-audit/reports/BUSINESS-OPEN-DECISIONS-20260712-113311.csv` | Owner decision backlog |
| Semantic classification | `_documentation-audit/reports/BUSINESS-REQUIREMENTS-SEMANTIC-CLASSIFICATION-20260712-115131.md` | Requirements mapping |
| Partial coverage matrix | `_documentation-audit/reports/PARTIAL-COVERAGE-REMEDIATION-MATRIX-20260712-120201.md` | Gap remediation |
| BD-005 … BD-012 acceptance criteria | `_documentation-audit/reports/BD-*.md` | Future backend rules (defer until freeze) |

---

## 2. Current baseline (read-only audit 2026-07-14)

| Metric | Evidence (GM Jul 2026) | Static `menu-data.ts` | Supabase production | Website render |
|---|---:|---:|---:|---:|
| Categories | 24 sections | 13 | 13 | 13 (fallback) |
| Items | 131 priced entries | 58 | 58 | 58 (fallback) |
| Variants | 40+ pizza tiers alone | 34 | 34 | 34 (fallback) |

**Known blockers (🔴):**

- Website Supabase query uses `display_order` — production has `sort_order` only.
- Website queries `menu_items_with_pricing` view — not deployed in production.
- ~73+ GM-verified items missing from catalog.
- ~40+ prices conflict (GM higher than DB/static).
- Pizza medium label: **9"** in DB vs **10"** on printed menu.

---

## 3. Phase roadmap

| Phase | Name | Status |
|---|---|---|
| **1** | **Business Freeze** (this checklist) | **ACTIVE** |
| 2 | Backend API | BLOCKED |
| 3 | ERP | BLOCKED |
| 4 | POS | BLOCKED |
| 5 | Kitchen | BLOCKED |
| 6 | Rider | BLOCKED |
| 7 | Customer App | BLOCKED |
| 8 | Admin | BLOCKED |
| 9 | AI Workforce | BLOCKED |

---

# PHASE 1 — BUSINESS FREEZE

---

## A. Branding

### A.1 Identity & logo

- [~] Official business name **Telepizza** consistent (Navbar, Footer, metadata)
- [ ] Legal entity name on site (if required for Pakistan operations)
- [~] Primary logo `telepizza-logo.png` deployed with SVG fallback
- [ ] Logo master files archived (`assets/brand/` or agreed canonical path)
- [ ] Logo usage rules documented (min size, clear space, dark/light backgrounds)
- [ ] Favicon set complete (all sizes)
- [ ] OG / social share image uses official branding

### A.2 Colors & typography

- [x] Primary red `#E31E24` defined in `index.css`
- [x] Secondary gold `#F5B800` defined
- [x] Charcoal, cream, orange tokens defined
- [ ] Legacy `#D22630` references removed or documented as deprecated
- [x] Display font Poppins loaded
- [x] Body font DM Sans loaded
- [x] Accent font Space Grotesk loaded
- [ ] Typography scale reviewed on mobile / tablet / desktop

### A.3 Copy & tagline

- [ ] Canonical tagline owner-selected (printed: **"Love At First Bite"** vs site marketing copy)
- [ ] Hero headline verified with owner
- [ ] About page narrative fact-checked
- [ ] No unsupported statistics on public pages (see A.7)

### A.4 Contact & branches

- [x] Royal Orchard phone **0304-1110495** consistent (menu photo + site + DB)
- [~] Royal Orchard address verified (Royal Orchard Main Business Plaza, Musa Wala, Multan)
- [~] Opening hours **10:00 AM – 2:30 AM** on site + DB — **owner confirm on printed/source**
- [~] Northern Bypass branch marked **Coming Soon** (not operating)
- [ ] Branch map links / directions verified
- [ ] WhatsApp order number matches published phone

### A.5 Social links

- [ ] Facebook URL live and correct
- [ ] Instagram URL live and correct
- [ ] TikTok / other links live or removed (no dead links)
- [ ] Social icons match active accounts only

### A.6 SEO & metadata

- [ ] Page titles unique per route (Home, Menu, About, Branches, etc.)
- [ ] Meta descriptions owner-approved
- [ ] `robots.txt` / sitemap correct for production domain
- [ ] Canonical URLs set for `telepizza.pk` / Vercel deployment
- [ ] Structured data (LocalBusiness / Restaurant) if used — fact-checked
- [ ] No indexed pages with placeholder content

### A.7 Unsupported claims audit

Resolve each before freeze (from verification report):

- [ ] **4.3 Google rating** — evidence or remove
- [ ] **642+ reviews** — evidence or remove
- [ ] **10K+ monthly customers** — evidence or remove
- [ ] **30-minute delivery** claims — evidence or remove
- [ ] **Free delivery** threshold claims — evidence or remove
- [ ] **Mobile app available** claims — evidence or remove
- [ ] Delivery radius / coverage promises — owner-confirmed

**Branding section gate:** all `[ ]` above must be `[x]` with evidence note.

---

## B. Menu freeze — category by category

**Target:** Every permanent printed-menu item exists in all three layers with matching slug, name, category, variants, and price.

**Parity columns (track per item in worksheet):** Evidence | Static | Supabase | Website

### B.0 Global menu rules

- [ ] Owner signed canonical price list (GM Jul 2026 **or** explicit alternate)
- [ ] Pizza medium size label standardized (**10" Medium** if GM canonical)
- [ ] Temporary Eid/Iftar promos excluded from permanent catalog
- [ ] Zinger Burger standalone rule resolved (see Owner blockers §F)
- [ ] Addon / topping pricing model defined (flat vs size-tier)
- [ ] Deals bundle composition documented (which SKUs, which quantities)
- [ ] Item naming spellings match owner preference (e.g. Creamo vs Cremo, Bihari vs Behari)

### B.1 Signature Pizza (4 in catalog / GM complete)

- [~] Tele Special — prices + S/M/L variants owner-verified
- [~] Peri Peri — prices + variants owner-verified
- [~] Bihari Kabab — prices + variants owner-verified
- [~] Kababish — prices + variants owner-verified

### B.2 Classic Pizza (6 in catalog)

- [~] Tikka
- [~] Bonfire
- [~] Chicken Supreme
- [~] Real Fajita
- [~] Mexicana
- [~] Cheese Lover

### B.3 Specialty Pizza (6 in catalog + GM gaps)

- [~] Behari Kabab Pizza — **owner: keep / reprice / remove** (not on GM photos)
- [~] Crown Crust (M/L)
- [~] Chicago Extreme
- [~] Stuffed Crust
- [~] Tele Extreme Pizza
- [~] 16" Incher
- [ ] Malai Boti Pizza (GM) — **ADD** when confirmed

### B.4 Extra toppings (GM — missing from catalog)

- [ ] Chicken topping S / M / L priced
- [ ] Cheese topping S / M / L priced
- [ ] Cheese slice add-on priced
- [ ] Topping UX defined (customizer vs separate line items)

### B.5 Burgers (🔴 1 of 10+ GM items)

- [~] Patty Burger — price owner-verified (299 vs 350 conflict)
- [ ] Zinger Burger — **NEEDS_OWNER_CONFIRMATION** (440/450/550)
- [ ] Classic Crunch Burger (GM 450)
- [ ] Big Boss Burger (GM 690)
- [ ] Smokehouse Grill Burger (GM 650)
- [ ] Grill Boss Burger (GM 890)
- [ ] Chipotle Fire Burger (GM 890)
- [ ] Smash Beef Classic (GM 690)
- [ ] Smash Beef Signature (GM 890)
- [ ] Smash Beef Supreme (GM 1090)

### B.6 Broast (5 in catalog — GM match ✓)

- [x] Quarter Broast — price matches GM (750)
- [x] Half Broast — price matches GM (1390)
- [x] Full Broast — price matches GM (2590)
- [x] Extra Garlic Dip
- [x] Extra Mustard Dip

### B.7 Sandwich (4 in catalog)

- [~] Crunchy Sandwich — price verify vs GM
- [~] Special Sandwich
- [~] Baked Smoked Sandwich
- [~] Sizzling Sandwich

### B.8 Wrap (🔴 naming conflicts)

- [~] Crunchy Wrap
- [~] Dynamite Wrap
- [~] Behari Roll
- [ ] `jumbo-wrap` — **CORRECT or REMOVE** (GM Jumbo Wraps @ 950 differ)
- [ ] Wrap it Hot Grilled Jumbo (GM 950)
- [ ] Jalapeno Kick Jumbo Wrap (GM 950)
- [ ] Lil Crunch Wrap (GM 400)
- [ ] Grill wrap variants from GM Link 4

### B.9 Fries (3 in catalog)

- [~] Loaded Fries
- [~] French Fries
- [~] Family Fries

### B.10 Wings (5 in catalog)

- [~] Fried & Crispy Wings
- [~] BBQ / Hot BBQ Wings — name + price align to GM
- [~] Creamo Wings — spelling owner-approved
- [~] Oven Baked Wings
- [~] Flaming Wings

### B.11 Pasta (🔴 1 of 4 GM items)

- [~] Crunchy Pasta — price verify (849 vs 980)
- [ ] Special Pasta (GM 899)
- [ ] Flaming Pasta (GM 899)
- [ ] Alfredo Pasta (GM 1100)

### B.12 Chicken & sides (6 in catalog)

- [~] Chicken Tender Strips
- [~] Crispy Box
- [~] Fried Chicken
- [~] Fried Chicken Chest
- [~] Hot Shots
- [~] Nuggets

### B.13 Appetizers (🔴 missing category)

- [ ] Paratha Roll (GM 390)
- [ ] Mozzarella Jalapeno Sticks (GM 599)
- [ ] Category created in DB + website if permanent

### B.14 Drinks (6 in catalog — GM has more)

- [~] 345ml drink
- [~] 500ml drink
- [~] 1L drink
- [~] 1.5L drink
- [~] Small water
- [~] Large water
- [ ] Telebar beverages scope decided (see B.16)

### B.15 Deals (7 in catalog — GM prices higher)

- [~] Family Festival — price verify (2350 vs 2850)
- [~] Knock Out Deal
- [~] Mega Offer
- [~] Pizza Fest
- [~] Family Deal
- [~] Pair Deal
- [~] Deal for Two
- [ ] Deal components that reference Zinger priced correctly without standalone SKU

### B.16 Addons (partial in customizer)

- [~] Pizza extra cheese / toppings in customizer
- [ ] Addon list matches printed Extra Topping section
- [ ] Addon prices match canonical list

### B.17 Dips (🔴 missing from catalog)

- [ ] Special Sauce (GM 50)
- [ ] Bone Fire dip (GM 50)
- [ ] Dip Sauce (GM 50)
- [ ] Garlic Ranch (GM 50)
- [ ] Dips surfaced in UX (menu vs cart vs customizer)

### B.18 Toppings (🔴 missing as catalog entities)

- [ ] Extra chicken topping tiers
- [ ] Extra cheese topping tiers
- [ ] Cheese slice
- [ ] Mapped to `menu_item_variants` or separate addon table — owner-approved model

### B.19 Telebar (🔴 27+ items — scope decision)

- [ ] Owner decides: include on customer website now or defer
- [ ] Shakes (all GM items)
- [ ] Mocktails
- [ ] Iced teas / coffees
- [ ] Fresh juices
- [ ] Sweet endings / desserts
- [ ] Telebar sub-category structure defined

**Menu section gate:** item count ≥ owner-approved permanent menu count; 0 unresolved CONFLICTED prices; 0 UNVERIFIED items on public menu without REVIEW flag.

---

## C. Database freeze

### C.1 Schema contract

- [x] `menu_categories.sort_order` exists (not `display_order`)
- [x] `menu_items`, `menu_item_variants` tables exist
- [x] `branches` table with opening_hours JSON
- [ ] `menu_items_with_pricing` view — **ADD migration OR remove from website query**
- [ ] Table grants for anon/authenticated in migrations (not manual post-start)
- [ ] RLS policies verified for public read

### C.2 Data completeness (per item)

For **every** public menu item:

- [ ] `slug` unique and stable
- [ ] `category_id` correct
- [ ] `name` matches owner-approved spelling
- [ ] `description` matches owner-approved copy (no invented ingredients)
- [ ] `image_url` points to final asset
- [ ] `base_price` correct for single-price items
- [ ] `is_available` / active flag correct
- [ ] Variants: size label, price, sort order
- [ ] Customization rules documented (pizza crust, addons, deal bundles)

### C.3 Parity tests

- [x] 53 database foundation tests pass (local)
- [ ] Slug parity test: static `menu-data.ts` === production export
- [ ] Category count parity test
- [ ] Variant count parity test
- [ ] Price spot-check test vs signed canonical list
- [ ] No orphan variants (variant without parent item)

### C.4 Production Supabase

- [x] Production project live (`pyeowxvacgypohrbvgee`)
- [~] 58 items seeded — incomplete vs full menu
- [ ] Production row counts match post-freeze targets
- [ ] Production migration history matches repo
- [ ] No manual hotfix drift (grants, ad-hoc SQL)
- [ ] Staging / prod promotion process documented

**Database section gate:** production REST API returns full frozen catalog without permission errors.

---

## D. Image library

### D.1 Asset standards

- [ ] Naming convention documented (`{slug}-hero.webp`, etc.)
- [ ] WebP (+ JPEG fallback) policy defined
- [ ] Max dimensions / compression targets set
- [ ] CDN or `public/images/` canonical path decided
- [ ] `assets/menu/` or equivalent master archive exists

### D.2 Per-item images (58 current + expansions)

For each menu item:

- [ ] Hero image (detail / customizer)
- [ ] Card image (menu grid)
- [ ] Thumbnail (cart / search)
- [ ] Alt text descriptive and accurate
- [ ] Image matches actual served product (no stock-photo misrepresentation)

### D.3 Category & marketing images

- [ ] Category header image per menu section
- [ ] Homepage hero / featured item images
- [ ] Deal banner images match live deal composition
- [ ] Branch photos verified (Royal Orchard)

### D.4 Broken image handling

- [x] `handleLogoError` / image fallback utility exists
- [ ] Zero broken images on production smoke test
- [ ] Placeholder policy for Coming Soon items only

**Image section gate:** Lighthouse / manual audit shows no broken menu images; every public SKU has card + thumbnail.

---

## E. Website rendering

### E.1 Catalog loading

- [ ] `menu-catalog.ts` queries match production schema (`sort_order`)
- [ ] Live Supabase load succeeds when env vars set (no silent fallback)
- [ ] Static fallback documented and tested (offline / outage)
- [ ] `MenuCatalogContext` used on Menu **and** Home (not direct `menu-data.ts` import on Home)
- [ ] Category sort order matches owner-approved order

### E.2 Menu page

- [ ] All frozen categories visible
- [ ] All frozen items visible with correct name
- [ ] Prices match database
- [ ] Variant selector shows correct size labels (10" Medium)
- [ ] Search returns all items
- [ ] Category filters accurate
- [ ] Unavailable items hidden or marked per rules

### E.3 Customization

- [ ] Pizza customizer addon prices correct
- [ ] Deal items cannot be misconfigured
- [ ] Variant IDs stable in cart (`slug`-based)

### E.4 Cart & checkout

- [ ] Line items show variant + price correctly
- [ ] Quantity limits sane
- [ ] WhatsApp message format owner-approved
- [ ] Order message includes branch, items, variants, total
- [ ] No reference to items not in catalog (e.g. phantom Zinger)

### E.5 Pages — branding surfaces

- [~] Home
- [~] Menu
- [~] About (pending claims audit)
- [~] Branches / Contact
- [~] Footer
- [~] Navbar / header

**Website section gate:** production site renders live Supabase catalog; spot-check 20 items = printed menu prices.

---

## F. Customer journey (end-to-end)

| Step | Checkpoint | Status |
|---|---|---|
| Home | Featured items from live catalog; no stale prices | [~] |
| Menu | Browse all categories; search works | [~] |
| Customize | Pizza / variant / addon flow correct | [~] |
| Cart | Add / remove / persist; totals correct | [~] |
| Checkout | Branch selection; customer fields | [~] |
| WhatsApp | `wa.me` link builds correct message | [~] |
| Order | Staff can fulfill from message alone | [ ] |
| Confirmation | User sees clear next-step UX | [~] |

### F.1 Device matrix

- [ ] Mobile (375px) — full journey
- [ ] Mobile (414px) — full journey
- [ ] Tablet (768px) — full journey
- [ ] Desktop (1280px+) — full journey
- [ ] No horizontal scroll on menu grid
- [ ] Touch targets ≥ 44px on primary actions

**Journey section gate:** owner or QA signs off recorded test session (date + device list).

---

## G. Performance & production

### G.1 Build & deploy

- [x] `pnpm check` passes
- [x] `pnpm build:website` passes
- [ ] Vercel env vars set (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- [ ] Production domain (`telepizza.pk`) active — not suspended
- [ ] Preview ≠ production drift documented

### G.2 Runtime performance

- [ ] Menu page LCP acceptable on 4G
- [ ] Images lazy-loaded
- [ ] No console errors on production menu load
- [ ] Supabase fetch < 2s typical

### G.3 Monitoring (pre-backend)

- [ ] Error boundary or logging for catalog fetch failures
- [ ] Fallback usage visible to ops (not silent)

---

## H. Owner decision blockers (must clear before freeze)

| ID | Question | Blocks |
|---|---|---|
| O-01 | Canonical prices: GM Jul 2026 or older board? | B.*, C.*, E.* |
| O-02 | Zinger permanent price + standalone SKU? | B.5, B.15 |
| O-03 | Behari Kabab Pizza — keep / reprice / remove? | B.3 |
| O-04 | `jumbo-wrap` — fix naming/price or remove? | B.8 |
| O-05 | About page stats — source or remove? | A.7 |
| O-06 | Opening hours 10:00 AM – 2:30 AM confirmed? | A.4 |
| O-07 | Telebar on customer website now or later? | B.19 |
| O-08 | Deals with Zinger — pricing without SKU? | B.15 |

**Owner responses:** _(fill in when decided)_

---

## I. Reconciliation scoreboard

Update after each work session.

| Source | Categories | Items | Variants | Last verified |
|---|---:|---:|---:|---|
| Printed menu (GM Jul 2026) | 24 | 131 | 40+ | 2026-07-13 |
| Static `menu-data.ts` | 13 | 58 | 34 | 2026-07-14 |
| Supabase production | 13 | 58 | 34 | 2026-07-14 |
| Website (target: live DB) | 13 | 58 | 34 | 2026-07-14 (fallback) |
| **Freeze target** | _TBD owner_ | _TBD owner_ | _TBD owner_ | — |

**Parity %:** ___% items matching across all four columns (target: **100%**)

---

## J. Section completion summary

| Section | Required items | Done | Partial | Open | Gate |
|---|---:|---:|---:|---:|---|
| A. Branding | 35 | 8 | 6 | 21 | ⬜ |
| B. Menu | 90+ | 3 | 40+ | 47+ | ⬜ |
| C. Database | 25 | 6 | 2 | 17 | ⬜ |
| D. Images | 20+ | 1 | 0 | 19+ | ⬜ |
| E. Website | 25 | 0 | 6 | 19 | ⬜ |
| F. Customer journey | 15 | 0 | 7 | 8 | ⬜ |
| G. Production | 10 | 2 | 0 | 8 | ⬜ |

_Update counts as checkboxes are ticked._

---

## K. Version 1.0 Business Locked — sign-off

**Pre-conditions (all must be true):**

- [ ] Section gates A through G: **PASS**
- [ ] Owner blockers O-01 through O-08: **RESOLVED**
- [ ] Reconciliation scoreboard: **100% parity**
- [ ] No 🔴 items in verification report remain open
- [ ] Backend Phase 2 explicitly **NOT started**

| Role | Name | Signature / date |
|---|---|---|
| Business owner | | |
| Menu authority | | |
| Technical verifier | | |

**Declared locked version:** `v1.0-business-locked`  
**Declaration date:** _______________

---

## L. What happens after lock

Only after §K sign-off:

1. **Phase 2 — Backend:** auth, customers, orders API (frozen menu as read model)
2. **Phase 3 — ERP:** inventory, procurement (frozen SKUs)
3. **Phase 4 — POS:** branch operations
4. **Phase 5 — Kitchen:** ticket flow from frozen order schema
5. **Phase 6 — Rider:** delivery from frozen branch rules
6. **Phase 7 — Customer app**
7. **Phase 8 — Admin**
8. **Phase 9 — AI workforce**

Menu or price changes after lock follow **change control**: update evidence → static → migration → website → checklist regression → deploy.

---

*This document is the operational master checklist. Findings remain in linked audit reports. Do not delete conflicting evidence — resolve via owner decision and update this tracker.*
