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

**Status:** Not started (after Phase 5 operational APIs)

---

## Phase 7 — POS System

Dine-in/takeaway/delivery · Cashier · Payments · Receipts · Shifts · Cash reconciliation · Branch sync · Offline-safe

**Status:** Not started · **Requires Slice 2D RLS PASS**

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
| Phase 5 **PASS AND CLOSED** (v2.0.0) | **Phase 6** — Admin and ERP Core |
| Phase 3 eng paused | Ops continues Meta/Twilio in parallel |
| Phase 6 implementation | After Phase 5 close (UNLOCKED) |

---

**TELEPIZZA MASTER ROADMAP: LOCKED**
