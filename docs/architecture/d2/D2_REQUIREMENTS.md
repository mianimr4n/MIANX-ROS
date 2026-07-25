# D2 Requirements — Production Data Reliability and Unified Operational Status

**Status:** Implementation In Progress  
**Implementation Evidence:** No  
**Release Evidence:** No  
**Engineering Authorization:** Granted (Founder authorization, 2026-07-25)

---

## Summary

D2 is a narrow reliability slice. It standardizes how operational surfaces
load data, propagate identity and scope, and represent data state, so that a
failed request can never be shown as valid live data.

D2 adds **no new product domains** and renames **no routes**.

---

## Goals

1. One shared request/client strategy for operational admin surfaces.
2. Consistent API base URL resolution across environments.
3. Reliable authentication token propagation on every affected request.
4. Organization and branch scope propagation preserved on every affected request.
5. Canonical, semantically distinct data states (see `D2_TECHNICAL_DESIGN.md`).
6. Honest failure behavior: a failed request never displays `0` as current live data.
7. Shared UI patterns for loading, empty, error, stale, retry, last-refresh, and connectivity.
8. Bounded, safe retry that never duplicates writes.
9. Request correlation IDs to support tracing and support triage.

---

## Non-Goals

D2 explicitly does **not** include:

- new role dashboards (Platform Owner, Regional, unified Staff home)
- inventory ledger, purchasing backend, finance ledger, loyalty ledger
- WhatsApp provider integration
- workforce/scheduling system
- new POS features or payment capture
- route renaming or new `/kds` / `/pos` shells
- full multi-tenant implementation
- new database schema, migrations, auth, or RBAC changes

---

## Affected Surfaces

| Surface | Repository entry point |
| --- | --- |
| Executive Dashboard | `apps/website/client/src/pages/admin/AdminDashboard.tsx` |
| Branch Dashboard | `apps/website/client/src/pages/admin/AdminBranchManager.tsx` |
| Orders | `apps/website/client/src/pages/admin/AdminOrders.tsx`, `AdminOrderDetail.tsx` |
| Kitchen ERP | `apps/website/client/src/pages/admin/AdminKitchen.tsx` |
| Kitchen Display | `apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx` |
| Delivery | `apps/website/client/src/pages/admin/AdminDelivery.tsx` |
| Reports (ops-data only) | `apps/website/client/src/pages/admin/AdminReports.tsx` |

Shared clients in scope: `apps/website/client/src/lib/api.ts`,
`apps/website/client/src/lib/admin-api.ts`,
`apps/website/client/src/lib/ops-api.ts`.

Reports is in scope **only** where it consumes the same operations data
(`fetchAdminOperationsDashboard`). Report-specific BI/export depth is out of scope.

---

## Functional Requirements

| ID | Requirement |
| --- | --- |
| D2-R1 | All affected requests route through one shared request strategy with consistent base URL resolution. |
| D2-R2 | Authentication token is attached uniformly; missing/expired token yields a distinct auth state, not a network error. |
| D2-R3 | Organization/branch scope parameters are attached consistently and preserved across refresh and retry. |
| D2-R4 | Requests support timeout and cancellation of obsolete in-flight requests (for example on branch switch or unmount). |
| D2-R5 | Retry is bounded, applies only to safe idempotent reads, and never retries writes in a way that duplicates effects. |
| D2-R6 | Errors are normalized into distinguishable categories (auth, network/timeout, server, validation). |
| D2-R7 | A failed refresh must not present prior or default values as current live data. |
| D2-R8 | A successful response with a zero value renders a valid zero, not an error or empty state. |
| D2-R9 | Successful empty responses render an explicit empty state. |
| D2-R10 | Stale data is marked with the last successful refresh timestamp. |
| D2-R11 | Technical error details are shown only to appropriate roles; business users see business language. |
| D2-R12 | Request correlation IDs are generated/propagated to support tracing. |

---

## Architecture Boundaries

- Frontend-first slice: shared client + state semantics + shared UI patterns.
- Backend changes limited to non-breaking observability support (for example
  request-id echo) **only if** authorized; no contract, schema, auth, or RBAC changes.
- No change to existing route paths or component public product behavior beyond
  reliability/state representation.

See [`D2_TECHNICAL_DESIGN.md`](./D2_TECHNICAL_DESIGN.md).

---

## Risks

| Risk | Mitigation |
| --- | --- |
| Regression in Orders/Kitchen/Delivery/POS behavior | Keep existing transitions untouched; add reliability wrappers only; run adjacent static + backend tests |
| Retry causing duplicate writes | Retry reads only; rely on existing idempotent transition replay for writes |
| Hiding real zeros as empty/error | Enforce D2-R8 semantic rule with tests |
| Scope creep into new domains | Enforce non-goals; architect review gate |
| Environment misconfiguration masked | Surface configuration-dependent states honestly; document runtime verification |

---

## Dependencies

- Existing shared client `apps/website/client/src/lib/api.ts` and `ApiRequestError`.
- Existing health endpoints `backend/api/src/app.ts` (`/healthz`, `/readyz`).
- Existing D1 honesty pattern in `AdminDashboard.tsx` (error preferred over stale payload).
- Governance acceptance policy `docs/00-governance/ACCEPTANCE_GATES.md`.

---

## Acceptance Criteria

See [`D2_ACCEPTANCE_GATES.md`](./D2_ACCEPTANCE_GATES.md).

---

## Runtime Verification Requirements

Source verification alone is insufficient. Runtime verification (documented
separately) must cover deployed API connectivity, auth propagation per role,
production CORS, environment variable correctness, and stale/offline behavior
under real network failure.

---

## Rollback Considerations

- Frontend reliability wrappers should be additive and revertible per surface.
- No schema/migration means rollback is a code revert only.
- Each affected surface should remain independently revertible.

---

## Repository Evidence

Exact evidence references are tracked in
[`D2_REPOSITORY_EVIDENCE_CHECKLIST.md`](./D2_REPOSITORY_EVIDENCE_CHECKLIST.md).
