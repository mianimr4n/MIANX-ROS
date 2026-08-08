# PHASE2-04 discovery and implementation boundary

Base: `237cc5bffd964f485bebed9002685369d6265e4c` (`origin/main`, PR #208 merge)  
Branch: `phase2/2.4-branch-readiness-control-plane`  
Discovery completed before PHASE2-04 implementation.

## Repository truth

- IDENTITY-01 is present at the base through migration `20260807100000_identity_01_tenant_owner_onboarding.sql` and its repository-derived organization/branch role scopes.
- The existing Production SMTP recovery evidence is isolated on `codex/identity-01-production-recovery`; it is not part of this branch.
- PHASE2-01 supplies `configuration_schemas`, immutable configuration versions, and change-log foundations.
- PHASE2-02 supplies validated persistence and masked effective-value reads.
- PHASE2-03 supplies active-version pointers plus super-admin-only activation and rollback.
- The current repository migration tip is IDENTITY-01. No PHASE2-04 migration is planned: readiness can be derived from existing branch, configuration, staffing, and immutable lifecycle data.

## Existing surfaces and sources

- Authoritative settings route: `/admin/settings`, using `AdminShell`, Settings primitives, and partially live organization/branch panels.
- `/admin/branches` is currently a placeholder; `/admin/branch` is an operational branch-manager surface. PHASE2-04 will replace only the `/admin/branches` placeholder and will reuse the existing Admin shell.
- The opening-readiness service already performs live checks over branch profile, staffing, floor/tables, booking, menu, payments, notifications, devices, SOP/training, rehearsal, and handover tables. Its legacy grade is not the PHASE2-04 contract and will be adapted without fabricating results.
- Existing configuration APIs expose schemas, version list/detail, effective resolution (`branch` -> `organization` -> `default`), persistence, and lifecycle operations. Secret schemas are masked by the backend.
- `configuration_change_log`, `configuration_versions`, and `configuration_active_versions` are the stored history/version sources. PHASE2-04 is read-only and must not synthesize audit entries.
- Branch operational fields available include identity/code/name/status, organization scope, phone, opening hours, timezone, address/location fields, delivery radius, and timestamps; checks will use only fields actually present in repository queries.

## Authorization ownership

- Platform super admin: platform-authorized inspection.
- Organization owner: read-only access only to branches in `ownedOrganizationIds`.
- Branch manager: read-only access only to assigned `branchIds`.
- Kitchen/cashier/rider and anonymous users: denied (anonymous is 401).
- Organization and branch scope are repository-derived. Query parameters cannot enlarge them.
- PHASE2-03 activation/rollback remains super-admin-only; no Owner lifecycle actions will be rendered.

## Exact implementation boundary

Planned product/test files:

1. `backend/api/src/services/branches/control-plane.ts` (new deterministic model/adapter)
2. `backend/api/src/modules/admin/routes.ts` (bounded readiness list/detail routes)
3. `backend/api/src/modules/admin/configuration.ts` (read-only effective collection/history endpoints)
4. `backend/api/tests/phase2-04-branch-readiness.test.ts`
5. `apps/website/client/src/App.tsx` (replace branches placeholder route)
6. `apps/website/client/src/lib/admin-api.ts` (typed read-only clients)
7. `apps/website/client/src/lib/admin-access.ts` (role gate and primary navigation)
8. `apps/website/client/src/pages/admin/AdminBranches.tsx`
9. `apps/website/client/src/components/admin/branches/BranchReadinessWorkspace.tsx`
10. `tests/website/phase2-04-branch-readiness-ui.test.mjs`
11. `tests/database/phase2-04-branch-readiness-control-plane.test.mjs`
12. `scripts/phase2-04/fixture-local.mjs` (loopback-only browser fixtures)
13. `e2e/phase2-04/branch-readiness.spec.ts`
14. `playwright.phase2-04.config.ts`

Evidence files are bounded to `docs/testing/acceptance-evidence/phase2-04-branch-readiness-control-plane/`:
`DISCOVERY.md`, `README.md`, `FINAL_REPORT.md`, `TEST_EVIDENCE.md`, `RBAC_MATRIX.md`, and `READINESS_MODEL.md`.

No migration, environment file, SMTP code, identity onboarding workflow, or Production automation belongs in the boundary.

## API and UI gaps

- No organization-scoped readiness list contract exists.
- Existing detail readiness lacks the required deterministic state/score/category/check/source contract.
- No bulk effective-configuration viewer exists; callers currently resolve one key at a time.
- No bounded, redacted configuration-history read API exists.
- `/admin/branches` has no operational readiness workspace, effective-value viewer, lifecycle visibility, or immutable history presentation.

## Security and contamination risks

- Service-role database access makes explicit API scope checks mandatory before every query.
- Unknown/unavailable probes must remain UNKNOWN and must never increase the score.
- Secret values and sensitive `secret_ref` metadata must be masked before serialization and again treated as non-renderable by the UI.
- Existing broad `admin.access` must not substitute for organization/branch ownership checks.
- Adding editing, activation, rollback, invitation, SMTP, cached readiness persistence, launch automation, or PHASE2-05 workflow is out of scope.
