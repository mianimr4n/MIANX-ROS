# Telepizza Master Roadmap — Locked Order

**Status:** ✅ **LOCKED** as master sequence (owner-approved 2026-07-16)
**Date:** 2026-07-16
**Catalog freeze:** v1.2.0 (13 / 58 / 3 / 40 / 7 · 2 branches)
**Canonical architecture:** O1–O12 FROZEN · Authz via `AuthPrincipal`
**Related:** `PROJECT-MILESTONE-AND-ROADMAP.md` · `SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md`

This document is the **single master sequence**. No app, ERP module, payment, inventory, finance, mobile app, AI agent, final number, or go-live step is skipped. Implementation of a later phase must not begin until the prior phase is **PASS AND CLOSED**.

---

## No-miss gate (every phase)

```text
Plan
→ Implement
→ Tests
→ PR Review
→ Merge
→ Migration/Deploy
→ Production Smoke
→ Close Report
```

Next phase starts **only** when previous phase is **PASS AND CLOSED**.

---

## Number classes (locked)

| Class | Use | Rule |
|---|---|---|
| **1. Verified business contact** | Current website / WhatsApp fallback | **`0304-1110495`** — use now; **re-verify at Phase 15 go-live** |
| **2. Test numbers** | Staging / smoke only | Never publish as production contact |
| **3. Final production numbers** | Orders · Support · OTP/WABA · Rider · Branch | **Owner sign-off at Phase 15 only** |

Do **not** treat current Multan pilot numbers as permanently locked forever. Final production phones, WABA senders, domains, payment accounts, and secrets are frozen in **Phase 15**.

---

## Phase 0 — Foundation and Governance

| Work | Status |
|---|---|
| Business freeze · Branding · Menu verification · Master data | ✅ Complete |
| Architecture docs · Release/versioning · Change-control | ✅ Complete |

---

## Phase 1 — Public Website and Catalog

| Work | Status |
|---|---|
| Website · Live Supabase menu · Cart · Pizza customizer · Branches | ✅ Complete |
| WhatsApp fallback · Production deployment | ✅ Complete |
| Catalog freeze v1.2.0 | ✅ Complete |

---

## Phase 2 — Authentication and Authorization

| Work | Status |
|---|---|
| Customer auth · Session · `/auth/me` · `AuthPrincipal` | ✅ Complete |
| Roles/permissions · Branch scope · Suspended-user blocking | ✅ Complete |
| Staff invites · Staff activation · Security tests | ✅ Complete |

---

## Phase 3 — Customer Phone / WhatsApp OTP

| Work | Status |
|---|---|
| Architecture (WhatsApp-first OTP · SMS · email fallback) | ✅ Architecture complete |
| Dedicated OTP WhatsApp number · Meta/WABA · Twilio Verify | 🟡 Provider setup pending |
| Phone-first login/register · `/staff/login` split | 🔒 Eng paused until 2C.0 READY |

**Hard rule:** Ordering number **0304-1110495** is **never** used for OTP (D11).

---

## Phase 4 — Orders Core

| Work | Status |
|---|---|
| Order schema · Idempotency · Server pricing · Quote engine | ✅ Complete (Sprint 4.1–4.2) |
| Website checkout · Guest/auth order · Tracking · Receipt | ✅ Complete (Sprint 4.3) |
| Guest read/cancel (O5) | ✅ Complete (Sprint 4.3 Phase B) |

**Close reports:** `SPRINT-04-1-PRODUCTION-CLOSE.md` · `SPRINT-04-3-PRODUCTION-CLOSE.md` · `SPRINT-04-3B-PRODUCTION-CLOSE.md`

---

## Phase 5 — Order Lifecycle

| Work | Status |
|---|---|
| Architecture freeze (branch / kitchen / rider / cancel / audit / RLS) | ✅ FROZEN — Sprint 4.4 (elevated to ADR-018 in v2.0.0) |
| Branch confirm/reject · Kitchen preparing/ready | ✅ Complete (Sprint 4.5 — PR #53) |
| Rider assignment · Dispatch · Delivered | ✅ Complete (Sprint 4.6 — PR #85) |
| Cancellation matrix · Order history/audit · Notifications | ✅ Complete (audit + domain_events mirror) |
| Branch/RLS enforcement (Slice 2D) | ✅ Complete — Production verified 63/63 PASS |

**Close report:** `docs/testing/acceptance-evidence/phase5-closeout/PHASE5_FINAL_GATE.md`
**Formal ADR:** `docs/13-adr/ADR-018-order-lifecycle-state-machine.md` (v2.0.0)

---

## Phase 6 — Admin and ERP Core

Admin dashboard · User/staff · Roles · Branches · Menu/price · Deals · Order control · Reports · Audit · Settings

**Status:** ✅ COMPLETE (v2.1.0) — Production-verified 95/95 PASS

**Close report:** `docs/testing/acceptance-evidence/phase6-closeout/PHASE6_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-019-rbac-authorization-principal.md` (v2.1.0) — RBAC permission model
- `docs/13-adr/ADR-020-canonical-single-price-menu-catalog.md` (v2.1.0) — menu catalog + atomic price audit
- `docs/13-adr/ADR-021-deals-coupons-loyalty-engine.md` (v2.1.0) — three-engine promotions surface
- `docs/13-adr/ADR-022-reports-analytics-framework.md` (v2.1.0) — query-time KPI registry

**Work items:**
- ✅ Admin dashboard (Owner Workspace, Operations, System Health, Opening Readiness)
- ✅ User/staff & Roles (RBAC, staff invites, staff assignments, HR lifecycle)
- ✅ Branches (ADR-001 — closed in v1.9.0)
- ✅ Menu/price (canonical single-price catalog, atomic price audit RPC, modifier system)
- ✅ Deals (menu-level deal SKUs + coupons + loyalty rewards)
- ✅ Order control (ADR-018 — closed in v2.0.0)
- ✅ Reports (query-time KPI registry, exception center, deferred scheduled reports)
- ✅ Audit (ADR-012 — closed in v1.9.0)
- ✅ Settings (ADR-001 / ADR-002 — closed in v1.9.0)

---

## Phase 7 — POS System

Dine-in/takeaway/delivery · Cashier · Payments · Receipts · Shifts · Cash reconciliation · Branch sync · Offline-safe

**Status:** ✅ COMPLETE (v2.2.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase7-closeout/PHASE7_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md` (v2.2.0) — POS cashier workflow + order source contract
- `docs/13-adr/ADR-024-dine-in-bill-settlement.md` (v2.2.0) — dine-in bill settlement + multi-tender payments
- `docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md` (v2.2.0) — POS shifts + Z-Report + cash reconciliation
- `docs/13-adr/ADR-026-branch-sync-offline-safe-pos-contract.md` (v2.2.0) — branch sync + offline-safe contract

**Work items:**
- ✅ Dine-in / takeaway / delivery order placement (3 order types via `orders.order_type`)
- ✅ Cashier workflow (`POST /api/v1/admin/pos/orders` with cash-only payment contract)
- ✅ Payments (4 methods: cash, card_terminal, bank_manual, complimentary — no online gateway)
- 🟡 Receipts (UI preview only — ReceiptPreview.tsx, 70 lines; format spec + fiscal printer deferred)
- ✅ POS shifts + Z-Report (`pos_z_report_events` append-only audit)
- ✅ Cash reconciliation (`cash_reconciliations` state machine with server-side variance)
- ✅ Branch sync (centralized DB + RLS — `branch_id` scoping on all POS tables)
- 🟡 Offline-safe (Idempotency-Key + retry; NO offline PWA / local persistence)

**Deferred to future ADRs:** online card gateway, offline PWA, real-time subscriptions, `pos_sessions` table, multi-timezone, refunds lifecycle. Each has an explicit trigger condition in ADR-023 §8 / ADR-024 §6 / ADR-025 §5 / ADR-026 §5.

---

## Phase 8 — Kitchen Dashboard

Kitchen queue · KOT · Preparing/ready · Timers · Item status · Priority · Branch isolation

**Status:** ✅ COMPLETE (v2.3.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase8-closeout/PHASE8_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md` (v2.3.0) — kitchen ticket lifecycle + queue contract (one ticket per order, 6-state machine, ORDER_STATUS_MIRROR, polling-not-realtime)
- `docs/13-adr/ADR-028-kot-snapshot-per-item-status.md` (v2.3.0) — KOT snapshot model + atomic stock consume via `kitchen_ticket_set_preparing_atomic` RPC
- `docs/13-adr/ADR-029-kitchen-timers-priority-display-contract.md` (v2.3.0) — kitchen timers, priority, display contract (PREP_WARN=20m / PREP_TARGET=15m client constants)

**Work items:**
- ✅ Kitchen queue (4-column board on KDS, 8s polling, branch-scoped `GET /api/v1/kitchen/tickets`)
- 🟡 KOT (data model complete — `kitchen_ticket_items` with frozen snapshots; print format + sequence_number + fiscal printer DEFERRED)
- ✅ Preparing/ready (6-state machine: queued→accepted→preparing→ready→completed|cancelled; `ORDER_STATUS_MIRROR` maps preparing/ready/cancelled onto `orders.status`)
- 🟡 Timers (client-side elapsed from `startedAt→acceptedAt→createdAt` fallback chain; PREP_WARN=20m / PREP_TARGET=15m display constants; server-side SLA tracking + late-alert events DEFERRED)
- 🟡 Item status (`is_completed` boolean column EXISTS on `kitchen_ticket_items`; mutation API + UI prep ticks DEFERRED)
- 🟡 Priority (`priority` integer column EXISTS with default 0; mutation endpoint + channel-based auto-priority DEFERRED)
- ✅ Branch isolation (RLS enabled on `kitchen_tickets` + `kitchen_ticket_items`; `current_user_can_access_kitchen_tickets` helper denies rider/cashier/customer; `enforce_kitchen_ticket_branch_match` trigger; backend `assertKitchenActor` + `assertBranchInScope` defense in depth)

**Deferred to future ADRs:** per-item prep ticks, KOT print format + fiscal printer, server-side SLA + late-alert events, priority mutation endpoint + auto-priority, `kitchen_stations` table + station routing, realtime updates (Supabase Realtime channels), audible alarms / bump-bar / recall, AI-driven kitchen prediction. Each has an explicit trigger condition in ADR-027 §8 / ADR-028 §4-5 / ADR-029 §2-4,7-8.

---

## Phase 9 — Rider and Delivery App

Rider login · Assignment · Pickup · Navigation · Out-for-delivery · POD · Failed delivery · Performance

**Status:** ✅ COMPLETE (v2.4.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7/8 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase9-closeout/PHASE9_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md` (v2.4.0) — rider identity (1:1 user_id + 1:1 branch_id) + manual dispatch contract (8 invariants, idempotent assignment, auto-dispatch DEFERRED)
- `docs/13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md` (v2.4.0) — delivery lifecycle + pickup + POD surface (6-state machine elevation, order mirror via mirrorOrderStatus + compensating rollback, picked-up IS out-for-delivery, POD-mandatory-for-delivered enforcement chain, failed-delivery capture + redelivery DEFERRED)
- `docs/13-adr/ADR-032-rider-location-navigation-performance-contract.md` (v2.4.0) — rider location (ADR-008 elevation) + navigation + partial performance surface (GPS ingest endpoint, 24h TTL purge, aggregate KPIs, per-rider KPIs + rider_daily_summaries + rider mobile app + customer live map DEFERRED to Phase 12)

**Work items:**
- ✅ Rider login (`rider` role + `/staff/login` + ADR-019 RBAC; `isRiderOnly` scope check; no dedicated `/api/v1/rider/*` surface — uses `/api/v1/riders/*`)
- ✅ Assignment (`POST /api/v1/riders/deliveries/:id/assign` with `delivery.assign`; 8 invariants enforced; manual only)
- ✅ Pickup (`POST /api/v1/riders/deliveries/:id/status` body `{status:'picked-up'}`; mirrors `orders.status='dispatched'`)
- 🟡 Navigation (rider_locations table + ingest endpoint exist; NO map UI in AdminDelivery — `DeliveryMapFoundation` placeholder only; NO turn-by-turn; customer TrackOrder.tsx has NO live map — DEFERRED to Phase 12)
- ✅ Out-for-delivery (`picked-up` IS the "out for delivery" state — ADR-018 §4 explicitly rejected separate `out_for_delivery` status)
- ✅ POD (ADR-009 fully implemented; mandatory for `delivered` via trigger + service + UI; `POST /api/v1/admin/delivery-pod` captures; immutability after delivered)
- 🟡 Failed delivery (`failed` terminal state in state machine; NO dedicated failed-delivery capture endpoint; riders cannot trigger `failed` from API — must escalate to BM/SA; NO `failure_reason`/`failure_category`/`return_to_branch` fields — DEFERRED)
- 🟡 Performance (aggregate KPIs in DeliveryKPIs + DeliveryInsights + DeliveryPerformance; NO per-rider KPI dashboard; NO `rider_daily_summaries` table — DEFERRED to Phase 12)

**Deferred to future ADRs:** auto-dispatch engine (rider scoring by proximity/load, auto-assign on confirmed), rider self-assign queue, rider shift scheduling integration, rider capacity cap, multi-branch riders, rider vehicle + license tracking, failed-delivery capture (`delivery_failures` table + rider-triggered endpoint), redelivery flow (`original_delivery_id` FK), customer-facing POD view (`/api/v1/orders/:id/pod`), live rider map (Supabase Realtime channels + customer RLS), single-transaction delivery+order mirror, delivery SLA tracking, `rider_daily_summaries` table, per-rider KPI dashboard, rider mobile app (turn-by-turn, in-app call, offline-tolerant), customer-facing live map, audible alarms + push notifications, TTL job failsafe, reverse geocoding at read-time. Each has an explicit trigger condition in ADR-030 §6 / ADR-031 §6-10 / ADR-032 §8-12.

---

## Phase 10 — Inventory and Procurement

Ingredients · Recipe/BOM · Stock · Branch inventory · POs · Suppliers · Wastage · Transfers · Alerts · Costing

**Status:** ✅ COMPLETE (v2.5.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7/8/9 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase10-closeout/PHASE10_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-033-inventory-stock-master-movement-ledger-contract.md` (v2.5.0) — inventory stock master + movement ledger + atomic adjustment (8 movement types, adjust_inventory_stock_atomic RPC, low-stock alerts + dedicated transfers + batch tracking DEFERRED)
- `docs/13-adr/ADR-034-recipe-bom-cogs-costing-contract.md` (v2.5.0) — versioned recipes + BOM + COGS (one-active-per-menu_item UNIQUE, idempotent + reversible consumption events, last_known cost_source, modifier-effect consume + COGS GL posting DEFERRED)
- `docs/13-adr/ADR-035-procurement-suppliers-grn-contract.md` (v2.5.0) — suppliers + PO + GRN + invoices + payments + supplier portal (8-state PO machine, 3-state GRN machine, 3-way match foundation, 20-route supplier portal, automated 3-way match + multi-branch consolidation DEFERRED)

**Work items:**
- ✅ Ingredients / Stock master (`inventory_items` branch-scoped, 3-state status, current_stock/minimum_stock/reorder_level, cost_price)
- ✅ Recipe/BOM (`inventory_recipes` versioned, one-active-per-menu_item, `inventory_recipe_lines` with waste_factor, `inventory_recipe_modifier_effects` documented)
- ✅ Stock movements (immutable ledger, 8 movement types: receipt/adjustment/transfer_in/transfer_out/waste/sale_consumption/purchase/sale)
- ✅ Branch inventory (RLS via `current_user_has_branch_access`, super-admin bypass)
- ✅ POs (`purchase_orders` 8-state machine, approval gate, UNIQUE `(branch_id, po_number)`)
- ✅ Suppliers (`suppliers` branch-scoped, status + approval_status split, supplier portal users)
- ✅ Wastage (`waste` movement type via `adjust_inventory_stock_atomic` RPC)
- 🟡 Transfers (`transfer_in` / `transfer_out` movement types EXIST in CHECK constraint; dedicated `inventory_transfers` table + transfer endpoint DEFERRED — currently requires two manual adjustments)
- 🟡 Alerts (`minimum_stock` + `reorder_level` columns EXIST; automated low-stock alert notification DEFERRED)
- ✅ Costing (`inventory_cogs_events` with `last_known` cost_source; `weighted_average`/`fifo` DEFERRED to Phase 11)

**Deferred to future ADRs:** low-stock alerts, dedicated `inventory_transfers` table, batch/lot tracking, cost history, DB-level immutability trigger on stock_movements, units master table, multi-warehouse, `sale` movement wiring, stock count workflow, modifier-effect consumption, COGS GL posting, weighted-average/FIFO costing, recipe versioning rollback, soft-fail mode, recipe yield factor enforcement, recipe import/export, automated 3-way match, DB-level PO state-machine trigger, negative-quantity GRN lines, multi-branch PO consolidation, supplier SSO, supplier-side invoice submission, procurement-to-GL automation, supplier performance scoring, multi-level approval workflow, RFQ flow, supplier-side PO acknowledgment SLA, contract management, inventory reservation. Each has an explicit trigger condition in ADR-033 §8 / ADR-034 §10 / ADR-035 §9.

---

## Phase 11 — Finance and Reporting

Revenue · Expenses · Payments · Cash · Branch P&L · Taxes · Discounts · Refunds · Reconciliation · Reports

**Status:** ✅ COMPLETE (v2.6.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7/8/9/10 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase11-closeout/PHASE11_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md` (v2.6.0) — branch GL + CoA + journal_entries (3-state) + balanced journal_entry_lines + create/reverse_journal_entry_atomic SECURITY DEFINER RPCs + finance_trial_balance / profit_loss / balance_sheet / cash_flow_indirect financial-statement RPCs + finance_periods 3-state period control + finance_account_mappings (20 purposes) + finance_exceptions queue + finance_postings idempotency UNIQUE + ADR-011 immutability triggers on journal_entries + journal_entry_lines (per-branch pricing + automated GL posting from kitchen/PO/invoice + multi-currency consolidation DEFERRED)
- `docs/13-adr/ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md` (v2.6.0) — Z-report append-only audit + cash_reconciliations 6-state with server-side compute_cash_reconciliation_totals IMMUTABLE RPC + COD 4-state reconciliation with ADR-010 post_cod_collection_journal trigger (idempotent via finance_postings) + payments 8-state 4-method + bill_splits 4 strategies + reservation_deposits 7-state + branch_payment_methods config + settle_bill_payment_atomic / close_dining_session_atomic SECURITY DEFINER RPCs (pos_sessions + online card gateway + multi-tender payment_splits + bank deposit slip + multi-timezone DEFERRED)
- `docs/13-adr/ADR-038-tax-ar-ap-cogs-expense-posting-contract.md` (v2.6.0) — tax_definitions (configurable rates, exclusive/inclusive basis, input/output classification) + AR surface (customer_invoices 7-state + customer_receipts + customer_receipt_allocations + customer_credit_notes 3-state) + AP surface (supplier_invoices 3-way match + supplier_payments + record_supplier_payment_atomic 8-arg + 7-arg overloads) + expense_claims 6-state + inventory_cogs_events (4-state cost_source, 4-state status) + inventory_consumption_events (idempotent + reversible) + controlled GL posting services (postSalesFromOrder / postSupplierInvoice / postCogsEvent / postPayrollAccrual / postPayrollSettlement) gated on mapping-required + period-gated + exception-recording (seeded jurisdiction rates + automated COGS GL posting + weighted-average/FIFO costing + inventory_cost_history + dedicated refunds table + partial-refund API + discounts master table DEFERRED)

**Work items:**
- ✅ Revenue (`orders.subtotal/discount_amount/tax_amount/delivery_fee/total_amount`, `customer_invoices` 7-state AR, `customer_receipts` + allocations, `postSalesFromOrder` controlled GL post service, `/finance/sales/post-from-order/:orderId` route, `finance_profit_loss` RPC, `sales.gross/net/aov` analytics metrics)
- ✅ Expenses (`expense_claims` 6-state + `expense_claim_events` audit, `tryPostExpenseJournal` + `postSupplierInvoice` controlled GL post services, `/finance/expenses/*` routes, `ExpensePanel` in FinancePanels.tsx)
- ✅ Payments (`payments` 8-state status, 4 payment methods, cash_tendered/change, idempotency_key UNIQUE, `settle_bill_payment_atomic` SECURITY DEFINER RPC, `bill_splits` 4 strategies, `reservation_deposits` 7-state, `branch_payment_methods` config, 9 routes in `modules/admin/payments.ts`, `PaymentSettlementService` 357 lines)
- ✅ Cash (`pos_z_report_events` append-only Asia/Karachi audit, `cash_reconciliations` 6-state with `compute_cash_reconciliation_totals` IMMUTABLE RPC, `finance_cash_accounts` cash/bank, `finance_cash_register_entries`, `PosZReportService` 175 lines, `tryPostCashVarianceJournal` controlled GL post)
- ✅ Branch P&L (`finance_profit_loss` + `finance_balance_sheet` + `finance_cash_flow_indirect` RPCs, all branch-scoped + RLS, `finance_periods` 3-state + `finance_assert_period_allows_posting` SECURITY DEFINER gate, `StatementsPanel` in LedgerPanel.tsx, analytics registry has 8 finance metrics incl. `finance.profit`, `finance.margin`)
- ✅ Taxes (`tax_definitions` with rate 0-1, tax_basis exclusive/inclusive, classification input/output, effective_from/to, payable/receivable account FKs, `tax-calc.ts` pure helpers half-up rounding, line/invoice tax calculation, `/finance/tax-definitions` GET+PUT routes, `orders.tax_amount` column, `output_tax` mapping purpose)
- 🟡 Discounts (`orders.discount_amount` column exists, `sales_discounts` mapping purpose, `sales.discounts` analytics metric, coupon system ADR-021 + loyalty rewards EXIST; NO `discounts` master table for non-coupon discounts (staff-discretionary/happy-hour/bulk); NO `discount_reason` audit; NO multi-line discount allocation on `order_items` — DEFERRED per ADR-018/021)
- 🟡 Refunds (`payments.refunded_at` + `voided_at` + `partially_refunded`/`refunded` status EXIST, `customer_credit_notes` 3-state EXIST, `refunds` mapping purpose, `cash_reconciliations.cash_refunds` column, `sales.refunds` analytics metric, `voidPayment` service; NO dedicated `refunds` table for operational refund tracking; NO `/api/v1/admin/refunds` route; NO refund lifecycle service (`voidPayment` sets `voided_at` not `refunded_at`); NO partial-refund API (only full void) — DEFERRED per ADR-018/024/026)
- ✅ Reconciliation (`cash_reconciliations` 6-state with server-side variance + GL posting link, `cod_collections` 4-state with auto-GL posting trigger, `finance_cash_register_entries.reconciliation_status`, `finance_postings` UNIQUE per source_module+source_id idempotency, `reverse_journal_entry_atomic` RPC, ADR-010 trigger fires on COD reconcile, ADR-011 immutability guards posted journals, `FinanceAttentionSnapshot` exposes reconciliation queues)
- ✅ Reports (12 routes in `modules/admin/reports.ts` — sales, orders/export, analytics workspace/modules/drilldown/export/scheduled/exceptions/data-quality; 25-module analytics registry incl. finance, sales, executive, branch_comparison; CSV/Excel/PDF export; `getOwnerWorkspace` aggregates 25 modules; scheduled reports execution_status='deferred' by design — analytics worker not deployed; AdminReports.tsx 149 lines + 12 supporting components 1114 lines; ADR-022 formally accepted)

**Deferred to future ADRs:** per-branch pricing, automated GL posting from kitchen/PO/invoice/sales order, multi-currency consolidation, inter-branch transfers, fiscal-year close automation, bank reconciliation, fixed-asset depreciation, `pos_sessions` table, online card gateway, multi-tender `payment_splits` table, bank deposit slip generation, multi-timezone, seeded jurisdiction tax rates, weighted-average/FIFO costing methods, `inventory_cost_history` table, `sale` movement type wiring for finished-goods, automated procurement-to-GL automation, automated 3-way match (DB-level trigger), supplier-side invoice submission, partial-cancel of order line items, dedicated `refunds` table, partial-refund API, discounts master table for non-coupon discounts, finance domain event mirror triggers. Each has an explicit trigger condition in ADR-018 §"Negative consequences" / ADR-020 / ADR-021 / ADR-023-026 / ADR-036 / ADR-037 / ADR-038.

---

## Phase 12 — Customer and Staff Apps

Customer mobile · Rider app · Staff app · Franchise portal · Support panel · Delivery dashboard

**Status:** ✅ COMPLETE (v2.7.0) — Production-verified (closeout-only, no new migrations; reuses Phase 5/6/7/8/9/10/11 baseline `20260821000000`)

**Close report:** `docs/testing/acceptance-evidence/phase12-closeout/PHASE12_FINAL_GATE.md`
**Formal ADRs:**
- `docs/13-adr/ADR-039-customer-mobile-franchise-portal-contract.md` (v2.7.0) — customer mobile + franchise portal contract (web-first PWA via `apps/website` + ADR-017 phone-first auth + ADR-021 loyalty wallet + ADR-022 owner workspace 25-module dashboard + `organization_owner` role + `AdminBranchManager.tsx` multi-branch view; NO native mobile app, NO service worker, NO push notifications, NO offline ordering, NO franchisee role, NO multi-tenant SaaS isolation — all DEFERRED with explicit trigger conditions)
- `docs/13-adr/ADR-040-rider-mobile-app-delivery-dashboard-contract.md` (v2.7.0) — rider mobile app + delivery dashboard contract (`AdminDelivery.tsx` + 8 sub-components + 10 admin routes + 4 rider-facing routes via `/api/v1/riders/*` + ADR-008/009/010 rider_locations/POD/COD surfaces + aggregate KPIs in DeliveryKPIs + DeliveryInsights; NO native rider app, NO turn-by-turn nav, NO in-app call masking, NO push notifications, NO offline-tolerant queue, NO live rider map, NO `rider_daily_summaries` table, NO per-rider KPI dashboard — all DEFERRED from Phase 9 ADR-032 §8-12 with explicit trigger conditions)
- `docs/13-adr/ADR-041-staff-app-support-panel-contract.md` (v2.7.0) — staff app + support panel contract (`AdminShell.tsx` + 37 admin pages + 5 ops pages + 32 admin router modules totaling 350+ routes + ADR-019 RBAC with `branch_manager`/`kitchen_manager`/`cashier`/`rider`/`support` roles + ADR-027/028/029 KDS + ADR-023/024/025/026 POS + `AdminCrm.tsx` 306 lines + `AdminWhatsApp.tsx` 11 routes as de facto support panel + ADR-012 audit log; NO mobile-optimized staff UI, NO PWA-installable admin, NO branch-manager mobile checklist, NO kitchen handheld view, NO customer 360 unified view, NO ticketing system, NO refund initiation workflow — all DEFERRED with explicit trigger conditions)

**Work items:**
- ✅ Customer mobile (`apps/website` React + Vite SPA, PWA manifest, ADR-017 phone-first auth, ADR-018 order lifecycle, ADR-021 loyalty wallet, `TrackOrder.tsx` 316 lines polling `GET /api/v1/orders/:id`, `MyTelepizza.tsx` 2,303 lines consolidating loyalty + history + favorites + addresses)
- 🟡 Rider app (rider role + `/staff/login` + 4 routes under `/api/v1/riders/*`; uses admin web on mobile browser; NO native mobile app, NO turn-by-turn nav, NO in-app call masking, NO push notifications, NO offline-tolerant queue — DEFERRED per ADR-040 §8.1-§8.6)
- 🟡 Staff app (`AdminShell.tsx` + 37 admin pages + 5 ops pages; desktop-first; NO mobile-optimized staff UI, NO PWA-installable admin, NO branch-manager mobile checklist, NO kitchen handheld view, NO offline-tolerant POS continuation — DEFERRED per ADR-041 §8.1-§8.5)
- 🟡 Franchise portal (`organization_owner` role + `getOwnerWorkspace` 25-module dashboard + `AdminBranchManager.tsx` 689 lines multi-branch view + `branch_comparison` analytics module; NO `franchisee` role, NO franchise agreement tracking, NO royalty computation, NO multi-tenant SaaS isolation — DEFERRED per ADR-039 §8.9-§8.12)
- 🟡 Support panel (`AdminCrm.tsx` 306 lines + `customers.ts` 8 routes + `AdminWhatsApp.tsx` + `whatsapp.ts` 11 routes as de facto support panel; `support` role seeded; NO customer 360 unified view, NO ticketing system, NO refund initiation workflow, NO auto-routing — DEFERRED per ADR-041 §8.13-§8.17)
- ✅ Delivery dashboard (`AdminDelivery.tsx` 550 lines + 8 sub-components totaling ~3,500 lines + 10 admin routes in `delivery-rider.ts` + aggregate KPIs in `DeliveryKPIs` + `DeliveryInsights`; `rider_locations` GPS ingest with 24h TTL purge per ADR-008; NO live rider map, NO per-rider KPIs, NO `rider_daily_summaries` table, NO customer-facing live map — DEFERRED per ADR-040 §8.9-§8.11)

**Deferred to future ADRs:** native mobile app (iOS/Android via React Native/Expo), service worker / offline cache, push notifications (Web Push + FCM + APNs), installable PWA banner, order tracking realtime (Supabase Realtime), offline ordering, one-tap reorder, birthday reward, tiered loyalty, franchisee role + onboarding, multi-tenant SaaS isolation, franchise agreement tracking, royalty computation, address autocomplete, reverse geocode, transactional SMS, email receipts, rider-specific mobile UI, turn-by-turn navigation, in-app call masking, rider offline-tolerant action queue, rider shift scheduling, auto-dispatch engine, per-rider KPIs + `rider_daily_summaries` table, live rider map (admin), customer-facing live map, reverse geocode at read-time, average distance computation, failed-delivery capture + redelivery, single-transaction delivery+order mirror, delivery SLA tracking, audible alarms + bump-bar + recall, mobile-optimized staff UI, PWA-installable admin, branch-manager mobile checklist, kitchen handheld view (per-item prep ticks), offline-tolerant POS continuation, KOT print format + sequence_number + fiscal printer, server-side SLA + late-alert events, priority mutation endpoint + auto-priority, `kitchen_stations` table + station routing, realtime kitchen updates, AI-driven kitchen prediction, customer 360 unified view, ticketing system, refund initiation workflow, auto-routing WhatsApp to support agent, sentiment analysis + auto-reply bot, support agent role refinement, multi-role staff UI switcher. Each has an explicit trigger condition in ADR-039 §8 / ADR-040 §8 / ADR-041 §8.

---

## Phase 13 — AI and Automation

Demand forecasting · Inventory prediction · Delivery optimization · Support AI · Marketing automation · Fraud signals · Mianx.ai agents · Operational AI teams

**Status:** Platform track continues in parallel; Telepizza product AI after core ops

---

## Phase 14 — Full Integration and QA

Website ↔ API ↔ DB · Admin ↔ POS ↔ Kitchen ↔ Rider · Inventory ↔ orders · Payments ↔ finance · Auth/RBAC/RLS · Perf · Security · Backup/restore · Failover · E2E · Owner/staff UAT

**Status:** Not started (gates go-live)

---

## Phase 15 — Final Production Launch

Only at this phase lock:

- Final production phone numbers (all classes)
- Final domains · Final WhatsApp/WABA sender
- Final branches · Final business hours
- Final payment accounts · Final email/SMS sender
- Final app-store details · Final production secrets
- Final data import · Final live smoke · Owner go-live sign-off

```text
PRODUCTION V1.0 = LIVE
```

---

## Current pointer

| Now | Next |
|---|---|
| Phase 12 **PASS AND CLOSED** (v2.7.0) | **Phase 13** — AI and Automation |
| Phase 3 eng paused | Ops continues Meta/Twilio in parallel |
| Phase 13 implementation | After Phase 12 close (UNLOCKED) |

---

**TELEPIZZA MASTER ROADMAP: LOCKED**
