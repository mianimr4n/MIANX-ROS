# Mianx.ai ERP Delivery Lifecycle

**Project:** Telepizza V1  
**Governance phase:** ✅ **CLOSED** (approved 2026-07-14)  
**Mode:** ⏳ Waiting for owner sign-off → then **engineering mode**

---

## Current project status

```text
✅ Governance Complete
✅ Documentation Complete
✅ Audit Complete
✅ Business Freeze Framework Complete
⏳ Waiting for Owner Sign-off

Backend      🔒 Locked
Database     🔒 Locked
Website      🔒 Locked
POS          🔒 Locked
ERP          🔒 Locked
```

**Owner document to send:** [OWNER-DECISIONS-REMAINING.md](./OWNER-DECISIONS-REMAINING.md) (5 items · phone ✅ done)  
**Full sign-off (optional):** [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md)

**Engineering entry trigger:**

> `Owner sign-off received — start pizza sprint.`

---

## Standard lifecycle (Mianx.ai blueprint — reusable)

```text
Idea
  ↓
Business Audit
  ↓
Business Freeze
  ↓
Owner Approval
  ↓
Engineering (category sprints)
  ↓
Testing
  ↓
Production
  ↓
Change Requests
  ↓
Version Upgrade
```

**Telepizza position:** Owner Approval (step 4 of 9).

---

## Documentation hierarchy (frozen)

```text
LEVEL 0 — Governance        Constitution · Versions · CR · Decision Register · THIS FILE
LEVEL 1 — Audit             Internal only (gap, workbook, evidence)
LEVEL 2 — Business          Brand · Menu · Master Data freeze
LEVEL 3 — Owner             2-page sign-off · Implementation Lock
LEVEL 4 — Engineering       Database · Website · Admin · API · POS · Kitchen · ERP
```

**Rule:** No new documentation unless CR or version bump requires it.

---

## Definition of Ready (DoR) — sprint start gate

A sprint **cannot start** unless all are true:

| # | Criterion | Telepizza check |
|---|---|---|
| 1 | **Business rule locked** | Category rows signed in workbook / owner 2-page |
| 2 | **Owner approved** | Signed `OWNER-SIGNOFF-2PAGE.md` on file |
| 3 | **Master data updated** | `MASTER-DATA-FREEZE.md` + `PRODUCT-CATALOG.md` for category |
| 4 | **Change Request approved** (if applicable) | `change-requests/CR-XXX.md` = APPROVED |
| 5 | **Freeze version assigned** | Row in `BUSINESS-FREEZE-VERSIONS.md` (e.g. V1.0) |

**Sprint 1 (Pizza) additional:** Global owner sign-off satisfies DoR for first sprint.

---

## Definition of Done (DoD) — category complete gate

A category is **LOCKED** only when all are true:

| # | Criterion |
|---|---|
| 1 | **Database updated** — migration applied; production parity |
| 2 | **Website synced** — static + live catalog match master data |
| 3 | **Admin tested** — category visible/manageable (when admin exists) |
| 4 | **Images verified** — register row not MISSING for public SKUs |
| 5 | **Mobile tested** — journey test pass (375px) |
| 6 | **Desktop tested** — journey test pass (1280px) |
| 7 | **SEO verified** — titles/meta for new public routes if any |
| 8 | **Regression passed** — slug parity + price spot-check CI |
| 9 | **Docs updated** — only if CR/version bump requires |

**Post-lock rule:** No category edits without approved CR.

---

## Category sprint roadmap (post owner sign-off)

| Sprint | Category | Notes |
|---|---|---|
| **1** | **Pizza** | Signature + Classic + Specialty + toppings customizer |
| 2 | Broast | Prices already match GM — fast path |
| 3 | Burgers | BFR-002 Zinger dependency for deals |
| 4 | Sandwiches | |
| 5 | Pasta | |
| 6 | Fries | |
| 7 | Wraps | BFR-004 jumbo-wrap |
| 8 | Wings | BFR-010 spelling |
| 9 | Deals | BFR-014 active list |
| 10 | Drinks | |
| — | Dips · Appetizers · Chicken & Sides | Schedule with workbook priority |
| V2 | Telebar | `PLANNED_V2` — separate version bump |

---

## Sprint 1 — Pizza (execution order)

```text
1. Pizza Master Data          MASTER-DATA-FREEZE + PRODUCT-CATALOG LOCK rows
2. Database Schema/Data       Supabase migration + seed sync
3. Admin Panel                Category CRUD read path (scope as available)
4. Website UI                 Menu cards, categories, sort_order fix
5. Product Detail Pages       Pizza detail / customizer entry
6. Cart & Customizer          Variants 6/10/12 + BFR-012 addons
7. Tests                      DoD regression + journey TC
8. Category Lock              FREEZE_STATUS = LOCKED · sprint closed
```

---

## Post-sprint artifacts

| Artifact | When |
|---|---|
| `IMPLEMENTATION-LOCK.md` | V1.0 on first owner sign |
| `BUSINESS-FREEZE-VERSIONS.md` | V1.0 row filled; V1.1+ on CR |
| Category cycle file | `categories/*-FREEZE-CYCLE.md` → LOCKED section signed |
| Git tag | `v1.0-business-locked` at full V1; per-sprint commits on branch |

---

## Engineering mode rules

1. **DoR before every sprint** — no exceptions  
2. **DoD before category LOCK** — no partial locks  
3. **CR for any business change** after lock  
4. **Version bump** per `BUSINESS-FREEZE-VERSIONS.md`  
5. **No new governance docs** unless lifecycle amendment approved by project lead  

---

## Governance closure sign-off

| Role | Status | Date |
|---|---|---|
| Project governance (approved) | ✅ Closed | 2026-07-14 |
| Business owner (V1 rules) | ⏳ Pending 2-page sign-off | — |
| Engineering | 🔒 Awaiting trigger message | — |

---

*Reusable across Mianx.ai clients: restaurant, hospital, school, textile ERP.*
