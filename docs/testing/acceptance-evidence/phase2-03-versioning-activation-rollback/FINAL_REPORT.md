# PHASE2-03 — Versioning, Activation and Rollback

**Date:** 2026-08-06
**Base:** `9da2fd5` (PHASE2-02 merge / PR #206)
**Status:** DRAFT PR CANDIDATE — local verification complete
**Production mutation:** NONE

## Repository truth

- The branch is based directly on fetched `origin/main` because local `main` contains an unrelated unpushed commit and cannot fast-forward without rewriting local history.
- PHASE2-02 is present at `9da2fd5` and supplies configuration persistence, organization ownership, branch ownership, RLS/grants, idempotency metadata, and the immutable change log.
- Before this slice, active configuration was represented by mutable `configuration_versions.status = 'active'` rows and no lifecycle APIs existed.

## Exact file boundary

| Class | Path | Purpose |
| --- | --- | --- |
| Migration | `supabase/migrations/20260806170223_phase2_03_versioning_activation_rollback.sql` | Immutable versions, active pointer, lifecycle RPCs and grants |
| Backend | `backend/api/src/modules/admin/configuration.ts` | Version create/list/detail/activate/rollback APIs |
| Backend tests | `backend/api/tests/admin-configuration.test.ts` | Lifecycle, RBAC, isolation, masking and concurrency behavior |
| Database tests | `tests/database/phase2-configuration-versioning-activation-rollback.test.mjs` | Static migration/security/immutability contract |
| Evidence | This directory | Bounded verification and limitations |

No frontend, readiness UI/API, shared `audit_events`, approval workflow, scheduling, support, CRM, delivery, finance, AI, PHASE2-04+, deployment, or Production file is included.

## Migration and lifecycle model

- Adds `configuration_active_versions`, keyed by schema/scope/scope ID, as the sole mutable active pointer with a monotonic revision.
- Backfills pointers from existing PHASE2-02 active rows without rewriting historical values.
- Makes `configuration_versions` reject both UPDATE and DELETE.
- Creates backend-only `create_configuration_version`, `activate_configuration_version`, and `rollback_configuration_version` transaction primitives.
- Uses transaction advisory locks plus `expectedRevision` to serialize activation and reject stale callers.
- Rollback copies the selected historical snapshot into a new immutable row and activates that copy.
- Retains the PHASE2-02 direct persistence contract for super-admin only, rewritten to append a version and move the active pointer without mutating history.
- Enables RLS, denies `public`/`anon`/`authenticated`, and grants lifecycle execution only to `service_role`.

## API contracts

- `POST /api/v1/admin/configuration/versions` — create an immutable draft for an organization or owned branch.
- `GET /api/v1/admin/configuration/versions` — list versions for an explicit scope, optionally filtered by key.
- `GET /api/v1/admin/configuration/versions/:versionId` — read a scope-authorized version.
- `POST /api/v1/admin/configuration/versions/:versionId/activate` — super-admin-only atomic activation.
- `POST /api/v1/admin/configuration/versions/:versionId/rollback` — super-admin-only rollback as a new version.

Lifecycle bodies accept optional `expectedRevision`, `reason`, and `idempotencyKey`. Stale revisions return `409 STALE_CONFIGURATION_REVISION`; malformed IDs return 400; unknown versions return 404.

## RBAC matrix

| Actor / condition | Create org draft | Create owned branch draft | Read owned branch history | Activate / rollback |
| --- | ---: | ---: | ---: | ---: |
| Unauthenticated | 401 | 401 | 401 | 401 |
| Missing approved permission | 403 | 403 | 403 | 403 |
| Super-admin | Allowed | Allowed | Allowed | Allowed |
| Branch manager with approved permission | 403 | Allowed | Allowed | 403 |
| Foreign organization / branch | 403 | 403 | 403 | 403 |
| Other operational roles | 403 | 403 | 403 | 403 |

The legacy direct-active branch PUT is now super-admin-only so it cannot bypass explicit activation authority.

## Concurrency, transaction and security evidence

The clean-local transactional probe demonstrated:

- first activation revision `0 → 1`;
- duplicate activation is an unchanged no-op;
- stale revision is rejected with SQLSTATE `40001` and does not move the pointer;
- second activation advances `1 → 2`;
- rollback creates a distinct row and advances `2 → 3`;
- historical version UPDATE is blocked;
- active pointer references the rollback copy;
- rollback audit is appended;
- audit metadata contains data type/redaction state, not configuration values;
- RLS is enabled and `anon`/`authenticated` have no direct SELECT privilege.

## Known limitations

- The repository remains single-organization; explicit ownership is enforced but multi-organization membership is not introduced.
- No approval workflow, scheduling, re-authentication ceremony, lifecycle UI, diff UI, or readiness UI exists in this slice.
- Organization history is readable only within the existing authenticated admin boundary; organization mutation and all activation/rollback remain super-admin-only.
- Legacy flat settings tables coexist and are not backfilled.
- Existing repository-wide Supabase advisor warnings remain outside this slice; PHASE2-03 introduced no error-level advisor finding and hardens search paths for configuration trigger functions.
- RC1's canonical branch-manager browser substep remains optional/non-blocking and was not run; all blocking RC1 gates passed.

## Rollback strategy

Application rollback is a revert of this PR. Database rollback must not delete configuration history. If separately authorized before Production use, remove lifecycle execute grants and routes first, then retain the active-pointer and immutable version data until dependency analysis confirms safe removal. No Production deployment, migration, SQL, merge, or remote Supabase mutation occurred.
