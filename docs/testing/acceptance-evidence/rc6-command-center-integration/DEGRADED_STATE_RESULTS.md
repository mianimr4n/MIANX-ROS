# RC6-QA-03 — Degraded state results

## Design (repository)

| State | Integrated behavior |
| --- | --- |
| Partial source failure | Affected panels/cards show unavailable/stale honesty; others may still render |
| Total ops failure | `totalFailure` path on OCC; retry via shared `onExceptionRetry` |
| Finance disabled / no branch | Posted P&L omitted; profitability shows ops estimate honesty only |
| Empty approval / exception queues | Empty states — not “all clear” when sources failed |
| Low health coverage | Branch Health coverage-adjusted score / honesty (DASH-05) |
| Incomplete EOD inputs | Non-final pack; export still preview-only |
| Missing What Changed baseline | Business-window wording until device baseline set |

## Certification evidence

| Check | Method | Result |
| --- | --- | --- |
| Retry wiring present | Static QA-03 test #6 (`onExceptionRetry`, `totalFailure`) | Contract PASS |
| No silent all-clear | Same + per-slice degraded docs under `rc6-dash-0*` | Documented |
| Live fault injection | Optional local abort of ops APIs | **Pending / operator** — not claimed here |
| Production degraded proof | — | **Not performed** |

## Limits

- QA-03 Playwright happy-path does not force 5xx injection; network guard fails the run if unexpected 5xx occur on admin/api paths during the journey.
- Degraded UX remains **local/CI** verified by contracts + prior DASH packs; not Production-verified.
