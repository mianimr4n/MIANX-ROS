# PHASE2-02 — Settings Persistence Foundation

**Date:** 2026-08-06
**Base:** `24f20586d24eef82e64037beedcd2039925a7237` (PR #205)
**Status:** FOUNDATION — implementation and local verification complete
**Production mutation:** NONE

## Repository truth

- Legacy organization settings are one `organization_settings` row (`id = 1`).
- Legacy branch settings remain flat columns on `branches`; there is no `branch_settings` table.
- PHASE2-01 created `configuration_schemas`, `configuration_versions`, and `configuration_change_log` plus a read-only effective-value endpoint.
- Before this slice, configuration tables had no persistence endpoint, ownership foreign keys, RLS/grant hardening, or atomic write primitive.
- Authorization principals are database-derived. `super-admin` is the repository's Founder/Owner authority; branch ownership is `principal.branchIds`. There is no approved organization-owner role or multi-organization membership model.
- Existing legacy organization/branch settings PUT contracts remain unchanged and outside this slice.

## Exact file boundary

| Class | Path | Purpose |
| --- | --- | --- |
| Migration | `supabase/migrations/20260806150140_phase2_02_settings_persistence_foundation.sql` | Ownership identity, audit metadata, RLS/grants, atomic persistence |
| Backend | `backend/api/src/modules/admin/configuration.ts` | Persistence and effective-value API contracts |
| Backend tests | `backend/api/tests/admin-configuration.test.ts` | Behavioral API/RBAC/validation/idempotency coverage |
| Database tests | `tests/database/phase2-settings-persistence-foundation.test.mjs` | Static migration/security/immutability contract |
| Evidence | This directory | Honest scope and verification record |

No frontend, PHASE2-03 lifecycle, readiness, support, CRM, delivery, finance, or AI file is in scope.

## Migration summary

- Adds a stable UUID identity to the existing singleton organization and links every branch to it without replacing legacy primary keys or settings data.
- Adds configuration key, redacted previous/new value metadata, request/correlation IDs, and idempotency key to the immutable change log.
- Extends audit change types with `update` for the create/update persistence contract.
- Enables RLS on all PHASE2-01 configuration tables, removes `anon`/`authenticated` table access, and grants backend `service_role` access.
- Converts append-only trigger functions to `SECURITY INVOKER` and removes public execution.
- Adds service-role-only `persist_configuration_value(...)`, which atomically supersedes the prior active row, inserts its replacement, and appends a change record. Same-value requests are no-ops; repeated idempotency keys replay the original result.
- Stores only data-type/redaction metadata in change rows. Secret-reference values are never copied into audit metadata.

The migration is additive and written with `IF NOT EXISTS`, guarded constraints, and replaceable functions. It does not drop or rewrite PHASE2-01 tables.

## API contracts

### `PUT /api/v1/admin/organizations/:organizationId/configuration/:key`

Super-admin-only organization create/update.

### `PUT /api/v1/admin/branches/:branchId/configuration/:key`

Requires `branch.manage` or `admin.access`, then enforces super-admin or exact branch membership.

Request:

```json
{
  "value": 10,
  "reason": "Operational adjustment",
  "idempotencyKey": "client-request-123"
}
```

Deterministic outcomes are `create` (`201`), `update`, `unchanged`, or `replayed` (`200`). Unknown keys return `404`; malformed identifiers and invalid values return `400`; authentication and authorization failures return `401`/`403`.

### `GET /api/v1/admin/branches/:branchId/configuration/:key/effective`

Resolves branch active value → organization active value → schema default. Response includes `source`, `value`, and `versionId`. A `secret_ref` is masked for non-super-admin readers.

## Validation and secret boundary

- The key must exist for the requested schema scope.
- Supported schema types are string, number, boolean, JSON object, and `secret_ref`.
- Approved constraints currently enforced: `min`/`minimum`, `max`/`maximum`, `minLength`, `maxLength`, and `pattern`.
- `secret_ref` accepts only environment-variable reference semantics: `^[A-Z][A-Z0-9_]{2,127}$`.
- Provider credentials such as `sk-*` are rejected and are never returned or logged.

## RBAC matrix

| Actor / condition | Organization write | Owned branch write | Foreign branch write |
| --- | ---: | ---: | ---: |
| Unauthenticated | 401 | 401 | 401 |
| Authenticated without config permission | 403 | 403 | 403 |
| Super-admin | Allowed for canonical organization | Allowed | Allowed within canonical organization |
| Branch manager with `branch.manage` | 403 | Allowed | 403 |
| Cashier / kitchen / rider / support | 403 | 403 unless explicitly granted an approved permission | 403 |

No request supports an omitted branch ID or an all-branch write.

## Test evidence

Focused backend suite covers:

- organization create/update;
- branch create/update;
- branch/organization/default precedence;
- unknown key, malformed UUID, invalid type and constraint;
- unauthenticated, missing permission, foreign organization and foreign branch;
- secret-reference validation/masking and no plaintext audit copy;
- same-value and idempotency-key retries.

Database contract tests cover additive ownership, RLS/grants, atomic writes, audit context, redacted metadata, and append-only guard retention.

Final command results and totals are recorded in `TEST_EVIDENCE.md`.

## Known limitations

- This repository remains single-organization. The UUID identity makes ownership explicit but does not introduce multi-organization membership or tenancy.
- Organization writes are super-admin-only because no organization-owner role/membership contract exists.
- No schema field defines per-key branch-manager eligibility. Branch managers require the existing approved `branch.manage`/`admin.access` permission and exact branch membership; absent permission is denied.
- This slice persists directly readable active values but exposes no activation, approval, scheduling, publishing, diff, history UI, or rollback API. Those remain PHASE2-03+ and are **UNAVAILABLE**.
- Legacy flat settings endpoints coexist and are not backfilled into configuration versions in this slice.

## Rollback strategy

Do not delete historical configuration rows. Application rollback is removal of the new routes/router behavior and revocation of function execution. Database rollback, if separately authorized, should remove only the new function/indexes/columns after confirming no PHASE2-02 data depends on them. Production SQL was not run.
