# RC5-OBS-01 — Observability capability matrix

Baseline: `fb7737c76f8a9127456ce7149d23620cec6e1d58`

Status labels: `IMPLEMENTED` · `OPERATOR_ACCESS_PROVEN` · `PROPOSED_NOT_ENABLED` · `DEFERRED` · `NOT_AVAILABLE`

| Capability | Source file | Test / evidence | Current limitation | Status |
| --- | --- | --- | --- | --- |
| JSON stdout logging | `backend/api/src/observability/logger.ts` | `observability.test.ts` (JSON.parse of sink lines) | Host must ship stdout (Render) | `IMPLEMENTED` |
| Redaction | `backend/api/src/observability/redact.ts` | Unit: secret keys → `[REDACTED]` | Non-matching key names not redacted | `IMPLEMENTED` |
| Request / correlation ID | `request-id.ts`, `request-logging.ts` | Unit: generate + propagate `X-Request-ID` | Client `X-Client-Request-Id` not read by API | `IMPLEMENTED` |
| Error envelope `requestId` | `error-format.ts` | Unit: ApiError body includes `error.requestId` | Some legacy helpers omit requestId | `IMPLEMENTED` |
| `/healthz` | `app.ts`, `health.ts` | Unit + Production HTTP probes | Migrations tip always `unavailable` | `IMPLEMENTED` |
| `/readyz` | `app.ts`, `render.yaml` | Unit + Production HTTP probes; Render healthCheckPath | Config readiness ≠ full business readiness | `IMPLEMENTED` |
| gitSha / build metadata | `runtime-info.ts` | Unit + `/readyz.runtime.gitSha` in prod probes | Relies on platform env (`RENDER_GIT_COMMIT`) | `IMPLEMENTED` |
| `slow_request` logging | `request-logging.ts` | Unit: warn at ≥500ms | Not proven in Render UI this session | `IMPLEMENTED` |
| APM | `apm.ts` | Noop adapter only | Full APM out of slice | `PROPOSED_NOT_ENABLED` / `DEFERRED` |
| Website request-ID | `apps/website/client/src/lib/api.ts` | Library captures header/body | Not surfaced as Owner ops UI | `IMPLEMENTED` (lib only) |
| Local health commands | `scripts/local-health-check.mjs`, `pnpm local:health` | Script exists; local stack required | Not a Production log export | `IMPLEMENTED` |
| Render Dashboard log access | Runbook §6; https://render.com/docs/logging | Docs reviewed 2026-08-02 | Session lacked Render credentials | Runbook `IMPLEMENTED`; access proof `NOT_AVAILABLE` |
| Supabase Dashboard log access | Runbook §7; https://supabase.com/docs/guides/platform/logs | Docs reviewed 2026-08-02 | Session lacked Supabase operator token | Runbook `IMPLEMENTED`; access proof `NOT_AVAILABLE` |
| Platform alerts | Runbook §10 | None in Git / none verified | Thresholds operator-owned | `PROPOSED_NOT_ENABLED` |
| Bulk log export automation in repo | — | — | Not shipped | `NOT_AVAILABLE` |
| Smoke/probe JSON fallback | RC4 LOG_MONITORING / cutover packs | Historical OPS-3 practice | Incomplete vs live log search | `IMPLEMENTED` (fallback) |

## Architecture (short)

```text
Client / probes
  → API (X-Request-ID)
  → JSON stdout (redacted)
  → Render service logs (operator Dashboard)
Supabase Auth/DB/API
  → Supabase Logs / Logs Explorer (operator Dashboard)
Alerts
  → candidates only (not enabled in this slice)
```
