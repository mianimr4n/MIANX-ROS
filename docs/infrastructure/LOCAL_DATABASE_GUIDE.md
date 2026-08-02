# Local Database Guide

## Strategy

| Operation | Command / method | Touches production? |
| --- | --- | --- |
| Fresh install | `npx supabase start` (applies `supabase/migrations/*`) | No |
| Reset | `npx supabase db reset` | No (local only) |
| Migrate | migrations auto-apply on start/reset | No |
| Seed foundation | `20260713191000_seed_foundation_data.sql` (roles, Royal Orchard, menu) | No |
| Seed enterprise staff/orders | `pnpm local:seed` | No (refuses cloud) |
| Rollback | Restore via `db reset` to last migration set; no production rollback tooling | N/A |
| Snapshot | `docker exec` → `pg_dump` to `.tmp/` (operator-owned) | No |
| Restore | `psql` into local `:54322` only | No |
| Verify | `pnpm local:health` + Studio | No |

## Connection (local)

From `supabase status`:

`postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Default local DB password is the Supabase CLI demo password — **never** reuse for production.

## Privileges (local contract)

Privileges are **migration-managed**. Fresh `supabase start` / `db reset` applies:

| Layer | Migration |
| --- | --- |
| Baseline | `20260714120000_grant_public_access.sql` |
| Harden client surface | `20260718130000_p0_harden_grants_and_definer_execute.sql` |
| Feature-selective | Later migrations as needed |

Normal workflow: start or reset — **do not** run blanket manual `GRANT` after every reset.

If you see `42501 permission denied` after a clean local reset:

1. Confirm migrations through tip applied (`supabase migration list` / `schema_migrations`)
2. Prefer `pnpm local:reset` when local migration state is stale
3. Investigate the exact role/table/action — do not paper over with undocumented blanket grants
4. Production privilege changes require separate authorization (not part of local startup)

Empirical local verification (no Production): `docs/testing/acceptance-evidence/rc5-ops-01/`.  
Static SQL-intent tests: `tests/database/rc5-ops-01-privilege-contract.test.mjs` (do not claim live-DB proof).

## Rules

- Never run seed/escalate SQL against `*.supabase.co`
- Never paste production service-role keys into local scripts
- Branch IDs differ per local reset — seed looks up `royal-orchard` by `branch_code`
