# RC5-OPS-01 — Fresh-local privilege verification

**Date:** 2026-08-02  
**Branch:** `feature/rc5-ops-01-agents-truth`  
**Baseline SHA:** `1a3e61ff08d8dd521158c765f3867b89136d0b1e`  
**Conclusion:** `FRESH_LOCAL_PRIVILEGE_CONTRACT_PASS`

## Local-only safety

| Check | Result |
| --- | --- |
| `pnpm local:guard` | PASS — loopback `127.0.0.1` for API + website Supabase URLs; no cloud bindings |
| Target | Local Docker Supabase only (`127.0.0.1:54321` / `:54322`) |
| Production SQL / deploy / secret rotation | Not performed |
| Manual `GRANT` | **Not executed** |

## Tooling versions (recorded)

| Tool | Version |
| --- | --- |
| Docker | 29.6.2 |
| Supabase CLI (npx) | 2.111.0 |

## Commands executed

```text
pnpm local:guard
pnpm local:stop
pnpm local:start
pnpm local:reset          # first attempt failed (bootstrap); retry:
npx supabase db reset --debug   # succeeded; migrations through tip applied
```

Read-only local diagnosis (Docker Postgres only; no secrets written to evidence):

- `schema_migrations` versions for `20260714120000`, `20260718130000`, tip `20260801180000`
- `has_table_privilege` matrix for `anon` / `authenticated` / `service_role` on sample tables
- `SET ROLE anon` / `SET ROLE authenticated` + `SELECT` from `public.branches`

## Migrations applied (observed)

| Version | Present in `schema_migrations` |
| --- | --- |
| `20260714120000` | Yes |
| `20260718130000` | Yes |
| Tip `20260801180000` | Yes |

## Observed privilege results (Postgres)

Sample matrix after fresh reset (**no manual GRANT**):

| Role | Table | SELECT | INSERT | UPDATE | DELETE | TRUNCATE |
| --- | --- | --- | --- | --- | --- | --- |
| anon | branches | yes | no | no | no | no |
| anon | menu_items | yes | no | no | no | no |
| anon | orders | no | no | no | no | no |
| anon | users | no | no | no | no | no |
| authenticated | branches | yes | no | no | no | no |
| authenticated | orders | yes | no | no | no | no |
| authenticated | users | yes | no | yes | no | no |
| service_role | (sampled tables) | yes | yes | yes | yes | yes |

`SET ROLE anon` / `authenticated` + `SELECT id FROM public.branches LIMIT 1` → **success** (exit 0).  
**No `42501`** observed in privilege probes.

Schema USAGE: `anon` / `authenticated` / `service_role` → true.

## PostgREST note (non-blocking for this slice)

HTTP probes to `http://127.0.0.1:54321/rest/v1/branches` returned **401** in this session (classic and publishable local keys). Responses did **not** include `42501` / `permission denied`. Privilege contract for this slice is established at Postgres role level via migrations + `SET ROLE` probes. PostgREST gateway/JWT behavior is out of scope for RC5-OPS-01 operator-truth alignment.

## Manual GRANT required?

**No.**

## Conclusion

`FRESH_LOCAL_PRIVILEGE_CONTRACT_PASS` — baseline + harden migrations apply on fresh local reset; application roles retain intended access; dangerous client privileges remain revoked on sampled catalog/ops tables; no residual gap requiring a new privilege migration.
