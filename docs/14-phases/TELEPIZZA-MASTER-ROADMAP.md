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

**Status:** Not started · **Requires Slice 2D + lifecycle APIs**

---

## Phase 9 — Rider and Delivery App

Rider login · Assignment · Pickup · Navigation · Out-for-delivery · POD · Failed delivery · Performance

**Status:** Not started

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
| Phase 7 **PASS AND CLOSED** (v2.2.0) | **Phase 8** — Kitchen Dashboard |
| Phase 3 eng paused | Ops continues Meta/Twilio in parallel |
| Phase 8 implementation | After Phase 7 close (UNLOCKED) |

---

**TELEPIZZA MASTER ROADMAP: LOCKED**
