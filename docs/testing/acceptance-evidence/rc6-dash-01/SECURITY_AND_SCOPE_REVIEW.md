# RC6-DASH-01 — Security and scope review

- Branch scope uses existing `branchIdFilter` / API query params; client filtering is not authorization.
- Drill-down routes enforce their own permissions.
- Summary cards omit phone, GPS, payroll, and cash amount detail.
- No new permission model; finance exceptions only when `canLoadFinance`.
- No cross-tenant aggregation beyond what ops APIs already authorize.
- No secrets, tokens, or Production data in evidence.
- Read-only: no acknowledge/assign/resolve/snooze/approve mutations.
