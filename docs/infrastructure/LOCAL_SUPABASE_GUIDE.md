# Local Supabase Guide

## Compatibility

This repository **already supports** Local Supabase via `supabase/` and `supabase/config.toml`.

| Capability | Local support | Notes |
| --- | --- | --- |
| PostgreSQL | Yes | Port `54322` |
| Auth | Yes | `site_url` → `http://localhost:3000` |
| Storage | Yes | API under `:54321/storage/v1` |
| Realtime | Yes (service) | Admin ERP currently **polls**; see limitations |
| Studio | Yes | Port `54323` |
| Mailpit | Yes | Port `54324` (auth emails) |
| Edge Functions | Available | No project functions required for core ERP smoke |

## Commands

```bash
npx supabase start
npx supabase status
npx supabase status -o env
npx supabase stop
npx supabase db reset   # wipes local DB, re-applies migrations
```

## Fresh install failure fixed (2026-07-22)

Migrations that assumed production-only drift were made safe for empty local DBs:

- `20260718130000_p0_harden_grants_and_definer_execute.sql` — conditional revoke of `handle_new_user()`
- `20260718130100_p1_retire_unmanaged_profiles.sql` — skip when `public.profiles` absent

Without these, `supabase start` aborted mid-migrate on Windows fresh stacks.

## Keys

Use **classic JWT** `ANON_KEY` / `SERVICE_ROLE_KEY` from `supabase status -o env` (not only `sb_publishable_` / `sb_secret_` if present).

Write into apps with:

```bash
npx supabase status -o env > .tmp/supabase.local.env
node scripts/write-local-env-from-supabase.mjs .tmp/supabase.local.env
```

## Project id

`config.toml` → `project_id = "telepizza-platform"`  
Docker DB container name: `supabase_db_telepizza-platform`

## Linked remote warning

CLI may warn that local service image versions differ from a **linked** cloud project. That does not force cloud usage. Do not `supabase db push` from this workflow.
