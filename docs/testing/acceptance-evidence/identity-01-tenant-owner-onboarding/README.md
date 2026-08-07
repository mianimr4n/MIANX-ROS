# IDENTITY-01 acceptance evidence

Date: 2026-08-07 (Asia/Karachi)

Base: `origin/main` at `095c54139b6f9309aab93df47d8e2e4e39db627d`

## Delivered boundary

- Platform role: `platform_super_admin` (legacy `super-admin` remains a compatibility alias).
- Organization roles: `organization_owner`, `finance`, `hr`, `auditor`.
- Branch roles: `branch_manager`, `kitchen_manager`, `cashier`, `rider`, `support`.
- Platform-only, idempotent first-owner bootstrap.
- Owner and branch-manager invitation ceilings, organization/branch isolation, multi-branch assignments, atomic role/scope updates, final-owner protection, immutable invite history, and database-backed acceptance throttling.
- Provider-neutral SMTP delivery; invitation tokens are single-use hashes at rest and are absent from repository API responses and audit metadata.
- Existing `branch-manager`, `kitchen`, `customer-support`, `host`, and `waiter` assignments remain readable/acceptable for compatibility. New invitations use only canonical IDENTITY-01 roles.

## Verification

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS (387 packages) |
| `pnpm check` | PASS |
| `pnpm test:db` | PASS — 1,056/1,056 |
| `pnpm test:backend` | PASS — 645/645 across 83 files |
| `pnpm build:website` | PASS |
| `pnpm rc1:gate` | PASS — 0 blocking failures, 0 known non-blocking debt; optional BM browser acceptance remains explicitly skipped by the existing gate |
| IDENTITY-01 Playwright | PASS — 1/1 Chromium lifecycle |
| Clean local `supabase db reset` | PASS through `20260807100000_identity_01_tenant_owner_onboarding` |
| Standard `pnpm local:seed` compatibility | PASS — six existing enterprise accounts |

The Playwright lifecycle verified platform owner bootstrap, direct local Mailpit delivery, owner acceptance, single-use replay rejection, duplicate bootstrap rejection, owner-created branch-manager invitation, manager acceptance, branch scope hydration, privilege-escalation denial, and foreign-branch denial. It ran only against loopback services and generated random local-only fixture credentials in an ignored directory.

## Database and security evidence

- The migration is additive and clean-reset safe. No business table or history row is dropped.
- New join/rate-limit tables have RLS enabled. `anon` and `authenticated` receive no direct table access; narrowly scoped service-role grants are explicit.
- Organization/branch consistency is enforced by database triggers, including legacy single-branch backfill.
- The final active organization owner cannot be deleted, demoted, or deactivated.
- Accepted role/scope changes use one security-definer transaction callable only by `service_role`.
- Invite audit rows reject update/delete, and service-role update/delete grants are revoked.
- Accept throttling is persisted in Postgres rather than process memory.
- Raw invitation tokens are not returned by create/list/detail/resend APIs, persisted in audit payloads, or logged. Only SHA-256 token hashes are stored.
- Production email readiness fails closed when SMTP is missing; production transport must use `smtps://`. No real email was requested or sent during acceptance.
- Changed-file review found no committed credentials, private keys, service-role values, or plaintext invitation tokens.

## API and UI contract

- `POST /api/v1/admin/identity/organizations/:organizationId/bootstrap-owner` — platform-only initial owner bootstrap.
- `POST/GET /api/v1/admin/staff/invites` and invite detail/send/resend/revoke routes — authority-scoped lifecycle management returning safe metadata only.
- `PATCH /api/v1/admin/staff/assignments/:id` — atomic accepted-role and multi-branch scope update within the actor's ceiling.
- Existing public token-preview and acceptance endpoints retain generic invalid/expired/revoked/replay responses and now expose organization/multi-branch display metadata.
- The minimum UI is embedded in Admin HR: first-owner bootstrap for platform admins and scoped invitation/status/resend/revoke/accepted-scope controls for owners/managers.

## Compatibility and rollback strategy

- Existing `super-admin` records are not rewritten; application authorization recognizes them as the platform compatibility alias.
- Existing accepted and pending single-branch invites are backfilled from their branch organization and continue through the acceptance RPC. Legacy operational role codes remain acceptable for existing rows but cannot be issued by the new API.
- Rollback is application-first: disable the new routes/UI and SMTP delivery, while retaining additive columns, joins, rate-limit records, and immutable audit history. Do not drop identity data or rewrite accepted assignments. A later reviewed migration may retire unused additive objects only after confirming no live references.
- Production rollout requires the migration before the new backend, a configured `smtps://` endpoint and sender identity, approved public acceptance origin, and post-deploy RBAC/RLS/masking smoke. None of those Production actions occurred here.

## Limitations and release statement

- No Production mutation, deployment, migration application, or real email delivery was performed.
- Mailpit SMTP and the full browser lifecycle are local acceptance evidence, not Production email-provider certification.
- The existing RC1 gate continues to label its BM browser acceptance as optional; IDENTITY-01 supplies a separate real Chromium onboarding lifecycle.
- This slice does not implement PHASE2-04 or any unrelated product feature.
- The pull request must remain Draft and must not be merged or deployed by this work.
