# D2 — Multi-Branch Security Model

**Status:** Implementation In Progress  
**Classification:** Security Model — Repository-Verified  
**Release Evidence:** No

This document records how branch isolation is enforced and the exact
repository evidence proving it. Client-side filtering is never treated as
security enforcement; every guarantee below is server-side.

---

## Seeded branches (repository truth)

| `branch_code` | Name | Status |
| --- | --- | --- |
| `royal-orchard` | Royal Orchard Branch | `operating` |
| `northern-bypass` | Northern Bypass Road Branch | `coming-soon` |

Source: `supabase/migrations/20260713191000_seed_foundation_data.sql`.
There is **no** organization / tenant table; the model is single-tenant Multan.

---

## Identity and scope derivation

| Concern | Evidence |
| --- | --- |
| Branch membership storage | `user_roles.branch_id` (nullable FK to `branches`) — `supabase/migrations/20260713190000_foundation_schema.sql` |
| Global (owner) assignment | `user_roles.branch_id IS NULL` with unique global index — `supabase/migrations/20260716010000_sprint3_customer_auth_foundation.sql` |
| Principal derivation | `backend/api/src/services/auth/supabase.ts` loads role assignments; `principal.ts` builds `branchIds` from non-null assignment branch ids only (`uniqueSorted`) |
| Inactive **accounts** | `requireAuthenticatedUser` rejects unless `users.status === "active"` (`USER_ACCESS_DISABLED`) |
| Inactive **memberships** | `user_roles` has no `is_active` column; rows present on the principal are treated as authorized |
| Inactive / coming-soon **branches** | `branches.status` is **not** filtered out of `principal.branchIds` today (documented limitation) |
| Spoofing resistance | Scope comes only from the DB-backed principal; forged `x-telepizza-*` headers are ignored |

## Access-semantics (frontend selector)

| Concern | Behavior |
| --- | --- |
| Helper | `canViewMultipleAssignedBranches` in `apps/website/client/src/lib/admin-access.ts` (renamed from misleading `canViewAllBranches`) |
| Super-admin | Aggregate selector label `"All Branches"` — organization-wide within the single tenant |
| Multi-branch staff | Aggregate selector label `"Assigned Branches"` when `branchIds.length > 1` |
| Single-branch staff | Forced to a single branch; no aggregate mode |
| What aggregate mode sends | `branchIdFilter = null` — **not** an explicit branch-ID list. The server uses `principal.branchIds` (or all branches for super-admin) |
| API filter shape | Single optional `branchId` UUID query param (zod). There is no `branchIds[]` request body/query |

## Server-side enforcement points (CANONICAL)

| Domain | Enforcement | Evidence |
| --- | --- | --- |
| Orders + dashboard | `resolveScopedBranchIds` + `assertBranchInScope` → 403 `ORDER_ACCESS_DENIED` | `backend/api/src/services/orders/management.ts` |
| Kitchen tickets | branch filter validated against scope; row-level check on transitions → 403 `KITCHEN_ACCESS_DENIED` | `backend/api/src/services/kitchen/tickets.ts` |
| Deliveries / riders | `assertBranchInScope` on list/roster/assign/status → 403 `DELIVERY_ACCESS_DENIED` | `backend/api/src/services/deliveries/operations.ts` |
| Tables / bills | service-layer `assertBranchInScope` | `services/tables/management.ts`, `services/bills/restaurant-bills.ts` |
| Database RLS helpers | defense for PostgREST; Express uses service role | `supabase/migrations/20260716140000_sprint3_slice2d_order_branch_rls.sql` |

### Invariant

For non–super-admin principals, any requested `branchId` must be a member of
`principal.branchIds`. Otherwise the service throws 403 (not an empty
partial result). Aggregate requests omit `branchId`; the server narrows to
`principal.branchIds` and never expands beyond it.

Mixed authorized/unauthorized ID **lists** are not representable: the API
accepts one optional UUID. Partial silent returns of a mixed list therefore
cannot occur.

### Middleware decision (Option C)

`requireBranchAccess` in `backend/api/src/middleware/authorization.ts` is
**NON-CANONICAL**. It is retained for unit tests and a possible future
route-level defense-in-depth layer, but **no production operational route
mounts it**. Canonical enforcement is the service layer, which must remain
secure when called outside a normal HTTP route. Do not treat the helper’s
presence as evidence that routes are gated.

## Negative-test evidence

| Guarantee | Test |
| --- | --- |
| Branch A cannot read Branch B via forged `branchId` | `backend/api/tests/multibranch-isolation.d2.test.ts` |
| Branch A cannot write Branch B | same + `orders-management.test.ts` |
| Unknown UUID outside membership → 403 | `multibranch-isolation.d2.test.ts` |
| Selector / omitted filter never widens scope | `multibranch-isolation.d2.test.ts` |
| Duplicate membership IDs do not widen scope | `multibranch-isolation.d2.test.ts` |
| One / multiple / super-admin / no-membership cases | `multibranch-isolation.d2.test.ts` |
| Spoofed headers ignored | `admin-dashboard.authz.test.ts`, `admin-orders.authz.test.ts` |
| Invalid (non-UUID) branch id → 400 | `admin-dashboard.authz.test.ts` |

## Known boundaries (documented, not hidden)

- Customer order intake (`POST /orders` by `branchCode`) is public by design.
- No organization / tenant / region / area-manager model exists.
- Frontend customer `BranchContext` may fall back to bundled code-string ids
  when the branches API is offline; admin scope still uses UUID memberships
  from `/auth/me`.
- `branches.status` (coming-soon / inactive) is not stripped from memberships.
