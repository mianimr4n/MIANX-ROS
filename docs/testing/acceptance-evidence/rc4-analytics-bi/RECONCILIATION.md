# RC4-2 Reconciliation

Data Quality Center (`POST /admin/analytics/data-quality/run`) checks:

1. `sales.tax_vs_gross` — tax must not exceed gross
2. `sales.net_identity` — net = gross − discounts − refunds
3. `registry.present` — formula registry loaded
4. `finance.pl_available` — P&L via FinanceService when `branchId` provided

Failures open rows in `analytics_exceptions`.  
Finance statement numbers are not recomputed in analytics — reconciled by delegation to GL RPCs.
