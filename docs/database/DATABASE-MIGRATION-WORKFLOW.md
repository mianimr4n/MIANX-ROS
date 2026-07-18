# Database migration workflow

## Freeze status (2026-07-18)

```text
DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
```

Remediation progress: **DB-R0** (grants) and **DB-R1** (`public.profiles` retirement) applied on linked prod. Freeze remains **BLOCKED** pending **DB-R2…R7**. See `_documentation-audit/reports/DB-R1-PROFILES-RETIREMENT-CLOSE.md`.

## Source of truth

The ordered SQL files in `supabase/migrations/` are the canonical source of truth for the Telepizza database schema. Every persistent schema or seed change must be represented by a reviewed, forward-only migration committed to Git.

Supabase SQL Editor saved queries are not migration history. They may be used for read-only checks or an explicitly approved, narrowly scoped one-off, but they must not be treated as the source of truth. Schema snapshots, including `production-schema-snapshot.sql`, are read-only references and must never be executed against an existing database.

Never rerun a full foundation schema against production. On an already-built database, statements such as `CREATE TABLE users` collide with existing relations and can fail with PostgreSQL `42P07`. Never manually `DROP` production objects to make a snapshot or old migration run.

## One change, one forward migration

1. Update local `main`, create a focused branch, and confirm the working tree is clean.
2. Create one migration for one logical database change:

   ```sh
   npx supabase migration new <descriptive_name>
   ```

3. Write forward-only SQL in the generated file. Do not edit migration files that have already been applied to a shared environment. Create a repair migration instead.
4. Review the SQL for locking, data impact, RLS, grants, functions, triggers, indexes, rollback/recovery implications, and idempotency where appropriate.
5. Run the database tests and any focused local verification.
6. Commit the migration and related documentation to Git. Git review and migration history—not SQL Editor history—provide the audit trail.

## Production release gate

Production application requires explicit approval and a verified recovery path. Before applying:

1. Confirm a current backup or point-in-time recovery capability and document who can restore it.
2. Compare local and remote history:

   ```sh
   npx supabase migration list --linked
   ```

3. Preview exactly what would run:

   ```sh
   npx supabase db push --linked --dry-run
   ```

4. Stop if migration history differs unexpectedly, if the dry-run lists an unreviewed file, or if recovery readiness is uncertain.
5. After approval, apply only the reviewed forward migration:

   ```sh
   npx supabase db push --linked
   ```

6. Post-verify migration history, expected schema objects, RLS, grants, functions, triggers, indexes, and application health. Do not use destructive cleanup as a recovery shortcut.

The non-dry-run command is intentionally a release step. Audits, documentation work, and pull-request validation must not run it.

## SQL Editor and snapshots

- Prefer SQL Editor for read-only catalog queries and verification.
- Any approved one-off must be minimal, peer-reviewed, recorded, and reconciled into Git where it changes persistent schema.
- Do not paste or run a full schema snapshot in production.
- Do not manually drop tables, functions, policies, triggers, or indexes in production.
- Generate snapshots schema-only: no table rows, credentials, tokens, connection strings, or personal data.
- Place a warning at the top of every snapshot that it is read-only, must not be executed against an existing database, and that `supabase/migrations/` remains canonical.
