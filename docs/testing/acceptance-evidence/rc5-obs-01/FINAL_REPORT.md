# RC5-OBS-01 — Final report

## Verdict

Secret-free operator runbook is **COMPLETE**.
Render dashboard requestId correlation is **`OPERATOR_ACCESS_PROVEN`**.
Supabase unified-log access and schema/privilege error searches are **`OPERATOR_ACCESS_PROVEN`** for the exact reviewed UTC window.
Alerts remain **`PROPOSED_NOT_ENABLED`**. Bulk export is **`NOT_PROVEN` / `NOT_CLAIMED`**. Full APM/paging is **`NOT IMPLEMENTED`**.

Acceptance: **F-01 PASS** · **F-02 PASS** (OPS-3/R-07 updated for proven Dashboard path; non-claims retained) · **F-03 PASS** (manual secret/PII review).

## Identity

| Field | Value |
| --- | --- |
| Baseline SHA | `fb7737c76f8a9127456ce7149d23620cec6e1d58` |
| Branch | `docs/rc5-obs-01-operator-log-alerting` |
| Primary runbook | `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md` |
| Proof | `OPERATOR_ACCESS_PROOF.md` |

## Required status language

| Topic | Status |
| --- | --- |
| Render dashboard correlation | `OPERATOR_ACCESS_PROVEN` |
| Supabase unified-log access + `42703`/`42P01`/`42501` searches | `OPERATOR_ACCESS_PROVEN` |
| Operator runbook | `COMPLETE` |
| Alerts | `PROPOSED_NOT_ENABLED` |
| Bulk log export | `NOT_PROVEN` / `NOT_CLAIMED` |
| Full APM or paging | `NOT IMPLEMENTED` |

## Sanitized proof summary

| Fact | Value |
| --- | --- |
| Render endpoint | `/readyz` |
| HTTP status | 200 |
| Partial request ID | `obs-20260802…4853Z` |
| Matching Render log | YES (structured JSON; no sensitive token observed) |
| Supabase window (UTC) | 2026-08-02 07:45Z–07:55Z |
| `42703` / `42P01` / `42501` | 0 / 0 / 0 (**this window only**) |
| Production mutation | NONE |

## Acceptance

| ID | Criterion | Result |
| --- | --- | --- |
| F-01 | Runbook for Render/Supabase logs without secrets in Git | **PASS** |
| F-02 | OPS-3 updated honestly | **PASS** — durable Dashboard path + proof; alerts/bulk export/APM not overstated |
| F-03 | Secret scan of PR clean | **PASS** (manual inspection; no CI secret-scan job exists) |

## Remaining limitations

1. Platform alerts are candidates only (`PROPOSED_NOT_ENABLED`).
2. Bulk export APIs / log drains are not claimed.
3. Full APM or paging is not implemented.
4. SQLSTATE zero counts are window-scoped only.
5. Smoke/probe JSON remains a useful fallback when Dashboard access is unavailable (R-07 residual).

## Rollback

Revert the documentation PR. No DB/migration/deploy rollback required.

## Helper script decision

**Not added.** Render/Supabase Dashboards are the canonical supported workflows.
