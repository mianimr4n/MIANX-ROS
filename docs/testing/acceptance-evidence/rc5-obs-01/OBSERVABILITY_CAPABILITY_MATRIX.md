# RC5-OBS-01 — Observability capability matrix

Baseline: `fb7737c76f8a9127456ce7149d23620cec6e1d58`

Status labels: `IMPLEMENTED` · `OPERATOR_ACCESS_PROVEN` · `PROPOSED_NOT_ENABLED` · `DEFERRED` · `NOT_AVAILABLE` · `COMPLETE` · `NOT_PROVEN` / `NOT_CLAIMED` · `NOT IMPLEMENTED`

| Capability | Source file | Test / evidence | Current limitation | Status |
| --- | --- | --- | --- | --- |
| JSON stdout logging | `backend/api/src/observability/logger.ts` | `observability.test.ts` (JSON.parse of sink lines) | Host must ship stdout (Render) | `IMPLEMENTED` |
| Redaction | `backend/api/src/observability/redact.ts` | Unit: secret keys → `[REDACTED]` | Non-matching key names not redacted | `IMPLEMENTED` |
| Request / correlation ID | `request-id.ts`, `request-logging.ts` | Unit + operator Render correlation | Client `X-Client-Request-Id` not read by API | `IMPLEMENTED` |
| Error envelope `requestId` | `error-format.ts` | Unit: ApiError body includes `error.requestId` | Some legacy helpers omit requestId | `IMPLEMENTED` |
| `/healthz` | `app.ts`, `health.ts` | Unit + Production HTTP probes | Migrations tip always `unavailable` | `IMPLEMENTED` |
| `/readyz` | `app.ts`, `render.yaml` | Unit + Production HTTP probes; Render healthCheckPath | Config readiness ≠ full business readiness | `IMPLEMENTED` |
| gitSha / build metadata | `runtime-info.ts` | Unit + `/readyz.runtime.gitSha` in prod probes | Relies on platform env (`RENDER_GIT_COMMIT`) | `IMPLEMENTED` |
| `slow_request` logging | `request-logging.ts` | Unit: warn at ≥500ms | Threshold tuning is operator-owned | `IMPLEMENTED` |
| APM | `apm.ts` | Noop adapter only | Full APM out of slice | `NOT IMPLEMENTED` |
| Website request-ID | `apps/website/client/src/lib/api.ts` | Library captures header/body | Not surfaced as Owner ops UI | `IMPLEMENTED` (lib only) |
| Local health commands | `scripts/local-health-check.mjs`, `pnpm local:health` | Script exists; local stack required | Not a Production log export | `IMPLEMENTED` |
| Operator runbook | `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md` | RC5-OBS-01 evidence pack | — | `COMPLETE` |
| Render Dashboard log access / requestId correlation | Runbook §6; `OPERATOR_ACCESS_PROOF.md` §A | `/readyz` 200; partial id `obs-20260802…4853Z`; matching structured JSON log; no sensitive token observed | Plan-dependent HTTP log filters; retention provider-controlled | `OPERATOR_ACCESS_PROVEN` |
| Supabase unified-log access + schema/privilege searches | Runbook §7; `OPERATOR_ACCESS_PROOF.md` §B | Window **2026-08-02 07:45Z–07:55Z**: `42703`/`42P01`/`42501` = **0** each | Zero counts apply **only** to that exact UTC window | `OPERATOR_ACCESS_PROVEN` |
| Platform alerts | Runbook §10; `ALERTING_STATUS.md` | Candidates documented only | Thresholds operator-owned | `PROPOSED_NOT_ENABLED` |
| Bulk log export automation in repo | — | — | Not shipped; not claimed | `NOT_PROVEN` / `NOT_CLAIMED` |
| Full APM or paging | — | — | Out of slice | `NOT IMPLEMENTED` |
| Smoke/probe JSON fallback | RC4 LOG_MONITORING / cutover packs | Historical OPS-3 practice | Secondary to Dashboard search | `IMPLEMENTED` (fallback retained) |

## Architecture (short)

```text
Client / probes
  → API (X-Request-ID)
  → JSON stdout (redacted)
  → Render service logs (operator Dashboard)  [OPERATOR_ACCESS_PROVEN]
Supabase Auth/DB/API
  → Supabase Logs / Logs Explorer (operator Dashboard)  [OPERATOR_ACCESS_PROVEN]
Alerts
  → candidates only (PROPOSED_NOT_ENABLED)
Bulk export / APM paging
  → NOT_PROVEN / NOT IMPLEMENTED
```
