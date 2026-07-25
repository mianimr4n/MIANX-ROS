# D2 — Implementation Evidence Report

**Status:** Implementation In Progress  
**Classification:** Repository Evidence — Working Tree (branch `feature/aug14-multibranch-opening-readiness`)  
**Release Evidence:** No — not committed, not merged, not deployed, not released  
**Runtime Acceptance:** Not performed — see runtime verification requirements below

---

## Canonical status semantics (implemented)

Single shared model: `apps/website/client/src/lib/op-status.ts`.

| State | Meaning |
| --- | --- |
| LOADING | First load in flight; no data yet |
| LIVE | Request succeeded; values are current — includes genuine zero |
| DERIVED | Value computed from live data (labeled at the KPI-card level) |
| EMPTY | Request succeeded with no records — never rendered as an error |
| STALE | Last successful data kept visible while the current refresh fails; always shows last-successful timestamp plus retry |
| OFFLINE | Network or timeout failure — never used for server validation errors |
| ERROR | Request failed with no prior data; value shows a dash, never `0` |
| FOUNDATION | Surface exists but backend capability is incomplete; controls disabled with explanation |
| UNAVAILABLE | Data intentionally not available for this scope/session |

Rules enforced in code:

- `useOperationalData` keeps failures from ever mapping to zero/default values
  (`data` stays `null` on failure; panels render a dash via `AdminKpiCard`).
- Empty success (`isEmpty`) maps to EMPTY, not ERROR.
- STALE requires a prior success; `lastSuccessAt` is always tracked.
- Error categories distinguish auth (401), forbidden (403), validation (400/422),
  server (5xx), network (status 0), and timeout.

## Shared API reliability (implemented)

| Behavior | Evidence |
| --- | --- |
| One envelope client, base URL resolution | `apps/website/client/src/lib/api.ts` (`VITE_API_BASE_URL` else `/api/v1`) |
| Shared bearer header builder | `bearerHeaders` in `api.ts`; used by `admin-api.ts` and `ops-api.ts` (duplication removed) |
| Bounded timeout | `timeoutMs` in `fetchApiEnvelope`; reads default 15 s, writes 20 s (`ADMIN_READ_TIMEOUT_MS`, `ADMIN_WRITE_TIMEOUT_MS`) |
| Request cancellation | `AbortSignal` threading through all read clients; `useOperationalData` aborts obsolete requests on dependency change/unmount |
| Safe retries (reads only) | Bounded automatic retry (default 1) for network/timeout/5xx in `useOperationalData`; writes are never auto-retried |
| Error normalization | Network → `ApiRequestError(0, "NETWORK")`, timeout → `(0, "TIMEOUT")`; categorization in `op-status.ts` |
| Correlation IDs | Client-generated per request, sent as `X-Client-Request-Id`; shown only to super-admin in the status banner |
| Branch scope propagation | `branchId` on all operational reads including `listOpsOrders` (previously missing) |

## Wired opening-critical surfaces

All use `useOperationalData` + `OperationalStatusBanner`
(`apps/website/client/src/components/admin/OperationalStatusBanner.tsx`):

| Surface | File | Notes |
| --- | --- | --- |
| Executive/Owner dashboard | `pages/admin/AdminDashboard.tsx` | STALE-aware KPIs; branch drill-down into Branch dashboard; staff-role redirects |
| Branch Manager dashboard | `pages/admin/AdminBranchManager.tsx` | Fixed: failures previously rendered `?? 0` as live zeros |
| Orders | `pages/admin/AdminOrders.tsx` | List + KPI reads; retry; empty vs error split |
| Kitchen ERP | `pages/admin/AdminKitchen.tsx` | 8 s poll via hook; failed polls → STALE |
| Kitchen Display | `pages/admin/AdminKitchenDashboard.tsx` | Sync badge shows Stale with last-good time |
| Delivery | `pages/admin/AdminDelivery.tsx` | Assignments/roster/enrichment reads; write errors separated |
| Reports | `pages/admin/AdminReports.tsx` | Queue counts render only from successful payloads |

`AdminKpiCard` gained a distinct `stale` state (`components/admin/AdminKpiCard.tsx`).

## Role dashboards

| Dashboard | Disposition |
| --- | --- |
| Organization / Franchise Owner | Executive dashboard with cross-branch `branchPerformance` (now available to verified multi-branch managers, not only super-admin) + branch drill-down |
| Super Admin | Executive dashboard + Settings/HR surfaces; correlation-id diagnostics visible to super-admin only |
| Organization Admin | No separate org model exists — covered by Executive dashboard + Settings; documented gap |
| Regional / Area Manager | No region model. Interim: `canViewMultipleAssignedBranches` + `"Assigned Branches"` when `branchIds.length > 1`; aggregate sends `branchIdFilter=null` (server uses principal memberships) |
| Branch Manager | `/admin/branch` completed with honest KPI states |
| Staff | Role homes: kitchen-only → KDS, cashier-only → POS (new), rider-only → Delivery (new); staff shells hide owner financial modules (`lib/admin-access.ts`) |
| Platform Owner | Not implemented — remains Approved Target, Not Current Operational Requirement |

## Backend changes

- `backend/api/src/services/orders/management.ts`: cross-branch comparison
  scope rule (`isSuperAdmin || branchIds.length > 1`); all isolation logic
  unchanged otherwise.

## Tests added or modified

| File | Coverage |
| --- | --- |
| `backend/api/tests/multibranch-isolation.d2.test.ts` (new) | Cross-branch read/write denial, unknown UUID rejection, duplicate memberships, one/multi/super-admin/no-membership, selector-not-authorization, successful zero |
| `tests/website/d2-multibranch-operational-reliability.test.mjs` (new) | Status model, reliability client, `canViewMultipleAssignedBranches`, branch scope on wired surfaces, staff role homes |
| `tests/website/admin-executive-dashboard-v1.test.mjs` (updated) | D1 KPI-state assertion updated to the D2 mapping (error/offline/stale) |
| `tests/website/admin-erp-foundation-s1.test.mjs` (updated) | Selector helper rename assertion |

## Verification results (local, 2026-07-25)

| Check | Result |
| --- | --- |
| `pnpm check` (website + backend typecheck) | PASS |
| `pnpm test` (426 node tests + 245 backend vitest tests) | PASS — 0 failures |
| `pnpm build:website` | PASS |

## Runtime verification requirements (not yet performed)

1. Deployed API reachability and CORS behavior with the `X-Client-Request-Id` header.
2. Live login per role (owner, branch manager, kitchen, cashier, rider) and
   role-home redirects against production auth.
3. Branch selector behavior against live `branches` rows (both branch UUIDs).
4. Induced API failure on production build showing ERROR/STALE (not zeros).
5. Second-branch dry run per `docs/operations/SECOND_BRANCH_OPENING_READINESS.md`.

## Explicit non-goals honored

No general ledger, purchasing backend, inventory ledger, loyalty ledger,
WhatsApp provider, payroll, forecasting, AI recommendations, kiosk, QR
ordering, multi-tenant platform, route renames, or visual redesign.
