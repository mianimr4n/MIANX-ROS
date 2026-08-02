# RC5-OBS-01 — Discovery

| Field | Value |
| --- | --- |
| Baseline SHA | `fb7737c76f8a9127456ce7149d23620cec6e1d58` |
| Branch | `docs/rc5-obs-01-operator-log-alerting` |
| Slice | Operator log export / alerting path *(optional)* |
| Date | 2026-08-02 |

## Approved scope (from planning)

- **Objective:** Address OPS-3; reduce reliance on ad-hoc smoke JSON for ops visibility.
- **Exact scope:** Credentialed runbook for Render/Supabase log access; optional alert hooks **without** committing secrets.
- **Out of scope:** Full APM; inventing Production incidents; SIEM; custom paging platform; Production deploy automation.
- **Acceptance:** F-01, F-02, F-03 (+ universal U-gates).
- **Risk:** R-07.

## Files reviewed

- `docs/planning/RC5_ROADMAP.md`, `RC5_ACCEPTANCE_CRITERIA.md`, `RC5_RISK_REGISTER.md`, `RC5_BASELINE.md`
- `docs/testing/acceptance-evidence/rc4-final-certification/KNOWN_LIMITATIONS.md`, `LOG_MONITORING.md`
- `docs/testing/acceptance-evidence/rc4-production-cutover/LOG_MONITORING.md`, `PRODUCTION_BASELINE.md`
- `docs/09-observability/PRODUCTION_HEALTH_SIGNALS.md`
- `docs/10-devops/RELEASE_AND_ROLLBACK_RUNBOOK.md`, `README.md`
- `backend/api/src/observability/*`, `backend/api/src/app.ts`, `backend/api/tests/observability.test.ts`
- `render.yaml`, `.github/workflows/ci.yml`, `scripts/local-health-check.mjs`
- `apps/website/client/src/lib/api.ts` (requestId capture)

## Operator credential check (names only)

Initial authoring session lacked Render/Supabase management API keys in the agent environment.
**Follow-up:** an authorized operator completed Dashboard correlation using credentials **outside Git**. Sanitized proof is in `OPERATOR_ACCESS_PROOF.md` (`OPERATOR_ACCESS_PROVEN`).

## Public probe (read-only)

Production health endpoints remain the preferred benign correlation seed. Proving event used `/readyz` HTTP 200 with partial request ID `obs-20260802…4853Z` — see proof file.

## Decision

- Deliver durable secret-free runbook under `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md` — **`COMPLETE`**.
- Do **not** add a helper script (Dashboard is canonical).
- Do **not** enable paid services or change Production configuration.
- Mark Render + Supabase Dashboard access **`OPERATOR_ACCESS_PROVEN`**; keep alerts **`PROPOSED_NOT_ENABLED`**; bulk export **`NOT_CLAIMED`**; APM/paging **`NOT IMPLEMENTED`**.
- Update OPS-3 / R-07 honestly for the proven Dashboard path while retaining non-claims.
