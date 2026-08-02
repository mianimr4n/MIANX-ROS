# RC6 Settings & Configuration Contract

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`
**Current truth:** Settings = `PARTIAL_LIVE`

> Do not implement settings in this slice. Do not treat Foundation panels as versioned configuration.

---

## 1. Hierarchy

```text
Platform Default
  → Organization
    → Brand
      → Branch
        → Department / Station
          → Device
            → User
```

| Concept | Definition |
| --- | --- |
| Inherited value | Resolved from higher level |
| Override | Explicit value at level |
| Effective value | Computed resolution |
| Source level | Which level won |
| Draft | Unactivated change set |
| Validation | Schema + business rules |
| Review / approval | Per risk class |
| Scheduled activation | Future effective_at |
| Monitoring | Drift vs template |
| Rollback | **New version** pointing to prior snapshot (not destructive mutate-in-place) |
| Immutable history | Append-only versions |

---

## 2. Domains vs current truth

| Domain | Current truth | Notes |
| --- | --- | --- |
| Organization / brand / branch profile | PARTIAL LIVE writes | Org + branch hours/profile |
| Business hours | PARTIAL LIVE | Branch hours |
| Service modes | FOUNDATION / opening | Opening ops rows |
| Orders policies | Phase 2 copy | Redirect to Orders module |
| Menu / pricing | Menu module LIVE; Settings redirect | Canonical menu elsewhere |
| Kitchen / KDS | Phase 2 / Planned printers | — |
| Delivery / riders | LIVE fee/radius/min | Zones/POD policies missing |
| POS / cash | Opening + POS module | Float gaps documented |
| Payments | Opening LIVE; advanced FOUNDATION | No gateway secrets in Git |
| Inventory / purchasing | Module LIVE; Settings Phase 2 | — |
| Finance / accounting / tax | Finance module; Settings tax UNAVAILABLE honesty | FIN-01 |
| HR / payroll | HR module | Settings not source of truth |
| CRM / loyalty / marketing | Modules; Settings FOUNDATION toggles | Provider send gated |
| Providers / notifications | FOUNDATION cards | No secrets |
| Approvals / roles / permissions | RBAC seed READ-ONLY in Settings | Writes not in Settings UI |
| Security / audit | FOUNDATION panels | No MFA write APIs |
| Devices / printers | PLANNED | — |
| Integrations / import-export / flags | FOUNDATION / READ-ONLY | Env metadata only |

---

## 3. Required control behaviors (target)

| Control | Requirement |
| --- | --- |
| Impact preview | Show effective diff before activate |
| Conflict detection | Conflicting overrides flagged |
| Environment separation | Local ≠ Preview ≠ Production |
| Branch drift | Score vs org template |
| Readiness score | Opening checklist inputs |
| Version history | Who/when/why |
| Bulk / templates | Multi-branch apply with approval |
| Production re-auth | High-risk activate |
| Rollback | Activate prior version as new version |
| Mianx.ai | Draft-only suggestions; never silent activate |

---

## 4. Slice mapping

SET-00 (this contract) → SET-01…SET-10 per roadmap. High-risk domains (tax, roles, payments providers) require security review + SoD.

---

## 5. Non-claims

- No configuration versioning/rollback implemented today.
- No claim that Foundation toggles persist.
- DASH-00 creates **contracts only**.
