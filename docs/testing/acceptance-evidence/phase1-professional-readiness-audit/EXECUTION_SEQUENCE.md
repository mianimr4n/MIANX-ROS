# Phase 1.1 — Execution sequence

| Order | Slice | Depends on | Migrate/Deploy | Smoke |
| --- | --- | --- | --- | --- |
| 0 | This audit PR | `v1.5.0` | none | none |
| 1 | Merge docs PR #193 (anchor sync) | **Done** | none | none |
| 2 | POLISH-01 | Audit | Website only | **Merged** (#195) |
| 3 | POLISH-02 | POLISH-01 | Website only | **In PR** — Owner hierarchy |
| 4 | POLISH-03 | — | Website only | Ops smoke local |
| 5 | POLISH-04 | — | Website only | Settings/HR/Inventory honesty tests |
| 6 | POLISH-05 | 01–04 patterns | Website only | Visual/regression |
| 7 | POLISH-06 | Touched routes | Website only | a11y+responsive matrix |
| 8 | POLISH-07 | — | Website only | Perf budgets + privacy checks |
| 9 | POLISH-QA | All polish waves | none | Prod read-only + local roles |

**Do not** start Phase 2 Delivery/Settings runtime until Phase 1.1 gate passes. Phase 1.1 gate remains **NOT PASSED**.
