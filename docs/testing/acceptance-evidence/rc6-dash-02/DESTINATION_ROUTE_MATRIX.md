# RC6-DASH-02 — Destination matrix

| KPI | Route | Filters | Clear filters |
| --- | --- | --- | --- |
| Preparing / Ready / Completed / Cancelled | `/admin/orders` | `status` | Clear filters |
| Sales / Orders / Open | `/admin/orders` | (none — date URL unsupported) | Clear filters |
| Kitchen Queue | `/admin/kitchen-dashboard` | `view=queue` | Clear filters → `view=board` |
| Delayed Orders | `/admin/kitchen-dashboard` | `view=delayed` | Clear filters → `view=board` |
| Out for delivery | `/admin/delivery` | `status=picked-up` | Clear filters |
| Low stock | `/admin/inventory` | `lowStock=1` (URL-synced) | Clear filters |

Branch authorization remains AdminBranchContext / server-side — not a URL `branchId`.
