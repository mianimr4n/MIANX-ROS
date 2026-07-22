# Telepizza Runtime Discovery

**Date:** 2026-07-22  
**Branch:** `feature/admin-dashboard-executive-v1` @ `b1435fa`  
**Change control:** Discovery only in this document — no secrets

## Monorepo

| Item | Truth |
| --- | --- |
| Package manager | `pnpm@10.15.1` (`packageManager` field) |
| Root | `telepizza-platform` |
| Website | `apps/website` (`telepizza-pakistan`) — React 19 + Vite |
| API | `backend/api` (`@telepizza/api`) — Express |
| Database | Supabase/Postgres via `supabase/` |
| Lockfile | `pnpm-lock.yaml` |

## Runtime ownership

| Concern | Owner process | Source files |
| --- | --- | --- |
| Env classification + cloud safety | API boot | `backend/api/src/config/env.ts`, `backend/api/src/main.ts` |
| HTTP API | API | `backend/api/src/app.ts`, `modules/*` |
| Supabase clients | API | `backend/api/src/services/**` |
| Browser Supabase Auth | Website | `apps/website/client/src/lib/supabase.ts`, `contexts/AuthContext.tsx` |
| Admin API calls | Website | `apps/website/client/src/lib/admin-api.ts`, `ops-api.ts` |
| Local Supabase stack | Docker + CLI | `supabase/config.toml`, `supabase/migrations/*` |
| Local env write/guard | Scripts | `scripts/write-local-env-from-supabase.mjs`, `local-env-guard.mjs` |
| Local seed | Scripts | `scripts/seed-local-enterprise.mjs` |
| Health | Scripts | `scripts/local-health-check.mjs` |

## Variables

| Variable | Consumed by | Local expectation |
| --- | --- | --- |
| `TELEPIZZA_ENV` | API | `local` |
| `SUPABASE_URL` | API | `http://127.0.0.1:54321` |
| `SUPABASE_ANON_KEY` | API | local demo JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | local demo JWT — never Vite |
| `API_JWT_SECRET` | API | ≥16 chars |
| `API_PORT` / `PORT` | API | `4000` |
| `API_CORS_ORIGIN` | API | `http://localhost:3000` |
| `TELEPIZZA_EMAIL_MODE` | API | `mock` locally |
| `TELEPIZZA_WHATSAPP_MODE` | API | `disabled` locally |
| `TELEPIZZA_PAYMENT_MODE` | API | `mock` locally |
| `TELEPIZZA_WEBHOOK_MODE` | API | `disabled` locally |
| `TELEPIZZA_REQUIRE_LOCAL_SUPABASE` | API | `1` for laptop |
| `TELEPIZZA_ALLOW_REMOTE_SUPABASE` | API | only with staging/production |
| `DATABASE_URL` | optional / tooling | unused by API runtime; blocked if remote in local |
| `VITE_SUPABASE_URL` | Website | loopback |
| `VITE_SUPABASE_ANON_KEY` | Website | local anon |
| `VITE_API_BASE_URL` | Website | `http://localhost:4000/api/v1` |

## External integrations (code truth)

| Integration | Live client in API src? | Local mode |
| --- | --- | --- |
| Stripe / JazzCash / Easypaisa | No | mock/disabled |
| WhatsApp Business send | No | disabled; Admin Foundation + `wa.me` |
| SMTP from app | No (Auth mailer) | Mailpit `:54324` |
| Realtime order channels | Not used by Admin ERP | polling |

## Startup scripts

| Script | Purpose |
| --- | --- |
| `pnpm local` | Checklist orchestrator |
| `pnpm local:start` / `stop` / `reset` / `status` | Supabase lifecycle |
| `pnpm local:env` | Write loopback `.env.local` |
| `pnpm local:seed` | Staff + OMS/KDS sample data |
| `pnpm local:guard` / `local:health` | Safety + health |
