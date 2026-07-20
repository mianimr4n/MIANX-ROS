# Sprint 2 — Pizza Category Reconciliation (Stage 1)

**Agent:** Telepizza Sprint 2 Menu Reconciliation (Mianx.ai governance)  
**Date:** 2026-07-15  
**Scope:** Signature / Classic / Specialty pizzas + pizza customizer toppings only  
**Mode:** READ-ONLY — no code, DB, commit, or push  
**Production:** Frontend `telepizza-website.vercel.app` · API `telepizza-api.onrender.com` · Supabase `pyeowxvacgypohrbvgee`  
**Sprint 1 gate:** PASS  

---

## Canonical baseline used for this cycle

| Rule | Applied value |
|---|---|
| Structured official menu-board images | V1 permanent baseline |
| Owner prompt expected pizza tiers | **6" / 9" / 12"** · Signature **499 / 950 / 1570** · Classic **470 / 890 / 1470** |
| Specialty expected | Chicago M/L **1199 / 1899** · Crown M/L **1199 / 1799** · Stuffed **1749** · Tele Extreme **1699** · 16" Incher **2399** |
| Promo / Eid / Iftar / social | **Not** canonical |
| GM Jul 2026 (`REAL-MENU-EXTRACTION.md` Link 3) | Conflicting evidence — **do not auto-apply** (BFR-001 still `OPEN`) |
| Behari Kabab Pizza | **BLOCK** for silent change — owner decision incomplete (BFR-003) |

Evidence sources inspected:

- `REAL-MENU-EXTRACTION.md` (GM / Google Maps Link 3)
- `_documentation-audit/evidence/REAL_MENU_EXTRACTED.md` (structured boards)
- `_documentation-audit/business-freeze-pack/*` (esp. `BUSINESS-DECISION-REGISTER.md`, `categories/PIZZA-CATEGORY-FREEZE-CYCLE.md`, `OWNER-DECISIONS-REMAINING.md`)
- `apps/website/client/src/data/menu-data.ts`, `cart-config.ts`, `menu-catalog.ts`, `MenuCatalogContext.tsx`, `Menu.tsx`, `PizzaCustomizerDialog.tsx`
- Supabase migrations `20260713191000_seed_foundation_data.sql`, `20260714100000_sync_verified_menu_catalog.sql`
- Live Supabase anon REST · Production API `/api/v1/menu/catalog` · Production `/menu`

---

## 1. Category counts (pizza only)

| Layer | Signature | Classic | Specialty | Pizza items total | Pizza variants¹ | Notes |
|---|---:|---:|---:|---:|---:|---|
| Printed structured board (baseline) | 4 | 6 | 5–6² | 15–16 | 34 expected shape | Specialty: Chicago, Crown, Stuffed, Tele Extreme, 16" Incher (+ Behari poster optional) |
| GM Link 3 (non-baseline conflict) | 4 | 6 | 6 incl. Malai Boti | 16+ toppings | Medium **10"** · higher Rs | Not used as publish baseline |
| Supabase production | 4 | 6 | 6 | **16** | **34** | Query via anon `menu_items` + nested variants |
| Production API | 4 | 6 | 6 | **16** | **34** | `/api/v1/menu/catalog` filtered by pizza categories |
| Static fallback (`menu-data.ts`) | 4 | 6 | 6 | **16** | **34** | Matches seed prices |
| Production website (live Supabase) | 4 | 6 | 6 | **16** rendered | Shown as size buttons / single price | Banner: “Live menu loaded from Supabase (58 items)” |

¹ Variant rows: Signature 4×3=12 + Classic 6×3=18 + Crown 2 + Chicago 2 = **34**. Single-price specialty SKUs use `base_price` (no variant rows).  
² Structured specialty list includes Behari Kabab Pizza only on a **standalone marketing poster** (starting Rs 549), not as a fully variant-defined board SKU.

**Overall catalog (all categories, for context):** 13 categories · 58 items · 34 pizza variants · 7 deals · 2 branches — unchanged from Sprint 1 baseline.

---

## 2. Per-pizza comparison

Legend for **Decision:**  
`KEEP` = matches structured baseline across DB/API/website/static · `CORRECT` = needs data fix after owner approval · `ADD` = missing vs approved baseline · `BLOCK` = unresolved ownership · `REMOVE_FROM_PUBLIC_VIEW` = should hide until decision  

Confidence: **High** = structured board + live layers agree · **Medium** = board incomplete / marketing only · **Conflict** = GM vs board prices.

### 2.1 Signature Pizzas

| Name | Slug | Category | Sizes (baseline) | Prices | Badge | Image | Evidence | DB | API | Website | Static | Decision |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Tele Special | `tele-special` | Signature | 6/9/12 inch | 499/950/1570 | Signature | `/images/menu-pizza_f729e710.jpg` | High | ✓ | ✓ | ✓ | ✓ | **KEEP** |
| Peri Peri | `peri-peri` | Signature | 6/9/12 | 499/950/1570 | — | `menu-pizza_f729e710.jpg` | High | ✓ | ✓ | ✓ | ✓ | **KEEP** |
| Bihari Kabab | `bihari-kabab` | Signature | 6/9/12 | 499/950/1570 | Hot | `menu-pizza.jpg` | High | ✓ | ✓ | ✓ | ✓ | **KEEP** |
| Kababish | `kababish` | Signature | 6/9/12 | 499/950/1570 | — | `menu-pizza.jpg` | High | ✓ | ✓ | ✓ | ✓ | **KEEP** |

Availability: all `is_available=true`. Featured: Tele Special only.

### 2.2 Classic Pizzas

| Name | Slug | Sizes | Prices | Image | Evidence | DB / API / Web / Static | Decision |
|---|---|---|---|---|---|---|---|
| Tikka | `tikka` | 6/9/12 | 470/890/1470 | `menu-pizza_f729e710.jpg` | High | Align | **KEEP** |
| Bonfire | `bonfire` | 6/9/12 | 470/890/1470 | `menu-pizza.jpg` | High | Align | **KEEP** |
| Chicken Supreme | `chicken-supreme` | 6/9/12 | 470/890/1470 | `menu-pizza_f729e710.jpg` | High | Align | **KEEP** |
| Real Fajita | `real-fajita` | 6/9/12 | 470/890/1470 | `menu-pizza.jpg` | High | Align | **KEEP** |
| Mexicana | `mexicana` | 6/9/12 | 470/890/1470 | `menu-pizza.jpg` | High | Align | **KEEP** |
| Cheese Lover | `cheese-lover` | 6/9/12 | 470/890/1470 | `menu-pizza.jpg` | High | Align | **KEEP** |

No badge mismatches observed on Classic.

### 2.3 Specialty Pizzas

| Name | Slug | Variants / price | Evidence | DB | API | Website | Static | Decision |
|---|---|---|---|---|---|---|---|---|
| Chicago Extreme | `chicago-extreme` | Medium=1199 · Large=1899 | High (structured board) | ✓ | ✓ | ✓ (M/L shown) | ✓ | **KEEP** |
| Crown Crust | `crown-crust` | Medium=1199 · Large=1799 | High | ✓ | ✓ | ✓ | ✓ prices; static badge `Chef Special` vs live badge `null` | **KEEP** prices · **CORRECT** badge drift (cosmetic) if owner wants Chef Special |
| Stuffed Crust | `stuffed-crust` | base **1749** (size unspecified on board) | Medium | ✓ | ✓ | ✓ Add | ✓ | **KEEP** (label clarity open — not wrong price) |
| Tele Extreme Pizza | `tele-extreme` | base **1699** (size unspecified) | Medium | ✓ | ✓ | ✓ | ✓ | **KEEP** |
| 16" Incher | `sixteen-inch-incher` | base **2399** | High | ✓ | ✓ | ✓ | ✓ | **KEEP** |
| Behari Kabab Pizza | `behari-kabab-pizza` | base **549** · badge Starting Price · no variants | Medium — marketing poster only; not on GM food photo | ✓ published | ✓ | ✓ **publicly shown** | ✓ | **BLOCK** — do not alter; needs exact price/variants owner confirm (BFR-003) |

### 2.4 Not in structured V1 pizza baseline (do not invent)

| Candidate | Source | Live layers | Decision |
|---|---|---|---|
| Malai Boti | GM Link 3 only (S/M/L 620/1270/1890) | **Absent** everywhere | **BLOCK / HOLD** — not on structured board; do **not ADD** without explicit owner approval |
| Iftar Tele Special 799 | Promotional | Absent as permanent SKU | **KEEP out** of permanent catalog |

### 2.5 Pizza toppings (customizer)

| Addon | Baseline prices | Architecture today | Catalog SKU? | Decision |
|---|---|---|---|---|
| Extra Chicken | 50 / 100 / 150 (S/M/L) | `cart-config.ts` + `PizzaCustomizerDialog.tsx` | No | **KEEP** as customizer · **BLOCK** catalog SKU publish until BFR-012 signed |
| Extra Cheese | 50 / 100 / 150 | Same | No | Same |
| Cheese Slice | 60 | Same | No | Same |

Topping tier mapping accepts both `9 inch` and `10 inch` labels (`getToppingTierFromVariantLabel`) — future-proof; live labels are `9 inch Medium`.

---

## 3. Exact mismatches

### 3.1 Missing items (vs structured baseline core list)

| Item | Status |
|---|---|
| Signature / Classic / Specialty core list | **None missing** vs owner-expected core set |
| Malai Boti | Missing vs **GM**, not vs structured board — not a V1 gap unless BFR expands baseline |

### 3.2 Wrong prices

| Against structured board baseline | Result |
|---|---|
| All KEEP rows above | **No price mismatches** across Supabase / API / website / static |
| Against GM Jul 2026 | Almost all prices **differ** (e.g. Signature 499≠620) — logged under EC / BFR-001; **do not correct to GM** without owner lock |

### 3.3 Wrong size labels

| Topic | Finding |
|---|---|
| Live / static | **6 inch Small / 9 inch Medium / 12 inch Large** |
| GM conflict | **6" / 10" Medium / 12"** (BFR-015 / BFR-005 `OPEN`) |
| Specialty Crown/Chicago | Labels **Medium / Large** without inch — matches structured specialty board style |
| Stuffed / Tele Extreme | Size blank on board · single `base_price` — intentional ambiguity preserved |

### 3.4 Duplicates

| Pair | Notes |
|---|---|
| `bihari-kabab` (Signature) vs `behari-kabab-pizza` (Specialty) | Distinct SKUs · distinct romanizations · not a data duplicate · product-policy collision for customers |
| No slug duplicates in pizza categories | Confirmed |

### 3.5 Unsupported / fragile public items

| Item | Issue |
|---|---|
| Behari Kabab Pizza | Public at Rs 549 “Starting Price” without owner-locked full size matrix |
| Generic pizza imagery | Most specialty + several classics share `menu-pizza.jpg` — image gap, not price gap |

### 3.6 Unavailable variants

None observed. All signature/classic/specialty variants queried have `is_available=true`.

### 3.7 Image gaps

| Gap | SKUs |
|---|---|
| Shared generic `menu-pizza.jpg` | Bihari Kabab, Kababish, most Classic, Chicago, Stuffed, Tele Extreme, Behari Kabab Pizza, 16" Incher |
| Hashed asset `menu-pizza_f729e710.jpg` | Tele Special, Peri Peri, Tikka, Chicken Supreme, Crown Crust |
| Product-specific hero photos | **Not present** for pizza SKUs |

### 3.8 Static fallback drift

| Field | Static (`menu-data.ts`) | Live DB/API |
|---|---|---|
| Prices / variants | Match | Match |
| Crown Crust badge | `Chef Special` | `null` (featured=true) |
| Behari Kabab Pizza | Published | Published |
| Toppings | Customizer only | Customizer only |

Static ↔ live parity for **prices and pizza membership** is good. Cosmetic badge drift on Crown Crust only.

---

## 4. Explicit isolations

### 4.1 Behari Kabab Pizza (`behari-kabab-pizza`)

| Question | Evidence |
|---|---|
| On structured pizza size board? | No (specialty list elsewhere) |
| On marketing/poster evidence? | Yes — starting Rs 549 |
| On GM Link 3? | No |
| Live published? | **Yes** on website, API, DB |
| Owner register | BFR-003: partial **KEEP**; price/variants **pending** |
| Sprint rule | **Do not silently reprice, variant, hide, or expand** until explicit decision |

**Recommended owner options (no auto-action):**  
A) KEEP @ 549 as single small / starting · B) DEFINE full size matrix · C) REMOVE_FROM_PUBLIC_VIEW until complete.

### 4.2 Toppings architecture

| Layer | Status |
|---|---|
| Catalog `menu_items` | **0** topping SKUs |
| Website customizer | Verified prices 50/100/150 + slice 60 |
| BFR-012 | Formally `OPEN`; technical recommendation **CUSTOMIZER_ONLY** |
| Risk | Publishing toppings as products without approval **forbidden** |

### 4.3 Specialty size labels

| SKU | Label clarity | Recommendation |
|---|---|---|
| Chicago / Crown | M/L clear | KEEP |
| Stuffed Crust · Tele Extreme | Unspecified size on board | KEEP single price · optional future owner label |
| 16" Incher | Explicit 16" | KEEP |

### 4.4 6/9/12 vs 6/10/12 conflict

| Source | Medium label | Signature S/M/L |
|---|---|---|
| Structured board + live stack | **9"** | 499 / 950 / 1570 |
| GM Jul 2026 Link 3 | **10"** | 620 / 1250 / 1890 |

**Publish rule:** Stay on **6/9/12 + current Rs** until BFR-001 / BFR-015 owner-signed. Do not “correct” to GM.

---

## 5. Proposed implementation plan (Stage 2 — after owner approval only)

### 5.1 Exact owner gates before any write

1. **BFR-001** — confirm structured board as locked V1 (vs GM / hybrid).  
2. **BFR-003** — Behari Kabab Pizza: exact KEEP price/variants **or** REMOVE_FROM_PUBLIC_VIEW.  
3. **BFR-012** — toppings CUSTOMIZER_ONLY (recommended) vs catalog.  
4. Optional: Malai Boti ADD? Specialty size captions? Crown badge keep Chef Special?

Until gates cleared: **no migration / no seed / no public hide-or-add**.

### 5.2 Files (conditional after approval)

| Area | Paths |
|---|---|
| Seed / migration | New SQL under `supabase/migrations/` (do **not** edit production by hand) |
| Static fallback | `apps/website/client/src/data/menu-data.ts` |
| Customizer | `apps/website/client/src/data/cart-config.ts`, `PizzaCustomizerDialog.tsx` |
| Catalog mapping | `apps/website/client/src/lib/menu-catalog.ts` |
| Images | `apps/website/client/public/images/` + `menu-images.ts` / register |
| Tests | Extend DB static assertions `tests/database/*.test.mjs`; website catalog parity test; API script `scripts/verify-production-api.mjs` + pizza-focused compare script |

### 5.3 Exact data changes (example — only if owners approve structured baseline + Behari option A)

- **No price changes** for Signature/Classic/Specialty KEEP rows (already aligned).  
- Behari: if KEEP @ 549 → document LOCKED; if REMOVE → set `is_available=false` (or remove public mapping) + static sync.  
- Crown badge: sync static ↔ DB if chef badge desired.  
- Toppings: leave customizer-only if BFR-012 A.  
- Malai Boti: ADD only if explicitly approved.

### 5.4 Tests

- Assert pizza category counts 4/6/6 (or 4/6/5 if Behari removed).  
- Assert each KEEP SKU price matrix vs fixture JSON from structured board.  
- Assert no topping catalog rows unless BFR-012 B/C.  
- Assert `malai-boti` absent unless approved.  
- Browser smoke: `/menu` live banner · Signature filter · customizer topping prices.

### 5.5 Rollback

- Revert migration (or restore prior `menu_items`/`menu_item_variants` snapshot).  
- Redeploy previous website artifact.  
- Keep static `menu-data.ts` as customer-safe fallback (already present).

### 5.6 Production verification steps

1. `node scripts/verify-production-api.mjs https://telepizza-api.onrender.com`  
2. Anon Supabase pizza count/matrix script (read-only).  
3. Browser: live Supabase banner + Signature / Classic / Specialty prices.  
4. Diff report: Printed = DB = API = Website for pizza only.  
5. Update `SPRINT-02-REPORT.md` with PASS/FAIL (one report per sprint — next artifact).

---

## 6. Stage 1 constraints honored

- No code changes  
- No database mutations  
- No commit  
- No push  
- Non-pizza categories untouched  

---

## 7. Summary verdict

| Area | Status |
|---|---|
| Signature pizza price/size parity (board ↔ DB ↔ API ↔ web ↔ static) | **ALIGNED** |
| Classic pizza parity | **ALIGNED** |
| Specialty core prices | **ALIGNED** |
| Behari Kabab Pizza | **BLOCKED** (policy incomplete; currently public) |
| Toppings | Aligned as customizer; **BFR-012 unsigned** |
| GM 6/10/12 higher prices | **Conflict logged — not applied** |
| Malai Boti | Absent; **do not invent** |
| Images | Generic placeholders — gap, not price mismatch |

**Owner action required before Stage 2 implementation:**

1. Sign BFR-001 (structured board lock recommended).  
2. Finish BFR-003 for Behari Kabab Pizza.  
3. Sign BFR-012 toppings UX.  

---

## PIZZA IMPLEMENTATION STATUS: READY

*(Stage 2 implementation delivered 2026-07-15 under BFR-001 HYBRID · BFR-003 REPRICE · BFR-012 BOTH. See `SPRINT-02-REPORT.md`.)*
