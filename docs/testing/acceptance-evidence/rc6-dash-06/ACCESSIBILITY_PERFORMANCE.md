# Accessibility / performance

- Maturity is textual (Operational Estimate vs Accounting Posted)
- Negative amounts have sr-only cue; not color-only
- Expandable excluded list with aria-expanded
- min-h-11 targets; min-w-0 mobile
- Reuses ops dashboard + one posted P&L fetch (branch-scoped); no new polling infra; mode switch does not change formulas
