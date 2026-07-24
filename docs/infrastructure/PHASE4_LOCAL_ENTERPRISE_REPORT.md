# Phase 4 — Local Enterprise Development Environment Report

**Date:** 2026-07-22  
**Change control:** No commit / push / PR / merge / deploy / production mutation  

## Repository Discovery

| Area | Finding |
| --- | --- |
| Env files | `backend/api/.env.local`, `apps/website/.env.local` (runtime); examples added; root `.env.example` (cloud-shaped) |
| Docker Compose | **None** for app stack — Local Supabase via CLI + Docker |
| Supabase | `supabase/config.toml` + full migration chain |
| Backend | Express `@telepizza/api` → Supabase JS (service/anon) |
| Frontend | Vite website → `VITE_SUPABASE_*` + `VITE_API_BASE_URL` |
| Payments | No live Stripe/JazzCash/Easypaisa clients in API src |
| WhatsApp | No outbound Business API; Admin Foundation + `wa.me` links |
| Email | Supabase Auth; local Mailpit `:54324` |

## Cloud Dependencies (pre-phase)

Frontend + Backend `.env.local` pointed at `*.supabase.co`. API `/readyz` previously exposed cloud URL. OMS confirm would mutate cloud — blocked.

## Implemented

- Local Supabase start (migrations fixed for fresh DB)
- `scripts/local-env-guard.mjs`, `write-local-env-from-supabase.mjs`, `local-health-check.mjs`, `local-up.mjs`, `seed-local-enterprise.mjs`
- Cloud `write-backend-env.mjs` gated behind `TELEPIZZA_ALLOW_CLOUD_ENV_WRITE=1`
- Root scripts: `pnpm local`, `local:guard`, `local:health`, `local:env`, `local:seed`
- Env rewritten to `127.0.0.1:54321`; API restarted; seed applied
- Docs under `docs/infrastructure/`

## Reused

- Existing `supabase/` local architecture
- Foundation seed + staff invite finalize path
- Grant migration already in chain

## Unsupported / Limitations

See `LOCAL_LIMITATIONS.md` — notably: `pnpm local` is checklist not full supervisor; Admin realtime is polling; inventory/finance deep seeds partial.

## Health Check (latest)

`WARNING — usable with documented limitations` — **0 FAIL**, 12 PASS, 2 WARNING (realtime polling, email/Mailpit note), 1 UNKNOWN (storage upload UX).

## Seed Coverage

6 staff accounts + 5 OMS/KDS orders; kitchen API returns **1 queued** ticket for kitchen principal.

## Remaining Blockers

1. Vite must load local `VITE_*` (restart after env rewrite) — in progress / operator confirm  
2. Deep Inventory/Finance/HR seed incomplete  
3. True single-command process supervisor not built  

## Security Review

- No production credentials committed  
- Local passwords only in gitignored `scripts/.tmp_pw/`  
- Cloud env writer gated  
- Seed/env writers refuse `*.supabase.co`  
- Cloud `.env.local` backups under `.tmp/` (gitignored)

## Documentation Created

- `LOCAL_DEVELOPMENT_SETUP.md`
- `LOCAL_ENVIRONMENT_GUIDE.md`
- `LOCAL_SUPABASE_GUIDE.md`
- `LOCAL_DATABASE_GUIDE.md`
- `LOCAL_SEED_DATA_GUIDE.md`
- `LOCAL_HEALTH_CHECK.md`
- `ENVIRONMENT_MATRIX.md`
- `DEVELOPER_ONBOARDING.md`
- `LOCAL_LIMITATIONS.md`
- `FOUNDER_DEVELOPMENT_ENVIRONMENT_CHECKLIST.md`
