# Phase 1.1 — Performance & network audit

## Measured (Production public @ release)

| Metric | Value |
| --- | --- |
| Entry script | `/assets/index-Bc7COIUp.js` |
| Entry bytes | 878125 |
| Gzip approx | 257618 (~251.58 kB) |
| Prior baseline gzip | 255.57 kB |
| Script count | 1 |
| Admin eager from public | false |

## Admin risks (code review)

| Risk | Target for remediation |
| --- | --- |
| Dashboard multi-source fan-out | Mode switch must not refetch all blindly |
| Branch switch refetch storms | Debounce / cancel stale |
| Large list unbounded | Enforce caps/pagination |
| Polling | Prefer explicit refresh |
| Image weight on marketing | Compress / modern formats |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-PERF-01 | P2 | Entry ~252 kB gzip — watch regressions | Budget in `phase1-polish-07/` |
| P11-PERF-02 | P2 | Admin lazy chunks ok; verify no public→admin eager | Guarded by POLISH-07 static test |
| P11-PERF-03 | P3 | Marketing JPG set large | Residual |

## Before/after targets (POLISH-07)

| Target | Goal |
| --- | --- |
| Public entry gzip | ≤ prior baseline (+2% tolerance) |
| Admin shell TTI (local) | Baseline then −10% stretch |
| Duplicate GETs on branch switch | 0 uncontrolled duplicates |
