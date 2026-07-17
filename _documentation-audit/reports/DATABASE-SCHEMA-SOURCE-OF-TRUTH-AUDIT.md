# Database schema source-of-truth audit

Date: 2026-07-18
Scope: documentation and read-only production inspection; no migration, DDL, DML, merge, or deployment was performed.

## Executive result

Git `supabase/migrations/` is the canonical schema source. All 16 local migration versions are present in remote migration history, and a linked dry-run reports the remote database is up to date.

The overall audit is **BLOCKED**, however, because the production `public` schema contains legacy objects that do not exist in any Git migration: `public.profiles`, its RLS policies and grants, and `public.handle_new_user()`. Migration history is aligned, but the physical schema is not completely derivable from that history.

## Why the SQL Editor script failed with 42P07

PostgreSQL SQLSTATE `42P07` means `duplicate_table` (more generally, a relation with the requested name already exists). The full SQL Editor snapshot attempted to create `users` in a production database where the relation was already present. That failure is evidence that a foundation/schema snapshot was rerun against an already-built database; it is not evidence that production needed the foundation migration again.

The saved SQL Editor query is a reference artifact, not migration history. It must not be rerun, and existing objects must not be dropped to make it pass. Future changes must be new forward migrations.

## Source-of-truth and migration alignment

- Canonical source: the ordered files in `supabase/migrations/`.
- Non-canonical sources: SQL Editor saved queries, pasted foundation scripts, architecture drafts, and schema snapshots.
- Local migration count: 16.
- Remote migration count: 16.
- Version range: `20260713190000` through `20260716160000`.
- Alignment: every local version has the same remote version; there are no local-only or remote-only versions.
- Unapplied migrations: none. `npx supabase db push --linked --dry-run` reported `Remote database is up to date.`

Migration history synchronization does not prove complete physical-schema equivalence when objects were created manually. The schema-only production dump confirms the migrated tables, functions, indexes, RLS policies, and grants are present, but also exposes the unmanaged legacy objects described below.

## Production schema inspection

The linked production project was queried only through read-only CLI operations:

- migration-history listing;
- migration push dry-run;
- schema-only `public` and temporary `auth` dumps;
- read-only table statistics.

No data rows were included in the committed snapshot. No SQL was executed against production.

### Expected migrated identity objects

- `public.users` exists with the expected `auth_user_id` link, identity fields, status/type constraints, phone constraint/indexes, own-profile RLS, and privilege-escalation trigger.
- The active `auth.users` bootstrap trigger is `on_auth_user_created`, which calls `public.handle_auth_user_created()` and provisions `public.users` through `public.ensure_customer_profile_for_auth_user(...)`.
- `public.users` is the application profile model. Repository application code and tests use it; no application code references `public.profiles`.
- Migrated functions, operational RLS policies, table indexes, and the staged grant/revoke posture are visible in the production dump.

### Drift and grant observations

- `public.profiles` is present in production but absent from all Git migrations.
- `public.handle_new_user()` is present and inserts into `public.profiles`, but the production `auth.users` trigger dump contains no trigger that invokes it. The only application bootstrap trigger invokes `handle_auth_user_created()`.
- Two legacy RLS policies remain on `public.profiles`: `Users can view own profile` and `Users can update own profile`.
- The legacy table retains grants to `anon`, `authenticated`, and `service_role`.
- The production dump also shows direct `anon`/`authenticated` execute grants on several functions that migrations intended to expose only to `service_role`. The migrations revoke from pseudo-role `PUBLIC`, which does not remove separate direct grants. This should receive a dedicated security review and, if confirmed, a forward grant-hardening migration; it was not changed during this docs-only audit.

Because of these unmanaged objects and effective-grant concerns, production schema equivalence is not a pass even though migration versions are synchronized.

## Legacy `public.profiles` audit

### Origin

No current or historical Git SQL migration creates `public.profiles`, `public.handle_new_user()`, or the legacy profile policies. Git history only introduces the explicit replacement model in migration `20260716010000_sprint3_customer_auth_foundation.sql`, whose header states: `Profile model: public.users (no parallel profiles table).`

The exact creation time and originating SQL Editor action cannot be established from a schema-only dump because PostgreSQL does not retain table creation timestamps. The defensible conclusion is that `public.profiles` was created outside canonical Git migration history.

### References and data

- Application references: none found.
- Git migration references: none create or use the table.
- Production trigger references: none. `handle_new_user()` is orphaned; `on_auth_user_created` targets the `public.users` bootstrap.
- Production row evidence: read-only table statistics report an estimated row count of `0`. An exact `count(*)` was not available through the safely linked CLI inspection interface, and no data dump or PII query was attempted.
- Replacement status: `public.users` has replaced the legacy profile path for application identity, authorization joins, customer bootstrap, staff invite acceptance, and order RLS.

Classification: **LEGACY AND SAFE TO RETIRE IN A FUTURE MIGRATION**

“Safe to retire” is a recommendation for a future reviewed migration, not authorization to drop it now. Before that migration, obtain an exact row count, confirm backup/recovery readiness, recheck dependencies and logs, and review the effective grants. Do not manually drop the table or function.

## Snapshot policy

`docs/database/production-schema-snapshot.sql` was generated from the linked project as a schema-only `public` dump. It contains no table data rows or secrets and begins with the required warning. It is a point-in-time read-only reference, captures current drift as well as expected objects, and is not executable migration input.

Snapshots never supersede `supabase/migrations/`. Do not paste or execute this snapshot in SQL Editor or against an existing database.

## Safe workflow

The authoritative workflow is documented in `docs/database/DATABASE-MIGRATION-WORKFLOW.md`:

1. Create one focused forward migration with `npx supabase migration new <name>`.
2. Review SQL, lock/data impact, RLS, grants, functions, triggers, indexes, and recovery.
3. Confirm backup or point-in-time recovery readiness.
4. Run `npx supabase migration list --linked`.
5. Run `npx supabase db push --linked --dry-run`.
6. Stop on any unexpected history or dry-run result.
7. Apply only after explicit approval with the non-dry-run push.
8. Post-verify schema and application behavior, then commit the migration and evidence to Git.

Never rerun the foundation schema, execute a full snapshot, or manually drop production objects.

## Files created

- `docs/database/DATABASE-MIGRATION-WORKFLOW.md`
- `docs/database/production-schema-snapshot.sql`
- `_documentation-audit/reports/DATABASE-SCHEMA-SOURCE-OF-TRUTH-AUDIT.md`

## Validation results

- `npx supabase migration list --linked`: PASS — 16 local/remote versions aligned.
- `npx supabase db push --linked --dry-run`: PASS — remote database up to date; no migration applied.
- `pnpm test:db`: PASS — 124 tests passed, 0 failed.
- `git diff --check`: PASS.
- Schema-only production dump: PASS — generated without data rows or secrets.
- Production physical schema vs Git migrations: BLOCKED — unmanaged legacy profile objects and effective function grants require future forward-migration review.

## Future cleanup recommendation

Open a separate, explicitly approved database-change PR to:

1. verify an exact `public.profiles` row count and dependency inventory;
2. review function/table grants, especially direct `anon` and `authenticated` function execution;
3. create one forward migration that retires only confirmed-unused legacy profile objects and hardens confirmed-excess grants;
4. validate with backup/recovery readiness, linked history, dry-run, and post-apply checks.

No cleanup should occur through SQL Editor or manual production drops.

DATABASE SCHEMA SOURCE-OF-TRUTH: BLOCKED
