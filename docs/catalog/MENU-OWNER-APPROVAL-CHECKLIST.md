# Menu Owner Evidence Checklist

**Purpose:** Structured owner approval interface to unblock catalog completion after [PR #80](https://github.com/mianimr4n/telepizza/pull/80) (merged; verdict was **BLOCKED — OWNER EVIDENCE REQUIRED**).  
**Manifest (read-only reference):** [`data/catalog/telepizza-canonical-menu.json`](../../data/catalog/telepizza-canonical-menu.json)  
**Companion docs:** [`TELEPIZZA-CANONICAL-MENU.md`](./TELEPIZZA-CANONICAL-MENU.md), [`CANONICAL-MENU-COMPLETION-AUDIT.md`](../../_documentation-audit/reports/CANONICAL-MENU-COMPLETION-AUDIT.md)  
**Currency:** PKR · **Baseline:** BFR-001 HYBRID (board-era V1 in DB; GM Jul-13 = reference only) · **Freeze:** 13 / 58 / 3 / 40 / 7  

> This checklist is an **approval worksheet only**. It does not change catalog JSON, invent prices, apply migrations, or deploy. Fill **Owner decision** and final fields; leave blanks where evidence is still missing.

### Status options (per Decision ID)

`APPROVE_AS_IS` · `APPROVE_WITH_CHANGE` · `DEACTIVATE` · `TEMPORARY_PROMOTION` · `BRANCH_SPECIFIC` · `EVIDENCE_REQUIRED`

### Record field key

| Field | Meaning |
|---|---|
| **Decision ID** | Stable ID for sign-off |
| **Category** | Browse / domain bucket |
| **Item** | Display name |
| **Variant/size** | Size or option, or `—` |
| **Current database value** | Live / hybrid V1 value in prod API freeze |
| **Conflicting value** | Alternate evidence value (usually GM Jul-13) |
| **Source of each value** | Where each number or state came from |
| **Missing evidence** | What still blocks PASS |
| **Recommended decision** | Agent recommendation only (not applied) |
| **Owner decision** | Fill: one of the status options |
| **Final approved name** | Owner fills |
| **Final approved price** | Owner fills (PKR) |
| **Active/inactive** | Owner fills |
| **Branch availability** | Owner fills (`all` / named branches / TBD) |
| **Permanent or promotional** | Owner fills |
| **Notes** | Owner fills |

---

## Owner summary (sign this page first)

| Metric | Count |
|---:|---:|
| **Total unresolved decisions** (Decision IDs below) | **92** |
| **Total price conflicts** (board/hybrid vs GM or promo) | **42** |
| **Total missing items** (GM/gap, not in V1 sellable) | **15** |
| **Total proposed deactivations** (already discontinued / retired) | **6** |
| **Total branch-specific decisions** | **1** |
| **Menu-board image files still required** | **See evidence list below** |

### Exact menu-board images / pages still required

Structured owner board files are **MISSING from the repo** (`assets/menu/` absent). Until these are checked in (or an authoritative path is confirmed), completion stays blocked:

| # | Required artifact | Current substitute | Status |
|---|---|---|---|
| 1 | Structured store menu-board image set (all categories) under repo path e.g. `assets/menu/` | None | **MISSING** |
| 2 | GM Link 1 photo — Deals, Sandwich, Wings, Fries, Roll, Wrap, Crispy Box, Tender Strips, Dips, Drinks | `https://maps.app.goo.gl/JTZ2iYpLgTHC2w4w9` · photo `CIABIhAkOQvSA2jzTdRF-UBrUvid` · transcribed in `REAL-MENU-EXTRACTION.md` | URL only — file not in repo |
| 3 | GM Link 2 photo — Burgers, Paratha roll, Mozzarella sticks, Pasta, telebar | `https://maps.app.goo.gl/hPKKJq6QD9TWrdev9` · photo `CIABIhABzakiTB8hwvOL8gB9mmBP` | URL only — file not in repo |
| 4 | GM Link 3 photo — Signature / Classic / Specialty pizzas + Extra Topping | `https://maps.app.goo.gl/LiyqtGfnHbg5fVxh9` · photo `CIABIhC-v6pMInI9JKwTVUEEVPYY` | URL only — file not in repo |
| 5 | GM Link 4 photo — Injected Broast, Grill/Smash burgers, Jumbo/Grill wraps | `https://maps.app.goo.gl/u7F5HkrxRVJnUvcz9` · photo `CIABIhDmLTFpMGOFgOm3fLWfqLCe` | URL only — file not in repo |
| 6 | Any current physical board / print that supersedes Jul-13 GM photos | Unknown | **OWNER TO SUPPLY** |
| 7 | Eid / Iftar creative boards (if those promos are still relevant) | Recorded as temporary/hidden in JSON only | Confirm keep-hidden vs schedule |

**Global blockers (from audit):** (1) board image files, (2) Broast retire vs return, (3) BFR-018 Zinger + GM price-era policy, (4) unverified modifier seed deltas, (5) explicit approval before any production apply of `20260718180000`.

---

## 1. Broast / Fried Chicken

> Prod browse: Broast **off**. GM Link 4 still lists Injected Broast. Canonical rows are `discontinued` + `OWNER_CONFIRMATION_REQUIRED`.

### MOC-001 — Category: Broast (browse tab)

| Field | Value |
|---|---|
| Decision ID | `MOC-001` |
| Category | Broast |
| Item | Broast category |
| Variant/size | — |
| Current database value | Category lifecycle **discontinued** / not in public 13 |
| Conflicting value | GM Link 4 shows Injected Broast section |
| Source of each value | DB: owner sync `20260716160000` + prod API 2026-07-18 · Conflict: `REAL-MENU-EXTRACTION.md` Link 4 |
| Missing evidence | Structured board images confirming Broast on/off |
| Recommended decision | `DEACTIVATE` (keep retired) unless boards prove return |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | — |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-002 — Quarter Broast

| Field | Value |
|---|---|
| Decision ID | `MOC-002` |
| Category | Broast |
| Item | Quarter Broast (`quarter-broast`) |
| Variant/size | — |
| Current database value | **750** PKR · `is_available=false` / discontinued |
| Conflicting value | Same **750** on GM (evidence present) but sold state conflicts with retirement |
| Source of each value | DB retired: `20260716160000` · Price evidence: GM Link 4 |
| Missing evidence | Board images + explicit re-activate or keep-retired |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-003 — Half Broast

| Field | Value |
|---|---|
| Decision ID | `MOC-003` |
| Category | Broast |
| Item | Half Broast (`half-broast`) |
| Variant/size | — |
| Current database value | **1390** PKR · discontinued |
| Conflicting value | GM **1390** (present) vs retired browse |
| Source of each value | Owner sync retire · GM Link 4 |
| Missing evidence | Board images + re-activate decision |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-004 — Full Broast

| Field | Value |
|---|---|
| Decision ID | `MOC-004` |
| Category | Broast |
| Item | Full Broast (`full-broast`) |
| Variant/size | — |
| Current database value | **2590** PKR · discontinued |
| Conflicting value | GM **2590** vs retired browse |
| Source of each value | Owner sync retire · GM Link 4 |
| Missing evidence | Board images + re-activate decision |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-005 — Extra Garlic Dip (Broast)

| Field | Value |
|---|---|
| Decision ID | `MOC-005` |
| Category | Broast |
| Item | Extra Garlic Dip (`broast-garlic-dip`) |
| Variant/size | — |
| Current database value | **60** PKR · discontinued |
| Conflicting value | GM Extra Dips Garlic **60** |
| Source of each value | Owner sync retire · GM Link 4 |
| Missing evidence | Board images; whether broast dips return with Broast |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | Distinct from Dips browse SKUs @ 50 |

### MOC-006 — Extra Mustard Dip (Broast)

| Field | Value |
|---|---|
| Decision ID | `MOC-006` |
| Category | Broast |
| Item | Extra Mustard Dip (`broast-mustard-dip`) |
| Variant/size | — |
| Current database value | **60** PKR · discontinued |
| Conflicting value | GM Extra Dips Mustard **60** |
| Source of each value | Owner sync retire · GM Link 4 |
| Missing evidence | Board images; return-with-Broast decision |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

---

## 2. Sauces and Dips

> Model: sauces = **Dips** browse SKUs (not separate sauce tables). Board-era hybrid prices are aligned; still need board-file confirmation for PASS.

### MOC-007 — Special Sauce Dip

| Field | Value |
|---|---|
| Decision ID | `MOC-007` |
| Category | Dips |
| Item | Special Sauce (`special-sauce-dip`) |
| Variant/size | — |
| Current database value | **50** PKR · sellable |
| Conflicting value | None flagged in canonical |
| Source of each value | Board-era hybrid + prod API · GM Link 1 dips |
| Missing evidence | Structured board image file in repo |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-008 — Bone Fire Dip

| Field | Value |
|---|---|
| Decision ID | `MOC-008` |
| Category | Dips |
| Item | Bone Fire (`bone-fire-dip`) |
| Variant/size | — |
| Current database value | **50** PKR · sellable |
| Conflicting value | Spelling: board “Bone Fire” vs likely “Bonfire” |
| Source of each value | Hybrid DB · GM Link 1 · extraction spelling note |
| Missing evidence | Board image confirming printed name |
| Recommended decision | `APPROVE_AS_IS` or `APPROVE_WITH_CHANGE` (rename) |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-009 — Dip Sauce

| Field | Value |
|---|---|
| Decision ID | `MOC-009` |
| Category | Dips |
| Item | Dip Sauce (`dip-sauce`) |
| Variant/size | — |
| Current database value | **50** PKR · sellable |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-010 — Garlic Ranch Dip

| Field | Value |
|---|---|
| Decision ID | `MOC-010` |
| Category | Dips |
| Item | Garlic Ranch (`garlic-ranch-dip`) |
| Variant/size | — |
| Current database value | **50** PKR · sellable |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 3. Drinks and Water

> Water lives under **Drinks**. Hybrid prices aligned; confirm on boards.

### MOC-011 — Drink 1.5L

| Field | Value |
|---|---|
| Decision ID | `MOC-011` |
| Category | Drinks |
| Item | 1.5L Drink (`drink-1-5l`) |
| Variant/size | 1.5L |
| Current database value | **210** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-012 — Drink 1L

| Field | Value |
|---|---|
| Decision ID | `MOC-012` |
| Category | Drinks |
| Item | 1L Drink (`drink-1l`) |
| Variant/size | 1L |
| Current database value | **170** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-013 — Drink 500ml

| Field | Value |
|---|---|
| Decision ID | `MOC-013` |
| Category | Drinks |
| Item | 500ml Drink (`drink-500ml`) |
| Variant/size | 500ml |
| Current database value | **110** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-014 — Drink 345ml

| Field | Value |
|---|---|
| Decision ID | `MOC-014` |
| Category | Drinks |
| Item | 345ml Drink (`drink-345ml`) |
| Variant/size | 345ml |
| Current database value | **70** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-015 — Large Water

| Field | Value |
|---|---|
| Decision ID | `MOC-015` |
| Category | Drinks (water) |
| Item | Large Water (`large-water`) |
| Variant/size | Large |
| Current database value | **99** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-016 — Small Water

| Field | Value |
|---|---|
| Decision ID | `MOC-016` |
| Category | Drinks (water) |
| Item | Small Water (`small-water`) |
| Variant/size | Small |
| Current database value | **50** PKR |
| Conflicting value | None flagged |
| Source of each value | Hybrid DB · GM Link 1 |
| Missing evidence | Board image file |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 4. Pizza Variants

> Shared conflict: hybrid board-era vs GM Jul-13 (often higher; medium labeled **9"** hybrid vs **10"** GM). Do not silent-replace.

### Signature (S 499 / M 950 / L 1570 vs GM S 620 / M 1250 / L 1890)

### MOC-017 — Tele Special

| Field | Value |
|---|---|
| Decision ID | `MOC-017` |
| Category | Signature Pizzas |
| Item | Tele Special (`tele-special`) |
| Variant/size | S / M / L |
| Current database value | **499 / 950 / 1570** |
| Conflicting value | GM **620 / 1250 / 1890** (M as 10") |
| Source of each value | Hybrid: `REAL_MENU_EXTRACTED.md` + `20260716160000` + prod API · Conflict: GM Link 3 |
| Missing evidence | Board image files; price-era policy (see MOC-084) |
| Recommended decision | `APPROVE_AS_IS` under BFR-001 **or** `APPROVE_WITH_CHANGE` to GM era |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-018 — Peri Peri

| Field | Value |
|---|---|
| Decision ID | `MOC-018` |
| Category | Signature Pizzas |
| Item | Peri Peri (`peri-peri`) |
| Variant/size | S / M / L |
| Current database value | **499 / 950 / 1570** |
| Conflicting value | GM **620 / 1250 / 1890** |
| Source of each value | Hybrid board-era · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-019 — Bihari Kabab (signature)

| Field | Value |
|---|---|
| Decision ID | `MOC-019` |
| Category | Signature Pizzas |
| Item | Bihari Kabab (`bihari-kabab`) |
| Variant/size | S / M / L |
| Current database value | **499 / 950 / 1570** · sellable |
| Conflicting value | GM **620 / 1250 / 1890**; separate retired poster SKU `behari-kabab-pizza` (MOC-087) |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; confirm romanization Bihari vs Behari |
| Recommended decision | `APPROVE_AS_IS` (keep signature) + confirm deactivation of poster duplicate |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-020 — Kababish

| Field | Value |
|---|---|
| Decision ID | `MOC-020` |
| Category | Signature Pizzas |
| Item | Kababish (`kababish`) |
| Variant/size | S / M / L |
| Current database value | **499 / 950 / 1570** |
| Conflicting value | GM **620 / 1250 / 1890** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Classic (S 470 / M 890 / L 1470 vs GM S 600 / M 1200 / L 1790)

### MOC-021 — Tikka

| Field | Value |
|---|---|
| Decision ID | `MOC-021` |
| Category | Classic Pizzas |
| Item | Tikka (`tikka`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-022 — Bonfire

| Field | Value |
|---|---|
| Decision ID | `MOC-022` |
| Category | Classic Pizzas |
| Item | Bonfire (`bonfire`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-023 — Chicken Supreme

| Field | Value |
|---|---|
| Decision ID | `MOC-023` |
| Category | Classic Pizzas |
| Item | Chicken Supreme (`chicken-supreme`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-024 — Real Fajita

| Field | Value |
|---|---|
| Decision ID | `MOC-024` |
| Category | Classic Pizzas |
| Item | Real Fajita (`real-fajita`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-025 — Mexicana

| Field | Value |
|---|---|
| Decision ID | `MOC-025` |
| Category | Classic Pizzas |
| Item | Mexicana (`mexicana`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-026 — Cheese Lover

| Field | Value |
|---|---|
| Decision ID | `MOC-026` |
| Category | Classic Pizzas |
| Item | Cheese Lover (`cheese-lover`) |
| Variant/size | S / M / L |
| Current database value | **470 / 890 / 1470** |
| Conflicting value | GM **600 / 1200 / 1790** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Specialty

### MOC-027 — Chicago Extreme

| Field | Value |
|---|---|
| Decision ID | `MOC-027` |
| Category | Specialty Pizzas |
| Item | Chicago Extreme (`chicago-extreme`) |
| Variant/size | M / L |
| Current database value | **1199 / 1899** |
| Conflicting value | GM **1470 / 2150** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-028 — Crown Crust

| Field | Value |
|---|---|
| Decision ID | `MOC-028` |
| Category | Specialty Pizzas |
| Item | Crown Crust (`crown-crust`) |
| Variant/size | M / L |
| Current database value | **1199 / 1799** |
| Conflicting value | GM **1470 / 2099** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-029 — Stuffed Crust

| Field | Value |
|---|---|
| Decision ID | `MOC-029` |
| Category | Specialty Pizzas |
| Item | Stuffed Crust (`stuffed-crust`) |
| Variant/size | **SIZE AMBIGUOUS** (flat SKU) |
| Current database value | **1749** (no size variants) |
| Conflicting value | GM flat **2050**; size not printed clearly |
| Source of each value | Hybrid · GM Link 3 · flag `SIZE_AMBIGUOUS_ON_BOARD` |
| Missing evidence | Board image showing size label |
| Recommended decision | `EVIDENCE_REQUIRED` then `APPROVE_WITH_CHANGE` (assign size) |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-030 — Tele Extreme

| Field | Value |
|---|---|
| Decision ID | `MOC-030` |
| Category | Specialty Pizzas |
| Item | Tele Extreme Pizza (`tele-extreme`) |
| Variant/size | **SIZE AMBIGUOUS** (flat SKU) |
| Current database value | **1699** |
| Conflicting value | GM flat **1950** |
| Source of each value | Hybrid · GM Link 3 · `SIZE_AMBIGUOUS_ON_BOARD` |
| Missing evidence | Board image showing size label |
| Recommended decision | `EVIDENCE_REQUIRED` then size + price sign-off |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-031 — 16" Incher

| Field | Value |
|---|---|
| Decision ID | `MOC-031` |
| Category | Specialty Pizzas |
| Item | 16" Incher (`sixteen-inch-incher`) |
| Variant/size | 16" |
| Current database value | **2399** |
| Conflicting value | GM **2800** |
| Source of each value | Hybrid · GM Link 3 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 5. Burgers and Sandwiches

### MOC-032 — Zinger Burger (BFR-018)

| Field | Value |
|---|---|
| Decision ID | `MOC-032` |
| Category | Burgers |
| Item | Zinger Burger (`zinger-burger`) |
| Variant/size | — |
| Current database value | **450** PKR (hybrid kept) |
| Conflicting value | Promo **440** · GM Link 2 **550** |
| Source of each value | Hybrid board · promo creative · GM Link 2 · flag `BFR-018` |
| Missing evidence | Authoritative board/promo period; Admin update plan if changing |
| Recommended decision | `EVIDENCE_REQUIRED` → then lock one price |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | Highest-priority burger conflict |

### MOC-033 — Patty Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-033` |
| Category | Burgers |
| Item | Patty Burger (`patty-burger`) |
| Variant/size | — |
| Current database value | **299** PKR |
| Conflicting value | GM **350** |
| Source of each value | Hybrid · GM Link 2 |
| Missing evidence | Board images; era policy |
| Recommended decision | `APPROVE_AS_IS` or `APPROVE_WITH_CHANGE` to GM |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-034 — Crunchy Sandwich

| Field | Value |
|---|---|
| Decision ID | `MOC-034` |
| Category | Sandwiches |
| Item | Crunchy Sandwich (`crunchy-sandwich`) |
| Variant/size | — |
| Current database value | **799** PKR |
| Conflicting value | GM **950** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-035 — Special Sandwich

| Field | Value |
|---|---|
| Decision ID | `MOC-035` |
| Category | Sandwiches |
| Item | Special Sandwich (`special-sandwich`) |
| Variant/size | — |
| Current database value | **749** PKR |
| Conflicting value | GM **930** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-036 — Baked Smoked

| Field | Value |
|---|---|
| Decision ID | `MOC-036` |
| Category | Sandwiches |
| Item | Baked Smoked (`baked-smoked-sandwich`) |
| Variant/size | — |
| Current database value | **749** PKR |
| Conflicting value | GM **930** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-037 — Sizzling Sandwich

| Field | Value |
|---|---|
| Decision ID | `MOC-037` |
| Category | Sandwiches |
| Item | Sizzling Sandwich (`sizzling-sandwich`) |
| Variant/size | — |
| Current database value | **749** PKR |
| Conflicting value | GM **930** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images; era policy |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 6. Sides

> Includes wings, fries, chicken pieces, wraps & rolls, pasta (non-pizza sides).

### Wings

### MOC-038 — Fried & Crispy Wings

| Field | Value |
|---|---|
| Decision ID | `MOC-038` |
| Category | Wings |
| Item | Fried & Crispy (`fried-crispy-wings`) |
| Variant/size | — |
| Current database value | **599** |
| Conflicting value | GM **650** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-039 — BBQ Wings

| Field | Value |
|---|---|
| Decision ID | `MOC-039` |
| Category | Wings |
| Item | BBQ (`bbq-wings`) |
| Variant/size | — |
| Current database value | **599** |
| Conflicting value | GM **650** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-040 — Creamo Wings

| Field | Value |
|---|---|
| Decision ID | `MOC-040` |
| Category | Wings |
| Item | Creamo (`creamo-wings`) |
| Variant/size | — |
| Current database value | **599** |
| Conflicting value | GM **650**; caption sometimes “Cremo” |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images; spelling confirm |
| Recommended decision | `APPROVE_AS_IS` (name) + price era decision |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-041 — Oven Baked Wings

| Field | Value |
|---|---|
| Decision ID | `MOC-041` |
| Category | Wings |
| Item | Oven Baked (`oven-baked-wings`) |
| Variant/size | — |
| Current database value | **549** |
| Conflicting value | GM **600** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-042 — Flaming Wings

| Field | Value |
|---|---|
| Decision ID | `MOC-042` |
| Category | Wings |
| Item | Flaming (`flaming-wings`) |
| Variant/size | — |
| Current database value | **549** |
| Conflicting value | GM **600** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Fries

### MOC-043 — Loaded Fries

| Field | Value |
|---|---|
| Decision ID | `MOC-043` |
| Category | Fries |
| Item | Loaded Fries (`loaded-fries`) |
| Variant/size | — |
| Current database value | **650** |
| Conflicting value | GM **790** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-044 — French Fries

| Field | Value |
|---|---|
| Decision ID | `MOC-044` |
| Category | Fries |
| Item | French Fries (`french-fries`) |
| Variant/size | — |
| Current database value | **199** |
| Conflicting value | GM **250** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-045 — Family Fries

| Field | Value |
|---|---|
| Decision ID | `MOC-045` |
| Category | Fries |
| Item | Family Fries (`family-fries`) |
| Variant/size | — |
| Current database value | **350** |
| Conflicting value | GM **390** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Chicken & sides (flagged)

### MOC-046 — Chicken Tender Strips

| Field | Value |
|---|---|
| Decision ID | `MOC-046` |
| Category | Chicken & Sides |
| Item | Chicken Tender Strips (`chicken-tender-strips`) |
| Variant/size | — |
| Current database value | **590** |
| Conflicting value | GM **750** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-047 — Crispy Box

| Field | Value |
|---|---|
| Decision ID | `MOC-047` |
| Category | Chicken & Sides |
| Item | Crispy Box (`crispy-box`) |
| Variant/size | — |
| Current database value | **670** |
| Conflicting value | GM **790** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-048 — Fried Chicken (Chest)

| Field | Value |
|---|---|
| Decision ID | `MOC-048` |
| Category | Chicken & Sides |
| Item | Fried Chicken (Chest) (`fried-chicken-chest`) |
| Variant/size | Chest |
| Current database value | **250** |
| Conflicting value | GM **300** |
| Source of each value | Hybrid · GM |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-049 — Fried Chicken (piece)

| Field | Value |
|---|---|
| Decision ID | `MOC-049` |
| Category | Chicken & Sides |
| Item | Fried Chicken (`fried-chicken`) |
| Variant/size | Piece |
| Current database value | **220** |
| Conflicting value | GM **280** |
| Source of each value | Hybrid · GM |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Wraps & rolls

### MOC-050 — Jumbo Wrap

| Field | Value |
|---|---|
| Decision ID | `MOC-050` |
| Category | Wraps & Rolls |
| Item | Tele Pizza Special Jumbo Wrap (`jumbo-wrap`) |
| Variant/size | Jumbo |
| Current database value | **649** · name board-era |
| Conflicting value | GM Link 4 different Jumbo SKUs @ **950** (name + price conflict) |
| Source of each value | Hybrid · GM Link 4 · flags `GM_NAME_CONFLICT` + `GM_PRICE_CONFLICT` |
| Missing evidence | Board images; which jumbo SKU is live |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | Related gaps MOC-078 / MOC-079 |

### MOC-051 — Crunchy Wrap

| Field | Value |
|---|---|
| Decision ID | `MOC-051` |
| Category | Wraps & Rolls |
| Item | Crunchy Wrap (`crunchy-wrap`) |
| Variant/size | — |
| Current database value | **399** |
| Conflicting value | GM **550** |
| Source of each value | Hybrid · GM |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-052 — Dynamite Wrap

| Field | Value |
|---|---|
| Decision ID | `MOC-052` |
| Category | Wraps & Rolls |
| Item | Dynamite Wrap (`dynamite-wrap`) |
| Variant/size | — |
| Current database value | **399** |
| Conflicting value | GM **550** |
| Source of each value | Hybrid · GM |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-053 — Behari Roll

| Field | Value |
|---|---|
| Decision ID | `MOC-053` |
| Category | Wraps & Rolls |
| Item | Behari Roll (`behari-roll`) |
| Variant/size | — |
| Current database value | **799** |
| Conflicting value | GM **950** |
| Source of each value | Hybrid · GM Link 1 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Pasta

### MOC-054 — Crunchy Pasta

| Field | Value |
|---|---|
| Decision ID | `MOC-054` |
| Category | Pasta |
| Item | Crunchy Pasta (`crunchy-pasta`) |
| Variant/size | — |
| Current database value | **849** |
| Conflicting value | GM **980** |
| Source of each value | Hybrid · GM Link 2 |
| Missing evidence | Board images |
| Recommended decision | Same as MOC-017 |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-055 — Special / Flaming Pasta

| Field | Value |
|---|---|
| Decision ID | `MOC-055` |
| Category | Pasta |
| Item | Special Pasta / Flaming Pasta (`special-pasta`) |
| Variant/size | — |
| Current database value | **749** · combined name |
| Conflicting value | GM lists **SPECIAL 899** and **FLAMING 899** as separate; Alfredo gap MOC-082 |
| Source of each value | Hybrid board layout · GM Link 2 · flag `NAME_AMBIGUOUS_ON_BOARD` |
| Missing evidence | Board image clarifying Special vs Flaming as one or two SKUs |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 7. Deals

### Evergreen deals with temporary promo conflicts

### MOC-056 — Family Deal

| Field | Value |
|---|---|
| Decision ID | `MOC-056` |
| Category | Deals |
| Item | Family Deal (`family-deal`) |
| Variant/size | — |
| Current database value | Evergreen **2250** |
| Conflicting value | Eid temp `eid-family-deal` **2199** (hidden) |
| Source of each value | Board evergreen · Eid creative · flags `EID_PROMO_CONFLICT` |
| Missing evidence | Confirm evergreen stays 2250; promo schedule |
| Recommended decision | `APPROVE_AS_IS` evergreen + `TEMPORARY_PROMOTION` for Eid if needed |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | Do not overwrite evergreen with promo |

### MOC-057 — Pizza Fest

| Field | Value |
|---|---|
| Decision ID | `MOC-057` |
| Category | Deals |
| Item | Pizza Fest (`pizza-fest`) |
| Variant/size | — |
| Current database value | Evergreen **1680** |
| Conflicting value | Eid temp **1649** |
| Source of each value | Board evergreen · Eid creative |
| Missing evidence | Promo schedule confirmation |
| Recommended decision | Keep evergreen; promo separate |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-058 — Pair Deal

| Field | Value |
|---|---|
| Decision ID | `MOC-058` |
| Category | Deals |
| Item | Pair Deal (`pair-deal`) |
| Variant/size | — |
| Current database value | Evergreen **1999** |
| Conflicting value | Eid temp **2099** + flag `CONTENT_CONFLICT_DRINK_SIZE` |
| Source of each value | Board evergreen · Eid creative |
| Missing evidence | Drink-size content on Eid creative; boards |
| Recommended decision | Evergreen stay; resolve drink size on promo |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-059 — Knock Out Deal

| Field | Value |
|---|---|
| Decision ID | `MOC-059` |
| Category | Deals |
| Item | Knock Out Deal (`knock-out-deal`) |
| Variant/size | — |
| Current database value | Evergreen **1440** |
| Conflicting value | Eid temp **1390** |
| Source of each value | Board evergreen · Eid creative |
| Missing evidence | Promo schedule |
| Recommended decision | Keep evergreen separate from temp |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### Temporary / hidden offers (do not merge into evergreen)

### MOC-060 — Eid Family Deal (temp)

| Field | Value |
|---|---|
| Decision ID | `MOC-060` |
| Category | Deals (temporary) |
| Item | Eid Celebration Family Deal (`eid-family-deal`) |
| Variant/size | — |
| Current database value | Hidden · **2199** · maps to `family-deal` |
| Conflicting value | Evergreen 2250 |
| Source of each value | Promo creative · canonical `temporaryOffers` |
| Missing evidence | Whether promo is still active / archive |
| Recommended decision | `TEMPORARY_PROMOTION` or keep `hidden` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Promotional |
| Notes | |

### MOC-061 — Eid Pizza Fest (temp)

| Field | Value |
|---|---|
| Decision ID | `MOC-061` |
| Category | Deals (temporary) |
| Item | Eid Celebration Pizza Fest (`eid-pizza-fest`) |
| Variant/size | — |
| Current database value | Hidden · **1649** |
| Conflicting value | Evergreen pizza-fest 1680 |
| Source of each value | Promo creative |
| Missing evidence | Active window |
| Recommended decision | `TEMPORARY_PROMOTION` or keep hidden |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Promotional |
| Notes | |

### MOC-062 — Eid Knock Out (temp)

| Field | Value |
|---|---|
| Decision ID | `MOC-062` |
| Category | Deals (temporary) |
| Item | Eid Celebration Knock Out (`eid-knock-out`) |
| Variant/size | — |
| Current database value | Hidden · **1390** |
| Conflicting value | Evergreen knock-out 1440 |
| Source of each value | Promo creative |
| Missing evidence | Active window |
| Recommended decision | `TEMPORARY_PROMOTION` or keep hidden |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Promotional |
| Notes | |

### MOC-063 — Eid Pair Deal (temp)

| Field | Value |
|---|---|
| Decision ID | `MOC-063` |
| Category | Deals (temporary) |
| Item | Eid Celebration Pair Deal (`eid-pair-deal`) |
| Variant/size | — |
| Current database value | Hidden · **2099** · `CONTENT_CONFLICT_DRINK_SIZE` |
| Conflicting value | Evergreen pair-deal 1999 |
| Source of each value | Promo creative |
| Missing evidence | Drink size content + active window |
| Recommended decision | `EVIDENCE_REQUIRED` on drink size |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Promotional |
| Notes | |

### MOC-064 — Iftar Tele Special (temp)

| Field | Value |
|---|---|
| Decision ID | `MOC-064` |
| Category | Deals (temporary) |
| Item | Tele Special Pizza — Iftar Special (`iftar-tele-special`) |
| Variant/size | Time window 5PM–7PM |
| Current database value | Hidden · **799** |
| Conflicting value | Signature Tele Special size prices (not a flat 799 evergreen) |
| Source of each value | Iftar creative · flag `TIME_WINDOW_5PM_7PM` |
| Missing evidence | Whether window still applies |
| Recommended decision | `TEMPORARY_PROMOTION` or keep hidden |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Promotional |
| Notes | |

---

## 8. Modifiers and Add-ons

### MOC-065 — Thick Crust delta

| Field | Value |
|---|---|
| Decision ID | `MOC-065` |
| Category | Modifiers / Crust |
| Item | Thick Crust |
| Variant/size | crust option `thick` |
| Current database value | Seed delta **+50** |
| Conflicting value | No board price printed in repo evidence |
| Source of each value | DB-R2 seed · flag `NO_BOARD_PRICE_EVIDENCE` / `unverified-seed` |
| Missing evidence | Board showing paid crust prices |
| Recommended decision | `EVIDENCE_REQUIRED` or `DEACTIVATE` paid option |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | Classic/Thin remain 0 |

### MOC-066 — Cheese Burst Crust delta

| Field | Value |
|---|---|
| Decision ID | `MOC-066` |
| Category | Modifiers / Crust |
| Item | Cheese Burst Crust |
| Variant/size | `cheese-burst` |
| Current database value | Seed delta **+150** |
| Conflicting value | No board price in repo evidence |
| Source of each value | DB-R2 seed · unverified |
| Missing evidence | Board images |
| Recommended decision | `EVIDENCE_REQUIRED` or `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-067 — Extra vegetables group

| Field | Value |
|---|---|
| Decision ID | `MOC-067` |
| Category | Modifiers |
| Item | Extra vegetables (olives/mushrooms/onions/peppers/jalapeños/corn/tomatoes) |
| Variant/size | Multi options |
| Current database value | Seed deltas **30–40** |
| Conflicting value | No structured board prices |
| Source of each value | DB-R2 seed · `NO_BOARD_PRICE_EVIDENCE` |
| Missing evidence | Board images for veg extras |
| Recommended decision | `EVIDENCE_REQUIRED` or deactivate group |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-068 — Extra toppings (meat) group

| Field | Value |
|---|---|
| Decision ID | `MOC-068` |
| Category | Modifiers |
| Item | Extra toppings — pepperoni / smoked chicken / BBQ chicken |
| Variant/size | Multi options |
| Current database value | Seed deltas **+80** each |
| Conflicting value | No structured board prices |
| Source of each value | DB-R2 seed · unverified |
| Missing evidence | Board images |
| Recommended decision | `EVIDENCE_REQUIRED` or deactivate |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | Distinct from board Extra Chicken/Cheese toppings |

### MOC-069 — Extra Chicken / Extra Cheese / Cheese Slice (board toppings)

| Field | Value |
|---|---|
| Decision ID | `MOC-069` |
| Category | Toppings (modifier-only) |
| Item | Extra Chicken · Extra Cheese · Extra Cheese Slice |
| Variant/size | S/M/L for chicken & cheese; slice flat |
| Current database value | Chicken/Cheese **50/100/150**; Slice **60** (aligned) |
| Conflicting value | None material (slice previously drifted 50→60, now aligned) |
| Source of each value | GM Link 3 Extra Topping · topping SKUs |
| Missing evidence | Board image file check-in |
| Recommended decision | `APPROVE_AS_IS` after boards confirm |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | Active (modifier-only, not browse tab) |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

---

## 9. Branch-specific availability

> Canonical JSON has **no** per-branch availability rows. Freeze notes two branches; GM photos are Royal Orchard Multan.

### MOC-070 — Catalog shared across branches?

| Field | Value |
|---|---|
| Decision ID | `MOC-070` |
| Category | Branch availability |
| Item | Entire V1 sellable catalog (13/58/3/40/7) |
| Variant/size | — |
| Current database value | Assumed shared; `branch_modifier_options` historically empty (default-open) |
| Conflicting value | Unknown New Branch / non-RO differences; GM evidence is RO Multan only |
| Source of each value | Prod freeze · GM place = Royal Orchard · DB-R2 notes |
| Missing evidence | Owner statement per branch; optional branch boards |
| Recommended decision | `BRANCH_SPECIFIC` if any SKU differs; else confirm `all` |
| Owner decision | _pending_ |
| Final approved name | — |
| Final approved price | — |
| Active/inactive | |
| Branch availability | _owner: all / list exceptions_ |
| Permanent or promotional | |
| Notes | List any SKU that is RO-only or NB-only |

---

## 10. Conflicting prices

> Domain rows above carry the per-SKU conflicts. This section locks the **policy** decisions that resolve many rows at once.

### MOC-084 — Price era policy (BFR-001)

| Field | Value |
|---|---|
| Decision ID | `MOC-084` |
| Category | Conflicting prices (policy) |
| Item | Global hybrid vs GM Jul-13 era |
| Variant/size | All GM_PRICE_CONFLICT SKUs (~38 browse) |
| Current database value | Board-era hybrid (prod API freeze) |
| Conflicting value | GM Jul-13 higher prices across pizzas, burgers, sandwiches, wraps, wings, fries, sides, pasta |
| Source of each value | BFR-001 approved hybrid · GM Links 1–4 · canonical flags |
| Missing evidence | Owner choice: keep hybrid, adopt GM, or Admin phased update |
| Recommended decision | Keep hybrid until boards prove GM era **or** schedule Admin updates |
| Owner decision | _pending_ |
| Final approved name | — |
| Final approved price | _policy outcome_ |
| Active/inactive | — |
| Branch availability | |
| Permanent or promotional | Permanent (until next board) |
| Notes | Resolves MOC-017–031, 033–054 in batch if chosen |

### MOC-085 — Medium pizza size label (9" vs 10")

| Field | Value |
|---|---|
| Decision ID | `MOC-085` |
| Category | Conflicting prices / size |
| Item | Signature + Classic medium size label |
| Variant/size | Medium |
| Current database value | Label **9 inch Medium** |
| Conflicting value | GM mediumLabel **10"** |
| Source of each value | Hybrid variant labels · GM Link 3 |
| Missing evidence | Board image showing printed inch size |
| Recommended decision | `EVIDENCE_REQUIRED` then `APPROVE_WITH_CHANGE` if needed |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | — (label only unless price era also changes) |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### Price-conflict index (no duplicate worksheets)

| Decision IDs | Domain | Pattern |
|---|---|---|
| MOC-017–031 | Pizzas | Hybrid vs GM |
| MOC-032 | Zinger | 450 vs 440 vs 550 |
| MOC-033–037 | Burgers/Sandwiches | Hybrid vs GM |
| MOC-038–055 | Sides/Wraps/Pasta | Hybrid vs GM / naming |
| MOC-056–059 | Deals | Evergreen vs Eid temp |

---

## 11. Items with no evidence (gaps / not in V1 sellable)

> From `ownerGapsNotInV1Sellable`. **Do not invent into sellable** without board confirmation.

### MOC-071 — Malai Boti

| Field | Value |
|---|---|
| Decision ID | `MOC-071` |
| Category | Specialty Pizzas (gap) |
| Item | Malai Boti (`malai-boti`) |
| Variant/size | S / M / L |
| Current database value | **Not in V1 sellable** |
| Conflicting value | GM **620 / 1270 / 1890** |
| Source of each value | GM Link 3 · gap list |
| Missing evidence | Owner board confirming add vs omit |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-072 — Smokehouse Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-072` |
| Category | Burgers (gap) |
| Item | Smokehouse Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **650** (NEW grill) |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-073 — Grill Boss Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-073` |
| Category | Burgers (gap) |
| Item | Grill Boss Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **890** |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-074 — Chipotle Fire Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-074` |
| Category | Burgers (gap) |
| Item | Chipotle Fire Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **890** |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-075 — Classic Beef Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-075` |
| Category | Burgers (gap) |
| Item | Classic Beef Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **690** |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-076 — Signature Beef Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-076` |
| Category | Burgers (gap) |
| Item | Signature Beef Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **1090** |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-077 — Supreme Beef Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-077` |
| Category | Burgers (gap) |
| Item | Supreme Beef Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **1090** |
| Source of each value | GM Link 4 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-078 — Classic Crunch Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-078` |
| Category | Burgers (gap) |
| Item | Classic Crunch Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **450** |
| Source of each value | GM Link 2 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-079 — Big Boss Burger

| Field | Value |
|---|---|
| Decision ID | `MOC-079` |
| Category | Burgers (gap) |
| Item | Big Boss Burger |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **690** |
| Source of each value | GM Link 2 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-080 — Paratha roll

| Field | Value |
|---|---|
| Decision ID | `MOC-080` |
| Category | Sides (gap) |
| Item | Paratha roll |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **390** |
| Source of each value | GM Link 2 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-081 — Mozzarella jalapeno sticks

| Field | Value |
|---|---|
| Decision ID | `MOC-081` |
| Category | Sides (gap) |
| Item | Mozzarella jalapeno sticks |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **599** |
| Source of each value | GM Link 2 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-082 — Alfredo Pasta

| Field | Value |
|---|---|
| Decision ID | `MOC-082` |
| Category | Pasta (gap) |
| Item | ALFREDO PASTA |
| Variant/size | — |
| Current database value | Not sellable |
| Conflicting value | GM **1100** (marked NEW) |
| Source of each value | GM Link 2 |
| Missing evidence | Board / launch decision |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-083 — Wrap it Hot Grilled Jumbo

| Field | Value |
|---|---|
| Decision ID | `MOC-083` |
| Category | Wraps (gap) |
| Item | Wrap it Hot Grilled Jumbo |
| Variant/size | Jumbo |
| Current database value | Not sellable |
| Conflicting value | GM **950** |
| Source of each value | GM Link 4 |
| Missing evidence | Board; interaction with MOC-050 |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-086 — Jalapeno Kick Grilled Jumbo

| Field | Value |
|---|---|
| Decision ID | `MOC-086` |
| Category | Wraps (gap) |
| Item | Jalapeno Kick Grilled Jumbo |
| Variant/size | Jumbo |
| Current database value | Not sellable |
| Conflicting value | GM **950** |
| Source of each value | GM Link 4 |
| Missing evidence | Board; interaction with MOC-050 |
| Recommended decision | `EVIDENCE_REQUIRED` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

### MOC-088 — telebar module (BFR-007)

| Field | Value |
|---|---|
| Decision ID | `MOC-088` |
| Category | telebar (gap / V2) |
| Item | telebar (43 SKUs) |
| Variant/size | Module |
| Current database value | Excluded from V1 · PLANNED_V2 |
| Conflicting value | Present on GM Link 2 beverages/desserts |
| Source of each value | BFR-007 · `REAL-MENU-EXTRACTION.md` |
| Missing evidence | V2 go/no-go; not required for V1 PASS if confirmed deferred |
| Recommended decision | Confirm **defer V2** or `EVIDENCE_REQUIRED` for V1 include |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | — |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | |
| Notes | |

---

## 12. Items proposed for deactivation

> Already discontinued in DB / canonical. Owner must confirm keep-retired vs restore.

| Decision ID | Item | Current DB | Conflicting evidence | Recommended | Owner decision |
|---|---|---|---|---|---|
| MOC-001–006 | Broast category + 5 SKUs | Discontinued / off browse | GM Link 4 present | `DEACTIVATE` keep | _pending_ |
| **MOC-087** | Behari Kabab Pizza (`behari-kabab-pizza`) | Discontinued · base **549** · `POSTER_ONLY` | Signature `bihari-kabab` remains sellable; not on GM specialty photo | `DEACTIVATE` keep | _pending_ |

### MOC-087 — Behari Kabab Pizza (poster-only duplicate)

| Field | Value |
|---|---|
| Decision ID | `MOC-087` |
| Category | Specialty / deactivation |
| Item | Behari Kabab Pizza (`behari-kabab-pizza`) |
| Variant/size | — |
| Current database value | **549** · discontinued · retired by owner sync |
| Conflicting value | Signature Bihari Kabab still sellable (MOC-019) |
| Source of each value | Owner sync · notes “poster only / not on GM specialty photo” |
| Missing evidence | Confirm permanent retire |
| Recommended decision | `DEACTIVATE` |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | Inactive |
| Branch availability | |
| Permanent or promotional | Permanent retire |
| Notes | |

### MOC-089 — Production sync apply gate

| Field | Value |
|---|---|
| Decision ID | `MOC-089` |
| Category | Process / deactivation sync |
| Item | Migration `20260718180000_sync_canonical_menu_catalog.sql` |
| Variant/size | — |
| Current database value | **Not applied to production** |
| Conflicting value | N/A — content sync designed only |
| Source of each value | Audit Phase 3 · PR #80 |
| Missing evidence | Completed owner sign-off on MOC-001–088 + board files |
| Recommended decision | Do **not** apply until checklist signed |
| Owner decision | _pending_ |
| Final approved name | — |
| Final approved price | — |
| Active/inactive | — |
| Branch availability | — |
| Permanent or promotional | — |
| Notes | Explicit out-of-scope for agents to apply |

### MOC-090 — Nuggets / Hot Shots board confirm (aligned, light touch)

| Field | Value |
|---|---|
| Decision ID | `MOC-090` |
| Category | Chicken & Sides |
| Item | Nuggets (`nuggets`) · Hot Shots (`hot-shots`) |
| Variant/size | — |
| Current database value | **449** each · sellable · **no GM_PRICE_CONFLICT flag** |
| Conflicting value | None in canonical flags |
| Source of each value | Hybrid freeze · board-era |
| Missing evidence | Still need board image files for global PASS |
| Recommended decision | `APPROVE_AS_IS` after boards |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | Included so chicken-sides set is fully signed |

### MOC-091 — Unflagged evergreen deals board confirm

| Field | Value |
|---|---|
| Decision ID | `MOC-091` |
| Category | Deals |
| Item | Mega Offer · Family Festival · Deal for 2 |
| Variant/size | — |
| Current database value | **3140** / **2350** / **999** · no conflict flags |
| Conflicting value | None flagged |
| Source of each value | Hybrid board evergreen |
| Missing evidence | Board image files |
| Recommended decision | `APPROVE_AS_IS` after boards |
| Owner decision | _pending_ |
| Final approved name | |
| Final approved price | |
| Active/inactive | |
| Branch availability | |
| Permanent or promotional | Permanent |
| Notes | |

### MOC-092 — Owner sign-off block

| Field | Value |
|---|---|
| Decision ID | `MOC-092` |
| Category | Sign-off |
| Item | Catalog completion PASS |
| Variant/size | — |
| Current database value | Status `BLOCKED_OWNER_EVIDENCE_REQUIRED` |
| Conflicting value | — |
| Source of each value | Canonical completionStatus · audit |
| Missing evidence | All critical MOCs + board files |
| Recommended decision | Leave blocked until signed |
| Owner decision | _pending_ |
| Final approved name | — |
| Final approved price | — |
| Active/inactive | — |
| Branch availability | — |
| Permanent or promotional | — |
| Notes | Owner name / date / signature: ______________________ |

---

## How to use

1. Check in board image files (or confirm authoritative path) — evidence table above.  
2. Decide **MOC-084** (era) and **MOC-001** (Broast) first — they cascade.  
3. Resolve **MOC-032** (Zinger / BFR-018) and size-ambiguous specialty pizzas.  
4. Approve or deactivate unverified modifiers (**MOC-065–068**).  
5. Confirm gaps (**MOC-071–083, 086, 088**) stay out of V1 or get board-backed adds.  
6. Sign **MOC-092**. Only then consider production apply of content sync (**MOC-089**).

---

*Generated 2026-07-18 from PR #80 artifacts. Docs-only. No catalog mutations.*
