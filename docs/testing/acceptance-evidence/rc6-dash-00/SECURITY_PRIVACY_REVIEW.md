# RC6-DASH-00 — Security / privacy review

**Classification:** Documentation / planning only — no runtime mutation

## Controls reinforced by contracts

| Topic | Contract stance |
| --- | --- |
| Tenant / branch isolation | Role matrix + widget scope; RLS remains authoritative |
| PII in widgets / events | Mask customer/rider/employee fields; redaction in event model |
| Actions | SoD for refunds, cash variance, payroll, PO, tax, role changes, COD settle |
| Re-auth | Required for high-risk config activate/rollback and sensitive approvals |
| Secrets | Never in UI, events, or evidence packs |
| Exports | Role-gated; audit |
| AI | Draft-only; no auto-execute; no secret exfiltration without ADR |
| GPS | Privacy/retention in Delivery contract — not claimed LIVE |

## Evidence hygiene

This pack contains **no** customer, employee, order, token, cookie, or provider credential data.

## Residual risks (process)

| ID | Note |
| --- | --- |
| R6-16 | Implementing without contracts → false LIVE (mitigated by DASH-00) |
| R6-17/18 | Over-claiming delivery/settings maturity |
| R6-19 | Fabricated What Changed without event model |

No Production SQL, secret creation, or RLS change in this slice.
