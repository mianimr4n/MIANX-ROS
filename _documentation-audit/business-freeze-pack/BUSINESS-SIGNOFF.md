# Business Sign-Off

**Pack:** Telepizza V1 Business Freeze Pack  
**Governance:** Mianx.ai  
**Purpose:** Formal declaration of **V1 Business Locked** and authorization to begin **Backend Phase 2**.

---

## Pre-sign-off checklist

All must be ✅ before signatures below.

| # | Requirement | Document | Status |
|---|---|---|---|
| 1 | Menu workbook 100% rows signed | [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) | ⬜ |
| 2 | Gap report closed (zero 🔴) | [MENU-GAP-REPORT.md](./MENU-GAP-REPORT.md) | ⬜ |
| 3 | All V1 SKUs `FREEZE_STATUS = LOCKED` | [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) | ⬜ |
| 4 | No MISSING images on public SKUs | [IMAGE-ASSET-REGISTER.md](./IMAGE-ASSET-REGISTER.md) | ⬜ |
| 5 | Branding gate G5 passed | [BRANDING-VERIFICATION.md](./BRANDING-VERIFICATION.md) | ⬜ |
| 6 | Customer journey G6 passed | [CUSTOMER-JOURNEY-TEST.md](./CUSTOMER-JOURNEY-TEST.md) | ⬜ |
| 7 | All BFR decisions APPROVED or DEFERRED_V2 | [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md) | ⬜ |
| 8 | Master checklist ≥ 100% | [MASTER-BUSINESS-FREEZE-CHECKLIST.md](./MASTER-BUSINESS-FREEZE-CHECKLIST.md) | ⬜ |

---

## Frozen scope summary (complete at sign-off)

| Field | Value at lock |
|---|---|
| **Version** | `v1.0-business-locked` |
| **Lock date** | _________________ |
| **Branch(es) V1** | Royal Orchard (operating) · Northern Bypass (coming soon) |
| **Category count** | _________ |
| **SKU count** | _________ |
| **Variant count** | _________ |
| **Canonical price source** | BFR-001: _________________ |
| **Telebar in V1** | BFR-007: **No — PLANNED_V2** |
| **Production Supabase project** | `pyeowxvacgypohrbvgee` |
| **Website deployment** | _________________ |

---

## Parity attestation

I confirm that at lock date:

- [ ] **Printed menu** (signed canonical list) matches **website** public menu
- [ ] **Website** matches **Supabase production** catalog (slugs, prices, variants)
- [ ] **Static fallback** (`menu-data.ts`) matches production (disaster recovery)
- [ ] No public menu item lacks owner verification
- [ ] No unsupported marketing claims remain on customer-facing pages
- [ ] Image register complete for all public SKUs

---

## Technical readiness attestation (implementation team)

- [ ] Database migrations applied to production with grants
- [ ] Website loads live Supabase catalog (no schema defect fallback)
- [ ] Slug parity automated test in CI
- [ ] `pnpm check` and `pnpm build:website` pass on lock commit

*Technical items may be completed in the **implementation sprint immediately after** business sign-off if business data is frozen first.*

---

## Authorization

### V1 Business Locked

> Telepizza customer-facing business rules, menu, branding, and catalog are **frozen** as of the date below. Changes require Decision Register amendment.

| Role | Name | Signature | Date |
|---|---|---|---|
| **Business owner** | | | |
| **Menu authority** | | | |
| **Operations (branch)** | | | |

---

### Backend Phase 2 Approved

> Engineering is authorized to implement Authentication, Customer Accounts, Orders API, and related backend services **on top of** the frozen catalog and business rules. Menu/schema changes require amendment process.

| Role | Name | Signature | Date |
|---|---|---|---|
| **Business owner** | | | |
| **Technical lead (Mianx.ai)** | | | |

---

## Explicitly NOT authorized by this sign-off

- ERP, POS, Kitchen, Rider modules (Phases 3–6)
- Customer mobile app (Phase 7)
- Admin panel (Phase 8)
- AI Workforce (Phase 9)
- Production menu changes without amendment log

---

## Post-lock artifact locations

| Artifact | Path |
|---|---|
| Frozen product catalog | `business-freeze-pack/PRODUCT-CATALOG.md` @ git tag |
| Database seed source | `supabase/migrations/` + seed synced to catalog |
| Static fallback | `apps/website/client/src/data/menu-data.ts` |
| Decision history | `business-freeze-pack/BUSINESS-DECISION-REGISTER.md` |

**Recommended git tag:** `v1.0-business-locked`

---

*This document is the only gate that unlocks Backend Phase 2.*
