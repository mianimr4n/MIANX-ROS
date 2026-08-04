# Phase 1.1 — Owner Production results

**Harness:** `.tmp/rc6-prod-owner-smoke.mjs` (credentials founder-entered in browser; not captured)  
**Target:** Production alias @ `bfe60cc…`

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `failCount` | **0** |
| Mutation | none |

## Highlights

| Area | Result |
| --- | --- |
| Login / OCC | PASS |
| What Changed / Exception / Approval / Branch Health | PASS |
| Operational Estimate ≠ Accounting Posted | PASS |
| Pre-open / Live / Closing modes | PASS |
| EOD CSV / JSON / print | PASS (filenames only; no export payloads stored) |
| Drill-down / Back / refresh | PASS |
| Mode axe c/s | 0 / 0 |
| Mobile dashboard overflow | PASS |
| Logout + protected route | PASS (`staff-access-required`; `occ=0`) |

REVIEWABLE never appeared as CLOSED. What Changed did not claim “since your last login”.
