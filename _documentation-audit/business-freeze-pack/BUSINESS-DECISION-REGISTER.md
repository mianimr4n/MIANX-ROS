# Business Decision Register

**Pack:** Telepizza V1 Business Freeze Pack  
**Governance:** Mianx.ai  
**Purpose:** Immutable audit trail for every owner decision affecting menu, branding, pricing, and V1 scope.  
**Rule:** No decision may be hard-coded into production without a row here marked `APPROVED`.  
**Evidence rule:** Explicit **owner approval** overrides conflicting evidence. Conflicts are preserved, not silently merged.

**Supersedes for V1 freeze:** `_documentation-audit/reports/BUSINESS-DECISION-REGISTER-20260712-113849.md` (backend-era decisions remain valid but separate).

---

## Evidence governance (V1)

| Evidence type | Role |
|---|---|
| **Structured menu-board images** | V1 **permanent baseline** (pending BFR-001 owner approve) |
| Standalone non-seasonal posters | Supporting evidence |
| Eid / Iftar creatives | `TEMPORARY_PROMOTION_ONLY` |
| Conflicting social / promo posters | Review required — **do not** replace baseline silently |
| `REAL-MENU-EXTRACTION.md` (GM Jul 2026) | Secondary / newer evidence — conflicts logged |
| Owner dashboard (post-launch) | Ongoing operational authority |

---

## Status definitions

| Status | Meaning |
|---|---|
| `OPEN` | Not decided — blocks freeze |
| `PENDING_EVIDENCE` | Awaiting photo, receipt, or owner document |
| `APPROVED` | Signed — propagate to catalog, DB, website |
| `REJECTED` | Explicitly not doing — document reason |
| `DEFERRED_V2` | Out of V1 scope — not on public menu |
| `NEEDS_OWNER_CONFIRMATION` | Blocks implementation for affected SKU |
| `HOLD` | Do not publish / implement until owner confirms |

---

## V1 freeze decisions (menu & branding)

| ID | Decision | Options | Status | Approved value | Source | Date | Approver |
|---|---|---|---|---|---|---|---|
| **BFR-001** | V1 canonical baseline source | A) Structured menu-board images · B) GM Jul 2026 · C) Hybrid | `OPEN` | — | 4 structured board images (recommended) | — | — |
| **BFR-002** | Zinger Burger standalone SKU | _(see BFR-018)_ | `HOLD` | — | Superseded by BFR-018 | — | — |
| **BFR-003** | Behari Kabab Pizza (`behari-kabab-pizza`) | A) Keep · B) Reprice · C) Remove | `NEEDS_OWNER_CONFIRMATION` | **KEEP** — price/variants pending | Marketing + site; not on GM food photos | 2026-07-14 | Partial |
| **BFR-004** | `jumbo-wrap` (649) vs GM Jumbo Wraps (950) | A) Rename/reprice to GM · B) Remove · C) Keep as separate legacy | `OPEN` | — | `REAL-MENU-EXTRACTION.md` §7 | — | — |
| **BFR-005** | Pizza medium size label | A) 10" Medium (GM) · B) Keep 9" | `OPEN` | — | GM Link 3 | — | — |
| **BFR-006** | Royal Orchard hours **10:00 AM – 2:30 AM** | A) Confirm · B) Correct to: ___ | `APPROVED` | **10:00 AM – 2:30 AM daily** | Business owner 2026-07-14 | 2026-07-14 | Business owner |
| **BFR-007** | Telebar on customer website V1 | A) Full telebar · B) Drinks only · C) Defer to V2 | `APPROVED` | **V2 only — `PLANNED_V2`; not on public website in V1** | 43 GM items; GM Link 2 | 2026-07-14 | Business owner (proposal) |
| **BFR-008** | About page stats (4.3★, 642 reviews, 10K+/mo) | A) Provide evidence · B) Remove · C) Replace with: ___ | `OPEN` | — | `About.tsx` | — | — |
| **BFR-009** | Tagline on website | A) "Love At First Bite" · B) Keep marketing copy · C) Both | `OPEN` | — | GM Link 1 | — | — |
| **BFR-010** | Creamo vs Cremo wings spelling | A) Creamo · B) Cremo | `OPEN` | — | GM print vs Maps caption | — | — |
| **BFR-011** | Burgers category structure | A) Single "Burgers" · B) Split Grill / Smash / Chicken | `OPEN` | — | GM has 3 sections | — | — |
| **BFR-012** | Extra toppings UX model | A) Customizer only · B) Catalog SKUs · C) Both | `OPEN` | — | GM Extra Topping | — | — |
| **BFR-013** | Official phone number | A) 0304-1110495 · B) 0304-1111795 · C) Other | `APPROVED` / **LOCKED** | **0304-1110495** · WhatsApp **923041110495** | Owner explicit 2026-07-14 | 2026-07-14 | Business owner |
| **BFR-018** | Zinger Burger canonical price | Rs 450 board · Rs 440 poster · Rs 550 GM | `NEEDS_OWNER_CONFIRMATION` | **Standalone SKU = HOLD** | Multi-source conflict | 2026-07-14 | — |
| **BFR-014** | Active vs seasonal deals (V1) | Owner ticks each deal ACTIVE/INACTIVE | `OPEN` | — | GM 7 deals vs social promos | — | — |
| **BFR-015** | Pizza size labels (canonical) | A) 6/10/12" GM · B) 6/9/12" site · C) 7/10/13" · D) Other | `OPEN` | — | Supersedes BFR-005 when signed | — | — |
| **BFR-016** | V1 branch scope | A) Royal Orchard only · B) Multi-branch structure | `APPROVED` | **Royal Orchard Active · Northern Bypass Coming Soon** | Owner confirm 2026-07-14 | 2026-07-14 | Business owner |

---

## Evidence conflicts (preserved — do not auto-resolve)

| ID | Subject | Canonical / baseline | Conflicting evidence | Publish rule |
|---|---|---|---|---|
| EC-001 | Alternate phone | **0304-1110495** (BFR-013 LOCKED) | **0304-1111795** on promo creatives | **DO NOT PUBLISH** — UNVERIFIED historical/promotional |
| EC-002 | Zinger Burger | — (SKU on HOLD) | Rs 450 structured board · Rs 440 poster · Rs 550 GM | BFR-018 — no standalone price until owner confirms |
| EC-003 | Pizza Fest | Baseline **Rs 1680** | Promo poster **Rs 1649** | Promo only until owner approves permanent change |
| EC-004 | Pair Deal | Baseline **Rs 1999** | Promo evidence **Rs 2099** | Promo only until owner approves |
| EC-005 | Family Deal | Baseline **Rs 2250** | Promo evidence **Rs 2199** | Promo only until owner approves |
| EC-006 | Knock Out Deal | Baseline **Rs 1440** | Promo evidence **Rs 1390** | Promo only until owner approves |

---

## Verified item confirmations (baseline-aligned)

| SKU | Status | Baseline evidence | Notes |
|---|---|---|---|
| `behari-kabab-pizza` | **KEEP** | Marketing creatives | Price/variants — BFR-003 pending |
| `crown-crust` | **SUPPORTED** | Structured board + standalone poster | Align to baseline on BFR-001 approve |
| `crunchy-pasta` | **SUPPORTED @ Rs 849** | Structured menu baseline | Do not silently move to GM Rs 980 |
| `special-sandwich` | **SUPPORTED @ Rs 749** | Structured menu baseline | Do not silently move to GM Rs 930 |

---

## Technical recommendations (NOT approved — superseded where owner locked)

| ID | Recommendation | Rationale | Date |
|---|---|---|---|
| BFR-001 | **Structured menu-board images** as V1 baseline | Aligns with current `menu-data.ts` seed; promos logged separately | 2026-07-14 |
| BFR-003 | **KEEP** Behari Kabab Pizza | Marketing evidence; price TBD | 2026-07-14 |
| BFR-012 | **CUSTOMIZER_ONLY** | POS/kitchen UX | 2026-07-14 |
| BFR-013 | **LOCKED** — do not reopen | Owner explicit approval | 2026-07-14 |

## Approved decisions log

*Record completed decisions below — newest first.*

| ID | Decision | Approved value | Source | Date | Approver | Propagated to |
|---|---|---|---|---|---|---|
| BFR-007 | Telebar V1 vs V2 scope | V2 module only; 43 SKUs `PLANNED_V2` | Owner proposal 2026-07-14 | 2026-07-14 | Business owner | PRODUCT-CATALOG, workbook §19 |
| BFR-013 | Official order / phone / WhatsApp | **0304-1110495** · intl **923041110495** · **LOCKED** | Owner explicit 2026-07-14 | 2026-07-14 | Business owner | Constitution, all touchpoints |
| BFR-018 | Zinger Burger price | Standalone **HOLD** — Rs 450/440/550 conflict | Reconciliation 2026-07-14 | 2026-07-14 | — | Workbook §8, deals dependency |
| BFR-016 | Official branches | Royal Orchard Multan **Active**; Northern Bypass Multan **Coming Soon** | Owner confirm 2026-07-14 | 2026-07-14 | Business owner | Constitution, branches table, website |
| BFR-006 | Official business hours | **10:00 AM – 2:30 AM** daily (Royal Orchard) | Owner approve 2026-07-14 | 2026-07-14 | Business owner | Constitution, website, DB, GBP, SEO |

---

## Decision template (copy for new rows)

```markdown
### BFR-XXX — [Title]
- **Date:**
- **Approver:**
- **Source:** (menu photo / owner message / receipt)
- **Options considered:**
- **Decision:**
- **Rationale:**
- **Impacted SKUs:**
- **Propagated to:** menu-data.ts / Supabase / website / PRODUCT-CATALOG.md
```

---

## Backend-era decisions (deferred — not blocking menu freeze)

These remain `OPEN` for Phase 2+; do **not** block V1 Business Locked unless they affect public menu copy.

| ID | Decision | Status | Notes |
|---|---|---|---|
| BD-005 | Delivery-charge model | OPEN | Checkout — Phase 2 |
| BD-006 | Payment methods | WORKING_ASSUMPTION | Phase 2 |
| BD-007 | Refund policy | OPEN | Phase 2 |
| BD-008 | Order cancellation | OPEN | Phase 2 |
| BD-009 | Peak-hour handling | OPEN | Phase 2 |
| BD-010 | Multi-branch routing | OPEN | Phase 2 |
| BD-011 | Discounts / loyalty | OPEN | Phase 2 |
| BD-012 | Free-delivery threshold | WORKING_ASSUMPTION | Phase 2 |

*Full detail:* `_documentation-audit/reports/BUSINESS-DECISION-REGISTER-20260712-113849.md`

---

## Change control (post V1 lock)

After **V1 Business Locked**, any price or SKU change requires:

1. New decision row (or amendment row) with date + approver
2. Update `PRODUCT-CATALOG.md` version
3. Migration + static sync
4. Regression test pass
5. Entry in amendment log below

### Amendment log (post-lock)

| Amendment | SKU | Old → New | Decision ref | Date | Approver |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

---

*Every checkbox in the freeze pack traces to a decision ID here.*
