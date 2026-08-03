# Phase 1.1 — HR, finance & reporting audit

## HR

| Item | Evidence | Honesty |
| --- | --- | --- |
| Employees / attendance / leave / docs | Wired | LIVE workforce badge |
| Payroll / shifts | Wired in panels | **Header still says payroll Planned for Phase 2** (`HRHeader.tsx:21`) vs banner claiming payroll available |
| Performance / training | Phase 2 | Honest |

| ID | Severity | Issue |
| --- | --- | --- |
| P11-HR-01 | P1 | `HRHeader` contradicts `HRStatusBanner` and payroll panels |

## Finance

| Item | Maturity |
| --- | --- |
| CoA / journals / TB / P&L / cash | PARTIAL_LIVE (repo) |
| AR / Tax / BS / CF UI | FOUNDATION / unwired subsets |
| Header actions (journal/expense) | Many “Planned for Phase 2” buttons |

| ID | Severity | Issue |
| --- | --- | --- |
| P11-FIN-01 | P2 | Sparse blank panels when GL empty — need empty-state design (not fake zeros) |
| P11-FIN-02 | P2 | Planned action buttons clutter primary chrome |

## Reports

| Item | Maturity |
| --- | --- |
| BI workspace + CSV/Excel/PDF | FOUNDATION / IMPLEMENTED_NOT_PROD |
| Scheduled reports | DEFERRED |
| Dead `ReportSections.tsx` | Stale copy if re-mounted |

| ID | Severity | Issue |
| --- | --- | --- |
| P11-RPT-01 | P2 | Do not present scheduled/custom builder as available |
| P11-RPT-02 | P3 | Remove or rewrite dead ReportSections stale ledger claims |

## Assessment

Large blank/sparse layouts are **empty-data UX**, not outages. Highest defect: HR header contradiction.
