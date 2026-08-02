# RC6-DASH-05 — Component drill-down matrix

| Component | Destination | Filters | Notes |
| --- | --- | --- | --- |
| BH-KITCHEN-DELAY | `/admin/kitchen-dashboard` | `view=delayed` | Same as DASH-01/02 kitchen delayed |
| BH-DELIVERY-LATE | `/admin/delivery` | `status=picked-up` | In-flight emphasis |
| BH-CONFIRM-DELAY | `/admin/orders` | `status=pending` | Confirmation backlog |
| BH-DISPATCH-WAIT | `/admin/delivery` | `status=pending` | Waiting for rider |
| BH-CASH-VARIANCE | `/admin/finance` | (none) | No variance-only filter yet |
| BH-STOCK-PRESSURE | `/admin/inventory` | `lowStock=1` | Existing inventory filter |

- Branch scope remains AdminBranchContext (not URL `branchId`).
- Action maturity: **DRILL_DOWN** only.
- No PII in URLs.
- Browser refresh/Back preserve dashboard `commandMode` as before.
