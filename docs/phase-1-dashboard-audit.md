# Phase 1 — Admin ERP Dashboard Audit
<!-- markdownlint-disable MD024 -->

**Branch:** `phase-1-dashboard-finalization`  
**Rule:** ZERO FAKE DATA — every UI element must reflect LIVE / DERIVED / FOUNDATION / UNAVAILABLE (or PARTIAL when offline fallback).  
**Audited:** 2026-07-29 (pass 1 + remaining modules)  
**Scope:** Full Admin ERP module set listed in tracker.

---

## Module tracker

| Module | Route (typical) | Audit status | Fake data found | Notes |
| --- | --- | --- | --- | --- |
| Dashboard | `/admin/dashboard` | **AUDITED** | None in KPI cards | See §1 |
| Orders | `/admin/orders` | **AUDITED** | KPI zeros on missing payload — fixed | See §3 |
| Kitchen | `/admin/kitchen` / `/admin/kitchen-dashboard` | **AUDITED** | KPI zeros on missing ticket payload (ERP) — fixed; KDS already honest | See §4 |
| Delivery | `/admin/delivery` | **AUDITED** | KPI zeros on missing assignment payload — fixed | See §5 |
| POS | `/admin/pos` | **AUDITED** | Default walk-in phone `03000000000` — fixed | See §9 |
| CRM | `/admin/crm` | **AUDITED** | DERIVED KPI zeros while loading / on failed order window — fixed | See §10 |
| Loyalty | `/admin/loyalty` | **AUDITED** | Same order-window zero invention — fixed | See §11 |
| Inventory | `/admin/inventory` | **AUDITED** | Catalog DERIVED `?? 0` while loading — fixed | See §12 |
| Purchasing | `/admin/purchasing` | **AUDITED** | None — Foundation-only workspace | See §13 |
| Finance | `/admin/finance` | **AUDITED** | None — Foundation + optional LIVE ops sales strip | See §14 |
| Reports | `/admin/reports` | **AUDITED** | Executive KPI `?? 0` LIVE/DERIVED on failed load — fixed | See §15 |
| HR | `/admin/hr` | **AUDITED** | Failed staff assignment load treated as empty roster — fixed | See §16 |
| Settings | `/admin/settings` | **AUDITED** | None — FOUNDATION / READ-ONLY / WAITING_ON_HUMAN honesty | See §6 |
| Menu Management | `/admin/menu` | **AUDITED** | Provenance label fix applied | See §2 |
| AI Team | `/admin/ai-team` | **AUDITED** | None material — deterministic agents | See §17 |

---

## §1 Admin Dashboard (`AdminDashboard.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| Hook | `useOperationalData(...)` wrapping `fetchAdminOperationsDashboard` |
| Client API | `apps/website/client/src/lib/admin-api.ts` → `GET /admin/dashboard/operations` |
| Backend route | `backend/api/src/modules/admin/dashboard.ts` → `router.get("/operations")` |
| Permission | `order.manage` |
| Service | `BranchOrderManagementDataSource.getOperationsDashboard` in `backend/api/src/services/orders/management.ts` |
| DB source | Supabase `orders` (+ branch join), last 500 rows filtered to active statuses **or** Asia/Karachi business-day rows |
| Honesty UI | `OperationalStatusBanner` + KPI `state` from `kpiState(opState)`; null values render as `—` (never invented zero on error) |

Coming-soon branches hide sales/order KPI grid and show opening readiness only.

### Executive KPI cards

| KPI card | UI `source` badge | Value path | Backend field | Classification | Hardcoded / fake? |
| --- | --- | --- | --- | --- | --- |
| Today’s Orders | LIVE | `data?.kpis.todayOrders` | `kpis.todayOrders` | **LIVE** | No |
| Today’s Sales | LIVE | `data?.kpis.todayGrossSales` | `kpis.todayGrossSales` | **LIVE** | No |
| Active Orders | DERIVED | `data?.kpis.activeOrders` | `kpis.activeOrders` | **DERIVED** | No |
| Kitchen Queue | DERIVED | `data?.kpis.kitchenWaiting` | `kpis.kitchenWaiting` | **DERIVED** (order status, not tickets) | No |
| Active Deliveries | DERIVED | `data?.kpis.activeDeliveries` | `kpis.activeDeliveries` | **DERIVED** (`dispatched` only) | No |
| Average Order Value | DERIVED / UNAVAILABLE | `data?.kpis.averageOrderValue` | `kpis.averageOrderValue` | **DERIVED** or **UNAVAILABLE** | No |

### Dashboard verdict

**PASS** — no hardcoded KPI numbers.

---

## §2 Menu Management (`AdminMenu.tsx`)

| Concern | Classification |
| --- | --- |
| SKUs / prices via `useMenuCatalog` | **LIVE** (Supabase) or **PARTIAL** (offline fallback, labeled) |
| Category tree | **DERIVED** from loaded catalog |
| Mianx Menu Insights | **DERIVED / FOUNDATION** — rule-based only, no LLM |
| Hidden / Draft KPIs | **UNAVAILABLE** |

**Fix applied earlier:** Menu KPI cards no longer claim LIVE on static fallback (`catalogMode` → PARTIAL).

---

## §3 Orders (`AdminOrders.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| List hook | `useOperationalData` → `listAdminOrders` |
| Client API | `GET /admin/orders` (`apps/website/client/src/lib/admin-api.ts`) |
| Backend | `backend/api/src/modules/admin/orders.ts` → `router.get("/")` · permission `order.manage` |
| Filters | status, orderType, orderSource, orderNumber, branchId, limit/offset — server-side |
| Detail | `getAdminOrder` → `GET /admin/orders/:id` |
| Transitions | `transitionAdminOrder` → `POST /admin/orders/:id/:action` |
| KPI hook | Separate `useOperationalData` → `fetchAdminOperationsDashboard` → same ops dashboard as Executive |

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| Order grid / list | **LIVE** | Real `orders` rows; empty = EMPTY via op-status |
| Status filters / pills on cards | **LIVE** | Status from API row, not a mock map |
| Order KPIs (pending/preparing/…) | **LIVE** when dashboard payload present | Counts from `statusCounts` / `kpis` |
| Avg preparation time KPI | **UNAVAILABLE** | Explicit `—` |
| Shift label (“Day/Evening shift”) | **FOUNDATION** | Display-only clock band; badged |
| Export button | **FOUNDATION** | Disabled |
| Mianx order insights | **DERIVED** | `buildOrderInsights` — rule-based |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| `OrderKPIs` used `snapshot?.field ?? 0` with `source="LIVE"` when the dashboard KPI payload was missing (failed/offline) — invented zeros | When `!snapshot`, render UNAVAILABLE `—` cards; only show numeric LIVE values when snapshot exists |

### Orders verdict

**PASS after KPI honesty fix.** List/detail/transitions are live; no mock order arrays.

---

## §4 Kitchen (`AdminKitchen.tsx` + `AdminKitchenDashboard.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| Tickets hook | `useOperationalData` → `listKitchenTickets` · poll **8s** |
| Client API | `GET /kitchen/tickets` (`ops-api.ts`) |
| Backend | `backend/api/src/modules/kitchen/routes.ts` → `router.get("/tickets")` |
| Status patch | `patchKitchenTicketStatus` → `PATCH /kitchen/tickets/:id/status` |
| Enrichment | Optional `listAdminOrders` / `getAdminOrder` when `order.manage` |
| Timers | `elapsedMinutes(ticketTimerStartIso(ticket), nowMs)` from real timestamps — **no countdown mocks** |

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| Ticket board / cards | **LIVE** | `kitchen_tickets` via API |
| Delayed KPI | **DERIVED** | Elapsed ≥ prep threshold (20m) |
| Avg prep | **DERIVED** / **UNAVAILABLE** | From startedAt/readyAt samples |
| Kitchen capacity / stations | **FOUNDATION** | Explicitly unavailable; station lanes labeled Foundation |
| Item/History views (manager shell) | **FOUNDATION** | Coming/foundation gates |
| Mianx kitchen insights | **DERIVED / FOUNDATION** | Rule-based |
| Kitchen Manager Dashboard KPIs | **LIVE / EMPTY / UNAVAILABLE** | Already refused failed→zero (`hasTicketPayload`) |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| ERP `AdminKitchen` always built a KPI snapshot from `ticketsOp.data ?? []`, so API failure looked like an empty LIVE board (zeros) | Pass `snapshot={ticketsOp.data != null ? kpiSnapshot : null}`; `KitchenKPIs` shows UNAVAILABLE when null |
| Hardcoded tickets / fake prep timers / mock stations | **Not found** — stations are Foundation-labeled; timers are elapsed from ISO fields |

### Kitchen verdict

**PASS after ERP KPI honesty fix.** KDS manager dashboard was already honest on missing payloads.

---

## §5 Delivery (`AdminDelivery.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| Assignments hook | `useOperationalData` → `listDeliveryAssignments` · poll **8s** |
| Client API | `GET /riders/assignments` |
| Backend | `backend/api/src/modules/riders/routes.ts` → `/assignments` |
| Rider roster | `listRiderRoster` → `GET /riders/roster` (needs assign permission) |
| Assign / status | `POST /riders/deliveries/:id/assign`, `POST .../status` |
| Enrichment | `listAdminOrders` filtered `orderType=delivery` for amounts/payment |

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| Dispatch queue / cards | **LIVE** | Delivery assignment rows |
| Provisional / awaiting confirmation | **DERIVED** | Order still pending — labeled separately |
| Waiting / assigned / picked-up / delivered / failed KPIs | **LIVE** when assignment payload present | |
| Late deliveries | **DERIVED** | ≥ 45 min from assign/pickup clocks |
| Avg delivery time | **DERIVED** / **UNAVAILABLE** | Needs delivered timestamps |
| Online riders | **LIVE** or **FOUNDATION** | Roster requires `delivery.assign` |
| Map panel | **FOUNDATION** | No fake pins / Google Maps |
| Mark failed / Call customer | **FOUNDATION** | Disabled actions |
| Mianx delivery insights | **DERIVED** | Rule-based, no traffic claims |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| `DeliveryKPIs` always received a snapshot derived from `assignmentsOp.data ?? []`, inventing LIVE zeros on API failure | Pass `snapshot={assignmentsOp.data != null ? kpiSnapshot : null}`; unavailable grid when null |
| Hardcoded active deliveries / mock rider queue | **Not found** |

### Delivery verdict

**PASS after KPI honesty fix.**

---

## §6 Settings (`AdminSettings.tsx`)

### Data / honesty model

| Item | Detail |
| --- | --- |
| Page | `apps/website/client/src/pages/admin/AdminSettings.tsx` |
| Classification helper | `apps/website/client/src/lib/admin-settings.ts` — categories tagged LIVE / READ-ONLY / DERIVED / FOUNDATION / UNAVAILABLE |
| Persistence | **No write/save API** — Save bar is disabled Foundation; no `localStorage` settings persistence |
| Branch directory | **READ-ONLY** from `GET /api/v1/branches` via `useAdminBranch` |
| Seeded RBAC display | **READ-ONLY** seeded role/permission labels — “no invented roles” |
| Tax / payments / printers / loyalty / notifications / security | **FOUNDATION** or **UNAVAILABLE** — never invent rates or claim Connected from placeholders |
| Secrets | Never rendered (no `sk_live`, service-role keys, CVV) |
| Opening Operations / Governance / Dry-run panels | Embedded under Settings; use shared readiness honesty helpers that surface **WAITING_ON_HUMAN** until verified (payments, devices, SOPs, training, etc.) — not COMPLETE from package alone |
| Mianx configuration insights | **DERIVED** rule-based only — no autonomous config / LLM |

### Fake data check

| Check | Result |
| --- | --- |
| Hardcoded “Connected” payment status | **Not found** (static test forbids `status: "Connected"`) |
| Fake save / invented write handlers | **Not found** |
| Invented tax rates | **Not found** — explicit “never invent tax rates” |
| Mock secrets in UI | **Not found** |

### Settings verdict

**PASS.** Settings items honestly show **FOUNDATION**, **READ-ONLY**, **UNAVAILABLE**, or Opening-ops **WAITING_ON_HUMAN** — no mocked live configuration numbers or fake Connected states.

---

## §7 Fixes applied (Orders / Kitchen / Delivery pass)

1. `OrderKPIs.tsx` — UNAVAILABLE grid when snapshot missing (no `?? 0` LIVE).
2. `KitchenKPIs.tsx` — same pattern.
3. `DeliveryKPIs.tsx` — same pattern.
4. `AdminKitchen.tsx` — only pass KPI snapshot when ticket payload exists.
5. `AdminDelivery.tsx` — only pass KPI snapshot when assignment payload exists.
6. Static tests updated for honesty wiring.
7. Settings — audit only this pass; **no code changes required**.

---

## §8 Out of scope (closed)

Remaining Admin ERP modules were audited in §§9–17. Phase 1 module-by-module honesty audit for Admin ERP is complete for the tracker set above.

---

## §9 POS (`AdminPos.tsx`)

### Data fetch / actions

| Item | Detail |
| --- | --- |
| Catalog | `useMenuCatalog` — LIVE Supabase or PARTIAL static fallback |
| Quote | `quoteOrder` → live pricing API |
| Place | `createAdminPosOrder` → live POS order create |
| Tables / dining | Live when table-service APIs available; otherwise empty / gated |
| Cart | In-session React state only — operator-built, not a mock catalog of sales |

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| Product grid / cart lines | **LIVE** / session | Prices from catalog + quote |
| Order place success | **LIVE** | Real order id/number from API |
| Payment method chips | **FOUNDATION** intent | Labels cash/card terminal/bank/complimentary; no fake “payment success” toast from mock settle |
| Save draft / Print | **FOUNDATION** | Disabled actions |
| Mianx POS insights | **DERIVED** | Rule-based |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| Default `customerPhone` seeded to `03000000000` (fake walk-in contact) | Default phone cleared to `""`; place still requires real name/phone (≥7 digits) |

### Residual (not fake numbers; noted)

`PaymentPanel` documents settlement ledger path; POS place flow still records payment intent as Foundation label in order notes — not a mocked paid settlement.

### POS verdict

**PASS after phone default honesty fix.** No fake cart arrays or hardcoded checkout success.

---

## §10 CRM (`AdminCrm.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| Source | `listAdminOrders` (window ≤100) — **no dedicated CRM customers API** |
| Aggregation | `aggregateCustomersFromOrders` / `buildCrmKpis` |

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| Customer table | **DERIVED** | Unique phones from loaded orders |
| Customer KPIs | **DERIVED** when `live` | Window-limited |
| VIP / Blocked | **FOUNDATION** | Explicit `—` |
| Export / WhatsApp / Edit | **FOUNDATION** | Disabled |
| Insights | **DERIVED** | Rule-based |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| `CustomerKPIs` always received a non-null snapshot (`buildCrmKpis([])`), so loading/`?? 0` never showed UNAVAILABLE; failed loads could look like zero customers | Init `live=false`; pass `snapshot={live ? kpis : null}`; clear orders on error; UNAVAILABLE grid when null |

### CRM verdict

**PASS after KPI honesty fix.** Segments are order-derived, not hardcoded VIP lists.

---

## §11 Loyalty (`AdminLoyalty.tsx`)

### Data fetch

Same order window as CRM. Points/tiers have **no ledger API**.

### Classification

| Surface | Classification | Notes |
| --- | --- | --- |
| “Members” / repeat | **DERIVED** | Order phones / 2+ orders |
| Points issued/redeemed / liability | **UNAVAILABLE** | Explicit `—` |
| Reward catalogue / tiers | **FOUNDATION** | No sample pizza rewards / no assigned tiers |
| Customer “tier” column | **UNAVAILABLE** / order-derived labels | Static tests forbid Bronze/Silver/Gold points |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| Same always-non-null KPI snapshot / `?? 0` DERIVED zeros | Mirror CRM: `live` gate + UNAVAILABLE grid |

### Loyalty verdict

**PASS after KPI honesty fix.** No faked points balances.

---

## §12 Inventory (`AdminInventory.tsx`)

### Data / honesty model

| Surface | Classification | Notes |
| --- | --- | --- |
| Stock on hand / movements / waste / receive | **UNAVAILABLE** / **FOUNDATION** | Empty tables; disabled write actions |
| Menu browse / topping SKU counts | **DERIVED** | From `useMenuCatalog` only — not stock |
| Recipe mapping | **FOUNDATION** | No server consumption engine |
| Insights | **DERIVED** | Rule-based |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| `InventoryKPIs` used `snapshot?.menuBrowseSkus ?? 0` while catalog still loading | Pass `snapshot={isLoading ? null : snapshot}`; UNAVAILABLE grid when null |

### Inventory verdict

**PASS after loading honesty fix.** No mocked stock levels.

---

## §13 Purchasing (`AdminPurchasing.tsx`)

### Data / honesty model

Honesty-first Foundation workspace: `buildPurchasingKpis()` returns unavailable markers; PO/supplier tables show empty Foundation copy; no procurement list API; refresh is readiness-only.

### Purchasing verdict

**PASS.** No faked POs or suppliers.

---

## §14 Finance (`AdminFinance.tsx`)

### Data / honesty model

| Surface | Classification | Notes |
| --- | --- | --- |
| Accounting KPIs / GL / expenses / tax | **FOUNDATION** / **UNAVAILABLE** | `buildFinanceKpiSnapshot()` — no fake revenue books |
| Operational sales strip | **LIVE** when ops dashboard loads | `fetchAdminOperationsDashboard` → `SalesOverview` (order sales, not GL revenue) |
| Insights | **DERIVED** | Rule-based |

### Finance verdict

**PASS.** Revenue/expense books not hardcoded; ops sales labeled as operational, not accounting.

---

## §15 Reports (`AdminReports.tsx`)

### Data fetch

| Item | Detail |
| --- | --- |
| Hook | `useOperationalData` → `fetchAdminOperationsDashboard` |
| Charts | `ReportCharts` / sections use dashboard `recentOrders` / status counts only when `data` present |
| Trends / export / inventory+finance report panels | **FOUNDATION** — no fabricated series |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| `ExecutiveKPIs` rendered `data?.kpis.todayOrders ?? 0` (and kitchen/delivery) as LIVE/DERIVED after failed load | UNAVAILABLE grid when `!data`; page passes `customerSnapshot={data != null ? customerSnapshot : null}` |

### Reports verdict

**PASS after Executive KPI honesty fix.**

---

## §16 HR (`AdminHr.tsx`)

### Data / honesty model

| Surface | Classification | Notes |
| --- | --- | --- |
| Employee directory / attendance / payroll / leave | **FOUNDATION** / **UNAVAILABLE** | Explicit empty / no simulation |
| Roles panel | **READ-ONLY** seeded | `SEEDED_ROLES` / `SEEDED_PERMISSIONS` |
| Staff assignments panel (Opening) | **LIVE** when API succeeds | `listStaffAssignments` |

### Fake / honesty issue found and fixed

| Finding | Fix |
| --- | --- |
| On assignment fetch failure `rows=null` was treated as empty (`length ?? 0`), inventing “No real operating staff assigned” and zero coverage counts | Distinguish `loadFailed` vs empty; show UNAVAILABLE copy and `—` summary counts |

### HR verdict

**PASS after assignment-load honesty fix.**

---

## §17 AI Team (`AdminAiTeam.tsx`)

### Data / honesty model

| Surface | Classification | Notes |
| --- | --- | --- |
| Agent cards | **DERIVED** | `buildMianxAgentCards` in `mianx-team.ts` — deterministic, rule-based status from ops/opening/health signals |
| Live inputs | **LIVE** when enabled | Ops dashboard, kitchen tickets, deliveries, opening readiness, system health, reservations/waitlist when permitted |
| Status badges | COMPLETE / ACTIVE / BLOCKED / WAITING_ON_HUMAN / FOUNDATION / UNAVAILABLE / OFFLINE / ERROR | Explicit honesty vocabulary — not LLM “insights” |

Mild residual: optional nullish coalescing to `0` inside agent copy for missing opening blockers — cosmetic string only when signal object partially present; agent status itself remains non-random.

### AI Team verdict

**PASS.** Deterministic agents; no mocked agent fleet metrics.

---

## §18 Fixes applied (remaining-modules pass)

1. `ExecutiveKPIs.tsx` + `AdminReports.tsx` — no LIVE/DERIVED zeros without dashboard payload.
2. `CustomerKPIs.tsx` + `AdminCrm.tsx` — KPI snapshot only when order window `live`.
3. `LoyaltyKPIs.tsx` + `AdminLoyalty.tsx` — same.
4. `InventoryKPIs.tsx` + `AdminInventory.tsx` — null snapshot while catalog loading.
5. `StaffAssignmentsPanel.tsx` — failed load ≠ empty roster.
6. `AdminPos.tsx` — remove fake default phone `03000000000`.
7. Static tests updated: reports, CRM, loyalty, inventory, HR, POS.

---

## §19 Stop line

Phase 1 Admin ERP module-by-module honesty audit is complete for the tracker. No further modules in this task.
