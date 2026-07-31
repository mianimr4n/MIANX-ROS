# RC3 Production Runbook (prepare only — do not execute)

## Pre-conditions

- Release candidate tagged from certified `main`
- Backup of Production Postgres completed and verified restorable
- Maintenance window approved by Founder
- Secrets owned by Founder / ops (never in git)

## Required environment variables (names only)

- `TELEPIZZA_ENV=production`
- `API_JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `API_CORS_ORIGIN`
- Integration modes: email/whatsapp/payment/webhook as approved (`live`/`sandbox`/`disabled`)

## Migration order

1. Apply pending Supabase migrations in timestamp order (see `rc3-migration-order.json`).
2. Apply missing role GRANTs if not yet in migrations (see AGENTS.md known gap).
3. Do **not** use ad-hoc `--linked` experiments from developer laptops without Founder authorization.

## Estimated duration

- Migration apply: tens of minutes depending on data volume (medium-high risk window).
- Smoke tests: 15–30 minutes.

## Health checks

- `GET /healthz` → 200
- `GET /readyz` → 200 with production env class
- `GET /api/v1/meta/modules` lists finance/HR/loyalty/marketing/supplier-portal modules

## Smoke tests (post-deploy)

1. Owner login → dashboard attention widgets load (zero vs unavailable distinguished).
2. Finance trial balance endpoint returns balanced books or honest error.
3. Supplier A login → sees only own POs.
4. Supplier A denied Supplier B PO by id.
5. Loyalty burn with idempotency key — replay safe.
6. Campaign submission does not mark delivered without provider response.
7. Payroll foundation action does not mark paid.

## Rollback / containment triggers

- Migration failure → stop, restore backup, escalate.
- Journal imbalance detected → freeze finance postings.
- Cross-supplier access → disable supplier portal module / revoke supplier sessions.
- Loyalty double-spend symptom → freeze burn endpoints.
- Provider outage → campaigns remain queued/failed; do not fabricate delivered.

## Feature flags / deferrals

- Binary supplier upload remains off.
- Payroll payment remains off.
- Marketing delivery claims remain provider-backed only.

## Monitoring / alerting

- API 5xx rate
- `/readyz` failures
- Finance posting errors
- Loyalty RPC conflicts
- Supplier portal 403/404 anomaly spikes
- Auth failure spikes

**This runbook was not executed against Production.**
