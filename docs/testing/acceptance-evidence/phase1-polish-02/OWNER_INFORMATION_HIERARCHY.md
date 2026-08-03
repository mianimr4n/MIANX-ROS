# POLISH-02 — Owner information hierarchy

## Decision sequence (30-second Owner scan)

1. **Context** — Active branch, business date, freshness (page header + filters + status banner)
2. **Command mode** — Pre-open / Live / Closing (advisory only)
3. **What needs attention** — Exception Center + Approval Inbox
4. **Business pulse** — Today / Live / Attention KPIs + Operational Estimate vs Accounting Posted
5. **Branch and operations health** — weighted Branch Health
6. **What changed** — device-local review baseline (not last login)
7. **Closing readiness** — EOD Pack preview
8. **More detail** — charts, activity, quick actions (secondary; collapsible in Closing)

## Mode composition (first sections)

| Mode | Lead order |
| --- | --- |
| PRE_OPEN | exception → approval → branch-health → unsupported → KPIs → profitability → what-changed → eod |
| LIVE | exception → approval → KPIs → profitability → branch-health → what-changed → eod |
| CLOSING | exception → approval → eod → unsupported → branch-health → profitability → what-changed (collapsed) |

Implementation: `lib/owner-dashboard-hierarchy.ts` + `MODE_COMPOSITION` in `command-modes/registry.ts`.
