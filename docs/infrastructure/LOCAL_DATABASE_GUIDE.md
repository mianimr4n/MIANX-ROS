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

## Grants

Migration `20260714120000_grant_public_access.sql` grants table privileges for fresh local installs. Older `AGENTS.md` notes about missing grants apply mainly to environments that ran older migration sets; prefer `db reset` if PostgREST returns `42501`.

## Rules

- Never run seed/escalate SQL against `*.supabase.co`
- Never paste production service-role keys into local scripts
- Branch IDs differ per local reset — seed looks up `royal-orchard` by `branch_code`
