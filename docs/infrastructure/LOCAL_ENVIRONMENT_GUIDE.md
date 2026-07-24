# Local Environment Guide

## Architecture (target)

```
Frontend (:3000)
  → Backend API (:4000)
    → Local Supabase (:54321)
      → Local PostgreSQL (:54322)
      → Local Auth / Storage / Realtime
      → Mailpit (:54324)
      → Studio (:54323)
```

## Process roles

| Process | How started | Config |
| --- | --- | --- |
| Supabase stack | `npx supabase start` | `supabase/config.toml` |
| API | `pnpm --filter @telepizza/api dev` | `backend/api/.env.local` |
| Website | `pnpm dev:website` | `apps/website/.env.local` |

## Safety scripts

| Script | Purpose |
| --- | --- |
| `pnpm local:guard` | Exit 2 if any app env points at `*.supabase.co` |
| `pnpm local:env` | Write local `.env.local` from `supabase status` |
| `pnpm local:seed` | Local staff + orders; refuses cloud |
| `pnpm local:health` | PASS/FAIL/WARNING/UNKNOWN report |
| `pnpm local` | Orchestrator checklist + printed next steps |

## Dangerous helper (gated)

`scripts/write-backend-env.mjs` historically wrote **cloud** Supabase URL + live CORS. It now **refuses** unless `TELEPIZZA_ALLOW_CLOUD_ENV_WRITE=1`. Prefer `write-local-env-from-supabase.mjs`.

## Env file locations

| File | Role | Tracked? |
| --- | --- | --- |
| `backend/api/.env.local` | Runtime API | No (gitignored) |
| `apps/website/.env.local` | Runtime Vite | No |
| `backend/api/.env.local.example` | Local template | Yes (intended) |
| `apps/website/.env.local.example` | Local template | Yes (intended) |
| `.env.example` | Cloud/hosting placeholders | Yes |

## Runtime classification

| Variable | Consumer | Local value |
| --- | --- | --- |
| `SUPABASE_URL` | API | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | API | from `supabase status` (classic JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | API | from `supabase status` (classic JWT) |
| `API_JWT_SECRET` | API | any ≥16 chars local secret |
| `API_CORS_ORIGIN` | API | `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Website | `http://127.0.0.1:54321` |
| `VITE_SUPABASE_ANON_KEY` | Website | local anon JWT |
| `VITE_API_BASE_URL` | Website | `http://localhost:4000/api/v1` |

`DATABASE_URL` is **not** consumed by the Node API — the API talks to Supabase HTTP/PostgREST, not direct Postgres.

## Switching modes

1. **Local ERP testing** — loopback URL + `pnpm local:guard` PASS + `/readyz` shows loopback.
2. **Cloud (optional)** — restore backed-up `.env.local` — **mutations affect shared cloud data**. Never use for Kitchen/OMS acceptance unless explicitly authorized.
