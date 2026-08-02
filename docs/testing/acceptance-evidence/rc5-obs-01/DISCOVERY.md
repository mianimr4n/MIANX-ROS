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

Environment variables for Render/Supabase management API keys were **ABSENT** in the authoring session. No `.env` files with operator keys were present in the workspace. Therefore platform Log Explorer correlation could **not** be completed in-session.

## Public probe (read-only, no credentials)

Performed against `https://telepizza-api.onrender.com` — see `OPERATOR_ACCESS_PROOF.md`.

## Decision

- Deliver durable secret-free runbook under `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md`.
- Do **not** add a helper script (Dashboard is canonical).
- Do **not** enable paid services or change Production configuration.
- Keep OPS-3 / R-07 **open/partial** until credentialed log correlation is proven.
- No helper CLI; no APM wiring.
