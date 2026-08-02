# RC6-DASH-00 — Current truth vs vision

## Owner Command Center

| Vision | Current truth | Gap |
| --- | --- | --- |
| Formal six-zone Command Center | LIVE shell at `/admin/dashboard` + attention cards | Not productized as six zones; mixed widget truth |
| Progressive L1–L6 actions | Mostly L1–L3 read | L4–L6 maturity fragmented / missing |
| Exception Center (ops) | Attention APIs / cards | Unified center NOT_PRESENT; ≠ analytics exception_center |
| What Changed / live timeline | Fragmented audit tables | Unified event model NOT_PRESENT → DASH-08 |
| Opening/live/closing modes | Informal ops | Modes NOT_PRESENT → DASH-03 |
| Branch health / EOD pack | Fragmented signals | Composite scores / packs PLANNED |
| Mianx.ai recommendations | Foundation / ADR-gated | Zone 6 PLANNED; draft-only boundary |

## Delivery / Rider

| Vision | Current truth | Gap |
| --- | --- | --- |
| Full 13-state lifecycle | PARTIAL — assign + `assigned`/`picked-up`/`delivered` | Intermediate/failed/return/POD states missing |
| Dispatch queue + smart assign | Basic assign | Queue UX, modes, AI dispatch later |
| Rider profiles/shifts/GPS | Foundation / weak | RIDER-01/02 |
| POD + failed delivery | NOT_PRESENT | DEL-03 |
| COD settlement | NOT_PRESENT | CASH-01 |
| Zones / SLA / profitability | Weak / PLANNED | DEL-04 |

## Settings & Configuration

| Vision | Current truth | Gap |
| --- | --- | --- |
| Full inheritance hierarchy | PARTIAL org/branch writes | Brand/device/user levels incomplete |
| Effective value + override engine | Foundation | SET-02 |
| Versioning / schedule / rollback | NOT_PRESENT | SET-08 |
| Readiness / drift | Partial opening signals | SET-09 |
| AI config assistant | PLANNED | SET-10 + AI ADR |

## Honesty rule

Operational Estimate ≠ Accounting Posted. Fake zeros forbidden. Route visibility ≠ LIVE workflow.
