# RC6-DASH-02 — KPI source audit

**Baseline (post-DASH-01):** `b913ecad14f147b0a58d48224ce25d474af524f3`
**Branch:** `feature/rc6-dash-02-actionable-kpi-drilldowns`

| KPI | Source | Trust | Branch | Date | Destination | Filter support | Eligible |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today Sales (gross) | ops todayGrossSales | PARTIAL_LIVE | context | Karachi day | /admin/orders | none (date unsupported) | Yes w/ limitation |
| Today Orders | ops todayOrders | PARTIAL_LIVE | context | Karachi day | /admin/orders | none | Yes w/ limitation |
| AOV | ops averageOrderValue | DERIVED | context | Karachi day | /admin/reports | weak | Deferred |
| Open Orders | ops activeOrders | DERIVED | context | current | /admin/orders | no multi-status | Yes w/ limitation |
| Preparing | statusCounts.preparing | LIVE | context | current | /admin/orders?status=preparing | status | Yes |
| Ready | statusCounts.ready | LIVE | context | current | /admin/orders?status=ready | status | Yes |
| Kitchen Queue | tickets / kitchenWaiting | PARTIAL_LIVE | context | current | /admin/kitchen-dashboard?view=queue | view | Yes |
| Delayed | ops alert age codes | DERIVED | context | current | /admin/kitchen-dashboard?view=delayed | view | Yes |
| Out for delivery | assignments / activeDeliveries | PARTIAL_LIVE | context | current | /admin/delivery?status=picked-up | status | Yes |
| Completed | statusCounts.completed | PARTIAL_LIVE | context | ops window | /admin/orders?status=completed | status | Yes w/ limitation |
| Low stock | lowStockCount | PARTIAL_LIVE | context | current | /admin/inventory?lowStock=1 | lowStock | Yes |
| Cancelled | statusCounts.cancelled | LIVE | context | ops window | /admin/orders?status=cancelled | status | Yes |
| Refunded / late GPS / cash / PO / HR / complaints / health / Accounting Net Sales | weak or covered elsewhere | — | — | — | — | — | Deferred |
