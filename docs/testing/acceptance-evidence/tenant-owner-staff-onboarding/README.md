# Tenant-owner and staff onboarding audit

Audit date: 2026-08-07
Repository baseline: `095c54139b6f9309aab93df47d8e2e4e39db627d` (`origin/main`)
Production Supabase project: `pyeowxvacgypohrbvgee`
Verdict: **NOT IMPLEMENTATION READY — bounded corrective PR required before Production invitations**

## Safety outcome

- No Production identity, invitation, role assignment, or authentication record was created or changed.
- No email address, invite token, credential, or other secret was read into this evidence.
- The existing platform Super Admin was not converted into a restaurant operational role.
- PHASE2-04 was not implemented.

## What works today

- A staff-invite data model exists with draft, pending, accepted, revoked, and expired states.
- Invite tokens are generated with cryptographic randomness and stored as SHA-256 hashes.
- Expiry, resend token rotation, a three-send-per-24-hour guard, revocation, acceptance, and audit events exist.
- Acceptance atomically creates the application user/profile and branch role through `finalize_staff_invite_acceptance`.
- RLS is enabled on invite tables and direct client access is revoked; the backend service role owns the privileged path.
- The public acceptance UI allows the invited person to set their own password. No shared default password is used.

## Partial or unsafe behavior

- All invite create/list/detail/send/resend/revoke routes are gated to `super-admin`; an organization owner cannot manage staff.
- Create/send/resend responses return a one-time plaintext `inviteUrl`. The new contract requires delivery through an approved email path without returning the bearer token to an authenticated API caller.
- The invite service constructs links but does not enqueue or send an invitation email through the notification provider.
- Acceptance marks the Auth email confirmed while creating the account; it does not independently prove mailbox ownership through the normal Supabase invitation/verification ceremony.
- Each invite supports one `branch_id` only. There is no multi-branch assignment model.
- Attempt throttling is process-local memory and is not durable or shared across Render instances.
- The API accepts `host` and `waiter`, while the database acceptance trigger's allowed-role list excludes them. This is contract drift.
- The HR page reads invite summaries for Super Admin but does not provide the requested owner-managed invitation lifecycle UI.

## Missing required model

Production role codes are currently:

`super-admin`, `branch-manager`, `cashier`, `customer`, `customer-support`, `host`, `kitchen`, `rider`, `supplier`, `waiter`.

The required `platform_super_admin`, `organization_owner`, `kitchen_manager`, `finance`, `hr`, `support`, and `auditor`/`read_only` role contracts do not exist as specified. The existing `super-admin` is global and currently doubles as the product's owner/founder label.

`staff_invites` and `user_roles` have `branch_id` but no `organization_id`. Although `branches` has `organization_id`, this is insufficient for an organization owner, for an owner invite that is not branch-bound, or for robust tenant-scoped authorization. There is no final-owner protection, owner transfer/recovery flow, tenant suspension boundary, or one-initial-owner bootstrap invariant.

## Repository evidence

### Backend

- `backend/api/src/services/staff/invites.ts` — token lifecycle, Super Admin assertion, acceptance and audit behavior.
- `backend/api/src/modules/admin/routes.ts` — Super Admin-only management routes and plaintext one-time invite URL responses.
- `backend/api/src/modules/auth/routes.ts` — unauthenticated preview and acceptance endpoints.
- `backend/api/src/middleware/authorization.ts` — current global Super Admin authorization helper.

### Database

- `supabase/migrations/20260713190000_foundation_schema.sql` — users, roles, role permissions and branch-bound user roles.
- `supabase/migrations/20260713191000_seed_foundation_data.sql` — original role catalog.
- `supabase/migrations/20260716020000_sprint3_authorization_foundation.sql` — authorization permissions.
- `supabase/migrations/20260716101000_sprint3_slice2b_staff_invites.sql` — invite and event tables.
- `supabase/migrations/20260716102000_sprint3_slice2b_accept_helper.sql` — acceptance transaction.
- `supabase/migrations/20260716103000_sprint3_slice2b_locked_decisions.sql` — role/branch constraints.

### Website and tests

- `apps/website/client/src/pages/StaffAccept.tsx` — token preview and password-set acceptance page.
- `apps/website/client/src/pages/admin/AdminHr.tsx` — Super Admin-only invite summary loading.
- `apps/website/client/src/lib/admin-api.ts` — invite list client only.
- `backend/api/tests/staff-invites.test.ts` — current API contract, including expected one-time `inviteUrl`.
- `tests/database/sprint3-staff-invites.test.mjs` — static migration assertions.

## Production read-only findings

- `staff_invites` has no `organization_id` and only one nullable `branch_id`.
- `user_roles` has no `organization_id` and only one nullable `branch_id` per assignment.
- `staff_invite_events` records actor, event type, redacted payload, IP, user agent, and timestamp, but no direct organization scope.
- Aggregate role-assignment inspection found one current `super-admin` assignment. No `organization_owner` role exists, so an initial owner cannot be represented.
- Existing non-owner role assignments were observed in aggregate only; their identity provenance was not inspected or changed.

## Required bounded corrective PR

1. Add an additive migration for explicit platform and tenant membership boundaries. Preserve `super-admin` compatibility while introducing a canonical platform-only mapping and `organization_owner`.
2. Add organization-scoped membership and invitation columns/tables, plus multi-branch assignments where the role permits them. Backfill only deterministic existing rows; do not infer tenant ownership.
3. Add database constraints/RPCs for exactly one bootstrap path, at least one active owner per organization, duplicate prevention, immutable invite/audit history, and atomic accept/role assignment.
4. Define and seed the approved role catalog and least-privilege permission matrix. Decide aliases/migrations for existing `kitchen`, `customer-support`, and other legacy codes explicitly.
5. Implement a one-time, auditable Platform Super Admin endpoint that can invite the first owner only when the target organization has no owner. It must reject ordinary staff provisioning.
6. Implement owner-only, same-organization staff invitation management with branch-scope validation, role ceilings, resend/revoke/expiry, and foreign-tenant denial.
7. Deliver invitation links only through the approved Production email provider/outbox. Do not return raw tokens or links in API responses, logs, audit metadata, browser storage, or telemetry.
8. Replace process-local acceptance throttling with a durable/shared limit and preserve generic anti-enumeration responses.
9. Add owner UI for invitation status and lifecycle; keep platform controls visibly and technically separate.
10. Add API, live-database, RLS, concurrency, email-delivery, browser, secret-scan, and clean-reset coverage, including final-owner and cross-tenant negative tests.

This is an architecture/security-boundary change and requires review before implementation. It must be a separate bounded PR; it is not PHASE2-04 and must not be folded into the PHASE2-03 closeout evidence.

## Founder input gate

Do not request or use Production email addresses yet. After the corrective PR is merged, deployed, migrated, and its security gates are green, pause for Founder-provided:

- exact Production organization-owner email and display name;
- exact independent Production branch-manager test email;
- organization identifier and the manager's authorized branch assignment(s).

Only then may the Platform Super Admin create the single initial owner invitation. Subsequent staff invitations must be created by that owner.

## Current certification impact

PHASE2-03 lower-role Production certification remains blocked: there is no independently provisioned Owner/Branch Manager identity that satisfies the requested onboarding and provenance rules. Existing aggregate role rows are not accepted as evidence of Founder-approved Production identities.
