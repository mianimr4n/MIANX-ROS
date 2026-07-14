# Business Freeze Versions

**Governance:** Mianx.ai · Level 0  
**Rule:** Versions are **immutable**. Never edit a locked version — create the next version instead.  
**Purpose:** Every system (website, database, POS, ERP) declares which freeze version it runs.

---

## Version registry

| Version | Date | Status | Summary | Git tag (recommended) |
|---|---|---|---|---|
| **V1.0** | _pending owner sign-off_ | `DRAFT` | Initial V1 — Royal Orchard, 88 food SKUs, telebar V2 | `v1.0-business-locked` |
| V1.1 | — | — | _Reserved — price-only patch_ | `v1.1-business-locked` |
| V1.2 | — | — | _Reserved — e.g. burger category expansion_ | `v1.2-business-locked` |
| V2.0 | — | — | _Reserved — telebar module launch_ | `v2.0-business-locked` |
| V3.0 | — | — | _Reserved — multi-branch operations_ | `v3.0-business-locked` |

---

## Version semantics

| Bump | When | Examples |
|---|---|---|
| **V1.0 → V1.1** | Patch — prices, hours, copy, images; no new categories | Zinger 550 → 560 |
| **V1.x → V1.y** | Minor — new items in existing categories | Add 3 grill burgers |
| **V2.0** | Major module — new customer-facing scope | Telebar on website |
| **V3.0** | Major platform — multi-branch, ERP live | Northern Bypass operating |

---

## V1.0 lock record (fill on owner sign-off)

```yaml
version: V1.0
freeze_date: YYYY-MM-DD
status: LOCKED
approved_by:
  name: ""
  designation: ""
signoff_document: OWNER-SIGNOFF-2PAGE.md

scope:
  branch_operating: royal-orchard
  food_skus: ~88
  telebar: PLANNED_V2
  canonical_prices: BFR-001  # owner choice

systems_aligned:
  master_data_freeze: master-data-v1.0.0
  supabase_migration: ""      # commit hash at lock
  website_release: ""         # commit / deploy id
  implementation_lock: IMPLEMENTATION-LOCK.md

supersedes: none
```

---

## System version declaration

Each runtime system must expose its business freeze version:

| System | Where to declare | Current |
|---|---|---|
| Website | `package.json` or env `VITE_BUSINESS_FREEZE_VERSION` | `DRAFT` |
| Supabase | `app_metadata` or config table | `DRAFT` |
| Admin (future) | Settings screen | — |
| POS (future) | Terminal config | — |

**Rule:** If system version ≠ registry LOCKED version → deployment blocked.

---

## Creating a new version

1. Owner request → [CHANGE-REQUEST-PROCESS.md](./CHANGE-REQUEST-PROCESS.md) CR approved  
2. Update `MASTER-DATA-FREEZE.md` + `PRODUCT-CATALOG.md`  
3. New row in this registry  
4. Migration + sync all systems  
5. Git tag `vX.Y-business-locked`  
6. Amendment in `BUSINESS-DECISION-REGISTER.md`

**Never:** Edit V1.0 row in place after LOCKED.

---

*Level 0 governance · See [DOCUMENTATION-LEVELS.md](./DOCUMENTATION-LEVELS.md)*
