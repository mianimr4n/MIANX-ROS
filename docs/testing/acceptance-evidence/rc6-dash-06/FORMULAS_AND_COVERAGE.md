# Formulas and coverage

Operational:
- Gross sales = ops `todayGrossSales` (non-cancelled day sum)
- Orders = `todayOrders`
- AOV = `averageOrderValue` (null when zero orders)

Accounting (posted activity only):
- Posted Net = postedRevenue − postedExpenses (may be negative)

Coverage: operational evaluated/3; accounting 3/3 when posted activity exists.
Confidence: HIGH ≥80% no stale; MEDIUM ≥50%; else LOW.
MIN_OPERATIONAL_COVERAGE_PERCENT = 50.
