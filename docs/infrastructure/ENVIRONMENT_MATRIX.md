# Environment Matrix

## Consumption map

| Variable | Where consumed | Production | Development | Shared | Legacy / unused | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SUPABASE_URL` | `backend/api/src/config/env.ts` + all Supabase clients | Hosted `*.supabase.co` | `http://127.0.0.1:54321` | Code default falls back to loopback | — | **Runtime currently often overridden by cloud `.env.local`** |
| `SUPABASE_ANON_KEY` | API env + Auth client | Cloud JWT | Local demo JWT | — | — | Required for `/readyz` |
| `SUPABASE_SERVICE_ROLE_KEY` | API service clients | Cloud JWT | Local demo JWT | — | — | Never expose to browser |
| `API_JWT_SECRET` | API | Host secret ≥16 | Local secret ≥16 | — | — | |
| `API_PORT` / `PORT` | API | Host port | `4000` | — | — | |
| `API_CORS_ORIGIN` / `CORS_ORIGIN` | API | Vercel origin | `http://localhost:3000` | — | — | |
| `VITE_SUPABASE_URL` | `apps/website/.../supabase.ts` | Cloud | Loopback | — | — | Baked at Vite start |
| `VITE_SUPABASE_ANON_KEY` | Website | Cloud anon | Local anon | — | — | |
| `VITE_API_BASE_URL` | `apps/website/.../api.ts` | Render/API host | `http://localhost:4000/api/v1` | — | — | |
| `DATABASE_URL` | Not used by Node API | Ops/docs/templates | Optional `psql` | Archive docs | **Unused by app runtime** | |
| Realtime URL | Implicit via Supabase client | Cloud | Local | — | Admin ERP does not subscribe to order channels | Auth uses `onAuthStateChange` only |
| Storage URL | Implicit | Cloud | Local | — | Menu largely static/catalog | |
| Stripe / JazzCash / Easypaisa keys | — | N/A | N/A | — | **Not present in `backend/api/src`** | Payments Foundation / mock |
| WhatsApp Business send token | — | N/A | N/A | — | Admin WhatsApp is order-derived UI | Customer site builds `wa.me` deep links only |
| SMTP | Supabase Auth / ops runbooks | Custom SMTP | Mailpit via local Auth | — | App does not send SMTP directly | |

## Classification of config files

| Path | Class |
| --- | --- |
| `backend/api/.env.local` | Development runtime (gitignored) |
| `apps/website/.env.local` | Development runtime (gitignored) |
| `*.env.local.example` | Development templates |
| `.env.example` | Shared placeholders (cloud-shaped examples) |
| `scripts/write-backend-env.mjs` | Legacy cloud helper — now gated |
| `scripts/write-local-env-from-supabase.mjs` | Development |
| `supabase/config.toml` | Development local stack |
| Vitest stubs `https://example.supabase.co` | Test-only fixtures |

## Incorrect / unsafe patterns discovered

1. Developer `.env.local` previously pointed API + website at **cloud** while testing Kitchen/OMS.  
2. `write-backend-env.mjs` hardcoded cloud project URL (now refuses without override).  
3. Running API process can remain on cloud after files are rewritten until restart.
