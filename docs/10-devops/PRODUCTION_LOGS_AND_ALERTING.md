# Production logs and alerting (operator runbook)

**Status:** ACTIVE (process documentation)  
**Slice:** RC5-OBS-01  
**Baseline SHA (docs authored against):** `fb7737c76f8a9127456ce7149d23620cec6e1d58`  
**Last reviewed:** 2026-08-02  

> This runbook describes **how operators obtain Render and Supabase logs without storing secrets in Git**, how to correlate API `requestId` values, and which alerts are **candidates** versus **enabled**.  
> It does **not** claim that platform alerts are enabled, that bulk log export APIs are wired in-repo, or that a full APM/paging stack exists.

---

## 1. Preconditions

| Requirement | Expectation |
| --- | --- |
| Render operator access | Ability to open the Production web service **`telepizza-api`** Logs page in [Render Dashboard](https://dashboard.render.com) |
| Supabase operator access | Ability to open the **Production** project Logs (API / Postgres / Auth) in the Supabase Dashboard |
| Least privilege | Prefer read-only / observer roles where the platform allows; do not use service-role keys for log browsing |
| Credentials | API keys and dashboard sessions stay **outside Git** and outside recorded terminal transcripts when possible |
| No secret paste | Never paste `RENDER_*` keys, Supabase management tokens, JWTs, or `Authorization` headers into chat, PRs, or evidence packs |

**Fallback when credentials are unavailable:** continue using authenticated HTTP probe bodies and redacted smoke JSON under `docs/testing/acceptance-evidence/` (historical OPS-3 practice). That fallback is **not** a substitute for platform log search during a live incident.

Official platform docs consulted while authoring this runbook (access date **2026-08-02**):

- Render — [Logs in the Render Dashboard](https://render.com/docs/logging)
- Supabase — [Logging / Logs Explorer](https://supabase.com/docs/guides/platform/logs)

---

## 2. Truth model (status labels)

| Label | Meaning |
| --- | --- |
| `IMPLEMENTED` | Present in application code and covered by repository tests and/or prior Production HTTP evidence |
| `OPERATOR_ACCESS_PROVEN` | Confirmed in a real operator session with credentials (this slice) |
| `PROPOSED_NOT_ENABLED` | Documented candidate only — **not** configured on the platform |
| `DEFERRED` | Explicitly out of RC5-OBS-01 scope |
| `NOT_AVAILABLE` | Not present / not proven in this repository or session |

Never describe an alert as “configured”, “active”, or “enabled” unless platform evidence shows `ENABLED_AND_VERIFIED`.

---

## 3. Application observability (IMPLEMENTED)

Canonical module: `backend/api/src/observability/`. Tests: `backend/api/tests/observability.test.ts`.

| Capability | Behavior | Source |
| --- | --- | --- |
| JSON stdout logging | One JSON object per line to stdout (`level`, `msg`, `timestamp`, fields) | `logger.ts` |
| Redaction | Keys matching password/token/authorization/api_key/jwt/cookie/… → `[REDACTED]`; long strings truncated | `redact.ts` |
| Request ID | Generate or propagate `X-Request-ID` (8–128 `[A-Za-z0-9._:-]`); set on response; CORS-exposed | `request-id.ts`, `app.ts` |
| Access logs | `msg: "request"` with `requestId`, method, path, status, `durationMs`, opaque ids | `request-logging.ts` |
| Slow requests | `msg: "slow_request"` at warn when duration ≥ 500ms (`TELEPIZZA_SLOW_REQUEST_MS`) | `request-logging.ts` |
| Error envelope | JSON `error.requestId`, `errorClass`, `code`, `status`, `route` | `error-format.ts` |
| `/healthz` | Liveness-style; typically HTTP 200 with diagnostics + optional Supabase Auth probe | `app.ts`, `health.ts` |
| `/readyz` | Readiness; HTTP 200 when env ready, else 503; Render `healthCheckPath` | `app.ts`, `render.yaml` |
| Build metadata | `gitSha` / version from `TELEPIZZA_GIT_SHA`, `RENDER_GIT_COMMIT`, `GITHUB_SHA`, … | `runtime-info.ts` |
| APM | Interface exists; **noop only** even if `TELEPIZZA_APM_PROVIDER` is set | `apm.ts` |
| Website | `ApiRequestError.requestId` from header/body; not a full UI incident console | `apps/website/client/src/lib/api.ts` |
| Local health | `pnpm local:health` → `scripts/local-health-check.mjs` | root `package.json` |

### Liveness vs readiness

| Endpoint | Purpose | Operator interpretation |
| --- | --- | --- |
| `GET /healthz` | Process is up and can answer | Useful for “is anything listening?”; may still report degraded DB probe details |
| `GET /readyz` | Safe to send traffic | Prefer this for Render health; expect `ok: true` and empty/absent blocking `issues` when ready |

**Production probe URLs (public, read-only):**

- `https://telepizza-api.onrender.com/healthz`
- `https://telepizza-api.onrender.com/readyz`

---

## 4. API health verification (operator)

1. From an operator workstation (not CI with Production secrets):

```bash
curl -sS -D - "https://telepizza-api.onrender.com/healthz" -o /tmp/tpz-healthz.json
curl -sS -D - "https://telepizza-api.onrender.com/readyz" -o /tmp/tpz-readyz.json
```

2. Confirm HTTP **200** for both when Production is healthy.
3. Note response header **`X-Request-ID`** (application correlation ID).
4. From JSON, note `gitSha` / `runtime.gitSha` and `readyz` `issues` (expect none when ready).
5. Delete temporary files after extracting a **redacted** summary for evidence.

Distinguish:

- **Application `X-Request-ID`** — generated/propagated by Telepizza API middleware; present on JSON access logs as `requestId`.
- **Edge/proxy IDs** (e.g. CDN / platform request IDs) — useful for platform HTTP logs; may **not** equal application `requestId`. Prefer searching application stdout JSON for `"requestId":"<value>"`.

Do **not** store full `Authorization` headers, cookies, or JWTs alongside these probes.

---

## 5. Request correlation procedure

1. Capture `X-Request-ID` from a health (or other) response.
2. Note UTC timestamp (±2 minutes) and deployed `gitSha`.
3. In Render → **telepizza-api** → **Logs**, set a time window covering the probe.
4. Search for the request ID string (Log Explorer text search). Also try path `/healthz` or `/readyz`.
5. Confirm a JSON line with `"msg":"request"` (or `"slow_request"`), matching method/path/status.
6. Confirm secret-looking keys are `[REDACTED]` if present in nested fields.
7. Record only a **partial** request ID in Git evidence (e.g. first 8 characters + `…`).

---

## 6. Render log access (canonical workflow)

**Canonical supported method for this repository:** Render Dashboard Log Explorer for service **`telepizza-api`**.  
Docs: https://render.com/docs/logging (reviewed 2026-08-02).

This repository does **not** ship a Render API client or commit a Render API key. Optional platform features (log streams, CLI) require operator-local credentials and are **not** required for this runbook.

### Steps

1. Sign in to Render Dashboard with an authorized operator account.
2. Open the Production service **`telepizza-api`** (see `render.yaml` / release runbook).
3. Open the **Logs** page (Log Explorer).
4. Choose a time range (default often “Last hour”; widen only as needed within retention).
5. Use text search for:
   - application `requestId`
   - `"slow_request"`
   - `"request_error"` / `"uncaught_exception"`
   - path fragments `/readyz`, `/healthz`, `/api/v1/`
6. Where workspace plan provides **HTTP request logs**, filters such as `method`, `status_code`, `path` may be available (plan-dependent — do not assume Free-tier parity).
7. Identify 5xx via status in application JSON (`"status":5xx`) and/or HTTP log `status_code` filters when available.
8. Treat frequent `/healthz` / `/readyz` lines as **health-probe noise** unless status ≠ 200 or readiness fails.
9. Prefer copying **redacted summaries** (timestamp, requestId partial, path, status, msg). Do **not** commit raw multi-megabyte exports.

### Export honesty

- Dashboard search/filter is the verified supported path documented here.
- Bulk “download everything” / API export is **not** implemented in this repository.
- Log **retention** is provider/plan-controlled (see Render docs). Longer retention or external shipping (syslog streams) is **Founder-authorized** platform work — out of this slice unless separately approved.

---

## 7. Supabase log access (canonical workflow)

**Canonical supported method:** Supabase Dashboard → Project → **Logs** (product logs + Logs Explorer).  
Docs: https://supabase.com/docs/guides/platform/logs (reviewed 2026-08-02).

### Steps

1. Open the **Production** Supabase project (not local `127.0.0.1`).
2. Use product log views as needed:
   - **API** / edge — REST/PostgREST traffic
   - **Postgres** — database errors / statements (plan and settings dependent)
   - **Auth** — authentication events
3. Search recent windows for PostgreSQL SQLSTATE codes in messages or Logs Explorer fields, including:
   - `42703` — undefined column
   - `42P01` — undefined table
   - `42501` — insufficient privilege
4. Auth errors: review counts/patterns; **never** copy access tokens, refresh tokens, magic-link URLs, or full user PII into Git.
5. Supabase documents spreadsheet download for matching query results in product logs — treat downloads as **operator-local**, access-controlled, and temporary. Do not commit raw exports.

### Export honesty

- Dashboard Logs / Logs Explorer are the supported operator path.
- In-repo automation of Supabase management-API log pull is **not** provided.
- Retention is plan-dependent (Supabase billing/docs).

---

## 8. Redaction rules (mandatory)

Never preserve in Git, chat, or shared evidence:

- passwords, access/refresh tokens, JWTs
- `Authorization` headers, cookies
- secret keys, service-role keys, database passwords
- reset-password URL fragments
- complete customer records
- unnecessary full IP / user-agent dumps

**Safe redacted example (synthetic):**

```json
{
  "level": "info",
  "msg": "request",
  "timestamp": "2026-08-02T07:03:20.000Z",
  "requestId": "4f4718df-…",
  "method": "GET",
  "path": "/healthz",
  "status": 200,
  "durationMs": 12,
  "userId": null,
  "authorization": "[REDACTED]"
}
```

---

## 9. Incident watchlist (exact searches)

| Signal | Where to search | Notes |
| --- | --- | --- |
| HTTP 5xx | Render app logs `"status":5`… / HTTP `status_code` filters | Correlate `requestId` |
| Readiness failures | `/readyz` HTTP ≠ 200; JSON `issues` | Render health check uses `/readyz` |
| Health-probe 401 noise | Supabase Auth probe / API logs | Historical CUT-2; probe should send anon headers |
| PostgreSQL `42703` | Supabase Postgres / API error text | Schema drift / bad column |
| PostgreSQL `42P01` | Supabase Postgres / API error text | Missing relation |
| PostgreSQL `42501` | Supabase Postgres / API error text | Privilege / RLS / grants |
| Chunk-load errors | Website/RUM not centralized; browser reports | API may not log these |
| Unhandled exceptions | Render search `uncaught_exception` / `unhandled_rejection` | Process handlers |
| `slow_request` | Render search `"slow_request"` | Threshold default 500ms |
| Auth failure spikes | Supabase Auth logs | Count patterns; no token copy |

---

## 10. Alerting matrix (candidates)

Threshold numbers are **operator decisions** until a measured baseline exists.  
**No alert in this table is claimed enabled by this documentation alone.**

| Signal | Source | Candidate condition | Severity | Candidate destination | Permission / secret | Status |
| --- | --- | --- | --- | --- | --- | --- |
| API not ready | Render health → `/readyz` | Sustained non-200 | High | Render notify / operator email | Render account (outside Git) | `PROPOSED_NOT_ENABLED` |
| API unavailable | Render service | Sustained downtime / failed deploys | Critical | Render notify | Render account | `PROPOSED_NOT_ENABLED` |
| 5xx increase | Render metrics/logs | Threshold chosen by operator | High | Render notify / log review | Render account | `PROPOSED_NOT_ENABLED` |
| PostgreSQL schema error | API/Supabase logs | `42703` or `42P01` observed | High | Operator on-call | Supabase + Render | `PROPOSED_NOT_ENABLED` |
| Privilege failure | API/Supabase logs | Repeated `42501` | High | Operator on-call | Supabase + Render | `PROPOSED_NOT_ENABLED` |
| Slow requests | API JSON logs | Repeated `slow_request` | Medium | Log review | Render logs | `PROPOSED_NOT_ENABLED` |
| Auth failures | Supabase Auth logs | Unusual sustained increase | Medium | Operator review | Supabase account | `PROPOSED_NOT_ENABLED` |

Optional future hooks (webhooks, log drains, APM) are **DEFERRED** unless Founder-authorized separately. Full APM is out of RC5-OBS-01 scope.

---

## 11. Retention and local storage

- Platform retention is **provider/plan-controlled** unless a Founder-approved log stream is configured.
- Local operator exports must be access-controlled and **gitignored**.
- Raw exports must **not** be committed.
- Sanitized summaries may be retained under `docs/testing/acceptance-evidence/rc5-obs-01/`.
- Delete temporary raw exports after producing a redacted summary.

---

## 12. OPS-3 / R-07 disposition

| Item | Disposition after RC5-OBS-01 docs |
| --- | --- |
| Durable **runbook** path | **Documented** in this file (Render Dashboard + Supabase Dashboard) |
| Credentialed **session proof** (log line ↔ requestId) | Required for `OPERATOR_ACCESS_PROVEN`; see acceptance evidence |
| Smoke/probe JSON fallback | **Retained** (R-07) |
| Platform alerts | Remain `PROPOSED_NOT_ENABLED` until separately enabled and verified |

---

## 13. Rollback

Revert the PR that introduced/updated this runbook and related evidence. No database, migration, or Production configuration change is required for rollback of documentation-only delivery.
