# What Changed comparison rules

- Previous and current values use the same metric formulas (DASH aggregates)
- Branch id and business window must match
- Permission / source-ok flags must allow the metric
- Missing previous value → no comparison
- Zero-denominator percentage omitted
- Source failure ≠ decrease / improvement / “No changes”
- Estimated vs Accounting Posted never mixed (posted P&L not in device snapshot)
- Flat (zero absolute change) omitted from top deltas
- Persistence labeled `BROWSER_LOCAL`; trust `DERIVED`
