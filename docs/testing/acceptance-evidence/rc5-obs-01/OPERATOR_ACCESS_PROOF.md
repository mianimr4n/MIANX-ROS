# RC5-OBS-01 — Operator access proof

**Result:** `PENDING` — platform credentials unavailable in authoring session.  
**Do not treat this file as proof of Render/Supabase Log Explorer correlation.**

## A. Public read-only health probe (completed — no platform credentials)

| Field | Value |
| --- | --- |
| Probe UTC window | 2026-08-02T07:03:20Z (±1 min) |
| Platform / service | Render-hosted API `telepizza-api` (`https://telepizza-api.onrender.com`) |
| Endpoints | `GET /healthz`, `GET /readyz` |
| HTTP results | `/healthz` **200** (`ok: true`); `/readyz` **200** (`ok: true`, `issues` count **0**, `database.connectivity` **ok**) |
| Application request IDs | Present on responses as `X-Request-ID` (values **partially redacted** below) |
| Deployed gitSha reported by API | `11aa195361364d1e48b3f1f589acbb9ca8bd173f` |
| Note on SHA | Website merge `fb7737c` (PERF-01) does not imply API redeploy; API metadata still reported `11aa195` at probe time |

### Partial request IDs (sanitized)

| Endpoint | Partial `X-Request-ID` |
| --- | --- |
| `/healthz` | `4f4718df…` |
| `/readyz` | `7ec0da0a…` |

Full IDs were not committed. No Authorization headers were used or stored.

### Correlation to Render logs

| Step | Status |
| --- | --- |
| Open Render → `telepizza-api` → Logs | **Not performed** — no Render operator credential in session |
| Search by requestId / timestamp / path | **Not performed** |
| Confirm structured JSON access log line | **Not performed** |
| Confirm redaction on log fields | **Not performed** (code-level redaction remains unit-tested) |

**Correlation result:** `NOT_PROVEN`

## B. Supabase log area

| Step | Status |
| --- | --- |
| Open Production project Logs | **Not performed** — no Supabase management/operator token in session |
| Search window for `42703`, `42P01`, `42501` | **Not performed** |

**Error-code search result:** `NOT_PERFORMED` (no fabricated “none observed”).

## C. Operator attestation

| Statement | Attestation |
| --- | --- |
| Public health/ready probes executed read-only | **Yes** |
| Render Log Explorer correlation executed | **No** |
| Supabase Logs search executed | **No** |
| Production data mutated | **No** |
| Credentials pasted into Git/chat/evidence | **No** |
| Alerts enabled on platform | **No** (not claimed) |

## D. How to complete proof (follow-up)

An authorized operator with Dashboard access should:

1. Repeat §A public probe; capture fresh `X-Request-ID` + UTC time + `gitSha`.
2. In Render Logs for `telepizza-api`, locate the JSON `"msg":"request"` line for that `requestId`.
3. In Supabase Logs, open Postgres/API views and search the same window for `42703` / `42P01` / `42501`; record counts or “none observed” for that window only.
4. Append a new dated section to this file (redacted) and update OPS-3 / R-07 if correlation succeeds.
