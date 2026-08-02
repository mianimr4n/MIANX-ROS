# RC4 known limitations

**As of:** 2026-08-02 — Production tip SHA `e5c6daf`

## Blocking for RC4 certification

None. Security closeout is complete — see `SECURITY_CLOSEOUT.md`.

## Non-blocking operational notes

| ID | Limitation | Notes |
| --- | --- | --- |
| OPS-1 | Free-plan Supabase | Logical dumps only; no PITR |
| OPS-2 | Local grants guidance (historical) | **Resolved for operator truth in RC5-OPS-01** — privileges are migration-managed (`20260714120000` + `20260718130000`); fresh-local empirical PASS without manual GRANT. Live-DB privilege job still deferred in CI. |
| OPS-3 | Render/Supabase log export | **Addressed for Dashboard operator path (RC5-OBS-01):** runbook `COMPLETE` at `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md`. Render requestId correlation and Supabase unified-log SQLSTATE searches are `OPERATOR_ACCESS_PROVEN` (see `docs/testing/acceptance-evidence/rc5-obs-01/OPERATOR_ACCESS_PROOF.md`). **Not claimed:** bulk log export (`NOT_PROVEN` / `NOT_CLAIMED`), platform alerts (`PROPOSED_NOT_ENABLED`), full APM/paging (`NOT IMPLEMENTED`). Smoke/probe JSON fallback retained when Dashboard access is unavailable. |
| OPS-4 | Some Analytics modules | Deferred/unavailable metrics remain honest (by design) |
| OPS-5 | Supplier A/B RLS matrix | Partial Production credential coverage historically noted |

## Closed this cycle

| ID | Item | Resolution |
| --- | --- | --- |
| SEC-1 | Security rotation | `SECURITY_CLOSEOUT_COMPLETE` |
| CUT-2 | Health-probe anon headers | PR #162 |
| CUT-4 | Analytics `order_items.name` 42703 | PR #163 |
| AUTH-1 | Password recovery landing | PR #165 @ `e5c6daf` |
