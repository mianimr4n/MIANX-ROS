# MASTER Business Freeze Checklist

**Pack:** Telepizza V1 Business Freeze Pack  
**Governance:** Mianx.ai  
**Last updated:** 2026-07-14  
**Backend status:** 🔴 **BLOCKED** until §8 sign-off in [BUSINESS-SIGNOFF.md](./BUSINESS-SIGNOFF.md)

---

## Overall progress

| Metric | Value |
|---|---|
| **Pack completion** | **22%** |
| Printed menu items (evidence) | 131 |
| Items owner-verified | 0 |
| Items in parity (Printed = Static = DB = Website) | 5 broast SKUs only (price match) |
| Open owner decisions | 12 (see [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md)) |
| Documents signed | 0 / 8 |

```text
[████░░░░░░░░░░░░░░░░] 22%  →  Target: 100% → V1 Business Locked
```

---

## Gate model

Each gate must pass before **V1 Business Locked**. Gates are sequential; later gates assume earlier ones are green.

| Gate | Name | Document | Progress | Status |
|---|---|---|---:|---|
| G0 | Owner signs 2-page form | [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md) | 0% | 🔴 **PRIMARY BLOCKER** |
| G0b | Evidence loaded | Audits + workbook | 100% | 🟢 |
| G1 | Menu workbook complete | [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) + [PIZZA cycle](./categories/PIZZA-CATEGORY-FREEZE-CYCLE.md) | 15% | 🟡 Pizza active |
| G2 | Gaps resolved | [MENU-GAP-REPORT.md](./MENU-GAP-REPORT.md) | 10% | 🔴 |
| G3 | Product catalog frozen | [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) | 12% | 🔴 |
| G4 | Images complete | [IMAGE-ASSET-REGISTER.md](./IMAGE-ASSET-REGISTER.md) | 5% | 🔴 |
| G5 | Branding verified | [BRANDING-VERIFICATION.md](./BRANDING-VERIFICATION.md) | 35% | 🟡 |
| G6 | Customer journey passed | [CUSTOMER-JOURNEY-TEST.md](./CUSTOMER-JOURNEY-TEST.md) | 0% | 🔴 |
| G7 | Decisions closed | [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md) | 8% | 🟡 BFR-007 ✓; BFR-001 open |
| G8 | Executive sign-off | [BUSINESS-SIGNOFF.md](./BUSINESS-SIGNOFF.md) | 0% | 🔴 |

**G8 unlocks:** Database freeze implementation → Backend Phase 2.

---

## Business area matrix

| Area | Sub-areas | Required | Done | % | Gate |
|---|---|---:|---:|---:|---|
| **Branding** | Logo, colors, fonts, voice, SEO, contact, branches | 28 | 10 | 36% | G5 |
| **Menu** | 16 categories, 131 evidence SKUs | 131 | 5 | 4% | G1–G3 |
| **Prices** | All variants + deals + addons | 131+ | 5 | 4% | G1 |
| **Variants** | Pizza S/M/L, specialty M/L, toppings | 40+ | 0 | 0% | G3 |
| **Images** | Hero + card + thumb per public SKU | 393+ | 13 | 3% | G4 |
| **Deals** | 7 bundles + composition rules | 7 | 0 | 0% | G1 |
| **Database** | Schema + data parity + live load | 18 | 6 | 33% | G3 |
| **Website** | Live catalog + pages + claims | 22 | 4 | 18% | G2, G6 |
| **Mobile / tablet / desktop** | Journey on 3 breakpoints | 24 | 0 | 0% | G6 |
| **SEO** | Meta, OG, structured data | 12 | 2 | 17% | G5 |
| **Performance** | Build, LCP, catalog fetch | 8 | 3 | 38% | G6 |
| **Production** | Domain, env, Supabase live | 10 | 4 | 40% | G2 |

---

## Phase 1 deliverables (this pack)

- [x] Pack folder structure created
- [x] All 9 documents scaffolded with audit baseline
- [ ] Every workbook row has owner action (Keep / Update / Remove)
- [ ] Gap report shows **zero** unresolved 🔴 gaps
- [ ] Product catalog: all public SKUs `FREEZE_STATUS = LOCKED`
- [ ] Image register: no `MISSING` for public SKUs
- [ ] Branding: no unsupported public claims
- [ ] Customer journey: all test cases PASS on 3 devices
- [ ] Decision register: zero `OPEN` items blocking menu/branding
- [ ] BUSINESS-SIGNOFF signed

---

## Phase 2+ (explicitly blocked)

| Phase | Scope | Blocked until |
|---|---|---|
| 2 Backend | Auth, orders API, customers | G8 sign-off |
| 3 ERP | Inventory, procurement | G8 + catalog LOCKED |
| 4 POS | Branch sales | G8 + branches verified |
| 5 Kitchen | Ticket flow | G8 + order schema from frozen catalog |
| 6 Rider | Delivery | G8 + branch rules |
| 7 Customer app | Mobile ordering | G8 + journey frozen |
| 8 Admin | Operations UI | G8 |
| 9 AI Workforce | Automation agents | G8 + decision register |

---

## Reconciliation scoreboard

Update after each owner session.

| Source | Categories | Items | Variants | Parity % |
|---|---:|---:|---:|---:|
| Printed menu (GM Jul 2026) | 24 | 131 | 40+ | — |
| Static `menu-data.ts` | 13 | 58 | 34 | 44% items exist |
| Supabase production | 13 | 58 | 34 | 44% items exist |
| Website render (today) | 13 | 58 | 34 | 44% (fallback) |
| **Freeze target** | TBD | TBD | TBD | **100%** |

**Price accuracy** (among 58 shared items): **5 / 58** match GM exactly (broast set). **53** need UPDATE or owner exception.

---

## Weekly owner workflow

1. Open [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) → complete one category per session.
2. Log each decision in [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md) with date + source.
3. Update [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) `FREEZE_STATUS` for signed SKUs.
4. Refresh progress % in this file.
5. When all gates green → [BUSINESS-SIGNOFF.md](./BUSINESS-SIGNOFF.md).

---

## Related audits (inputs only)

| Report | Path |
|---|---|
| Stage 1 verification | `_documentation-audit/reports/BRAND-MENU-DATABASE-VERIFICATION.md` |
| Printed menu evidence | `REAL-MENU-EXTRACTION.md` |
| Older price evidence | `_documentation-audit/evidence/REAL_MENU_EXTRACTED.md` |
| Legacy decision register | `_documentation-audit/reports/BUSINESS-DECISION-REGISTER-20260712-113849.md` |

---

*Progress % formula: weighted average of gate completion (G1–G7). G8 is binary (signed or not).*
