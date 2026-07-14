# Documentation Levels & Workflow

**Governance:** Mianx.ai · Telepizza V1  
**Status:** Documentation foundation **COMPLETE** — governance phase **CLOSED**.

See [MIANX-DELIVERY-LIFECYCLE.md](./MIANX-DELIVERY-LIFECYCLE.md) for DoR, DoD, and sprint roadmap.

---

## Final documentation hierarchy

```text
LEVEL 0 — Governance
──────────────────────
  BUSINESS-CONSTITUTION.md
  BUSINESS-FREEZE-VERSIONS.md
  CHANGE-REQUEST-PROCESS.md
  BUSINESS-DECISION-REGISTER.md

LEVEL 1 — Audit (internal — AI + dev)
──────────────────────
  Gap reports · Workbook · Evidence · Verification reports

LEVEL 2 — Business freeze (internal)
──────────────────────
  Brand freeze · Menu freeze · MASTER-DATA-FREEZE.md

LEVEL 3 — Owner + lock
──────────────────────
  OWNER-SIGNOFF-2PAGE.md ⭐
  IMPLEMENTATION-LOCK.md

LEVEL 4 — Engineering (after LOCK)
──────────────────────
  Database → Website → Admin → API → POS → Kitchen → ERP
```

---

## 3 delivery levels (summary)

| Level | Audience | Key files |
|---|---|---|
| **0 Governance** | Everyone (rules) | Constitution, Versions, CR process |
| **1–2 Internal** | AI + dev | Freeze pack, workbook, master data |
| **3 Owner** | Business owner | 2-page sign-off only |
| **4 Engineering** | After LOCK | Code + migrations |

---

## Production workflow

```text
01  BUSINESS-CONSTITUTION
02  Brand Freeze
03  Menu Freeze
04  MASTER-DATA-FREEZE
05  OWNER-SIGNOFF-2PAGE ⭐
06  IMPLEMENTATION-LOCK + BUSINESS-FREEZE-VERSIONS → V1.0 LOCKED
07  Database Build
08  Website
09  Tests · category cycles (Pizza first)
10+ Admin · API · POS · Kitchen · ERP
```

**Future changes:** CR → Master Data → Database → Website → POS → Kitchen  
**Version bump:** See BUSINESS-FREEZE-VERSIONS.md

---

## Documentation freeze rule

From this point:

- ✅ Add CRs to `change-requests/` when owner requests changes  
- ✅ Bump version registry on each material lock  
- ❌ No new audit templates, checklists, or pack documents  
- ❌ No implementation before owner 2-page signature  

---

## Mianx.ai reusable blueprint

This hierarchy is the standard for AI-first ERP projects (Telepizza, future hospital/school/restaurant).

| Reuse as-is | Customize per client |
|---|---|
| Levels 0–3 structure | Constitution values |
| CR process | SKU catalog |
| Version semantics | Branch count |
| 2-page owner form | Category list |

---

*Owner document: [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md)*
