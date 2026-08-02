# Filter and drill-down matrix

| Type | Destination | Filters (inbox) | Limitation |
| --- | --- | --- | --- |
| APR-PO-PENDING | /admin/purchasing | domain, priority | Closest queue — not exact PO id |
| APR-CASH-CLOSE | /admin/finance | domain, priority | Closest finance panel |
| APR-EXPENSE | /admin/finance | domain, priority | Closest finance panel |
| APR-LEAVE | /admin/hr | domain, priority | Closest HR leave queue |

Branch via AdminBranchContext. Clear filters supported. No PII in URLs.
