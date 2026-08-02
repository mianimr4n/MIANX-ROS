# RC6-DASH-06 — Profitability source audit

**Baseline:** `64d655760fb9564ac841bff05cd797241b2a7743` (post–PR #186)

| Metric | Existing source | Formula supported | Branch scoped | Date scoped | Posted/estimated | Classification | Safe for DASH-06 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gross sales (today) | Ops dashboard `todayGrossSales` | Yes — non-cancelled day sum | Yes | Karachi day | Operational Estimate | VERIFIED_OPERATIONAL | Yes |
| Orders (today) | `todayOrders` | Yes | Yes | Karachi day | Operational | VERIFIED_OPERATIONAL | Yes |
| AOV | `averageOrderValue` | Yes — gross÷orders | Yes | Karachi day | Derived ops | VERIFIED_OPERATIONAL | Yes |
| Net sales | Analytics `sales.net` | Risky discount double-count | Yes | Range | Estimated | PARTIAL_SOURCE | No |
| Discounts / refunds | Order fields / payments | Partial | Partial | Partial | Ops fields | PARTIAL_SOURCE | Deferred |
| Estimated COGS | Recipe `estimatedCost` | Per-recipe only | Yes | Point-in-time | Estimated | PARTIAL_SOURCE | No aggregate |
| Gross profit / margin | Finance KPI UNAVAILABLE | No product formula | — | — | — | NOT_PRESENT | No |
| Posted revenue/expenses/net | `finance_profit_loss` posted journals | Yes | Required branch | from/to | Accounting Posted | VERIFIED_ACCOUNTING_POSTED | Yes when activity |
| Posted COGS / gross profit | COGS auto-post foundation | No routine posts | — | — | Foundation | FOUNDATION_ONLY | Show Not Available |
| Draft journals | Journal status draft | Must exclude | Yes | Entry date | Draft | PARTIAL_SOURCE | Excluded from posted |
| Labor / payroll cost | HR analytics | Partial / PII risk | Partial | Weak | Estimated | PARTIAL_SOURCE | Deferred |
| Cash balance | — | — | — | — | — | NOT_PRESENT as profit | Never as profit |
