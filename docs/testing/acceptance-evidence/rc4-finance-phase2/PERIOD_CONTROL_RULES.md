# Period Control Rules

Statuses: `open` | `soft_closed` | `closed`.

- `finance_assert_period_allows_posting` blocks posts when overlapping period is `closed`
- Soft-closed does not hard-block (warn via policy / UI honesty)
- Reopen `closed` → `open` audited in `finance_period_events`
- Irreversible year-end close: DEFERRED
