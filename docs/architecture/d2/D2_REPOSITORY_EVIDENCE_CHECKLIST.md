# D2 Repository Evidence Checklist

**Status:** Implementation In Progress (checklist reflects pre-implementation state)  
**Implementation Evidence:** No  
**Release Evidence:** No  
**Engineering Authorization:** Granted (Founder authorization, 2026-07-25)

---

## Purpose

Exact, repository-verified evidence for the proposed D2 concerns as of
2026-07-25. Classifications use repository files only. Screenshots are excluded.
Runtime success is not inferred from source.

---

## Classification Legend

- Verified Implemented
- Partially Implemented
- Missing
- Configuration Dependent
- Runtime Verification Required
- Unknown

---

## A. API Reliability

| Concern | Repository evidence | Classification |
| --- | --- | --- |
| Shared request client | `apps/website/client/src/lib/api.ts` — `fetchApiData`, `fetchApiEnvelope`, `resolveApiUrl`, `ApiRequestError` | Partially Implemented |
| Duplicate domain clients | `apps/website/client/src/lib/admin-api.ts` and `ops-api.ts` each define their own `authHeaders` | Partially Implemented |
| API base URL resolution | `api.ts`: `CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL` else `/api/v1`; type in `apps/website/client/src/vite-env.d.ts` | Configuration Dependent |
| Auth token propagation | Per-call `Authorization: Bearer` via `authHeaders(accessToken)` in `admin-api.ts` / `ops-api.ts` | Partially Implemented |
| Branch scope propagation | `branchId` query param in `fetchAdminOperationsDashboard`, `listAdminOrders`, `listKitchenTickets`, `listDeliveryAssignments` | Partially Implemented |
| Organization scope propagation | No org-scope parameter present in clients | Missing |
| Timeout behavior | No timeout in `api.ts` `fetch` call | Missing |
| Safe retry policy | No retry in shared client; only 3 unrelated `AbortController`/retry hits in `*.tsx` (ProductDetail, CustomerInsights) | Missing |
| Cancellation of obsolete requests | No `AbortController`/`signal` in affected admin pages | Missing |
| Normalized error handling | `ApiRequestError { statusCode, code }` in `api.ts` | Partially Implemented |
| Request correlation IDs | No request-id/correlation middleware in `backend/api/src`; none in clients | Missing |

---

## B. Surface Data Loading

| Surface | Repository evidence | Classification |
| --- | --- | --- |
| Executive Dashboard | `AdminDashboard.tsx` — `load()` sets `loading/error`, `kpiState` prefers error over stale; `lastUpdated` used | Partially Implemented |
| Branch Dashboard | `AdminBranchManager.tsx` — `fetchAdminOperationsDashboard` branch-scoped | Partially Implemented |
| Orders | `AdminOrders.tsx` — `fetchAdminOperationsDashboard` + `listAdminOrders` | Partially Implemented |
| Kitchen ERP | `AdminKitchen.tsx` + `listKitchenTickets` (`ops-api.ts`) | Partially Implemented |
| Kitchen Display | `AdminKitchenDashboard.tsx` + kitchen tickets | Partially Implemented |
| Delivery | `AdminDelivery.tsx` + `listDeliveryAssignments` (`/riders/assignments`) | Partially Implemented |
| Reports (ops data) | `AdminReports.tsx` + `fetchAdminOperationsDashboard` | Partially Implemented |

---

## C. State Semantics

| Concern | Repository evidence | Classification |
| --- | --- | --- |
| KPI state model | `apps/website/client/src/components/admin/AdminKpiCard.tsx` — `AdminKpiState = available/loading/empty/unavailable/error/planned` | Partially Implemented |
| Error-over-stale rule | `AdminDashboard.tsx` `kpiState`: `if (args.error) return "error"` | Partially Implemented (dashboard only) |
| Loading insights honesty | `ExecutiveWidgets.tsx` `AiInsightsPanel` loading vs empty distinction | Partially Implemented |
| Zero-vs-failure rule (`0` valid only on success) | Not enforced uniformly across affected surfaces | Missing |
| Stale timestamp | `lastUpdated` prop on `AdminKpiCard`; not a shared stale-marking pattern across panels | Partially Implemented |
| Offline/connectivity state | No dedicated offline indicator found | Missing |

---

## D. Health, Tracing, Observability

| Concern | Repository evidence | Classification |
| --- | --- | --- |
| Health endpoints | `backend/api/src/app.ts` — `/healthz`, `/readyz` (readiness via `getEnvironmentStatus`) | Verified Implemented |
| Readiness detail | `/readyz` returns config + `safetyBlockers` + `issues` | Verified Implemented |
| Request IDs / tracing | None found in `backend/api/src` | Missing |
| Structured logging depth | Varies by module; no unified request logging middleware evidenced | Partially Implemented |

---

## E. Environment Configuration

| Concern | Repository evidence | Classification |
| --- | --- | --- |
| Website API base URL | `VITE_API_BASE_URL` (`api.ts`, `vite-env.d.ts`); `vercel.json` build config | Configuration Dependent |
| API CORS origin | `backend/api/src/app.ts` `cors({ origin: envStatus.config.corsOrigin })`; `render.yaml` `API_CORS_ORIGIN` | Configuration Dependent / Runtime Verification Required |
| API readiness env | `backend/api/src/main.ts` warns when not ready; `/readyz` 503 when unconfigured | Runtime Verification Required |

---

## Runtime Verification Required (not provable from source)

- deployed API connectivity from production website origin
- per-role authentication propagation in production
- production CORS behavior
- environment-variable correctness across preview/production
- realtime sync (if any) for kitchen/delivery
- correlation-ID propagation end to end (if backend echo authorized)

---

## Summary

The repository provides a **partial** reliability foundation (shared envelope
client, `ApiRequestError`, KPI state model, D1 error-over-stale on the executive
dashboard, health endpoints). The main gaps are **timeout, retry, cancellation,
correlation IDs, uniform auth/scope propagation, a uniform zero-vs-failure rule,
and shared stale/offline UI patterns** across all affected surfaces.
