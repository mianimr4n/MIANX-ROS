# D4 — Role Dashboards and Opening Command Center

**Status:** Implementation In Progress
**Branch:** `feature/aug14-role-dashboards-completion`
**Base:** `6377b7e` (D3 merge on main)
**Business deadline:** Northern Bypass opening — 14 August 2026

> Not committed. Not pushed. Not merged. Not deployed. Not released. Not production verified.

## Objective

Complete every opening-relevant Telepizza dashboard using real backend data, server-side RBAC, branch isolation, shared operational states, working actions, responsive layouts, automated tests, and browser verification.

## Role-dashboard matrix

| Role (repo code) | Redirect / home | Backend | Branch scope | Key KPIs | Actions | Gaps / verification |
| --- | --- | --- | --- | --- | --- | --- |
| `super-admin` | `/admin/dashboard` | operations + system-health + readiness | org-wide | ops + readiness + health | Settings, HR, Branch readiness | Browser matrix may be PASS_WITH_LIMITATIONS |
| Owner (SA / org-wide) | `/admin/dashboard` | operations + table-service | all authorized | ops + table-service + comparison | Drill-down by branch | No fabricated finance |
| `admin` | `/admin/home/config` | opening-readiness | assigned / selected | blockers / checks | Settings, HR, Menu, Floor plan | Fixture often absent locally |
| `branch-manager` (multi) | `/admin/branch` | operations + table + readiness | assigned aggregate | ops + table + readiness | POS, Orders, KDS, Floor, etc. | Assigned-mode fixture TBD |
| `branch-manager` | `/admin/branch` | same | single branch | opening-day KPIs | opening actions | Core BM path |
| `cashier` | `/admin/home/cashier` | operations + table-service | assigned | counter + bill/payment | POS primary | |
| `host` | `/admin/home/host` | table-service | assigned | reservations / waitlist / conflicts | Res, Waitlist, Seat, Floor | |
| `waiter` | `/admin/home/waiter` | table-service + live floor | assigned | sessions / bills | POS, Floor | |
| `kitchen` | `/admin/kitchen-dashboard` | kitchen tickets (existing) | assigned | queue / delayed | KDS | Existing KDS |
| `rider` | `/admin/home/delivery` | orders/delivery APIs | assigned | ready / dispatched | Delivery console | Fixture may be missing |
| general staff | `/admin/home/staff` | none fabricated | assigned | entry points only | permitted links | |
| Ops CC | `/ops` | operations + table-service | selected | live ops + floor | Orders/Kitchen/Dispatch/Floor | |

## Backend contracts

| Endpoint | Permission | Notes |
| --- | --- | --- |
| `GET /api/v1/admin/dashboard/operations` | `order.manage` | Operational KPIs (not audited revenue) |
| `GET /api/v1/admin/dashboard/table-service?branchId=` | `reservation.read` | Table-service KPI summary + optional occupancy comparison |
| `GET /api/v1/admin/dashboard/system-health` | technical roles only | No stack traces / secrets |
| `GET /api/v1/admin/dashboard/opening-readiness?branchId=` | membership | Opening readiness grade |
| `GET /api/v1/admin/branches/:branchId/readiness` | membership | Same readiness report |

## Shared architecture

- Scope: selected branch / assigned-branches aggregate / org-wide SA
- States: `op-status.ts` LOADING LIVE DERIVED EMPTY STALE OFFLINE ERROR FOUNDATION UNAVAILABLE
- UI: `AdminKpiCard`, `OperationalStatusBanner`, `DashboardActionCard`, `OpeningReadinessSummary`, `RoleHomeShell`, `TableServiceSummary`

## Operational state semantics

- `0` means successful valid zero
- Failed current load must not display fake live zero
- Stale keeps previous value + timestamp + warning
- Empty ≠ error; foundation ≠ functional; unavailable ≠ error

## Northern Bypass

Production Northern Bypass remains `coming-soon`. Dashboards show readiness/blockers; primary action **Complete Opening Readiness**. Do not activate the branch.

## KPI definitions (table-service)

Returned in API `definitions` map. Averages remain `null` until measured from stored timestamps.

## Scope rules

- Selector is UX only; server resolves memberships
- Forged branch UUID → 403
- Omitted filter cannot widen beyond authorized memberships
- Coming-soon blocks live operational actions

## Tests

- Backend: `backend/api/tests/d4-dashboard.authz.test.ts`, `d4-dashboard.scope.d4.test.ts`
- Frontend static: `tests/website/d4-role-dashboards.test.mjs`
- Browser: `playwright.d4.config.ts`, `e2e/d4/role-matrix.spec.ts`, `e2e/d4/responsive.spec.ts`
- Fixture map: `scripts/d4/fixture-role-matrix.mjs`

## Known limitations

- Average wait / table-turn remain null (FOUNDATION) until timestamp derivation lands
- Device/on-site verification always reports not verified until an evidence store exists
- Some browser fixtures (admin-config, assigned multi-branch, NB BM, delivery) may be NOT_VERIFIED locally
- Browser role matrix / full a11y not claimed PASS without recorded evidence in this working tree

## Rollback plan

Discard uncommitted D4 changes on `feature/aug14-role-dashboards-completion`. Production remains on main without D4. Northern Bypass status is independent and stays `coming-soon` unless separately authorized.
