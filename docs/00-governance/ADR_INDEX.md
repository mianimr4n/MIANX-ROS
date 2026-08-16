# Architecture Decision Register

**Status:** Active

---

## Purpose

This document indexes Architecture Decision Records (ADRs) and related governance policies for the Telepizza ROS repository.

ADRs document significant architectural decisions that affect the long-term direction of the platform.

Detailed ADR markdown files, when authored, live under [`docs/13-adr/`](../13-adr/). Until an ADR file exists there, treat the index entries below as governance policy pointers, not as claims that a standalone ADR artifact is present.

---

## ADR Lifecycle

Every Architecture Decision follows the same lifecycle.

```text
Proposal
    ↓
Review
    ↓
Approval
    ↓
Implementation
    ↓
Verification
    ↓
Active
```

---

## ADR Index

| ADR | Title | Status | Version | Artifact |
|-----|-------|--------|---------|----------|
| ADR-001 | Branch Configuration Inheritance & Overrides | Accepted | 1.0 | [`docs/13-adr/ADR-001-branch-configuration-inheritance.md`](../13-adr/ADR-001-branch-configuration-inheritance.md) — implemented in `v1.9.0` |
| ADR-002 | Settings Versioning, Activation & Rollback Model | Accepted | 1.0 | [`docs/13-adr/ADR-002-settings-versioning-rollback.md`](../13-adr/ADR-002-settings-versioning-rollback.md) — implemented in `v1.9.0` |
| ADR-003 | Provider-Secret Boundary Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-003-provider-secret-boundary.md`](../13-adr/ADR-003-provider-secret-boundary.md) — implemented in `v1.9.0` |
| ADR-004 | WhatsApp Conversation Ownership & Routing | Accepted | 1.0 | [`docs/13-adr/ADR-004-whatsapp-conversation-ownership.md`](../13-adr/ADR-004-whatsapp-conversation-ownership.md) — implemented in `v1.9.0` |
| ADR-005 | Canonical Customer Identity Strategy | Accepted | 1.0 | [`docs/13-adr/ADR-005-canonical-customer-identity.md`](../13-adr/ADR-005-canonical-customer-identity.md) — implemented in `v1.9.0` |
| ADR-006 | Customer Account Merge & Reversal Process | Accepted | 1.0 | [`docs/13-adr/ADR-006-customer-account-merge.md`](../13-adr/ADR-006-customer-account-merge.md) — implemented in `v1.9.0` |
| ADR-007 | Delivery State Machine & Transition Rules | Accepted | 1.0 | [`docs/13-adr/ADR-007-delivery-state-machine.md`](../13-adr/ADR-007-delivery-state-machine.md) — implemented in `v1.8.0` |
| ADR-008 | Rider Location Retention & Privacy Policy | Accepted | 1.0 | [`docs/13-adr/ADR-008-rider-location-retention.md`](../13-adr/ADR-008-rider-location-retention.md) — implemented in `v1.9.0` |
| ADR-009 | Proof of Delivery (POD) Data Format & Storage | Accepted | 1.0 | [`docs/13-adr/ADR-009-proof-of-delivery.md`](../13-adr/ADR-009-proof-of-delivery.md) — implemented in `v1.9.0` |
| ADR-010 | Cash on Delivery (COD) Financial Ownership | Accepted | 1.0 | [`docs/13-adr/ADR-010-cod-financial-ownership.md`](../13-adr/ADR-010-cod-financial-ownership.md) — implemented in `v1.9.0` |
| ADR-011 | Accounting Immutability & Double-Entry Reversals | Accepted | 1.0 | [`docs/13-adr/ADR-011-accounting-immutability.md`](../13-adr/ADR-011-accounting-immutability.md) — implemented in `v1.8.0` |
| ADR-012 | Domain Event & Shared Audit Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-012-domain-event-audit.md`](../13-adr/ADR-012-domain-event-audit.md) — implemented in `v1.9.0` |
| ADR-013 | AI Provider Boundary & Data Governance | Accepted | 1.0 | [`docs/13-adr/ADR-013-ai-provider-boundary.md`](../13-adr/ADR-013-ai-provider-boundary.md) — implemented in `v1.9.0` |
| ADR-014 | AI Human-Approval Gate Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-014-ai-approval-gate.md`](../13-adr/ADR-014-ai-approval-gate.md) — implemented in `v1.9.0` |
| ADR-015 | AI Prompt & Data Retention Policy | Accepted | 1.0 | [`docs/13-adr/ADR-015-ai-prompt-retention.md`](../13-adr/ADR-015-ai-prompt-retention.md) — implemented in `v1.9.0` |
| ADR-016 | OTP Verification Architecture | Accepted | 1.0 | [`docs/13-adr/ADR-016-otp-verification-architecture.md`](../13-adr/ADR-016-otp-verification-architecture.md) — implemented in `v1.10.0` (Phase 3) |
| ADR-017 | Phone-First Auth & Session Handoff | Accepted | 1.0 | [`docs/13-adr/ADR-017-phone-first-auth-session-handoff.md`](../13-adr/ADR-017-phone-first-auth-session-handoff.md) — implemented in `v1.10.0` (Phase 3) |
| ADR-018 | Order Lifecycle State Machine & Staff Transition API | Accepted | 1.0 | [`docs/13-adr/ADR-018-order-lifecycle-state-machine.md`](../13-adr/ADR-018-order-lifecycle-state-machine.md) — implemented in `v2.0.0` (Phase 5 closeout) |
| ADR-019 | RBAC Authorization Principal & Permission Model | Accepted | 1.0 | [`docs/13-adr/ADR-019-rbac-authorization-principal.md`](../13-adr/ADR-019-rbac-authorization-principal.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-020 | Canonical Single-Price Menu Catalog & Atomic Price Audit | Accepted | 1.0 | [`docs/13-adr/ADR-020-canonical-single-price-menu-catalog.md`](../13-adr/ADR-020-canonical-single-price-menu-catalog.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-021 | Deals, Coupons & Loyalty Promotion Engine | Accepted | 1.0 | [`docs/13-adr/ADR-021-deals-coupons-loyalty-engine.md`](../13-adr/ADR-021-deals-coupons-loyalty-engine.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-022 | Reports & Analytics Framework — Query-Time KPI Registry | Accepted | 1.0 | [`docs/13-adr/ADR-022-reports-analytics-framework.md`](../13-adr/ADR-022-reports-analytics-framework.md) — implemented in `v2.1.0` (Phase 6 closeout) |
| ADR-023 | POS Cashier Workflow & Order Source Contract | Accepted | 1.0 | [`docs/13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md`](../13-adr/ADR-023-pos-cashier-workflow-order-source-contract.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-024 | Dine-in Bill Settlement & Multi-tender Payments | Accepted | 1.0 | [`docs/13-adr/ADR-024-dine-in-bill-settlement.md`](../13-adr/ADR-024-dine-in-bill-settlement.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-025 | POS Shifts, Z-Report & Cash Reconciliation | Accepted | 1.0 | [`docs/13-adr/ADR-025-pos-shifts-zreport-cash-recon.md`](../13-adr/ADR-025-pos-shifts-zreport-cash-recon.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-026 | Branch Sync & Offline-Safe POS Contract | Accepted | 1.0 | [`docs/13-adr/ADR-026-branch-sync-offline-safe-pos-contract.md`](../13-adr/ADR-026-branch-sync-offline-safe-pos-contract.md) — implemented in `v2.2.0` (Phase 7 closeout) |
| ADR-027 | Kitchen Ticket Lifecycle & Queue Contract | Accepted | 1.0 | [`docs/13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md`](../13-adr/ADR-027-kitchen-ticket-lifecycle-queue-contract.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-028 | Kitchen Order Ticket (KOT) Snapshot & Per-Item Status Model | Accepted | 1.0 | [`docs/13-adr/ADR-028-kot-snapshot-per-item-status.md`](../13-adr/ADR-028-kot-snapshot-per-item-status.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-029 | Kitchen Timers, Priority & Display Contract | Accepted | 1.0 | [`docs/13-adr/ADR-029-kitchen-timers-priority-display-contract.md`](../13-adr/ADR-029-kitchen-timers-priority-display-contract.md) — implemented in `v2.3.0` (Phase 8 closeout) |
| ADR-030 | Rider Identity, Dispatch & Assignment Contract | Accepted | 1.0 | [`docs/13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md`](../13-adr/ADR-030-rider-identity-dispatch-assignment-contract.md) — implemented in `v2.4.0` (Phase 9 closeout) |
| ADR-031 | Delivery Lifecycle, Pickup & POD Surface | Accepted | 1.0 | [`docs/13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md`](../13-adr/ADR-031-delivery-lifecycle-pickup-pod-surface.md) — implemented in `v2.4.0` (Phase 9 closeout) |
| ADR-032 | Rider Location, Navigation & Performance Contract | Accepted | 1.0 | [`docs/13-adr/ADR-032-rider-location-navigation-performance-contract.md`](../13-adr/ADR-032-rider-location-navigation-performance-contract.md) — implemented in `v2.4.0` (Phase 9 closeout) |
| ADR-033 | Inventory Stock Master, Movement Ledger & Atomic Adjustment Contract | Accepted | 1.0 | [`docs/13-adr/ADR-033-inventory-stock-master-movement-ledger-contract.md`](../13-adr/ADR-033-inventory-stock-master-movement-ledger-contract.md) — implemented in `v2.5.0` (Phase 10 closeout) |
| ADR-034 | Recipe/BOM & COGS Costing Contract | Accepted | 1.0 | [`docs/13-adr/ADR-034-recipe-bom-cogs-costing-contract.md`](../13-adr/ADR-034-recipe-bom-cogs-costing-contract.md) — implemented in `v2.5.0` (Phase 10 closeout) |
| ADR-035 | Procurement, Suppliers & GRN Contract | Accepted | 1.0 | [`docs/13-adr/ADR-035-procurement-suppliers-grn-contract.md`](../13-adr/ADR-035-procurement-suppliers-grn-contract.md) — implemented in `v2.5.0` (Phase 10 closeout) |
| ADR-036 | Branch GL, P&L, Balance Sheet & Cash Flow Contract | Accepted | 1.0 | [`docs/13-adr/ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md`](../13-adr/ADR-036-branch-gl-pnl-balance-sheet-cash-flow-contract.md) — implemented in `v2.6.0` (Phase 11 closeout) |
| ADR-037 | Cash Reconciliation, Z-Report & COD Financial Ownership Contract | Accepted | 1.0 | [`docs/13-adr/ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md`](../13-adr/ADR-037-cash-reconciliation-zreport-cod-financial-ownership-contract.md) — implemented in `v2.6.0` (Phase 11 closeout) |
| ADR-038 | Tax, AR, AP, COGS & Expense Posting Contract | Accepted | 1.0 | [`docs/13-adr/ADR-038-tax-ar-ap-cogs-expense-posting-contract.md`](../13-adr/ADR-038-tax-ar-ap-cogs-expense-posting-contract.md) — implemented in `v2.6.0` (Phase 11 closeout) |
| ADR-039 | Customer Mobile & Franchise Portal Contract | Accepted | 1.0 | [`docs/13-adr/ADR-039-customer-mobile-franchise-portal-contract.md`](../13-adr/ADR-039-customer-mobile-franchise-portal-contract.md) — implemented in `v2.7.0` (Phase 12 closeout) |
| ADR-040 | Rider Mobile App & Delivery Dashboard Contract | Accepted | 1.0 | [`docs/13-adr/ADR-040-rider-mobile-app-delivery-dashboard-contract.md`](../13-adr/ADR-040-rider-mobile-app-delivery-dashboard-contract.md) — implemented in `v2.7.0` (Phase 12 closeout) |
| ADR-041 | Staff App & Support Panel Contract | Accepted | 1.0 | [`docs/13-adr/ADR-041-staff-app-support-panel-contract.md`](../13-adr/ADR-041-staff-app-support-panel-contract.md) — implemented in `v2.7.0` (Phase 12 closeout) |

> **Note:** All Phase 2 ADRs (ADR-001 through ADR-015) now have standalone
> ADR files authored under `docs/13-adr/` and are marked Accepted.
> Phase 3 ADRs (ADR-016, ADR-017) cover customer phone / WhatsApp OTP
> authentication and session handoff.
> ADR-018 formally accepts the Sprint 4.4 frozen Order Lifecycle
> architecture as the canonical Phase 5 decision and records the as-built
> implementation against the as-designed matrix.
> ADR-019 through ADR-022 formally accept the Sprint 3 / RC3 / RC4-11
> as-built Admin & ERP Core architecture as the canonical Phase 6
> decision: RBAC permission model, single-price menu catalog, three-engine
> promotions surface (coupons + campaigns + loyalty), and query-time
> analytics registry.
> ADR-023 through ADR-026 formally accept the Sprint 4 / DB-R6 / D3 / RC3
> Finance as-built POS architecture as the canonical Phase 7 decision:
> cashier workflow + order source contract, dine-in bill settlement +
> multi-tender payments, POS shifts + Z-Report + cash reconciliation, and
> branch sync + offline-safe contract (centralized DB + RLS + Idempotency-
> Key, with explicit deferral of offline PWA).
> ADR-027 through ADR-029 formally accept the Sprint 4 / DB-R5 / REQ-KIT-012
> as-built Kitchen Dashboard architecture as the canonical Phase 8 decision:
> kitchen ticket lifecycle + queue contract (one ticket per order, 6-state
> machine, ORDER_STATUS_MIRROR, polling-not-realtime), KOT snapshot model
> (frozen item_name + modifiers_snapshot JSONB, idempotent Option B creation
> on order confirm, atomic stock consume via kitchen_ticket_set_preparing_atomic
> RPC, per-item is_completed DEFERRED, KOT print + sequence_number DEFERRED),
> and kitchen display contract (client-side elapsed timer with fallback chain,
> PREP_WARN=20m / PREP_TARGET=15m display constants, priority field EXISTS
> with mutation DEFERRED, KITCHEN_STATION_CATALOG display-only with
> kitchen_stations table DEFERRED, no realtime / sounds / bump / recall).
> ADR-030 through ADR-032 formally accept the Sprint 4.6 / ADR-007/008/009/010
> as-built Rider and Delivery App architecture as the canonical Phase 9
> decision: rider identity + dispatch contract (rider role + 1:1 user_id +
> 1:1 branch_id, manual dispatch only with same-branch + state-machine +
> rider-active invariants, auto-dispatch DEFERRED), delivery lifecycle +
> pickup + POD surface (6-state machine with order mirror via
> mirrorOrderStatus + compensating rollback, picked-up IS the out-for-delivery
> state, POD-mandatory-for-delivered enforcement chain, failed-delivery
> capture + redelivery flow + customer-facing POD view DEFERRED), and rider
> location + navigation + performance contract (rider_locations ephemeral
> table with 24h TTL purge, GPS ingest endpoint with delivery.access
> permission, partial aggregate KPIs in admin dashboard, per-rider KPIs +
> rider_daily_summaries table + rider mobile app + customer-facing live map
> + push notifications DEFERRED to Phase 12).
> ADR-033 through ADR-035 formally accept the RC3 / RC4 as-built Inventory
> and Procurement architecture as the canonical Phase 10 decision: inventory
> stock master + movement ledger contract (branch-scoped inventory_items
> with on-hand current_stock, immutable stock_movements ledger with 8
> movement types, adjust_inventory_stock_atomic SECURITY DEFINER RPC with
> 4 invariants, RLS via current_user_has_branch_access, low-stock alerts +
> dedicated transfers + batch tracking + cost history DEFERRED), recipe/BOM
> + COGS costing contract (versioned inventory_recipes with one-active-per-
> menu_item UNIQUE index, inventory_recipe_lines with waste_factor,
> idempotent + reversible inventory_consumption_events, inventory_cogs_events
> with last_known cost_source forward-compatible with weighted_average/fifo,
> cost-availability honesty model, modifier-effect consume + COGS GL posting
> + recipe versioning rollback DEFERRED), and procurement + suppliers + GRN
> contract (suppliers branch-scoped with status + approval_status split,
> purchase_orders 8-state machine with explicit approval gate, GRN 3-state
> machine with create_goods_receiving_with_stock_atomic RPC, supplier_invoices
> with 3-way match foundation, supplier_payments with record_supplier_payment
> atomic RPC + GL posting, full supplier portal surface with 20 routes +
> idempotent responses + document upload, automated 3-way match + multi-branch
> consolidation + supplier SSO + supplier-side invoice submission DEFERRED).
> ADR-036 through ADR-038 formally accept the RC3 / RC4 / D3 as-built Finance
> and Reporting architecture as the canonical Phase 11 decision: branch GL +
> Chart of Accounts (5-type CoA, branch-scoped, UNIQUE branch+account_code) +
> double-entry `journal_entries` (3-state draft/posted/voided) + balanced
> `journal_entry_lines` + `create_journal_entry_atomic` / `reverse_journal_entry_atomic`
> SECURITY DEFINER RPCs + `finance_trial_balance` / `finance_profit_loss` /
> `finance_balance_sheet` / `finance_cash_flow_indirect` financial-statement
> RPCs + `finance_periods` 3-state period control + ADR-011 immutability
> triggers on journal_entries + journal_entry_lines (ADR-036); cash
> reconciliation 6-state with server-side `compute_cash_reconciliation_totals`
> IMMUTABLE RPC + Z-Report append-only audit + COD 4-state reconciliation with
> ADR-010 `post_cod_collection_journal` trigger + payments 8-state with 4
> methods + multi-tender `bill_splits` (4 strategies) + `reservation_deposits`
> 7-state + per-branch `branch_payment_methods` config (ADR-037); tax
> definitions (configurable rates, exclusive/inclusive basis, input/output
> classification, effective dates) + AR surface (`customer_invoices` 7-state +
> `customer_receipts` + `customer_receipt_allocations` + `customer_credit_notes`
> 3-state) + AP surface (`supplier_invoices` 3-way match foundation +
> `supplier_payments` + `record_supplier_payment_atomic` 8-arg + 7-arg
> overloads) + `expense_claims` 6-state + `inventory_cogs_events` +
> `inventory_consumption_events` + controlled GL posting services
> (postSalesFromOrder / postSupplierInvoice / postCogsEvent / postPayrollAccrual
> / postPayrollSettlement) gated on mapping-required + period-gated +
> exception-recording + 20 mapping purposes (ADR-038). DEFERRED items across
> the three ADRs: per-branch pricing, automated GL posting from kitchen/PO/
> invoice/sales order, multi-currency consolidation, inter-branch transfers,
> fiscal-year close automation, bank reconciliation, fixed-asset depreciation,
> `pos_sessions` table, online card gateway, multi-tender `payment_splits`
> table, bank deposit slip generation, multi-timezone, seeded jurisdiction tax
> rates, weighted-average/FIFO costing methods, `inventory_cost_history` table,
> `sale` movement type wiring for finished-goods, automated procurement-to-GL
> automation, automated 3-way match (DB-level trigger), supplier-side invoice
> submission, partial-cancel of order line items, dedicated `refunds` table,
> partial-refund API, discounts master table for non-coupon discounts.
> ADR-039 through ADR-041 formally accept the as-built Customer and Staff Apps
> architecture as the canonical Phase 12 decision: customer mobile + franchise
> portal contract (web-first PWA via `apps/website` + ADR-017 phone-first auth
> + ADR-021 loyalty wallet + ADR-022 owner workspace 25-module dashboard +
> `organization_owner` role + `AdminBranchManager.tsx` multi-branch view; NO
> native mobile app, NO service worker, NO push notifications, NO offline
> ordering, NO franchisee role, NO multi-tenant SaaS isolation — all DEFERRED
> with explicit trigger conditions, ADR-039); rider mobile app + delivery
> dashboard contract (`AdminDelivery.tsx` + 8 sub-components + 10 admin
> routes + 4 rider-facing routes via `/api/v1/riders/*` + ADR-008/009/010
> rider_locations/POD/COD surfaces + aggregate KPIs in DeliveryKPIs +
> DeliveryInsights; NO native rider app, NO turn-by-turn nav, NO in-app call
> masking, NO push notifications, NO offline-tolerant queue, NO live rider
> map, NO `rider_daily_summaries` table, NO per-rider KPI dashboard — all
> DEFERRED from Phase 9 ADR-032 §8-12 with explicit trigger conditions,
> ADR-040); staff app + support panel contract (`AdminShell.tsx` + 37 admin
> pages + 5 ops pages + 32 admin router modules totaling 350+ routes + ADR-019
> RBAC with `branch_manager`/`kitchen_manager`/`cashier`/`rider`/`support`
> roles + ADR-027/028/029 KDS + ADR-023/024/025/026 POS + `AdminCrm.tsx` 306
> lines + `AdminWhatsApp.tsx` 11 routes as de facto support panel + ADR-012
> audit log; NO mobile-optimized staff UI, NO PWA-installable admin, NO
> branch-manager mobile checklist, NO kitchen handheld view, NO customer 360
> unified view, NO ticketing system, NO refund initiation workflow — all
> DEFERRED with explicit trigger conditions, ADR-041). DEFERRED items across
> the three ADRs: native mobile app (iOS/Android via React Native/Expo),
> service worker / offline cache, push notifications (Web Push + FCM + APNs),
> installable PWA banner, order tracking realtime (Supabase Realtime),
> offline ordering, one-tap reorder, birthday reward, tiered loyalty,
> franchisee role + onboarding, multi-tenant SaaS isolation, franchise
> agreement tracking, royalty computation, address autocomplete, reverse
> geocode, transactional SMS, email receipts, rider-specific mobile UI,
> turn-by-turn navigation, in-app call masking, rider offline-tolerant
> action queue, rider shift scheduling, auto-dispatch engine, per-rider KPIs
> + `rider_daily_summaries` table, live rider map (admin), customer-facing
> live map, reverse geocode at read-time, average distance computation,
> failed-delivery capture + redelivery, single-transaction delivery+order
> mirror, delivery SLA tracking, audible alarms + bump-bar + recall,
> mobile-optimized staff UI, PWA-installable admin, branch-manager mobile
> checklist, kitchen handheld view (per-item prep ticks), offline-tolerant
> POS continuation, KOT print format + sequence_number + fiscal printer,
> server-side SLA + late-alert events, priority mutation endpoint +
> auto-priority, `kitchen_stations` table + station routing, realtime
> kitchen updates, AI-driven kitchen prediction, customer 360 unified view,
> ticketing system, refund initiation workflow, auto-routing WhatsApp to
> support agent, sentiment analysis + auto-reply bot, support agent role
> refinement, multi-role staff UI switcher.

---

## When an ADR is Required

Create an ADR when changing:

- System architecture
- Database architecture
- Public APIs
- Authentication
- Security boundaries
- Shared libraries
- Module boundaries
- Repository governance
- Engineering standards

Routine implementation changes do **not** require an ADR.

---

## ADR Status

Allowed statuses:

- Draft
- Review
- Approved
- Active
- Superseded
- Deprecated

---

## Related Documents

- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)
- [docs/13-adr/README.md](../13-adr/README.md)
