# RC4 known limitations

**As of:** 2026-08-02 — Production tip SHA `e5c6daf`

## Blocking for RC4 certification

None. Security closeout is complete — see `SECURITY_CLOSEOUT.md`.

## Non-blocking operational notes

| ID | Limitation | Notes |
| --- | --- | --- |
| OPS-1 | Free-plan Supabase | Logical dumps only; no PITR |
| OPS-2 | Local grants guidance (historical) | **Resolved for operator truth in RC5-OPS-01** — privileges are migration-managed (`20260714120000` + `20260718130000`); fresh-local empirical PASS without manual GRANT. Live-DB privilege job still deferred in CI. |
| OPS-3 | Render/Supabase log export | **Partial (RC5-OBS-01):** durable operator runbook exists at `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md` (Dashboard Log Explorer paths; no secrets in Git). Credentialed session proof that correlates `X-Request-ID` to a Render log line remains **pending** when operator platform credentials are unavailable. Smoke/probe JSON fallback retained (R-07). Platform alerts remain proposed/not enabled. |
| OPS-4 | Some Analytics modules | Deferred/unavailable metrics remain honest (by design) |
| OPS-5 | Supplier A/B RLS matrix | Partial Production credential coverage historically noted |

## Closed this cycle

| ID | Item | Resolution |
| --- | --- | --- |
| SEC-1 | Security rotation | `SECURITY_CLOSEOUT_COMPLETE` |
| CUT-2 | Health-probe anon headers | PR #162 |
| CUT-4 | Analytics `order_items.name` 42703 | PR #163 |
| AUTH-1 | Password recovery landing | PR #165 @ `e5c6daf` |
