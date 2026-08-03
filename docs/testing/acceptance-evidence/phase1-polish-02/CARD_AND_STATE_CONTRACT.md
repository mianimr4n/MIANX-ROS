# POLISH-02 — Card and state contract

Shared primitives in `OwnerDashboardPresentation.tsx`:

- `OwnerDashboardCard` — title, description, count, severity text, action slot, state badge
- `OwnerDashboardProvenance` — compact key/value line
- `OwnerDashboardDetails` — progressive disclosure for Source/Trust/Formula
- States: loading, loaded, zero, empty, filtered-empty, partial, insufficient, stale, unavailable, restricted, error

Honesty: zero ≠ unavailable; empty ≠ failed; partial ≠ complete; insufficient coverage ≠ healthy.
