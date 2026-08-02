# RC6-DASH-01 — Drill-down matrix

| Type | Destination | Filter preserved | Branch scope | Limitation |
| --- | --- | --- | --- | --- |
| EXC-KDS-DELAY | `/admin/kitchen-dashboard?view=delayed` | `view=delayed` | Admin branch context | Prep guide ≠ contractual SLA |
| EXC-KDS-DELAY fallback | `/admin/orders?status=preparing` | `status=preparing` | Same | Used when kitchen tickets unavailable |
| EXC-DEL-UNASSIGNED | `/admin/delivery?status=pending` | `status=pending` | Same | Pending list may include non-ready rows; waiting logic is orderStatus=ready |
| EXC-DEL-UNASSIGNED fallback | `/admin/delivery` | none | Same | Assignment list unavailable |
| EXC-STOCK-LOW | `/admin/inventory?lowStock=1` | `lowStock=1` | Same | Client filter + list API branch scope |
| EXC-CASH-VAR | `/admin/finance` | none | Same | No variance-only URL filter yet |
| EXC-ORD-PENDING | `/admin/orders?status=pending` | `status=pending` | Same | — |

Browser Back returns to dashboard via normal history. Links are URL-addressable on refresh. Destination routes retain their own authz.
