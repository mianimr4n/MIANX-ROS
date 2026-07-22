# Local Development Setup

**Audience:** Engineers bootstrapping Telepizza ERP on a laptop  
**Change control:** Local / development only — never points at production by default

## Goal

Run the full Restaurant Operating System against **Local Supabase** (Postgres, Auth, Storage, Realtime, Studio, Mailpit). Cloud remains optional and untouched.

## Prerequisites

| Tool | Notes |
| --- | --- |
| Node 20+ | Repo uses `pnpm@10.15.1` |
| pnpm | `corepack enable` if needed |
| Docker Desktop | Required by Supabase CLI |
| Supabase CLI | `npx supabase` works; global install optional |

## One-time install

```bash
pnpm install
```

## Local startup (documented path)

`pnpm local` runs tooling checks and prints the exact next commands. Fully automated compose-up of API+website+Supabase is **not** a single opaque daemon yet (honest limitation).

### Recommended sequence

```bash
# 1) Tooling + env guard
pnpm local

# 2) Start Local Supabase
pnpm local:start
# equivalent: npx supabase start

# 3) Write app env (refuses *.supabase.co)
npx supabase status -o env > .tmp/supabase.local.env
pnpm local:env .tmp/supabase.local.env
pnpm local:guard

# 4) Seed
pnpm local:seed

# 5) API + website (separate terminals); restart after env rewrite
pnpm --filter @telepizza/api dev
pnpm dev:website

# 6) Health
pnpm local:health

# Reset (LOCAL ONLY — refuses cloud env bindings)
pnpm local:reset
pnpm local:seed
```

## URLs (default local)

| Service | URL |
| --- | --- |
| Website | http://localhost:3000 |
| Admin login | http://localhost:3000/admin/login |
| API health | http://localhost:4000/healthz |
| API ready | http://localhost:4000/readyz — `supabaseUrl` must be `http://127.0.0.1:54321` |
| Supabase API | http://127.0.0.1:54321 |
| Studio | http://127.0.0.1:54323 |
| Mailpit (auth email) | http://127.0.0.1:54324 |

## Staff passwords

After `pnpm local:seed`, passwords are only in gitignored:

`scripts/.tmp_pw/staff-handover.local.json`

Never commit, paste into docs, or use those passwords against cloud.

## Verify cloud is disconnected

```bash
pnpm local:guard
curl http://localhost:4000/readyz
```

`readyz.config.supabaseUrl` must **not** contain `supabase.co`.

## Restore previous cloud env (optional)

Cloud `.env.local` files are renamed into `.tmp/*.cloud.bak.*` when rewriting local env. Copy back manually if you need cloud again — do not use cloud for ERP mutation testing.
