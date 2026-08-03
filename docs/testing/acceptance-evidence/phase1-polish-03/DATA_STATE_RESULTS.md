# POLISH-03 — Data-state results

Vocabulary documented in `operations-status-labels.ts` (`OPERATIONS_DATA_STATES`).

Existing `OperationalStatusBanner` + domain KPI unavailable patterns retained:

- empty ≠ API failure
- unavailable capacity/ETA ≠ zero (Delivery performance)
- configuration missing (floor setup) uses SETUP REQUIRED
- permission gates still return null / sign-in messaging
