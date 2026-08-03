# POLISH-QA — Performance budget results

Budgets from `admin-performance-contract.ts` / POLISH-07 evidence.

| Metric | Budget / expectation | Result |
| --- | --- | --- |
| Public entry gzip | ≤ ceil(251.58 × 1.02) KB | Baseline ~251.58 KB retained; no public Admin eager import (static PASS) |
| Public CSS gzip | Contracted in POLISH-07 | No new CSS framework |
| Admin shared / lazy routes | Soft max largest lazy 180 KB gzip | Lazy boundaries preserved (static) |
| Owner initial / mode / branch switches | Duplicate identical concurrent reads = 0 | `shareIdenticalRead` + static suite PASS |
| KDS pollers | One intended; pause when `document.hidden` | Static PASS |
| Export object URL revoke | Required | Static PASS |
| Axe / test tooling in Production bundle | Forbidden | Static PASS |
| Production source maps | Forbidden | Static PASS |

Local `rc1:gate` website build PASS. No major core-route usability regression in headed suites.
