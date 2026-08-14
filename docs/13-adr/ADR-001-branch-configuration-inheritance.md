# ADR-001: Branch Configuration Inheritance & Overrides

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migrations `20260805190000` + `20260805200000`)

---

## Context

Telepizza operates multiple branches (Royal Orchard live; Northern Bypass
coming soon). Each branch needs its own configuration (delivery radius,
tax rate, opening hours, kitchen lead time, etc.) but inheriting most
settings from the organization default. The original model stored flat
JSONB blobs on the `branches` table, leading to:

1. **Duplication.** Every branch copied the same default values, with
   minor variations. Updating a default required touching every branch
   row.
2. **Sync errors.** When a default changed, operators had to manually
   update each branch's JSONB — often forgotten, leading to drift.
3. **No effective-value resolution.** The frontend had to know whether
   to read from the branch blob or the organization blob, leading to
   inconsistent rendering.

Phase 2.1 (Settings) closes this gap. ADR-001 establishes a three-tier
inheritance model: Branch Override → Organization Default → System
Fallback.

## Decision

Implement branch configuration inheritance with these rules:

1. **`configuration_schemas` table** defines the catalog of known
   configuration keys (e.g. `delivery.radius_km`, `tax.pct`, `hours.open`).
   Each schema entry specifies:
   - `scope_type` — `organization` or `branch`
   - `key` — dotted path (e.g. `delivery.radius_km`)
   - `data_type` — `string`, `number`, `boolean`, `jsonb`, or
     `secret_ref` (per ADR-003)
   - `default_value` — JSONB fallback when no version is active
   - `validation_rules` — JSONB with min/max/regex/etc.
   - `is_required` — boolean
   - `requires_approval` — boolean (if true, super-admin must activate)

2. **`configuration_versions` table** stores versioned values:
   - `schema_id` — FK to configuration_schemas
   - `scope_type` + `scope_id` — `organization` (scope_id NULL) or
     `branch` (scope_id = branch UUID)
   - `value` — JSONB
   - `status` — `draft`, `pending_approval`, `active`, `superseded`,
     `rolled_back`
   - `created_by`, `approved_by`, `activated_at`
   - UNIQUE partial index: only one `active` version per
     `(schema_id, scope_id)`.

3. **Three-tier resolution.** When the backend needs an effective value
   for `(key, branch_id)`:
   1. Look up active branch-scoped version for `(schema_id, branch_id)`
   2. If not found, look up active organization-scoped version for
      `(schema_id, NULL)`
   3. If not found, fall back to `schema.default_value`
   4. If still not found, return 404 (configuration missing)

4. **`configuration_change_log` table** records every change
   (create/activate/rollback/delete) with actor + reason. Append-only.

5. **Branch override is opt-in.** Most configuration keys have only an
   organization-level active version. Branches inherit by default. To
   override, a branch-manager creates a branch-scoped version (draft →
   pending_approval → active).

6. **Secret values use `secret_ref`.** Per ADR-003, secrets (API keys,
   tokens) are NEVER stored in `configuration_versions.value`. Instead,
   the value is a reference like `"provider_config_ref:WHATSAPP_API_KEY"`,
   which the backend resolves at runtime from `process.env`.

## Consequences

### Positive

- **Single source of truth.** Each configuration key has exactly one
  schema definition + one active version per scope.
- **No duplication.** Branches inherit by default; overrides are
  explicit and tracked.
- **Audit trail.** Every change is logged with who/when/why.
- **Approval workflow.** High-impact configurations (e.g. tax rate)
  can require super-admin approval before activation.

### Negative

- **Read latency.** Effective-value resolution requires up to 3 lookups
  (branch → organization → default). Mitigated by caching in the
  backend (TTL 60s).
- **Schema migration required for new keys.** Adding a new configuration
  key requires inserting a `configuration_schemas` row. Not a code
  change, but requires DB access.

## Implementation references

- Migration: `supabase/migrations/20260805190000_phase2_01_configuration_schema_versions.sql`
- Migration: `supabase/migrations/20260805200000_phase2_01_configuration_audit_hardening.sql`
- TypeScript service: `backend/api/src/services/settings/organization.ts`
- TypeScript service: `backend/api/src/services/settings/branch.ts`
- Admin routes: `backend/api/src/modules/admin/configuration.ts`, `backend/api/src/modules/admin/settings.ts`
