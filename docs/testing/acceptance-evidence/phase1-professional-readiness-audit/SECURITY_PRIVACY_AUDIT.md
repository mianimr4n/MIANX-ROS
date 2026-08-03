# Phase 1.1 — Security & privacy audit

## Scope

Read-only repository review + prior Owner smoke logout proof. No Production screenshots/PII stored.

## Controls reviewed

| Area | Result |
| --- | --- |
| Route gates (`useAdminAccessGate`) | Present |
| Shell staff gate | Present |
| Finance/HR/purchasing permission helpers | Present |
| Logout clears session → protected dashboard | PASS (release Owner smoke) |
| Public error surfaces | No raw stack dumps observed in public smoke |
| Evidence hygiene | No Prod screenshots/PII in this pack |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-SEC-01 | P1 | CRM/order UIs expose customer PII to authorized roles — verify export/log masking in POLISH-07 |
| P11-SEC-02 | P2 | Ensure order IDs not leaked into public analytics payloads |
| P11-SEC-03 | P2 | Browser Back after logout covered for dashboard; extend matrix to other admin routes |
| P11-SEC-04 | P3 | Raw UUIDs in admin URLs acceptable if authz holds |

## P0 search

No authorization bypass, secret exposure, or cross-branch leak proven in this audit. Any future bypass = P0 stop-ship.
