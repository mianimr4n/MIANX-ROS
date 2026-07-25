# D2 Technical Design — Data Reliability and State Semantics

**Status:** Implementation In Progress  
**Implementation Evidence:** No  
**Release Evidence:** No  
**Engineering Authorization:** Granted (Founder authorization, 2026-07-25)

---

## Scope

Proposed technical design for the D2 reliability slice. This is design intent,
not implemented capability. No code, schema, auth, or RBAC changes are made by
this document.

---

## A. API Reliability

### Current repository evidence

| Concern | Evidence | Classification |
| --- | --- | --- |
| Shared client | `apps/website/client/src/lib/api.ts` (`fetchApiData`, `fetchApiEnvelope`) | Partially Implemented |
| Domain clients | `apps/website/client/src/lib/admin-api.ts`, `ops-api.ts` (each defines own `authHeaders`) | Partially Implemented |
| Base URL resolution | `api.ts` `VITE_API_BASE_URL` else `/api/v1`; `vite-env.d.ts` typing | Configuration Dependent |
| Auth propagation | Manual `Authorization: Bearer` per call via `authHeaders(accessToken)` | Partially Implemented |
| Branch scope propagation | Manual `branchId` query param per call (`admin-api.ts`, `ops-api.ts`) | Partially Implemented |
| Organization scope propagation | No explicit org scope parameter found in clients | Missing |
| Timeout | No request timeout in `api.ts` | Missing |
| Retry policy | No retry in shared client; ~no `AbortController`/retry across admin pages | Missing |
| Cancellation of obsolete requests | No `AbortController` usage in affected admin pages | Missing |
| Normalized error handling | `ApiRequestError` with `statusCode`/`code` in `api.ts` | Partially Implemented |
| Request correlation IDs | None found in `backend/api/src` or clients | Missing |

### Proposed design

- Consolidate on a single request layer built on the existing `api.ts` envelope.
- Add a shared authenticated request helper so `authHeaders` is defined once,
  removing duplication between `admin-api.ts` and `ops-api.ts`.
- Add optional timeout + `AbortController` support for reads; callers pass a
  `signal` and cancel obsolete requests on branch switch/unmount.
- Add a bounded read-only retry policy (for example limited attempts with
  backoff) that never applies to write endpoints.
- Normalize errors into categories derived from `ApiRequestError.statusCode`
  and network/timeout failures.
- Propagate a client-generated correlation ID header; backend may echo it
  (non-breaking) if separately authorized.

---

## B. Data-State Semantics

Canonical states (must remain semantically distinct per blueprint §9):

| State | Meaning |
| --- | --- |
| LOADING | Request in flight; no trusted current value yet |
| LIVE | Successful response from a first-party live source |
| DERIVED | Computed from live data, not a direct source metric |
| FOUNDATION | Honest placeholder for a domain without a live backend |
| UNAVAILABLE | Capability not available in this environment/config |
| EMPTY | Successful response containing zero records |
| ERROR | Request failed (auth/network/server/validation) |
| STALE | Last value known-good but not refreshed within threshold |
| OFFLINE | Client/connectivity cannot reach the API |

### Required semantic rule

- `0` means a **successful response with a valid zero value** and renders as `0`.
- A **failed** request must **not** silently display `0` (or a prior value) as
  current live data. It must render ERROR/STALE/OFFLINE as appropriate.

This extends the existing D1 honesty pattern in
`apps/website/client/src/pages/admin/AdminDashboard.tsx`
(`kpiState` prefers `error` over stale payload).

---

## C. Shared UI Behavior

Proposed shared components/patterns (built on existing
`apps/website/client/src/components/admin/AdminKpiCard.tsx` state model):

| Pattern | Intent |
| --- | --- |
| Loading state | Skeleton/spinner without fake values |
| Empty state | Explicit "no records" for successful zero-length responses |
| Error state | Distinguishes auth vs network vs server; business language by default |
| Stale-data state | Marks data with last successful refresh time |
| Retry action | Bounded manual/automatic retry for reads |
| Last successful refresh | Timestamp surfaced per panel (existing `lastUpdated` prop) |
| Connectivity status | OFFLINE indicator when API unreachable |
| Technical details | Correlation ID / status code shown only to appropriate roles |

`AdminKpiCard` already models `loading/empty/unavailable/error/planned`;
D2 extends shared patterns to panels beyond KPI cards.

---

## D. Initial D2 Surfaces

In scope (data loading only):

- Executive Dashboard — `AdminDashboard.tsx`
- Branch Dashboard — `AdminBranchManager.tsx`
- Orders — `AdminOrders.tsx`, `AdminOrderDetail.tsx`
- Kitchen ERP / Kitchen Display — `AdminKitchen.tsx`, `AdminKitchenDashboard.tsx`
- Delivery — `AdminDelivery.tsx`
- Reports — `AdminReports.tsx` (only where it consumes `fetchAdminOperationsDashboard`)

Out of scope: everything listed in `D2_REQUIREMENTS.md` Non-Goals.

---

## Architecture Boundaries

- Additive frontend reliability layer; no route renames.
- No changes to order/kitchen/delivery transition semantics.
- No schema/migration/auth/RBAC changes.
- Backend limited to optional non-breaking correlation-ID echo, only if
  separately authorized.

---

## Runtime Verification

Deployed connectivity, auth propagation, CORS, environment correctness, and
stale/offline behavior must be verified at runtime and recorded separately from
source verification. See [`D2_ACCEPTANCE_GATES.md`](./D2_ACCEPTANCE_GATES.md).
