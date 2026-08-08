# RBAC and isolation matrix

| Principal | List/detail | Effective configuration | History | Result |
| --- | --- | --- | --- | --- |
| Platform super admin | Platform-authorized scope | Allowed | Allowed | 200 |
| Organization owner | Owned organization only | Owned organization branches | Branch plus owned-organization history | 200 |
| Branch manager | Assigned branches only | Assigned branches only | Assigned-branch history only | 200 / foreign 403 |
| Kitchen manager/kitchen | Denied | Denied | Denied | 403 |
| Cashier | Denied | Denied | Denied | 403 |
| Rider | Denied | Denied | Denied | 403 |
| Anonymous | Denied before service access | Denied | Denied | 401 |

Malformed branch UUID returns 400. An unknown well-formed UUID returns 404. An existing foreign branch returns 403. Backend filtering uses `ownedOrganizationIds` and `branchIds`; frontend navigation is convenience only.

Secret schemas are always serialized as `<REDACTED>`, including for platform super admin. Secret change metadata is replaced with `{ redacted: true }`. Direct client access remains blocked by existing RLS/revokes and service-role credentials remain backend-only.
