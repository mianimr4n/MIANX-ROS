# RC4-9 RBAC Matrix

| Role | Recipe read | Recipe write | Stock consume | Costing |
| --- | --- | --- | --- | --- |
| Owner / Super-admin | Yes | Yes (`admin.access`) | Via kitchen actor | Yes |
| Inventory Manager (`inventory.manage`) | Yes | Yes | No direct | Yes |
| Branch Manager | Yes (own branches) | Yes if permission | Kitchen if role | Yes |
| Kitchen Staff | No admin recipes | No | Trusted server RPC on preparing | No |
| Cashier | No | No | No | No |
| Finance Staff | No inventory recipes unless also inventory/admin | No | No | GL DEFERRED |
| Read-only | No mutate | No | No | — |
| Supplier | Denied | Denied | Denied | Denied |
| Unauthenticated | 401 | 401 | 401 | — |

Branch isolation: `assertBranchMembership` + recipe `branch_id`. Suppliers cannot access recipe APIs.
