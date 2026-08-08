# PHASE2-04 — Branch Readiness & Settings Control Plane

Status: local implementation and acceptance gates complete; Draft PR pending.  
Base SHA: `237cc5bffd964f485bebed9002685369d6265e4c`  
Migration: **NONE** — readiness is derived from existing source-backed data.

## Delivered surfaces

- `GET /api/v1/admin/branches/readiness`
- `GET /api/v1/admin/branches/:branchId/readiness`
- `GET /api/v1/admin/branches/:branchId/configuration/effective`
- `GET /api/v1/admin/branches/:branchId/configuration/history`
- Owner/Admin route: `/admin/branches`

The workspace provides deterministic branch states and scores, categorized checks, remediation paths, effective-value provenance, active version visibility, and immutable configuration history. It does not edit configuration or expose lifecycle actions.

## Scope guarantees

- No persisted readiness score or migration.
- No Production mutation or deployment.
- No Production account or invitation creation.
- Production SMTP and real Owner onboarding remain deferred.
- No PHASE2-05 implementation.
- PHASE2-03 activation/rollback remains platform-super-admin-only.

See `DISCOVERY.md`, `READINESS_MODEL.md`, `RBAC_MATRIX.md`, `TEST_EVIDENCE.md`, and `FINAL_REPORT.md` for the evidence record.
