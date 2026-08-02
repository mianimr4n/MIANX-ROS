# RC6-DASH-05 — Test results

## Automated

| Suite | Result |
| --- | --- |
| `tests/website/rc6-dash-05-branch-health.test.mjs` | PASS (local) |
| DASH-04 approval inbox regression | PASS |
| DASH-03 command modes (when run) | See gate log |
| `pnpm check` / `pnpm test` / `pnpm test:db` / `pnpm rc1:gate` | Recorded at PR time |

## Manual (local Owner)

| Check | Result |
| --- | --- |
| Selected branch score + breakdown | Exercised via deterministic fixtures in unit tests |
| Mode switch score stability | Covered by mode-emphasis contract (weights/score unchanged) |
| Drill-downs | Static route matrix + source assertions |
| No mutation | Static source scan |
| Production credentials | Not used |

## Notes

- Playwright Owner smoke remains the shared authenticated dashboard gate (CI).
- Not Production-verified.
