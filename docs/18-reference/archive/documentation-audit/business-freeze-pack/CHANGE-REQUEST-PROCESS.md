# Change Request (CR) Process

**Governance:** Mianx.ai · Level 0  
**Rule:** **No direct database, website, or POS edits** without an approved CR.  
**Purpose:** Preserve audit trail when owner says "price 440 se 460 kar do" on WhatsApp.

---

## Workflow

```text
Owner / ops request
        ↓
   CR created (OPEN)
        ↓
   Impact analysis → affected SKUs / systems
        ↓
   Owner approves CR (APPROVED)
        ↓
   Master Data Freeze updated
        ↓
   Database migration
        ↓
   Website
        ↓
   POS / Kitchen (when live)
        ↓
   CR closed (IMPLEMENTED)
        ↓
   New BUSINESS-FREEZE-VERSION if material (V1.0 → V1.1)
```

---

## CR statuses

| Status | Meaning |
|---|---|
| `OPEN` | Logged, not approved |
| `APPROVED` | Owner signed — engineering may implement |
| `REJECTED` | Not doing — reason recorded |
| `IMPLEMENTED` | All systems synced |
| `CANCELLED` | Withdrawn |

---

## CR register

| CR ID | Title | Status | Version bump | Date opened | Date closed |
|---|---|---|---|---|---|
| — | _(none yet)_ | — | — | — | — |

---

## CR template (copy for each request)

```markdown
## CR-XXX — [Short title]

| Field | Value |
|---|---|
| **Requested by** | Owner / Operations / Marketing |
| **Date requested** | YYYY-MM-DD |
| **Channel** | WhatsApp / In-person / Email |
| **Reason** | |
| **Priority** | Normal / Urgent |

### Affected entities

| Entity type | ID / slug | Field |
|---|---|---|
| Product | e.g. zinger-burger | price |

### Change detail

| | Old | New |
|---|---|---|
| **Value** | | |
| **Evidence** | Printed menu / owner message / receipt | |

### Systems to update

- [ ] MASTER-DATA-FREEZE.md
- [ ] PRODUCT-CATALOG.md
- [ ] Supabase migration
- [ ] menu-data.ts (fallback)
- [ ] Website deploy
- [ ] POS (future)
- [ ] Kitchen display (future)

### Approval

| Role | Name | Date | Approved |
|---|---|---|---|
| Business owner | | | Yes / No |

### Implementation

| Role | Name | Date | Commit / migration |
|---|---|---|---|
| Engineering | | | |

### Version

| Bump required? | Yes → V1.0 → V1.1 | No — config only |
|---|---|---|

**CR status:** OPEN → APPROVED → IMPLEMENTED
```

---

## Example (reference only — not implemented)

### CR-001 — Zinger Burger price increase

| Field | Value |
|---|---|
| Requested by | Owner |
| Reason | Ingredient cost increased |
| Affected | `zinger-burger` |
| Old price | Rs 440 |
| New price | Rs 460 |
| Approved | Yes _(pending real owner)_ |
| Effective date | YYYY-MM-DD |
| Version bump | V1.0 → V1.1 |

---

## What requires a CR

| Change | CR required? |
|---|---|
| Any price change | **Yes** |
| Add / remove menu item | **Yes** |
| Phone, hours, branch | **Yes** |
| Logo / brand color | **Yes** |
| Deal activation / deactivation | **Yes** |
| Bug fix (no business rule change) | No |
| Performance / UI polish | No |
| Security patch | No (note in changelog) |

---

## Emergency override

Only if kitchen cannot operate (e.g. wrong price causing losses):

1. Verbal owner approval + screenshot  
2. CR created **within 24 hours** retroactively  
3. Mark CR `APPROVED` with `emergency: true`  
4. Version bump still required if data changed  

---

## File location

Active CRs: `_documentation-audit/business-freeze-pack/change-requests/CR-XXX.md`  
Or append to register table above for small teams.

---

*Level 0 governance · Pairs with [BUSINESS-FREEZE-VERSIONS.md](./BUSINESS-FREEZE-VERSIONS.md)*
