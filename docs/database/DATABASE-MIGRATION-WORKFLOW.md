# Database Migration Workflow

**Status:** Governance source of truth (pre-freeze)  
**Project:** `pyeowxvacgypohrbvgee` (Telepizza)  
**Last audited:** 2026-07-18 (`audit/database-pre-freeze-completeness`)

## Principles

1. **Migrations are the only schema source of truth.** Dashboard SQL Editor edits to production are forbidden.
2. **Forward-only.** Never rewrite applied migrations. Fix with a new migration.
3. **No destructive production resets.** Never drop/truncate/recreate `public.users` or other live tables to "fix" history.
4. **Dry-run before push.** `npx supabase db push --linked --dry-run` must show remote up to date or only the intended new files.
5. **History must match.** If local and remote migration lists differ, **STOP** and escalate. Do not `migration repair` without owner approval.
6. **Schema dumps are reference-only.** Never execute `production-schema-snapshot.sql` against an existing database.

## Daily / PR checklist

```bash
# From repo root, linked project must be pyeowxvacgypohrbvgee
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

| Check | Pass criteria |
|---|---|
| Linked ref | `supabase/.temp/project-ref` = `pyeowxvacgypohrbvgee` |
| History | Every local version has matching remote version (and vice versa) |
| Dry-run | "Remote database is up to date" OR only lists new unapplied local migrations you intend to ship |

## Adding a migration

1. Create `supabase/migrations/YYYYMMDDHHMMSS_short_name.sql`.
2. Prefer idempotent DDL (`if not exists`, `drop policy if exists`, etc.).
3. Include RLS + **least-privilege grants** in the same migration when adding tables.
4. Explicitly `REVOKE` dangerous privileges (`TRUNCATE`, `REFERENCES`, `TRIGGER`) from `anon` / `authenticated`.
5. For `SECURITY DEFINER` functions: `REVOKE ALL FROM PUBLIC`; grant `EXECUTE` only to intended roles; pin `search_path`.
6. Add/extend static assertions in `tests/database/*.test.mjs` when behavior is contractual.
7. Never commit service-role keys, DB passwords, or raw invite tokens.

## Apply path (production)

1. Owner approval recorded (PR + freeze checklist).
2. `migration list --linked` aligned.
3. `db push --linked --dry-run` reviewed.
4. `db push --linked` (only after approval).
5. Re-run list + targeted verification SQL (counts / policy / grant checks).
6. Update inventory docs if objects changed.

## Forbidden during audit / freeze prep

- Executing complete schema snapshots as SQL
- `supabase db reset` against production
- Migration history repair without owner approval
- Feature-table additions outside an approved feature phase
- Editing production via SQL Editor

## Related docs

- `DATABASE-SCHEMA-INVENTORY.md`
- `DATABASE-RLS-AND-GRANTS-MATRIX.md`
- `DATABASE-FREEZE-CHECKLIST.md`
- `_documentation-audit/reports/DATABASE-PRE-FREEZE-COMPLETENESS-AUDIT.md`
