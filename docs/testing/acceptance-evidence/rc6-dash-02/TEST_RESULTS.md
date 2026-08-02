# RC6-DASH-02 — Test results

## Automated

| Suite | Result |
| --- | --- |
| `tests/website/rc6-dash-02-kpi-drilldowns.test.mjs` | PASS |
| `tests/website/rc6-dash-01-exception-center.test.mjs` (regression) | PASS |
| `pnpm check` | PASS |
| `pnpm test` (db + backend) | PASS (849 website/db static + backend vitest) |
| `pnpm test:db` | Covered by `pnpm test` |
| `pnpm rc1:gate` | PASS |
| `git diff --check` | PASS |

## Coverage notes

- Registry maturity DRILL_DOWN only; sales not ACCOUNTING
- Destination sanitize + Clear filters (orders/delivery/kitchen/inventory)
- No PII in destinationRoute lines
- Exception Center contracts remain green
- Owner Playwright / dashboard axe: deferred to CI on PR (local Owner smoke not re-run this slice; DASH-01 post-merge CI tracked separately)

## Manual (local)

Local Owner drill-down click-through recommended on ephemeral Supabase before Production deploy authorization. Not claimed as Production-verified.
