# RC6-DASH-02 — Date/timezone review

- Owner KPI “today” uses Asia/Karachi business day in ops dashboard service.
- `listAdminOrders` has **no** startDate/endDate query — date cannot be preserved in URL.
- Decision: keep KPIs with honest limitations; do not invent date query params.
- Branch-local TZ beyond Karachi default remains a later settings/ops slice.
