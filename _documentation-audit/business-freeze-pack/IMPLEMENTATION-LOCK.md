# Implementation Lock

**Governance:** Mianx.ai  
**Status:** 🔓 **UNLOCKED** — awaiting owner signature on [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md)

> This file is updated **once** when owner signs. It authorizes engineering implementation.  
> Do not set `LOCKED` without a signed 2-page owner form on file.

---

## Current state

| Field | Value |
|---|---|
| **Business status** | `UNLOCKED` |
| **Version** | — |
| **Freeze date** | — |
| **Approved by** | — |
| **Owner sign-off document** | Not received |
| **Backend Phase 2** | 🔴 BLOCKED |
| **Database build** | 🔴 BLOCKED |
| **Pizza category sprint** | 🔴 BLOCKED |

---

## Locked state (template — fill when owner signs)

```yaml
business_status: LOCKED
version: V1.0
freeze_date: YYYY-MM-DD
approved_by:
  name: ""
  designation: ""
  signature_on_file: true
  signoff_document: OWNER-SIGNOFF-2PAGE.md

owner_decisions_propagated:
  BFR-001: ""   # e.g. A — GM Jul 2026 prices
  BFR-003: ""   # e.g. KEEP
  BFR-012: ""   # e.g. CUSTOMIZER_ONLY
  BFR-013: ""   # e.g. 0304-1110495
  BFR-014: ""   # active deals list
  BFR-015: ""   # e.g. 6/10/12
  BFR-016: ""   # e.g. Royal Orchard V1
  BFR-007: PLANNED_V2  # telebar — pre-approved

implementation_authorized:
  - master_data_freeze
  - database_migrations
  - website_catalog_sync
  - category_freeze_cycles

implementation_blocked_until_lock:
  - backend_phase_2
  - pos
  - kitchen_display
  - erp
  - admin_panel
  - customer_app
```

---

## Unlock checklist (engineering — after LOCKED)

**Sprint DoR:** See [MIANX-DELIVERY-LIFECYCLE.md](./MIANX-DELIVERY-LIFECYCLE.md) — all 5 criteria must pass before sprint start.

| Step | Action | Done |
|---|---|---|
| 1 | Copy owner choices → `BUSINESS-DECISION-REGISTER.md` (APPROVED) | ⬜ |
| 2 | Update `BUSINESS-CONSTITUTION.md` immutable fields | ⬜ |
| 3 | Execute `MASTER-DATA-FREEZE.md` → database schema + seed | ⬜ |
| 4 | Pizza category cycle → LOCKED | ⬜ |
| 5 | Remaining categories → LOCKED | ⬜ |
| 6 | `IMPLEMENTATION-LOCK.md` → status LOCKED (this file) | ⬜ |
| 7 | Git tag `v1.0-business-locked` | ⬜ |
| 8 | Full pack `BUSINESS-SIGNOFF.md` at 100% | ⬜ |
| 9 | **Backend Phase 2** authorized | ⬜ |

---

## Amendment process (post-lock)

Any change to prices, menu, phone, or branding:

1. **[CHANGE-REQUEST-PROCESS.md](./CHANGE-REQUEST-PROCESS.md)** — CR approved by owner  
2. Update `MASTER-DATA-FREEZE.md` + version in [BUSINESS-FREEZE-VERSIONS.md](./BUSINESS-FREEZE-VERSIONS.md)  
3. Migration + sync all systems  
4. Entry in `BUSINESS-DECISION-REGISTER.md` amendment log  

---

*Owner-facing document: [OWNER-SIGNOFF-2PAGE.md](./OWNER-SIGNOFF-2PAGE.md)*
