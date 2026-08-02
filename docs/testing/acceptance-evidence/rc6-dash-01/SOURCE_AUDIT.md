# RC6-DASH-01 — Source audit

**Baseline (post-DASH-00):** `cc09e239f966ac7173536f54eec63ae1fb01e1f8`
**Branch:** `feature/rc6-dash-01-owner-exception-center`
**Date:** 2026-08-02

## Source matrix

| Exception candidate | Existing source | Evidence | Branch scoped | Freshness | Drill-down | Safe for DASH-01 |
| --- | --- | --- | --- | --- | --- | --- |
| Delayed kitchen tickets | `listKitchenTickets` + `PREP_TARGET_MINUTES` | AdminDashboard + admin-kitchen | Yes (`branchIdFilter`) | Kitchen poll | `/admin/kitchen-dashboard?view=delayed` | **Yes** |
| Preparing-too-long (fallback) | Ops dashboard `PREPARING_TOO_LONG` | `orders/management.ts` | Yes | Ops poll | `/admin/orders?status=preparing` | Yes (fallback) |
| Ready awaiting rider | Delivery assignments + `isDispatchWaitingForRider` | operational-truth + AdminDelivery | Yes | Delivery poll | `/admin/delivery?status=pending` | **Yes** |
| Ready awaiting dispatch (fallback) | Ops `READY_AWAITING_DISPATCH` | management alerts | Yes | Ops poll | `/admin/delivery` | Yes (fallback) |
| Low stock | Ops KPI `lowStockCount` | management + inventory | Yes | Ops poll | `/admin/inventory?lowStock=1` | **Yes** |
| Unresolved cash variance | `fetchFinanceAttention` | finance attention API | Yes | Attention poll | `/admin/finance` | **Yes** (Owner finance) |
| Pending too long | Ops `PENDING_TOO_LONG` | management alerts | Yes | Ops poll | `/admin/orders?status=pending` | **Yes** |
| Negative stock | Inventory items | No dedicated ops KPI | Yes | — | Inventory | Deferred — use low-stock only |
| Late GPS delivery | Delivery late helper | No ETA/GPS product | — | — | — | Deferred |
| Failed payments | Attention metrics mark unavailable | No verified feed | — | — | — | Deferred |
| Branch readiness incomplete | Opening readiness panel | Separate opening surface | Branch | — | Branch/opening | Deferred (existing panel) |
| API /readyz fail | `fetchSystemHealth` (SA only) | Super-admin only | Org | — | — | Deferred |
| Analytics exception_center | analytics module | Different product | — | — | — | **Excluded** (do not conflate) |
| POD / COD / rider cash | — | NOT_PRESENT | — | — | — | Deferred |
| Approvals / ack / snooze | — | Would require mutation | — | — | — | Out of scope |

## Request impact

No new network endpoints. Exception Center reuses dashboard fetches already present on `/admin/dashboard` (ops, kitchen tickets, delivery assignments, finance attention).
