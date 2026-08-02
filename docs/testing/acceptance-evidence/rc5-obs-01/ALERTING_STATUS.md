# RC5-OBS-01 — Alerting status

**Rule:** No alert is described as enabled unless platform evidence proves `ENABLED_AND_VERIFIED`.

All candidates below are **`PROPOSED_NOT_ENABLED`** as of 2026-08-02. Numerical thresholds are **operator-owned** (no measured baseline in this slice).

| Signal | Source | Candidate condition | Severity | Candidate destination | Secret required | Status |
| --- | --- | --- | --- | --- | --- | --- |
| API not ready | Render health → `/readyz` | Sustained non-200 | High | Render notify / email | Render account (outside Git) | `PROPOSED_NOT_ENABLED` |
| API unavailable | Render service | Sustained downtime | Critical | Render notify | Render account | `PROPOSED_NOT_ENABLED` |
| 5xx increase | Render metrics/logs | Operator-chosen threshold | High | Render notify / log review | Render account | `PROPOSED_NOT_ENABLED` |
| PostgreSQL schema error | API / Supabase logs | `42703` or `42P01` observed | High | Operator on-call | Dashboard access | `PROPOSED_NOT_ENABLED` |
| Privilege failure | API / Supabase logs | Repeated `42501` | High | Operator on-call | Dashboard access | `PROPOSED_NOT_ENABLED` |
| Slow requests | API JSON logs | Repeated `slow_request` | Medium | Log review | Render logs | `PROPOSED_NOT_ENABLED` |
| Auth failures | Supabase Auth logs | Unusual sustained increase | Medium | Operator review | Supabase account | `PROPOSED_NOT_ENABLED` |

## Explicitly not claimed

- No PagerDuty / Slack / email integration committed
- No Render alert rules verified
- No Supabase alert rules verified
- No APM vendor enabled (`apm.ts` remains noop)
- No paid log-stream / SIEM enabled in this slice
