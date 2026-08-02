# RC6 KPI Trust Registry

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`

## Trust states

| State | Meaning |
| --- | --- |
| LIVE | Computed from authoritative operational sources; freshness OK |
| DERIVED | Calculated from LIVE inputs (e.g. AOV = sales/orders) |
| ACCOUNTING | Posted ledger / reconciliation final |
| ESTIMATED | Model or incomplete inputs; must label ESTIMATED |
| FOUNDATION | Schema/API exists; product KPI not fully wired |
| STALE | Exceeded freshness target |
| UNAVAILABLE | Source missing, denied, or failed |

**Hard rule:** Operational Estimate ≠ Accounting Posted. Never show a single unlabeled number that mixes both.

Formulas unsupported by current repository evidence are marked **PROPOSED**.

---

## KPI contracts (selected)

### KPI-NET-SALES

| Field | Content |
| --- | --- |
| Display name | Net Sales |
| Business definition | Gross sales in window minus documented cancellations/refunds per policy |
| Formula | **PROPOSED:** `sum(order.total where status in completed set) - sum(refunds)` — exact status set must match ops KPI service |
| Sources | Orders tables; ops KPI endpoints used by Owner Command Center |
| Scope | Org / branch filter |
| Window | Branch-local day or selected range |
| Timezone | Branch TZ (default Asia/Karachi) |
| Currency / tax | PKR; tax treatment must match order totals (document inclusive/exclusive) |
| Refunds / cancels | Exclude cancelled; subtract refunded amounts when refund records exist |
| Freshness | ≤60s LIVE; else STALE |
| Finalized vs provisional | Provisional until EOD/accounting close |
| Exclusions | Test/seed orgs in Production (N/A locally) |
| Limitations | POS float gaps; finance P&L may differ |
| Drill-down | Orders list filtered by window/branch |
| Access | Owner, BM, Finance |
| Prod proof | Sample day reconcile vs reports |

### KPI-ORDERS

| Field | Content |
| --- | --- |
| Definition | Count of orders in window matching ops definition |
| Formula | **PROPOSED:** count orders in window with statuses used by dashboard KPI |
| Sources | Orders + dashboard KPI API |
| Trust | LIVE when API fresh |
| Drill-down | `/admin/orders` |

### KPI-AOV

| Field | Content |
| --- | --- |
| Definition | Average order value |
| Formula | DERIVED: `KPI-NET-SALES / KPI-ORDERS` (guard divide-by-zero → empty) |
| Trust | DERIVED |
| Limitations | Inherits sales definition gaps |

### KPI-CANCEL-REFUND

| Field | Content |
| --- | --- |
| Definition | Cancelled order count and refunded amount |
| Formula | **PROPOSED** from order status + refund records |
| Trust | PARTIAL / FOUNDATION until refund SoD complete |
| Access | Owner, BM, Finance |

### KPI-KDS-DELAY

| Field | Content |
| --- | --- |
| Definition | Active kitchen tickets over SLA threshold |
| Formula | **PROPOSED:** count tickets where age > branch SLA |
| Sources | Kitchen tickets APIs / KDS board |
| Trust | PARTIAL_LIVE |
| Freshness | ≤15s |
| Drill-down | `/admin/kitchen-dashboard` |
| Prod proof | Ticket transition smoke |

### KPI-DEL-LATE

| Field | Content |
| --- | --- |
| Definition | Deliveries past promised/SLA window |
| Formula | **PROPOSED:** active deliveries where now − promised > threshold |
| Sources | `deliveries` + riders assignments |
| Trust | PARTIAL_LIVE (no GPS ETA) |
| Limitations | No live map; status API limited to assigned/picked-up/delivered |
| Drill-down | `/admin/delivery` |

### KPI-RIDER-AVAIL

| Field | Content |
| --- | --- |
| Definition | Riders available for dispatch |
| Formula | **PROPOSED:** count roster status=available |
| Sources | Riders roster API |
| Trust | FOUNDATION_READ_ONLY (capacity model incomplete) |

### KPI-CASH-VAR

| Field | Content |
| --- | --- |
| Definition | Expected vs counted cash variance |
| Formula | From cash reconciliation records when present |
| Sources | `cash_reconciliations` / cash APIs; POS Z events |
| Trust | PARTIAL_LIVE / ACCOUNTING when posted |
| Limitations | POS float/variance gaps documented in living status |
| Access | Owner, BM, Finance, Cashier (scoped) |
| Prod proof | Reconciliation with SoD |

### KPI-STOCK

| Field | Content |
| --- | --- |
| Definition | SKUs at/below reorder or zero |
| Sources | Inventory APIs |
| Trust | IMPLEMENTED_NOT_PRODUCTION_VERIFIED |
| Prod proof | Required before LIVE_VERIFIED |

### KPI-BRANCH-HEALTH

| Field | Content |
| --- | --- |
| Definition | Composite readiness/ops score |
| Formula | Coverage-adjusted weighted mean of 6 verified components (kitchen, delivery late, confirm, dispatch, cash clear, stock bands) — see `rc6-dash-05/SCORE_FORMULA_AND_WEIGHTS.md` |
| Trust | IMPLEMENTED_NOT_PRODUCTION_VERIFIED / DERIVED after DASH-05 |
| Rule | Must expose component breakdown, coverage, confidence; missing ≠ healthy |

### KPI-EOD

| Field | Content |
| --- | --- |
| Definition | Checklist completeness for close |
| Formula | **PROPOSED** boolean gates (cash close, open tickets, COD pending, printers) |
| Trust | PARTIAL fragmented |
| Slice | RC6-DASH-07 |

### KPI-HEALTH

| Field | Content |
| --- | --- |
| Definition | API `/healthz` `/readyz` + critical dependency |
| Trust | PARTIAL_LIVE |
| Rule | Never show secrets |

### KPI-PROFIT-*

| Field | Content |
| --- | --- |
| Definition | Contribution / margin views |
| Formula | **PROPOSED**; must label ESTIMATED vs ACCOUNTING |
| Sources | Finance GL when wired; else UNAVAILABLE |
| Related | RC6-FIN-01, RC6-DASH-06 |

### KPI-ATTEND

| Field | Content |
| --- | --- |
| Definition | On-shift / absent counts |
| Sources | HR attendance/shifts |
| Trust | IMPLEMENTED_NOT_PRODUCTION_VERIFIED |
| PII | Employee identifiers masked in Owner cards |

### KPI-FORECAST

| Field | Content |
| --- | --- |
| Definition | Forecast vs actual sales |
| Trust | PLANNED / ESTIMATED |
| Rule | Never LIVE without model evidence |

---

## Production-verification requirement

Any KPI claimed LIVE_VERIFIED on Production requires:

1. Documented formula matching code
2. Sample window reconcile
3. Freshness proof
4. Role access proof
5. No silent zero on error
