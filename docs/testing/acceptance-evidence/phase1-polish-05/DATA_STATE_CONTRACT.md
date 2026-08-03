# Data-state contract

Canonical states in `ADMIN_DATA_STATES` with copy in `ADMIN_DATA_STATE_COPY`.
Component: `AdminDataState` (+ Empty/Error/Partial helpers).
Rules: empty ≠ error; unavailable ≠ zero; permission restricted ≠ empty.
