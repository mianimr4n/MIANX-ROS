# CANONICAL MENU COMPLETION AUDIT

**Date:** 2026-07-18  
**Branch:** `feature/canonical-menu-database-completion`  
**Verdict:** **BLOCKED — OWNER EVIDENCE REQUIRED**

---

## Executive summary

Delivered a single canonical manifest, forward-only DB sync design (not applied), website fallback generated from the manifest, modifier price alignment for linked SKUs, validation tests, and owner docs. Production catalog already matches the V1 hybrid freeze (**13 / 58 / 3 / 40 / 7**, Dips on, Broast off). Completion cannot be declared **PASS** because **owner structured menu-board image files are missing from the repository**, and several domains remain gap/flagged under change control.

---

## Phase 0 — Source review

| Rank | Evidence | Result |
|---:|---|---|
| 1 | Owner menu-board images | **GAP** — not in repo (`assets/menu/` absent; evidence docs reference uploads/Maps URLs only) |
| 2 | Approved extracted docs | Used: `_documentation-audit/evidence/REAL_MENU_EXTRACTED.md`, `REAL-MENU-EXTRACTION.md` |
| 3 | Prod DB via public API | `GET /api/v1/menu/catalog` → meta 13/58/3/40/7; categories include Dips; no Broast |
| 4 | Migrations | Owner sync + modifier system reviewed; new content sync drafted |
| 5 | Website fallback | Was duplicate price list; now **generated from canonical** |
| 6 | Promo creatives | Eid/Iftar recorded as temporary ≠ evergreen |

**Conflicts:** Never silent-picked. Board-era kept under **BFR-001 HYBRID**; GM deltas and promo prices flagged `OWNER_CONFIRMATION_REQUIRED`.

---

## Phase 1 — Gap audit matrix

| Domain | V1 sellable | Gap / conflict |
|---|---|---|
| Pizzas | Signature/Classic/Specialty board set | GM higher prices; Malai Boti missing; 9" vs 10" medium |
| Burgers | Zinger 450, Patty 299 | Grill/smash/extra chicken on GM; Zinger multi-source |
| Broast | None (discontinued) | GM Injected Broast present; owner sync retired |
| Sandwiches | 4 board SKUs | GM higher prices |
| Wraps | 4 board SKUs | GM jumbo/grill set differs |
| Pasta | 2 SKUs | Alfredo gap; Special/Flaming naming ambiguous |
| Wings / Fries / Sides | Board set | GM higher prices |
| Drinks / Water | 6 SKUs | Aligned board-era |
| Sauces | 4 Dips SKUs | Correct model (no separate sauce tables) |
| Toppings | 3 modifier-only | Cheese slice static delta corrected 50→60 |
| Crust / add-ons | Modifier groups | Paid crust/veg/meat extras **unverified** on boards |
| Deals | 7 evergreen | Eid/Iftar temporary conflicts flagged |

---

## Phase 2 — Canonical file

**Path:** `data/catalog/telepizza-canonical-menu.json` (exactly one)

- Stable `code` identity (no UUID identity)
- PKR prices; lifecycle: sellable / modifier-only / hidden / discontinued / owner-confirmation-required
- Temporary offers separated from evergreen
- Conflicted items flagged, not silently resolved

---

## Phase 3 — DB sync design

**File:** `supabase/migrations/20260718180000_sync_canonical_menu_catalog.sql`

| Rule | Status |
|---|---|
| Upsert by slug | Yes |
| Deactivate obsolete (no DELETE) | Yes |
| Preserve order history | Yes |
| Schema can represent modifiers | Yes — `item_modifier_groups` + linked options |
| Production apply | **NOT DONE** — owner approval required |
| Dry-run | `pnpm catalog:dry-run` (file-level) |

**Schema blocker:** None for representation. **Evidence blocker:** owner boards + gap approvals.

---

## Phase 4 — Website single-source

| Before | After |
|---|---|
| Hand-maintained `menu-data.ts` duplicate prices | Generated from canonical (`pnpm catalog:generate-fallback`) |
| Live path already Supabase-first | Preserved with graceful fallback |
| Modifier static deltas drifted from SKUs | Aligned drinks/fries/slice to catalog |

---

## Phase 5 — Customization path

Verified architecture (no order/auth/RLS changes):

- Cart carries modifier codes → quote/create server-side reprice
- `order_item_modifiers` immutable snapshots
- WhatsApp includes extras; money authority remains server quote

Unverified seed modifier prices remain flagged in canonical (do not treat as board-verified).

---

## Phase 6 — Tests + validation

| Check | Command / path |
|---|---|
| Canonical suite | `tests/catalog/canonical-menu.test.mjs` |
| Migration dry-run | `pnpm catalog:dry-run` |
| Existing option-B / modifier tests | Still assert 13 cats, no broast browse, dips/zinger |

---

## Phase 7 — Owner package

| Artifact | Path |
|---|---|
| Owner menu doc | `docs/catalog/TELEPIZZA-CANONICAL-MENU.md` |
| This audit | `_documentation-audit/reports/CANONICAL-MENU-COMPLETION-AUDIT.md` |
| Manifest | `data/catalog/telepizza-canonical-menu.json` |

---

## Blockers for PASS

1. **Owner menu-board image files not in repo** (critical)
2. Broast re-activate vs keep-retired decision
3. BFR-018 Zinger + remaining GM price era confirmations / Admin update plan
4. Unverified modifier seed prices (crust paid / vegetables / meat extras)
5. Explicit approval to apply `20260718180000` to production

---

## Delivery checklist

- [x] Branch `feature/canonical-menu-database-completion`
- [x] One canonical JSON
- [x] Forward-only migration designed (not applied)
- [x] Website fallback generated from canonical
- [x] Tests + dry-run script
- [x] Owner docs
- [ ] Owner approval
- [ ] Prod migration apply
- [ ] Deploy *(explicitly out of scope)*
