# Telepizza V1 Business Freeze Pack

**Governance:** Mianx.ai  
**Governance phase:** ✅ **CLOSED** — see [MIANX-DELIVERY-LIFECYCLE.md](./MIANX-DELIVERY-LIFECYCLE.md)  
**Purpose:** ERP-grade business specification completed **before** Backend, ERP, POS, Kitchen, Rider, Admin, or AI Workforce.

---

## Start here

| Who | Document |
|---|---|
| **Restaurant owner** | [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md) only (~2 pages) |
| **Project lead** | [DOCUMENTATION-LEVELS.md](./DOCUMENTATION-LEVELS.md) |
| **Developers / AI** | This pack (internal audit) |

**Current blocker:** Owner signature on 2-page form → then [IMPLEMENTATION-LOCK.md](./IMPLEMENTATION-LOCK.md) = `LOCKED`

---

## 3 documentation levels

| Level | Audience | Key files |
|---|---|---|
| **1 Internal audit** | AI + dev | Workbook, gap report, catalog, verification report |
| **2 Owner sign-off** | Business owner | `OWNER-SIGNOFF-2PAGE.md` ⭐ |
| **3 Implementation lock** | Engineering | `IMPLEMENTATION-LOCK.md` after sign |

Details: [DOCUMENTATION-LEVELS.md](./DOCUMENTATION-LEVELS.md)

---

## Production workflow

```text
01 BUSINESS-CONSTITUTION  →  02 Brand  →  03 Menu  →  04 MASTER-DATA-FREEZE
        →  05 Owner 2-page sign  →  06 LOCK  →  07 Database  →  08 Website  →  09+ POS/ERP
```

---

## Pack documents (internal)

| # | Document | Role |
|---|---|---|
| ★ | [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md) | **Owner-facing** — decisions only |
| | [IMPLEMENTATION-LOCK.md](./IMPLEMENTATION-LOCK.md) | Post-sign status · Backend unlock |
| | [BUSINESS-CONSTITUTION.md](./BUSINESS-CONSTITUTION.md) | Immutable ERP foundation |
| | [BUSINESS-FREEZE-VERSIONS.md](./BUSINESS-FREEZE-VERSIONS.md) | V1.0, V1.1, V2.0… registry |
| | [CHANGE-REQUEST-PROCESS.md](./CHANGE-REQUEST-PROCESS.md) | CR workflow (no direct DB edits) |
| | [MASTER-DATA-FREEZE.md](./MASTER-DATA-FREEZE.md) | Schema source: categories, SKUs, variants… |
| 1 | [MASTER-BUSINESS-FREEZE-CHECKLIST.md](./MASTER-BUSINESS-FREEZE-CHECKLIST.md) | Progress % · gates |
| 2 | [MENU-VERIFICATION-WORKBOOK.md](./MENU-VERIFICATION-WORKBOOK.md) | Per-item verification |
| 3 | [MENU-GAP-REPORT.md](./MENU-GAP-REPORT.md) | Printed vs web vs DB |
| 4 | [PRODUCT-CATALOG.md](./PRODUCT-CATALOG.md) | Canonical SKU records |
| 5 | [IMAGE-ASSET-REGISTER.md](./IMAGE-ASSET-REGISTER.md) | Hero / card / thumb |
| 6 | [BRANDING-VERIFICATION.md](./BRANDING-VERIFICATION.md) | Logo, SEO, contact |
| 7 | [CUSTOMER-JOURNEY-TEST.md](./CUSTOMER-JOURNEY-TEST.md) | E2E test scripts |
| 8 | [BUSINESS-SIGNOFF.md](./BUSINESS-SIGNOFF.md) | Full pack G8 · Backend approval |
| 9 | [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md) | Amendment audit trail |
| | [MASTER-OWNER-SIGNOFF.md](./MASTER-OWNER-SIGNOFF.md) | Internal detail (not for owner) |
| | [categories/PIZZA-CATEGORY-FREEZE-CYCLE.md](./categories/PIZZA-CATEGORY-FREEZE-CYCLE.md) | First category cycle |

---

## Status (2026-07-14)

| Item | Status |
|---|---|
| Governance phase | ✅ **CLOSED** ([MIANX-DELIVERY-LIFECYCLE.md](./MIANX-DELIVERY-LIFECYCLE.md)) |
| Documentation foundation | ✅ Complete — frozen |
| DoR / DoD | ✅ Defined |
| Sprint roadmap | ✅ Pizza → Drinks (10 sprints) |
| Owner 2-page form | ✅ Ready to send |
| Owner signature | ⏳ Pending — **3 items** (canonical menu · deals · telebar) |
| Phone BFR-013 | ✅ **0304-1110495** locked |
| Branches BFR-016 | ✅ Royal Orchard Active · Northern Bypass Coming Soon |
| Hours BFR-006 | ✅ **10:00 AM – 2:30 AM** daily |
| Engineering mode | 🔒 Until trigger message |

---

## Rules

1. **Never send internal audit to owner** — only 2-page sign-off.
2. Do not invent items, prices, or claims.
3. No production changes until `IMPLEMENTATION-LOCK` = LOCKED.
4. Backend / ERP blocked until full pack sign-off (G8).
