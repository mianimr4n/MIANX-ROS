# Master Owner Sign-Off — V1 Business Freeze

> **Owner-facing document:** Use [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md) only (~2 pages).  
> **This file** = internal appendix for dev/AI — do not send to restaurant owner.

**Governance:** Mianx.ai  
**Purpose:** Single document for **business owner** signature before any pizza/database/website implementation.  
**Rule:** Technical team and AI agents may **recommend** only. **Owner approves** in §4 below.

**Status:** 🔴 **AWAITING OWNER SIGNATURE** — pizza implementation **BLOCKED**

---

## 1. What this document freezes

When signed, these become the **only** source of truth for V1:

- Canonical prices and pizza sizes  
- Which menu items are public vs removed vs V2  
- Contact phone and branch scope  
- Active vs seasonal deals  
- Extra toppings behaviour  
- Telebar V2 scope (already decided BFR-007)

**Downstream systems that depend on this sign-off:**

Website · Supabase catalog · Future POS · Kitchen · Rider · Order APIs · Admin

---

## 2. Evidence summary (for owner review)

| Source | Date | Trust level |
|---|---|---|
| Google Maps printed menu photos | 2026-07-13 | **Primary** for prices & food items |
| `REAL-MENU-EXTRACTION.md` | 2026-07-13 | Transcription of GM photos |
| Current website / database | 2026-07-14 | **Stale** vs GM on most prices |
| Marketing / social images | Owner uploads | **Secondary** — promos, visuals; may conflict with printed menu |
| Older board extraction | 2026-07-12 | Matches current DB — superseded if BFR-001 = A |

---

## 3. Decisions requiring owner approval

### Blockers — must sign before Pizza implementation

| ID | Decision | Options | Technical recommendation | Evidence notes |
|---|---|---|---|---|
| **BFR-001** | **Canonical price list** | **A)** GM Jul 2026 · **B)** Older board/website · **C)** Hybrid (specify) | **Recommend A** — single source of truth; latest printed menu | GM: 131 entries; website ~53 stale |
| **BFR-003** | **Behari Kabab Pizza** @ Rs 549 | **A)** KEEP · **B)** REPRICE · **C)** REMOVE | **Recommend KEEP** — recent marketing promotes product; verify price under BFR-001 | **Conflict:** not on GM food-menu photos; on marketing creatives |
| **BFR-012** | **Extra toppings** | **A)** Customizer only · **B)** Catalog line items · **C)** Both | **Recommend A (CUSTOMIZER_ONLY)** — best for POS/kitchen UX | GM prints topping prices 50/100/150 |
| **BFR-013** | **Official phone number** | **A)** 0304-1110495 · **B)** 0304-1111795 · **C)** Other: ___ | **Recommend A** — printed on GM menu Link 1; entire codebase uses this | 1111795 in some marketing images (owner); **not in repo** |
| **BFR-014** | **Active deals (V1)** | List which are **permanent** vs **seasonal/ended** | Owner must tick each deal below | GM shows 7 deals; promos on social may differ |
| **BFR-015** | **Pizza size labels** | **A)** 6" / 10" / 12" (GM Jul 2026) · **B)** 6" / 9" / 12" (current site) · **C)** 7" / 10" / 13" · **D)** Other: ___ | **Recommend A** if BFR-001 = A | Merges legacy BFR-005 |
| **BFR-016** | **V1 branch scope** | **A)** Royal Orchard Multan only · **B)** Multi-branch ready (Northern Bypass coming soon) | **Recommend B structure, A operations** — one operating branch V1 | Northern Bypass = Coming Soon in site/DB |

### Already approved (include for completeness)

| ID | Decision | Approved value | Date |
|---|---|---|---|
| **BFR-007** | Telebar V1 | **V2 only — `PLANNED_V2`; not on public website** | 2026-07-14 |

### Sign before full V1 lock (may follow pizza cycle)

| ID | Decision | Options | Status |
|---|---|---|---|
| BFR-002 | Zinger Burger standalone SKU | Add @ GM / other / deals-only / defer | OPEN |
| BFR-004 | `jumbo-wrap` vs GM Jumbo Wraps | Fix / remove / keep | OPEN |
| BFR-006 | Hours 10:00 AM – 2:30 AM | Confirm / correct | PENDING_EVIDENCE |
| BFR-008 | About page stats | Evidence / remove / replace | OPEN |
| BFR-009 | Website tagline | Love At First Bite / marketing / both | OPEN |
| BFR-010 | Creamo vs Cremo spelling | Creamo / Cremo | OPEN |
| BFR-011 | Burgers category structure | Single / split sections | OPEN |

---

## 4. Owner approval form

*Owner completes this section. Digital or scanned signature acceptable.*

### 4.1 Core blockers (required for Pizza sprint)

| ID | Owner choice (circle one) | Owner initials | Date |
|---|---|---|---|
| BFR-001 | A / B / C: _______________ | | |
| BFR-003 | KEEP / REPRICE: ___ / REMOVE | | |
| BFR-012 | CUSTOMIZER_ONLY / CATALOG / BOTH | | |
| BFR-013 | 1110495 / 1111795 / Other: ___ | | |
| BFR-014 | See deal table §4.2 | | |
| BFR-015 | A / B / C / D: _______________ | | |
| BFR-016 | A / B | | |

### 4.2 Deal activation (BFR-014)

Mark each deal **ACTIVE** (permanent V1) or **INACTIVE** (remove/hide):

| Deal | GM price (if BFR-001=A) | Owner: ACTIVE / INACTIVE | Notes |
|---|---:|---|---|
| Family Deal | 2650 | | |
| Pizza Fest | 2020 | | |
| Mega Offer | 3799 | | |
| Pair Deal | 2600 | | |
| Family Festival | 2850 | | |
| Deal for 2 | 1240 | | |
| Knock Out Deal | 1750 | | |

*Deals referencing Zinger require BFR-002 resolution before LOCK.*

### 4.3 Behari Kabab Pizza (if BFR-003 = KEEP or REPRICE)

| Field | Owner value |
|---|---|
| Public name | Behari Kabab Pizza / other: ___ |
| Price (PKR) | ___ (GM Signature tier? Specialty single? Marketing price 549?) |
| Variants | None / S-M-L: ___ / M-L: ___ |

### 4.4 Extra toppings (if BFR-012 = CUSTOMIZER_ONLY)

Confirm customizer addon prices (if BFR-001 = A):

| Addon | Small | Medium | Large |
|---|---:|---:|---:|
| Extra chicken | 50 | 100 | 150 |
| Extra cheese | 50 | 100 | 150 |
| Cheese slice | 60 | — | — |

Owner confirm: ⬜ Yes · ⬜ Correct to: ___

---

## 5. Technical recommendations log (NOT owner approval)

*Recorded for audit. Does not authorize implementation.*

| ID | Recommendation | Recommended by | Date | Owner override? |
|---|---|---|---|---|
| BFR-001 | **A** — GM Jul 2026 canonical | Mianx.ai technical review | 2026-07-14 | ⬜ |
| BFR-003 | **KEEP** — marketing evidence; reprice under BFR-001 | Mianx.ai technical review | 2026-07-14 | ⬜ |
| BFR-012 | **CUSTOMIZER_ONLY** | Mianx.ai technical review | 2026-07-14 | ⬜ |
| BFR-013 | **1110495** — matches printed menu | Mianx.ai technical review | 2026-07-14 | ⬜ |
| BFR-015 | **6" / 10" / 12"** — matches GM Jul 2026 | Mianx.ai technical review | 2026-07-14 | ⬜ |
| BFR-016 | **Royal Orchard operating; multi-branch schema** | Mianx.ai technical review | 2026-07-14 | ⬜ |

---

## 6. Signature block

> I confirm that the choices in §4 are the authoritative business rules for Telepizza V1.  
> I understand that engineering will implement exactly these rules across website, database, and future POS/ERP.  
> Changes after sign-off require an amendment in `BUSINESS-DECISION-REGISTER.md`.

| Role | Name | Signature | Date |
|---|---|---|---|
| **Business owner** (required) | | | |
| Menu authority (optional) | | | |
| Operations / branch manager (optional) | | | |

**Document version:** `owner-signoff-v1.0-draft`  
**Upon signature:** tag `v1.0-owner-rules-approved` → unlock Pizza implementation sprint

---

## 7. What happens after signature

```text
Owner signs §6
      ↓
Decision Register → APPROVED rows
      ↓
Pizza Category Freeze Cycle → implementation
      ↓
Broast → Burgers → … (one category per cycle)
      ↓
BUSINESS-SIGNOFF.md (full pack G8)
      ↓
Backend Phase 2 authorized
```

**Until §6 is signed:** No pizza migrations · No `menu-data.ts` price changes · No production Supabase updates

---

## 8. Quick reference — recommended package (owner may accept or override)

```text
BFR-001 = A          (GM Jul 2026 prices)
BFR-003 = KEEP       (verify/reprice Behari Kabab Pizza)
BFR-012 = CUSTOMIZER_ONLY
BFR-013 = 0304-1110495
BFR-014 = [owner ticks each deal]
BFR-015 = A          (6" / 10" / 12")
BFR-016 = B          (Royal Orchard live; multi-branch structure)
BFR-007 = V2 telebar (already approved)
```

*This block is a convenience summary — only §4 + §6 constitute legal owner approval.*

---

*Related:* [BUSINESS-DECISION-REGISTER.md](./BUSINESS-DECISION-REGISTER.md) · [categories/PIZZA-CATEGORY-FREEZE-CYCLE.md](./categories/PIZZA-CATEGORY-FREEZE-CYCLE.md)
