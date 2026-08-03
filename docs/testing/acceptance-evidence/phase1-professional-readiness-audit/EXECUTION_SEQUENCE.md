# Phase 1.1 — Execution sequence

| Order | Slice | Depends on | Migrate/Deploy | Smoke |
| --- | --- | --- | --- | --- |
| 0 | This audit PR | `v1.5.0` | none | none |
| 1 | Merge docs PR #193 (anchor sync) | **Done** | none | none |
| 2 | POLISH-01 | Audit | Website only | **Merged** (#195) |
| 3 | POLISH-02 | POLISH-01 | Website only | **Merged** (#196 → `8eb81a6`) |
| 4 | POLISH-03 | POLISH-02 | Website only | **Merged** (#197 → `936c5a3`) |
| 5 | POLISH-04 | POLISH-03 | Website only | **Merged** (#198 → `7fa2c8b`) |
| 6 | POLISH-05 | POLISH-04 | Website only | **Merged** (#199 → `944eb8f`) |
| 7 | POLISH-06 | POLISH-05 | Website only | **Merged** (#200 → `c7b91bf`) |
| 8 | POLISH-07 | POLISH-06 | Website only | **In PR** — perf/privacy |
| 9 | POLISH-QA | All polish waves | none | Prod read-only + local roles |

**Do not** start Phase 2 Delivery/Settings runtime until Phase 1.1 gate passes. Phase 1.1 gate remains **NOT PASSED**.
