# Health Probe Audit

## Before

| Field | Value |
| --- | --- |
| URL | `{SUPABASE_URL}/auth/v1/health` |
| Headers | `Accept: application/json` only |
| 401 handling | Treated as connectivity `ok` |
| Effect | Production Auth logs repeated 401 every health poll; readiness still green |

## After (repository fix)

| Field | Value |
| --- | --- |
| URL | unchanged |
| Headers | `apikey` + `Authorization: Bearer` from `SUPABASE_ANON_KEY` when configured |
| 200 | `ok` |
| 401 with anon key | `error` (unexpected when key present) |
| 401 without anon key | `ok` (legacy reachability-only fallback) |
| 5xx / network | `error` |
| Secrets | Never logged by probe; `redactForLogs` covers `apikey` |

## Tests

`backend/api/tests/observability.test.ts` — probe headers, 200/401/5xx/network, skip-in-test, not_configured.

## Readiness

`/readyz` still depends on env readiness first; connectivity probe no longer intentionally relies on unauthenticated 401 as the happy path when anon key exists.
