# Telepizza ROS Current-State Assessment — 2026-07-25

**Status:** Repository-Verified Assessment
**Classification:** Point-in-Time Architecture Assessment
**Authoritative Implementation Inventory:** No
**Evidence Basis:** Repository files, tests, routes, API contracts, and configuration
**Screenshot Evidence:** Excluded
**Valid As Of:** 2026-07-25

---

## Purpose

This assessment records what the repository **shows** about current Telepizza ROS surfaces on 2026-07-25.

It is not:

- a release record
- an acceptance certificate
- proof of production runtime success
- the approved target architecture (see [`../RESTAURANT_OPERATING_SYSTEM_BLUEPRINT.md`](../RESTAURANT_OPERATING_SYSTEM_BLUEPRINT.md))

---

## Classification Legend

| Classification | Meaning |
| --- | --- |
| Verified Implemented | Repository evidence shows a working vertical for the named surface’s core path (UI + wiring + supporting contract/tests as applicable) |
| Partially Implemented | Core path exists with honest gaps, foundation labels, or incomplete domain depth |
| Foundation Only | UI/shell exists primarily as honesty/foundation surface without domain ledger/API depth |
| Planned | Route or product intent reserved (for example ComingSoon) without operational depth |
| Unknown | Insufficient repository evidence to classify |
| Verification Blocked | Evidence incomplete or runtime-dependent; cannot classify further from files alone |

---

## Surface Inventory

| Surface | Classification | Repository Evidence | Missing Capability | Confidence |
| --- | --- | --- | --- | --- |
| Executive Dashboard | Partially Implemented | `apps/website/client/src/pages/admin/AdminDashboard.tsx`; route `/admin/dashboard` in `apps/website/client/src/App.tsx`; `fetchAdminOperationsDashboard` in `apps/website/client/src/lib/admin-api.ts` calling `GET /api/v1/admin/dashboard/operations`; handler `backend/api/src/modules/admin/dashboard.ts`; static suite `tests/website/admin-executive-dashboard-v1.test.mjs` | Multi-day analytics; customer-session RBAC browser proof; induced live API error AV1 gap remains documented in governance status | High |
| Branch Dashboard | Partially Implemented | `apps/website/client/src/pages/admin/AdminBranchManager.tsx`; route `/admin/branch` in `apps/website/client/src/App.tsx`; `fetchAdminOperationsDashboard` via `apps/website/client/src/lib/admin-api.ts`; branch-scoped ops dashboard usage in page | Full cash variance, attendance, hourly analytics endpoints labeled Foundation in page | High |
| Operations Command Center | Partially Implemented | Routes `/ops`, `/ops/orders`, `/ops/kitchen`, `/ops/dispatch` in `App.tsx`; pages `apps/website/client/src/pages/ops/OpsDashboard.tsx`, `OpsOrders.tsx`, `OpsKitchen.tsx`, `OpsDispatch.tsx` | Unified enterprise OCC product naming; consolidation with Admin ERP consoles | Medium |
| Orders | Partially Implemented | `AdminOrders.tsx`, `AdminOrderDetail.tsx`; `/admin/orders`, `/admin/orders/:orderId`; `backend/api/src/modules/admin/orders.ts` (list/get/transitions); `tests/website/admin-orders-management-v1.test.mjs` | Export and some filters labeled Foundation; full OMS depth varies | High |
| Kitchen ERP | Partially Implemented | `AdminKitchen.tsx`; `/admin/kitchen`; `backend/api/src/modules/kitchen/routes.ts` (`GET /tickets`, `PATCH /tickets/:id/status`); `tests/website/admin-kitchen-display-v1.test.mjs` | VIP/urgent priority labels Foundation; not full station model | High |
| Kitchen Display System | Partially Implemented | `AdminKitchenDashboard.tsx`; `/admin/kitchen-dashboard` (no standalone `/kds` route); kitchen tickets API; `tests/website/admin-kitchen-manager-dashboard-v1.test.mjs`; RC1 PARTIAL in `docs/rc1/04-MODULE_STATUS.md` and `docs/rc1/10-KNOWN_LIMITATIONS.md` | Bump/recall/stations/item-level PATCH/sound per RC1 limitations | High |
| Delivery | Partially Implemented | `AdminDelivery.tsx`; `/admin/delivery`; `backend/api/src/modules/riders/routes.ts` (assignments/roster/assign/status); `tests/website/admin-delivery-management-v1.test.mjs`; map foundation in page | Map foundation; export Foundation | High |
| POS | Partially Implemented | `AdminPos.tsx`; `/admin/pos` (no standalone `/pos` route); quote/create via `backend/api/src/modules/orders/routes.ts`; tables/bills under `backend/api/src/modules/admin/tables.ts` and `bills.ts`; `tests/website/admin-pos-v1.test.mjs` | Dedicated POS payment module; payment capture/print Foundation | High |
| Menu | Partially Implemented | `AdminMenu.tsx`; `/admin/menu`; public/catalog read via `backend/api/src/modules/menu/routes.ts`; `tests/website/admin-menu-management-v1.test.mjs`; RC1: writes unavailable | Menu write APIs / publishing depth | High |
| Inventory | Foundation Only | `AdminInventory.tsx`; `/admin/inventory`; `InventoryFoundationPanel`; `tests/website/admin-inventory-management-v1.test.mjs`; RC1 foundation | Stock ledger / recipes / food-cost APIs | High |
| Purchasing | Foundation Only | `AdminPurchasing.tsx`; `/admin/purchasing`; foundation panels; `tests/website/admin-purchasing-suppliers-v1.test.mjs`; RC1 foundation | PO / receiving / supplier ledger APIs | High |
| Finance | Foundation Only | `AdminFinance.tsx`; `/admin/finance`; `FinanceFoundationPanel`; KPI slice from `fetchAdminOperationsDashboard` (hybrid display, not a ledger API); `tests/website/admin-finance-accounting-v1.test.mjs`; RC1 foundation; no finance ledger module under `backend/api/src/modules/` | Cash drawer, GL, settlements APIs | High |
| Reports | Partially Implemented | `AdminReports.tsx`; `/admin/reports`; `fetchAdminOperationsDashboard`; `ReportsFoundationPanel`; `tests/website/admin-reports-business-intelligence-v1.test.mjs` | Trend/export BI depth beyond today ops snapshot | High |
| CRM | Partially Implemented | `AdminCrm.tsx`; `/admin/crm`, `/admin/customers`; customers aggregated from admin orders (`tests/website/admin-crm-v1.test.mjs` asserts order-derived aggregation); RC1 order-derived; no dedicated CRM backend module | Full Customer 360 service cases; dedicated CRM APIs | Medium |
| Loyalty | Foundation Only | `AdminLoyalty.tsx`; `/admin/loyalty`; `tests/website/admin-loyalty-rewards-v1.test.mjs`; RC1: no points ledger API | Points ledger, redemptions, tier engine | High |
| WhatsApp | Foundation Only | `AdminWhatsApp.tsx`; `/admin/whatsapp`; `WhatsAppFoundationPanel`; `tests/website/admin-whatsapp-order-center-v1.test.mjs`; RC1: no provider send | Provider send/inbox sync | High |
| Workforce / Employees | Foundation Only | `AdminHr.tsx`; `/admin/hr`, `/admin/staff`; `HRFoundationPanel`; staff invite routes in `backend/api/src/modules/admin/routes.ts`; `tests/website/admin-hr-workforce-management-v1.test.mjs` | Scheduling, attendance, payroll handoff | High |
| Settings / Governance UI | Foundation Only | `AdminSettings.tsx`; `/admin/settings`; `tests/website/admin-settings-configuration-v1.test.mjs`; RC1: no persistence API | Durable settings persistence API | High |
| Security and RBAC | Partially Implemented | `apps/website/client/src/lib/admin-access.ts`; `AuthContext`; `/auth/me` in `backend/api/src/modules/auth/routes.ts`; admin route guards; `tests/website/admin-erp-foundation-s1.test.mjs`; server remains authoritative per RC1 | Full org hierarchy / multi-tenant platform RBAC; complete permission matrix for all future workspaces | Medium |
| Audit and observability | Foundation Only | API health endpoints referenced in ops docs (`/healthz`, `/readyz`); structured logging depth varies by module; no dedicated Admin Audit workspace route beyond settings foundation | Complete audit workspace, request tracing productization, SLO dashboards | Medium |
| Integrations and devices | Planned | ComingSoon routes in `App.tsx`: `/admin/integrations`; also `/admin/promotions`, `/admin/support`, `/admin/branches`, `/admin/ai-command-center` | Integration framework, device management product | High |
| Online ordering (customer) | Partially Implemented | `apps/website` customer routes/pages; menu/cart/checkout path; catalog data under `data/catalog/`; backend orders/menu/branches modules | Full account depth varies by Phase 1 closure status (`docs/architecture/PHASE-1-*`) | Medium |
| Rider application | Verification Blocked | Rider API module `backend/api/src/modules/riders/routes.ts` exists; dedicated rider app UX not evidenced as complete product shell in website admin routes | End-to-end rider application UX and acceptance | Low |
| QR / table ordering | Verification Blocked | Dine-in module `backend/api/src/modules/dine-in/routes.ts`; architecture note `docs/architecture/DINE-IN-TABLE-QR-ARCHITECTURE.md` (architecture ≠ implementation proof) | Full QR ordering product acceptance | Low |
| Platform Owner Dashboard | Planned | No dedicated platform-owner multi-tenant dashboard route evidenced; blueprint marks Not Current Operational Requirement | Multi-tenant platform architecture | High |
| Regional Manager Dashboard | Planned | No dedicated regional dashboard route evidenced beyond branch-scoped filters | Regional scorecards product | High |
| Staff Dashboard (role home) | Planned | Role redirects exist (kitchen/branch) via dashboard/shell behavior; no single unified Staff Dashboard product | Unified staff home | Medium |

---

## Parallel Kitchen Surfaces (Observed)

Repository evidence shows three kitchen UIs coexist:

| Route | Page | Notes |
| --- | --- | --- |
| `/admin/kitchen` | `AdminKitchen.tsx` | Owner/admin kitchen board in Admin shell |
| `/admin/kitchen-dashboard` | `AdminKitchenDashboard.tsx` | Kitchen Manager KDS (PARTIAL per RC1) |
| `/ops/kitchen` | Ops kitchen page | Ops command path |

Consolidation is documented as future debt in `docs/rc1/04-MODULE_STATUS.md` and `docs/rc1/10-KNOWN_LIMITATIONS.md`. This assessment does not authorize rename or consolidation.

---

## Observed Architectural Risks

Only risks with repository evidence:

1. **Multiple kitchen execution UIs** — three routes/pages coexist (`docs/rc1/04-MODULE_STATUS.md`, `App.tsx`), increasing operator confusion and divergence risk.
2. **Foundation ERP modules present as navigable UI** — Inventory, Purchasing, Finance, HR, Settings expose honesty UIs without domain ledgers (`docs/rc1/10-KNOWN_LIMITATIONS.md`, foundation panels in pages). Risk: users may over-trust navigability as completeness.
3. **Permission proxies for unfinished domains** — `admin-access.ts` maps inventory/purchasing access to `branch.manage` until dedicated permissions are seeded (inline comments in `apps/website/client/src/lib/admin-access.ts`).
4. **Shared operations dashboard payload reused for multiple workspaces** — Finance/Reports/Branch/Executive often call `fetchAdminOperationsDashboard`, coupling analytics honesty to one ops snapshot shape (`AdminFinance.tsx`, `AdminReports.tsx`, `AdminBranchManager.tsx`, `AdminDashboard.tsx`).
5. **ComingSoon routes reserved in production navigation surface** — `/admin/integrations`, `/admin/ai-command-center`, etc. in `App.tsx` without operational depth.
6. **Acceptance limitations remain on Executive Dashboard** — governance status records PASS WITH LIMITATIONS (customer RBAC browser proof, induced API error, planned cards in shell nav) in `docs/00-governance/REPOSITORY_STATUS.md`.

---

## Claims Requiring Runtime Verification

Do not infer production success from source alone:

- deployed API connectivity from the production website origin
- authentication propagation for each staff role in production
- production CORS behavior (`render.yaml` lists `API_CORS_ORIGIN` for Vercel website; runtime correctness still requires verify)
- live database availability and RLS/grant behavior in each environment
- realtime synchronization (if any) for kitchen/delivery boards
- environment-variable correctness (`/readyz` vs `/healthz` behavior documented historically in RC1 limitations)
- provider integrations (WhatsApp send, payment capture, device printers)
- rider end-to-end field application flow
- QR/table ordering guest flow acceptance

---

## Evidence Sources Consulted

| Source | Path |
| --- | --- |
| Website routes | `apps/website/client/src/App.tsx` |
| Admin pages | `apps/website/client/src/pages/admin/` |
| Admin access helpers | `apps/website/client/src/lib/admin-access.ts` |
| Admin API client | `apps/website/client/src/lib/admin-api.ts` |
| Admin API server | `backend/api/src/modules/admin/` |
| Kitchen API | `backend/api/src/modules/kitchen/routes.ts` |
| Orders / menu / riders / dine-in APIs | `backend/api/src/modules/*/routes.ts` |
| Static admin suites | `tests/website/admin-*.test.mjs` |
| RC1 module honesty | `docs/rc1/04-MODULE_STATUS.md`, `docs/rc1/10-KNOWN_LIMITATIONS.md` |
| Governance status | `docs/00-governance/REPOSITORY_STATUS.md` |
| Target architecture | `docs/architecture/RESTAURANT_OPERATING_SYSTEM_BLUEPRINT.md` |

Untracked local planning trees (when present) are **not** treated as implementation evidence for this assessment.

---

## Summary

As of 2026-07-25, repository evidence supports a **partial Admin ERP + ops foundation** with live-leaning Orders / Kitchen / Delivery / POS / Executive and Branch surfaces, and foundation-only Inventory / Purchasing / Finance / HR / Loyalty / WhatsApp / Settings depth.

This assessment does not authorize new implementation and does not change release status.
