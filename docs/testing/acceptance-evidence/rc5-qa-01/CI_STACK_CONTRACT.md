# RC5-QA-01 — CI stack contract

## Local-only services

| Service | Command | URL | Notes |
| --- | --- | --- | --- |
| Guard | `pnpm local:guard` | — | Exit 2 on cloud Supabase bindings |
| Supabase | `pnpm local:start` / `npx supabase start` | `http://127.0.0.1:54321` | Migrations apply on start/reset |
| Env write | `npx supabase status -o env > .tmp/supabase.local.env` then `node scripts/write-local-env-from-supabase.mjs .tmp/supabase.local.env` | — | Refuses `*.supabase.co` |
| Privileges | Migration-managed (OPS-01) | — | No manual `GRANT` |
| Seed | `pnpm local:seed` | — | Writes `scripts/.tmp_pw/staff-handover.local.json` (gitignored) |
| API | `node scripts/rc5/run-with-local-env.mjs backend/api/.env.local -- pnpm --filter @telepizza/api exec tsx src/main.ts` | `http://127.0.0.1:4000` | Wait `/healthz` + `/readyz` |
| Website | `pnpm exec vite --host localhost --port 3000` (from `apps/website`) | `http://localhost:3000` | Vite loads `.env.local` |
| Stop | kill API/web PIDs; `npx supabase stop` | — | CI uses `if: always()` |

## CORS / origin contract

`API_CORS_ORIGIN` from local env write is `http://localhost:3000`.

Owner Playwright **must** use `D3_E2E_BASE_URL=http://localhost:3000` (not `127.0.0.1:3000`), otherwise browser `/auth/me` is CORS-blocked after Supabase sign-in and the login page never redirects.

## Target refusal

`scripts/rc5/assert-local-e2e-targets.mjs` refuses:

- `TELEPIZZA_PROD_*`
- `*.supabase.co`, `*.onrender.com`, `*.vercel.app`, Production-like hosts

## Health polling

`scripts/rc5/wait-http.mjs <url> [timeoutSec] [acceptCsv]` — bounded polling (default 120s), no arbitrary sleep-only readiness.
