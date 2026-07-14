# Pizza Category Freeze Cycle

**Pack:** Telepizza V1 Business Freeze Pack  
**Category:** Pizza (Signature + Classic + Specialty + Extra Topping)  
**Status:** 🟡 **AWAITING OWNER SIGNATURE** on [MASTER-OWNER-SIGNOFF.md](../MASTER-OWNER-SIGNOFF.md)  
**Governance:** One Category = One Completion Cycle  
**Prerequisite:** Owner signs [OWNER-SIGNOFF-2PAGE.md](../OWNER-SIGNOFF-2PAGE.md) → [IMPLEMENTATION-LOCK.md](../IMPLEMENTATION-LOCK.md) = LOCKED

---

## V1 scope rules (locked)

| Rule | Source |
|---|---|
| Telebar **not** in V1 public menu | BFR-007 APPROVED → `PLANNED_V2` |
| Only GM-verified permanent items | `REAL-MENU-EXTRACTION.md` |
| No LOCK without BFR-001 price source | Execution order Step 1 |
| No category rework after LOCK | Amendment via Decision Register only |

---

## Completion cycle (this category)

```text
Evidence          → GM Link 3 + workbook rows        [██████░░] 80%
Owner Verification → BFR-001 + per-item sign-off      [░░░░░░░░]  0%  ← BLOCKED on BFR-001
Database Update    → migration + variants              [░░░░░░░░]  0%
Website Update     → menu-data + catalog               [░░░░░░░░]  0%
UI Test            → desktop menu + customizer         [░░░░░░░░]  0%
Mobile Test        → 375px journey                     [░░░░░░░░]  0%
Production Test    → live site + Supabase              [░░░░░░░░]  0%
Sign-off           → category authority                [░░░░░░░░]  0%
LOCKED             → FREEZE_STATUS on all pizza SKUs   [░░░░░░░░]  0%
```

---

## BFR-001 blocker (must resolve first)

| Option | Source | Pizza impact |
|---|---|---|
| **A) GM Jul 2026** | `REAL-MENU-EXTRACTION.md` | All pizza prices **increase**; medium = **10"** |
| **B) Older board** | `REAL_MENU_EXTRACTED.md` | Keeps current web/DB prices; medium = **9"** |
| **C) Hybrid** | Owner specifies per-tier | Document each exception in Decision Register |

**Owner decision BFR-001:** ⬜ Pending — record in [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md)

---

## Subcategory 1 — Signature Pizza (4 items)

**GM tier:** 6" Small **620** · 10" Medium **1250** · 12" Large **1890**

| SKU | GM S/M/L | Web/DB S/M/L | Size label | Evidence | Owner action | Sign-off |
|---|---|---|---|---|---|---|
| tele-special | 620 / 1250 / 1890 | 499 / 950 / 1570 | 9" → 10" | Link 3 ✓ | ⬜ UPDATE* | |
| peri-peri | 620 / 1250 / 1890 | 499 / 950 / 1570 | 9" → 10" | Link 3 ✓ | ⬜ UPDATE* | |
| bihari-kabab | 620 / 1250 / 1890 | 499 / 950 / 1570 | 9" → 10" | Link 3 ✓ | ⬜ UPDATE* | |
| kababish | 620 / 1250 / 1890 | 499 / 950 / 1570 | 9" → 10" | Link 3 ✓ | ⬜ UPDATE* | |

\*Final action depends on BFR-001. If A → UPDATE all to GM. If B → KEEP with owner initials.

**Subcategory gate:** 4 / 4 signed → ⬜

---

## Subcategory 2 — Classic Pizza (6 items)

**GM tier:** 6" Small **600** · 10" Medium **1200** · 12" Large **1790**

| SKU | GM S/M/L | Web/DB S/M/L | Owner action | Sign-off |
|---|---|---|---|---|
| tikka | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |
| bonfire | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |
| chicken-supreme | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |
| real-fajita | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |
| mexicana | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |
| cheese-lover | 600 / 1200 / 1790 | 470 / 890 / 1470 | ⬜ | |

**Subcategory gate:** 6 / 6 signed → ⬜

---

## Subcategory 3 — Specialty Pizza (7 rows)

| SKU | Variants | GM Rs | Web/DB Rs | Evidence | Owner action | Sign-off |
|---|---|---|---|---|---|---|
| chicago-extreme | M / L | 1470 / 2150 | 1199 / 1899 | Link 3 ✓ | ⬜ UPDATE* | |
| crown-crust | M / L | 1470 / 2099 | 1199 / 1799 | Link 3 ✓ | ⬜ UPDATE* | |
| malai-boti | S / M / L | 620 / 1270 / 1890 | — missing | Link 3 ✓ | ⬜ ADD | |
| stuffed-crust | — | 2050 | 1749 | Link 3 ✓ | ⬜ UPDATE* | |
| tele-extreme | — | 1950 | 1699 | Link 3 ✓ | ⬜ UPDATE* | |
| sixteen-inch-incher | 16" | 2800 | 2399 | Link 3 ✓ | ⬜ UPDATE* | |
| behari-kabab-pizza | — | **not on GM** | 549 | — | ⬜ **BFR-003** REVIEW | |

**Subcategory gate:** 7 / 7 resolved → ⬜

---

## Subcategory 4 — Extra Topping (addons)

| SKU | Variants | GM Rs | In catalog | Owner action | Sign-off |
|---|---|---|---|---|---|
| extra-chicken-topping | S / M / L | 50 / 100 / 150 | ✗ | ⬜ ADD (BFR-012) | |
| extra-cheese-topping | S / M / L | 50 / 100 / 150 | ✗ | ⬜ ADD (BFR-012) | |
| cheese-slice | — | 60 | ✗ | ⬜ ADD (BFR-012) | |

**UX decision BFR-012:** Customizer-only vs catalog line items → affects website implementation.

**Subcategory gate:** 3 / 3 signed → ⬜

---

## Pizza category totals

| Metric | Count |
|---|---:|
| Evidence SKUs (incl. toppings) | 20 |
| In website/DB today | 17 |
| Missing (ADD) | 1 (`malai-boti`) + 3 toppings |
| REVIEW | 1 (`behari-kabab-pizza`) |
| Price match today | 0 |
| LOCKED | 0 |

**V1 pizza target after cycle:** 19 SKUs LOCKED (if BFR-003 = REMOVE behari-kabab-pizza) or 20 (if KEEP).

---

## Implementation checklist (after BFR-001 + owner sign-off)

Execute in order — **do not skip steps**.

### Phase A — Database

- [ ] `menu_categories` — pizza categories `sort_order` verified
- [ ] `menu_items` — names, descriptions from GM text
- [ ] `menu_item_variants` — S/M/L prices per BFR-001; label `10 inch Medium` if GM canonical
- [ ] ADD `malai-boti` + toppings (if approved)
- [ ] RESOLVE `behari-kabab-pizza` per BFR-003
- [ ] Slug parity test vs static

### Phase B — Website

- [ ] `menu-data.ts` — sync to DB
- [ ] `menu-catalog.ts` — `sort_order` fix (prerequisite for live load)
- [ ] Pizza customizer — addon prices if BFR-012 approved
- [ ] `cart-config.ts` — medium variant label

### Phase C — Images

- [ ] Per-SKU hero / card / thumb (or approved category placeholder policy)
- [ ] Update [IMAGE-ASSET-REGISTER.md](./IMAGE-ASSET-REGISTER.md)

### Phase D — Tests

- [ ] UI: all pizza cards, customizer, cart line format
- [ ] Mobile: TC-02, TC-03 from [CUSTOMER-JOURNEY-TEST.md](./CUSTOMER-JOURNEY-TEST.md)
- [ ] Production: spot-check 10 pizza SKUs vs workbook

### Phase E — Sign-off

- [ ] [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) §1–4 complete
- [ ] [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) — all pizza SKUs `FREEZE_STATUS = LOCKED`
- [ ] Category authority signature below

---

## Category sign-off

| Field | Value |
|---|---|
| Category | Pizza (Signature + Classic + Specialty + Extra Topping) |
| BFR-001 applied | ⬜ |
| SKUs LOCKED | ___ / ___ |
| Date | |
| Menu authority | |
| Technical verifier | |

**After LOCK:** Proceed to **Burgers** category cycle (next in queue) — or **Broast** if burgers blocked on BFR-002.

---

## Category queue (after Pizza)

| Order | Category | Blockers |
|---|---|---|
| **1** | **Pizza** | BFR-001, BFR-003, BFR-012 | ← **ACTIVE** |
| 2 | Broast | None (prices match — fast lock candidate) |
| 3 | Burgers | BFR-002 Zinger, BFR-011 category structure |
| 4 | Sandwiches | BFR-001 |
| 5 | Wraps | BFR-004 jumbo-wrap |
| 6 | Wings | BFR-010 Creamo spelling |
| 7 | Fries | BFR-001 |
| 8 | Pasta | BFR-001 |
| 9 | Chicken & Sides | BFR-001 |
| 10 | Drinks | BFR-001 |
| 11 | Deals | BFR-001 + BFR-002 |
| 12 | Dips | ADD all |
| 13 | Add-ons | BFR-012 |
| 14 | Telebar | **PLANNED_V2** — separate V2 module cycle |

---

*Template: copy this file for each category as `categories/{name}-FREEZE-CYCLE.md` when pizza cycle completes.*
