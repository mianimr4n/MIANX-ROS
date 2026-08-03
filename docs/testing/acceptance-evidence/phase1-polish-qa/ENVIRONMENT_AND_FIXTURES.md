# POLISH-QA — Environment and fixtures

## Local stack (this certification)

| Component | Result |
| --- | --- |
| Docker Desktop | Available |
| Local Supabase (`telepizza-platform`) | Running |
| Backend API | `http://127.0.0.1:4000` — `/healthz` ok; `/readyz` ok with loopback env via `scripts/rc5/run-with-local-env.mjs backend/api/.env.local` |
| Website Vite | `http://localhost:3000` |
| `pnpm local:guard` | PASS |
| `pnpm local:seed` | Applied; handover `scripts/.tmp_pw/staff-handover.local.json` (**not committed**) |
| Local Postgres GRANTs | Applied for anon/authenticated/service_role (known migration gap workaround; ephemeral) |

## Fixtures / accounts used (emails only)

- `admin@telepizza.pk` (super-admin)
- `branch.manager@telepizza.pk`
- `kitchen.manager@telepizza.pk`
- `cashier@telepizza.pk`
- `rider@telepizza.pk`
- `support@telepizza.pk`

Host/waiter/HR-only/finance-only/supplier: **not in enterprise seed** for this run — recorded as residual coverage gap for those personas; D4 fixture matrix requires separate `d4` fixture generation.

## Safety

- No Production credentials
- No Production data mutations
- No Production screenshots / PII in evidence
- API refused when env pointed away from loopback

## CI parity

Required PR CI includes Typecheck/test + Owner Playwright (ephemeral Supabase). Local `rc1:gate` executed successfully with live local API.
