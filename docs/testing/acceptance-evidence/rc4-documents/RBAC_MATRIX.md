# RC4-5 RBAC Matrix

## Supplier Portal documents

| Action | Actor | Gate | Isolation |
| --- | --- | --- | --- |
| List | Authenticated supplier portal user | `resolveContext` (supplier user / portal permission) | Filtered by `ctx.supplierId`; archived excluded |
| Upload binary | Same | Same | `supplier_id` / `branch_id` from context; PO must belong to supplier |
| Create URL reference (legacy) | Same | Same | Same |
| Download (signed URL) | Same | Same | Document loaded with `.eq("supplier_id", ctx.supplierId)` |
| Archive | Same | Same | Same supplier filter |

**Suppliers never receive another supplier's document IDs via list.** Cross-supplier download by guessing UUID returns 404 / not found under ownership filter.

Suppliers **cannot** approve POs, create GRNs, or access HR documents.

## HR employee documents

| Action | Actor | Gate | Isolation |
| --- | --- | --- | --- |
| List / create URL / upload binary / download | Staff with `hr.manage` **or** `staff.manage` **or** `admin.access` | `requireHrAccess` | Branch membership via `assertBranchMembership` on employee branch |
| Types | CNIC, CONTRACT, CERTIFICATE, POLICY, OTHER | Zod + DB check | — |

Payroll and finance permissions are **not** implied by document access.

## Storage

- Buckets are **private** (`public = false`).
- API uses **service role** for storage I/O after authorization.
- Clients receive **time-limited signed URLs** only after ownership checks.
