# POLISH-QA — Backend CSV classification

## Implementation

- File: `backend/api/src/services/reports/sales.ts`
- `csvEscape` quotes only when `[" , \n \r]` present — **does not** neutralize leading `=+-@`
- Routes: `GET /reports/sales/export`, `GET /reports/orders/export` in `backend/api/src/modules/admin/reports.ts`
- Guard: `requireAuthenticatedUser` + `requireReportsAccess` (reports permissions / admin.access / order.manage set)
- Orders export fields include user-influenced `contact_name`, `contact_phone`

## Decision

**Option B — Reachable but P2 hardening residual**

Rationale:

- Not an unauthorized-data leak of itself (role-gated; branch-scoped via service)
- Formula-injection risk exists for spreadsheet consumers of contact fields
- Frontend Owner EOD CSV already hardened in POLISH-07
- Backend change requires separate authorization (out of POLISH-QA safety boundary)

**Not** option C (P0/P1) — no proven unauthorized export path or active exploit in this audit.

Classification: **ACCEPTED_P2_RESIDUAL**. Token: not `PHASE1_POLISH_QA_BACKEND_EXPORT_BLOCKED`.
