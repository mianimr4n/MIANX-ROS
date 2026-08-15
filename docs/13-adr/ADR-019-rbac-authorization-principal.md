# ADR-019: RBAC Authorization Principal & Permission Model

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.1.0` (closes Phase 6 — Admin and ERP Core, RBAC surface)

---

## Context

Telepizza's authorization surface has grown incrementally across multiple
sprints (Sprint 3 Slice 2B staff invites, Sprint 3 Slice 2D branch-scoped
RLS, IDENTITY-01 tenant/owner onboarding, and the Phase 2 ADR-driven
permission seeds for `audit.read`, `delivery.access`, `customer.read`,
`ai.use`, `otp.manage`). Each sprint added tables, roles, and
permission grants — but the **canonical model** that ties them together
was never recorded in a single ADR.

This ADR formally accepts the as-built RBAC architecture as the
canonical Phase 6 decision: the `users → user_roles → roles →
role_permissions → permissions` graph, the dual legacy/canonical role
namespace, the `isSuperAdmin` short-circuit, the customer forbidden
permissions allowlist, and the middleware pipeline (`createRequireAuthenticatedUser`
+ `requirePermission` + service-layer branch scoping).

Authentication (who the user is) is governed by ADR-016 (OTP) and
ADR-017 (phone-first session handoff). This ADR governs **authorization**
(what the user may do).

## Decision

### 1. Five-table permission graph

```text
users
  └── user_roles (M:N, branch-scoped, status: ACTIVE | DEACTIVATED)
        ├── user_role_branches (1:N — multi-branch assignment)
        └── roles
              └── role_permissions (M:N)
                    └── permissions (module.action codes)
```

| Table | Purpose | Created in |
|---|---|---|
| `users` | Auth-linked identity: `user_type ∈ {customer, staff, rider, admin, support, franchise, supplier}` · `status ∈ {invited, active, inactive, suspended}` | `20260713190000_foundation_schema.sql` |
| `roles` | Role catalog: `code` (unique), `is_system_role` flag | `20260713190000_foundation_schema.sql` |
| `permissions` | Permission catalog: `module`, `action`, `code` (unique) | `20260713190000_foundation_schema.sql` |
| `role_permissions` | M:N grant table | `20260713190000_foundation_schema.sql` |
| `user_roles` | User-role assignment, branch-scoped via `branch_id` (legacy single-branch) + `user_role_branches` (canonical multi-branch) | `20260713190000` + extended `20260807100000_identity_01` |
| `user_role_branches` | Per-`user_roles.id` multi-branch link (canonical) | `20260807100000_identity_01_tenant_owner_onboarding.sql` |

Only rows with `assignment_status = 'ACTIVE'` contribute to the
principal. `DEACTIVATED` rows are retained for audit but produce no
permissions.

### 2. Dual role namespace (legacy + canonical)

Two parallel role code namespaces coexist by design. The platform
treats them as equivalent at the principal level:

| Legacy (kebab-case) | Canonical (underscored) | Notes |
|---|---|---|
| `super-admin` | `platform_super_admin` | `isSuperAdmin` short-circuit |
| `branch-manager` | `branch_manager` | Legacy grants mirrored in `20260807100000` |
| `customer-support` | `support` | Mirror |
| `kitchen` | `kitchen_manager` | Mirror |
| `cashier` | `cashier` | Identical |
| `rider` | `rider` | Identical |
| (none) | `organization_owner` | IDENTITY-01 only |
| (none) | `finance`, `hr`, `auditor` | IDENTITY-01 only |
| (none) | `supplier` | Supplier portal only |
| `host`, `waiter` | (no canonical) | D3 floor/dine-in only |
| `customer` | (no canonical) | Zero-permission enforced |

The migration in `20260807100000_identity_01_tenant_owner_onboarding.sql:39-49`
explicitly mirrors legacy grants into canonical codes so both namespaces
resolve to the same permission set. Future workstreams should prefer
canonical codes; legacy codes are retained for backwards compatibility
with existing data and cannot be removed without a coordinated rename.

### 3. `isSuperAdmin` short-circuit

`backend/api/src/services/auth/principal.ts:97-99` treats both
`platform_super_admin` and `super-admin` as `isSuperAdmin = true`. The
principal resolver and the `requirePermission` middleware both honor
this flag — a super-admin bypasses the per-permission lookup and is
granted every permission code implicitly.

This is intentional: super-admin is the platform-level break-glass role
and must never be locked out by a missing permission seed. The
short-circuit is **only** applied to authorization decisions — RLS
policies still apply (super-admin operates through the service-role
client for cross-branch access).

### 4. Customer forbidden permissions allowlist

`CUSTOMER_FORBIDDEN_PERMISSIONS` (`backend/api/src/services/auth/principal.ts:51-66`)
is a hard-coded allowlist of permission codes that customers must never
receive, regardless of what `role_permissions` says:

```text
menu.update, staff.create, staff.assign_role, staff.manage,
reports.read, payment.manage, branch.manage, order.manage,
delivery.assign, delivery.update, admin.access
```

If a future migration accidentally grants one of these to the
`customer` role, the principal resolver strips it before the
middleware sees it. This is defense-in-depth against permission-misconfiguration
bugs that could escalate customer privileges.

The `customer` role itself is seeded with **zero** permissions in
`20260716020000_sprint3_authorization_foundation.sql:14-26`, and a
trigger `enforce_customer_role_zero_permissions` blocks any
`role_permissions` insert targeting the customer role.

### 5. Middleware pipeline

All authenticated staff/admin endpoints flow through this pipeline:

```text
1. createRequireAuth (auth.ts)         — Bearer JWT → Supabase getUser
2. createRequireAuthenticatedUser      — loads AuthPrincipal from DB
   (authorization.ts:87-107)             · rejects suspended / inactive users
                                          · rejects users with no ACTIVE user_roles
3. requirePermission(code)              — checks role_permissions for code
   (authorization.ts:109-126)            · short-circuits on isSuperAdmin
4. Service-layer branch scoping         — assertBranchMembership / resolveScopedBranchIds
   (in service, NOT middleware)          · uses user_role_branches, NOT client-supplied branchId
```

**`requireBranchAccess` middleware is deprecated** (marked
`@deprecated` in `authorization.ts:162-188`). Branch isolation lives in
the service layer because most endpoints accept a `branchId` query
parameter or path parameter that must be validated against the
principal's actual branch membership — not just against the
`requireBranchAccess` middleware's coarse check.

**Client-supplied `branchId` is never trusted for authorization.** It
is only used as a query filter after the principal's branch scope is
resolved server-side.

### 6. Staff assignment constraints

`backend/api/src/services/staff/assignments.ts` enforces two hard
lists:

| List | Contents | Effect |
|---|---|---|
| `ASSIGNABLE_STAFF_ROLES` | `branch-manager, cashier, kitchen, rider, customer-support, host, waiter` | Only these role codes can be assigned via the staff-assignments API |
| `FORBIDDEN_ROLE_CODES` | `super-admin, owner, founder, admin, customer` | Never assignable via staff-assignments — super-admin and org-owner assignment uses the invite flow only |

The staff invite flow (`backend/api/src/services/staff/invites.ts`)
uses a separate canonical list: `organization_owner, finance, hr,
auditor, branch_manager, kitchen_manager, cashier, rider, support`.

### 7. Permission seed discipline

Every ADR that introduces a new permission code MUST ship a migration
that seeds the permission row AND the appropriate `role_permissions`
grants. The pattern (established in Phase 2 and continued in Phase 3
and Phase 5) is:

```sql
INSERT INTO permissions (module, action, code, description) VALUES (...)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code IN ('super-admin', 'branch-manager')  -- or appropriate scope
  AND p.code = '<new-permission>'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

The Phase 2 / Phase 3 / Phase 5 migrations follow this pattern for
`audit.read`, `delivery.access`, `customer.read`, `customer.merge`,
`ai.use`, `ai.approve`, `ai.read`, `otp.manage`, `otp.read`.

## Consequences

### Positive

- **Single source of truth for permissions.** The `permissions` table
  is the canonical catalog; no permission code is enforced in code
  alone. New permissions require a migration, which keeps the audit
  trail honest.
- **Branch-scoped by default.** `user_role_branches` ensures that a
  branch manager at Branch A cannot see Branch B's data even if both
  branches share the same `branch-manager` role code.
- **Defense-in-depth for customer privilege escalation.** The
  `CUSTOMER_FORBIDDEN_PERMISSIONS` allowlist catches misconfiguration
  bugs that the trigger-based `enforce_customer_role_zero_permissions`
  might miss (e.g. a new permission code not yet in the trigger's
  blocklist).
- **Clean super-admin escape hatch.** The `isSuperAdmin` short-circuit
  ensures break-glass operations are never accidentally locked out by
  a missing permission seed.
- **Auditable staff lifecycle.** `staff_assignment_events` records
  every assignment, deactivation, and reactivation with actor and
  timestamp — the RBAC graph is reconstructable from the audit trail.

### Negative

- **Dual role namespace is permanent.** Removing legacy kebab-case
  codes would require a coordinated rename across `user_roles`,
  `role_permissions`, application code, and existing JWTs. The cost
  exceeds the benefit; the namespace is retained as a permanent
  compatibility surface.
- **`requireBranchAccess` middleware is dead code.** It remains
  imported in a few legacy routes but is functionally a no-op (it
  checks `branchId` against principal scope, which the service layer
  also does). It cannot be removed without auditing every callsite.
- **Customer role's empty-permission invariant is enforced in two
  places** (trigger + principal allowlist). This is intentional
  defense-in-depth but means a future permission rename must update
  both places.
- **No fine-grained column-level permissions.** The model is
  row-level (RLS) + table-action-level (`permissions`). Column-level
  masking (e.g. "support can see orders but not payment amounts")
  would require a separate mechanism.

## Alternatives Considered

- **Single canonical role namespace (rename legacy kebab-case).**
  Rejected: the rename cost (existing JWTs, application code, test
  fixtures, documentation) exceeds the readability benefit. The
  principal resolver's mirror logic makes both namespaces
  functionally equivalent.
- **Attribute-Based Access Control (ABAC) with policy engine.**
  Rejected: Telepizza's authorization surface is role-shaped (branch
  manager, cashier, rider) and does not need the flexibility of ABAC
  policies. RBAC + branch scope is sufficient and far simpler to
  audit.
- **Application-only enforcement (no RLS).** Rejected: defense in
  depth. A buggy service or a manual `psql` fix could otherwise
  leak cross-branch data with no record. RLS is the hard gate;
  application middleware is the fast path.
- **Permission codes derived from `module.action` convention without
  a `permissions` table.** Rejected: a catalog table makes the
  permission surface discoverable (`SELECT code FROM permissions`)
  and lets us seed grants idempotently. Hard-coded constants in code
  would hide the surface and make audits harder.
- **OAuth-style scopes instead of permission codes.** Rejected: scopes
  are designed for third-party delegation (e.g. "this app can read
  your orders"). Telepizza's surface is first-party staff
  authorization; scopes would add indirection without benefit.

## As-Built Verification (2026-08-16)

`scripts/phase_6_verify.py` confirms Production Supabase has:

- ✅ 6 RBAC tables: `users`, `roles`, `permissions`, `role_permissions`,
  `user_roles`, `user_role_branches`
- ✅ 4 staff-invite tables: `staff_invites`, `staff_invite_events`,
  `staff_invite_branches`, `staff_invite_attempts`
- ✅ 1 staff assignment audit table: `staff_assignment_events`
- ✅ ≥15 role codes seeded (both legacy and canonical namespaces)
- ✅ ≥30 permission codes seeded across all modules
- ✅ `customer` role has zero permissions (trigger-enforced)
- ✅ `super-admin` / `platform_super_admin` both flagged super-admin
  in `buildAuthPrincipal`
- ✅ `CUSTOMER_FORBIDDEN_PERMISSIONS` allowlist present in principal resolver
- ✅ `enforce_customer_role_zero_permissions` trigger exists
- ✅ `identity_role_scope_guard`, `identity_invite_scope_guard`,
  `prevent_final_organization_owner_removal` triggers exist

**Result: see `PHASE6_FINAL_GATE.md` for full verification matrix.**

## References

- [`docs/13-adr/ADR-016-otp-verification-architecture.md`](./ADR-016-otp-verification-architecture.md) — OTP verification (authentication)
- [`docs/13-adr/ADR-017-phone-first-auth-session-handoff.md`](./ADR-017-phone-first-auth-session-handoff.md) — session handoff (authentication)
- [`docs/13-adr/ADR-001-branch-configuration-inheritance.md`](./ADR-001-branch-configuration-inheritance.md) — branch scope inheritance (settings layer)
- [`docs/13-adr/ADR-012-domain-event-audit.md`](./ADR-012-domain-event-audit.md) — domain events audit
- [`backend/api/src/services/auth/principal.ts`](../../backend/api/src/services/auth/principal.ts) — `AuthPrincipal` builder + `CUSTOMER_FORBIDDEN_PERMISSIONS`
- [`backend/api/src/middleware/auth.ts`](../../backend/api/src/middleware/auth.ts) — `createRequireAuth` / `createOptionalAuth`
- [`backend/api/src/middleware/authorization.ts`](../../backend/api/src/middleware/authorization.ts) — `requirePermission` / `requireAnyPermission` / `requireSuperAdmin` / `createRequireAuthenticatedUser`
- [`backend/api/src/services/auth/supabase.ts`](../../backend/api/src/services/auth/supabase.ts) — `SupabaseAuthPrincipalRepository` (loads the 5-table graph)
- [`backend/api/src/services/staff/assignments.ts`](../../backend/api/src/services/staff/assignments.ts) — `ASSIGNABLE_STAFF_ROLES` / `FORBIDDEN_ROLE_CODES`
- [`backend/api/src/services/staff/invites.ts`](../../backend/api/src/services/staff/invites.ts) — canonical inviteable roles
- Migrations: `20260713190000_foundation_schema.sql`, `20260713191000_seed_foundation_data.sql`, `20260716020000_sprint3_authorization_foundation.sql`, `20260716100000_sprint3_slice2b_staff_permissions.sql`, `20260716101000_sprint3_slice2b_staff_invites.sql`, `20260716103000_sprint3_slice2b_locked_decisions.sql`, `20260718130000_p0_harden_grants_and_definer_execute.sql`, `20260807100000_identity_01_tenant_owner_onboarding.sql`
