# Phase 2 Readiness Audit — Branch and Settings Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current State Audit

### Existing Tables

| Table | Migration | Columns | Notes |
|---|---|---|---|
| `organization_settings` | `20260729140000` | id (singleton), company_name, phone, email, address, updated_at, updated_by, created_at | Singleton (id=1); no versioning |
| `branches` | `20260713190000` | id, branch_code, name, city, area, address, phone, email, lat, long, status, opening_hours (jsonb), delivery_radius_km | Flat fields; opening_hours is untyped JSONB |
| Branch delivery fee | `20260729150000` | delivery_fee added to branch_settings or similar | Additive column |

### Existing APIs

| Endpoint | Method | Auth | Role |
|---|---|---|---|
| `/api/v1/admin/organization-settings` | GET | JWT | authenticated staff |
| `/api/v1/admin/organization-settings` | PUT | JWT | super-admin |
| `/api/v1/admin/branch-profile/:id` | GET | JWT | branch-manager (scoped), super-admin |
| `/api/v1/admin/branch-profile/:id` | PUT | JWT | branch-manager (scoped), super-admin |
| `/api/v1/admin/delivery-settings/:id` | GET | JWT | branch-manager (scoped), super-admin |
| `/api/v1/admin/delivery-settings/:id` | PUT | JWT | branch-manager (scoped), super-admin |
| `/api/v1/admin/branch-settings/:id` | GET | JWT | branch-manager (scoped), super-admin |
| `/api/v1/admin/branch-settings/:id` | PUT | JWT | branch-manager (scoped), super-admin |

### Existing UI

| Route | Component | State |
|---|---|---|
| `/admin/settings` | AdminSettings | Functional — reads/writes org and branch settings |
| `/admin/branches` | BranchesComingSoon | NAVIGATION_ONLY — renders AdminComingSoon |
| `/admin/branch` | AdminBranchManager | Owner Decision Queue; branch profile editing |

### AdminBranchContext

`AdminBranchContext` exists and provides:
- `branchIdFilter` — selected branch for scoped views
- `allowedBranches` — branches visible to current user
- `label` — display label for selected branch

Settings edit-target behavior: branch-manager is implicitly scoped to their branch; super-admin can select any branch via branch selector. No explicit edit-target API — branch ID is passed as URL param.

---

## Gaps Against Phase 2.1 Target

### Decision Answers (Required Per Audit Mandate)

**Q1: Which values are organization-level?**
- Company name, primary contact phone, primary email, primary address
- Default delivery radius, default delivery fee (proposed)
- Default order window hours (proposed)
- Tax rate defaults (proposed)
- Brand assets (proposed)

**Q2: Which values are branch-level?**
- Opening hours
- Delivery radius km (overrides org default)
- Delivery fee (overrides org default)
- Branch phone, email, address
- Notification recipient contacts
- POS float requirement (proposed)

**Q3: Which values may be inherited?**
- Delivery radius — branch inherits org default if not set
- Delivery fee — branch inherits org default if not set
- Tax rate — branch inherits org if not set

**Q4: Which values may be overridden?**
- All branch-level values above may override org defaults

**Q5: How is the effective value calculated?**
```
effectiveValue(key) = branchOverride[key] ?? orgDefault[key] ?? schemaDefault[key]
```
API must return both the source and the resolved effective value.

**Q6: How are drafts separated from active values?**
- Proposed: `configuration_drafts` table with `status IN ('draft', 'pending_approval', 'active', 'superseded')`
- Active configuration is the latest record with `status = 'active'` per (scope, key)

**Q7: Who may approve and activate?**
- Branch-level changes: branch-manager drafts, super-admin (or designated branch-manager lead) activates
- Org-level changes: super-admin drafts and activates
- High-impact changes (e.g., delivery radius): require explicit approval step (proposed ADR-001 decision)

**Q8: What requires rollback support?**
- Delivery radius changes (affects active orders)
- Opening hours changes (affects order acceptance window)
- All configuration changes should have rollback-to-previous-version capability

**Q9: What cannot be stored in normal application tables?**
- Provider API keys, HMAC secrets, database passwords
- These must be referenced by name from a secrets manager (environment variable or Supabase Vault)
- Configuration tables store only the reference name, not the secret value

**Q10: How are secrets referenced without being exposed?**
- Configuration stores `provider_config_ref: "WHATSAPP_API_KEY"` (key name only)
- Runtime resolves from `process.env.WHATSAPP_API_KEY`
- No secret value is written to the database

**Q11: How are provider configurations scoped?**
- Org-level: WhatsApp WABA number (one per org)
- Branch-level: SMS sender ID, notification email (one per branch)

**Q12: How are configuration changes audited?**
- `configuration_change_log` table: change_id, scope_type, scope_id, key, previous_version_id, new_version_id, changed_by, changed_at, reason
- Immutable append-only; no UPDATE or DELETE

**Q13: What happens when a referenced dependency is removed?**
- Configuration referencing a deleted branch → set status to 'orphaned'; alert super-admin
- Configuration referencing a removed provider → set to 'configuration_required' state

**Q14: What is the safe failure mode?**
- If effective value cannot be resolved → return `configuration_required` error code
- Do not substitute with unpredictable defaults for financial/operational settings

---

## Proposed Data Model for 2.1

### `configuration_schemas` (new)
```sql
id uuid PRIMARY KEY
scope_type TEXT CHECK (scope_type IN ('organization', 'branch'))
key VARCHAR(100) NOT NULL
label VARCHAR(200) NOT NULL
data_type TEXT CHECK (data_type IN ('string', 'number', 'boolean', 'jsonb', 'secret_ref'))
default_value JSONB
validation_rules JSONB
is_required BOOLEAN DEFAULT false
requires_approval BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
```

### `configuration_versions` (new)
```sql
id uuid PRIMARY KEY
schema_id uuid REFERENCES configuration_schemas(id)
scope_type TEXT
scope_id uuid -- org_settings.id or branches.id
value JSONB NOT NULL
status TEXT CHECK (status IN ('draft', 'pending_approval', 'active', 'superseded', 'rolled_back'))
created_by uuid REFERENCES users(id)
approved_by uuid REFERENCES users(id)
activated_at TIMESTAMPTZ
created_at TIMESTAMPTZ
UNIQUE (schema_id, scope_id, status) WHERE status = 'active'
```

### `configuration_change_log` (new)
```sql
id uuid PRIMARY KEY
schema_id uuid REFERENCES configuration_schemas(id)
scope_type TEXT
scope_id uuid
from_version_id uuid REFERENCES configuration_versions(id)
to_version_id uuid REFERENCES configuration_versions(id)
change_type TEXT CHECK (change_type IN ('create', 'activate', 'rollback', 'delete'))
changed_by uuid REFERENCES users(id)
changed_at TIMESTAMPTZ
reason TEXT
```

---

## Risk Classification

| Migration | Type | Risk |
|---|---|---|
| `configuration_schemas` table | Additive | Low |
| `configuration_versions` table | Additive | Low |
| `configuration_change_log` table | Additive | Low |
| Migrate existing `organization_settings` to new schema | Data normalization | Medium |
| Migrate existing `branch_settings` / JSONB columns | Data normalization | Medium — requires backfill |

---

## Readiness Assessment

| Item | Status |
|---|---|
| Existing settings tables | Sufficient for Phase 1; insufficient for Phase 2.1 |
| API foundation | Exists but flat; needs versioning layer |
| UI foundation | AdminSettings renders; needs draft/activation workflow |
| Auth/RBAC | Sufficient for basic; needs approval-role extension |
| ADR-001 required | YES — before implementation |
| Migration risk | Medium (backfill required) |
| Phase 2.1 maturity | FOUNDATION → target LIVE |

**Verdict: READY TO PLAN — ADR-001 must be accepted before implementation begins.**
