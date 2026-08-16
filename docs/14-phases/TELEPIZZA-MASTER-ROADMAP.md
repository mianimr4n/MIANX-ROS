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

**Status:** Not started

---

## Phase 11 — Finance and Reporting

Revenue · Expenses · Payments · Cash · Branch P&L · Taxes · Discounts · Refunds · Reconciliation · Reports

**Status:** Not started

---

## Phase 12 — Customer and Staff Apps

Customer mobile · Rider app · Staff app · Franchise portal · Support panel · Delivery dashboard

**Status:** Not started

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
| Phase 9 **PASS AND CLOSED** (v2.4.0) | **Phase 10** — Inventory and Procurement |
| Phase 3 eng paused | Ops continues Meta/Twilio in parallel |
| Phase 10 implementation | After Phase 9 close (UNLOCKED) |

---

**TELEPIZZA MASTER ROADMAP: LOCKED**
