# RC4-2 Formulas

Authoritative registry: `backend/api/src/services/analytics/registry.ts`  
Version: `rc4-2.analytics.v1`

Every KPI contract includes: metric id, formula, authoritative source, included/excluded statuses, timezone (`Asia/Karachi`), period, branch scope, organization scope, freshness, permissions, fallback.

Key sales identities:

- `sales.gross` = Σ `orders.total_amount` excluding `cancelled`
- `sales.net` = gross − discounts − refunded payments
- `sales.aov` = gross / order_count (null when 0)
- WoW / MoM / YoY = percent change vs prior window; null when prior = 0

Finance KPIs **delegate** to `FinanceService` / `FinancePhase2Service` (no duplicated GL math).

Workforce KPIs delegate to `HrWorkforceService.getMetrics`.

Payroll labour cost is LIVE only when approved/locked run totals exist; otherwise UNAVAILABLE.
