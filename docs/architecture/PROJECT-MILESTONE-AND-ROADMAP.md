# Telepizza — Project Milestone & Parallel Roadmap

**Date:** 2026-07-16
**Status:** Milestone confirmed by owner
**Baseline:** Catalog freeze v1.2.0 · Auth foundation (Slices 1–2B) · Slice 2C architecture approved

---

## 1. Current project status

| Sprint / Slice | Status |
|---|---|
| Sprint 1 | ✅ Complete |
| Sprint 2 | ✅ Complete |
| Sprint 3 Slice 1 | ✅ Complete |
| Sprint 3 Slice 2A | ✅ Complete |
| Sprint 3 Slice 2B | ✅ Complete |
| Sprint 3.5 | ✅ Complete |
| **Sprint 4.1** Orders foundation | ✅ PASS AND CLOSED (production) |
| **Sprint 4.2** Quote contract | ✅ merged · production |
| **Sprint 4.3** Website checkout | ✅ PASS AND CLOSED (production) |
| **Sprint 4.3 Phase B** Guest read/cancel | ✅ PASS AND CLOSED (production) |
| **Slice 2C** | 🟡 Architecture approved — **BLOCKED** on WhatsApp Business / Twilio ops |
| Slice 2D | 🔒 Not started (RLS gate before POS unlock) |
| Sprint 4.5+ Staff lifecycle | 🔒 After Slice 2D |

The project is past prototype: release freeze, authentication, authorization model, and architecture docs form a solid base for the operational restaurant platform.

**Owner directive:** Protect quality over speed. Keep the Sprint 1–3 pattern — architecture → small slice → tests → PR → merge → deploy → smoke → close → next. Do not rush.

---

## 1b. Slice discipline (mandatory)

```text
1 Architecture → 2 Small slice → 3 Tests → 4 PR review → 5 Merge
→ 6 Production migration/deploy → 7 Smoke → 8 Close → 9 Next slice only
```

Each Sprint 4 slice must be independently shippable with a clear Definition of Done (see `SPRINT-04-ORDERS-BACKEND-PLANNING.md`).

---

## 2. Parallel teams (owner strategy — confirmed)

WhatsApp is part of the **product**, not just a notification channel.

| Locked auth architecture | Rule |
|---|---|
| Customer auth | **WhatsApp OTP first** |
| SMS | Fallback only |
| Email/password | Temporary pilot fallback |
| Staff auth | Email/password (until a future staff-specific enhancement) |
| Ordering vs auth numbers | **0304-1110495** ordering/support only; dedicated **Telepizza Login** for OTP |

Remaining Slice 2C blocker is **operational** (dedicated sender, Meta, Twilio Verify, CAPTCHA, pilot) — not technical design.

### Team 1 — Engineering (Telepizza backend)

Continue building the restaurant core (Sprint 4+), one closable slice at a time:

- Orders Engine · Kitchen Workflow · Order State Machine · Rider Assignment · Payments · Notifications · Admin APIs

Every future touchpoint depends on this lifecycle: Website, WhatsApp ordering, POS, Kitchen Display, Rider App, Admin Dashboard, Reporting, AI automation.

### Team 2 — Operations (External)

Complete provider prerequisites (non-blocking for Team 1):

- Meta Business verification · Twilio Verify · WhatsApp auth template · Dedicated auth number · CAPTCHA · Pilot setup

Track: `SLICE-2C0-OTP-OPERATIONS-READINESS.md` (**BLOCKED** / eng **PAUSED**)

### Team 3 — AI Platform (Mianx.ai)

Continue: Agent Router · Memory Engine · Task Engine · Documentation automation · AI workforce

Speeds Telepizza and future ERP products.

### Reuse principle

Auth, authorization, staff invites, and the order engine are being built as **reusable platform foundations**. The same spine can later serve Hospital ERP, School ERP, Logistics ERP, and broader Mianx.ai products with domain-specific changes only.

---

## 3. Suggested multi-sprint roadmap

```text
Sprint 4
├── Orders Engine
├── Kitchen Workflow
├── Order State Machine
├── Rider Assignment
├── Payment Flow
└── Notifications
        ↓
Sprint 5
├── Admin Dashboard
├── POS
├── Kitchen Display
├── Branch Management
└── Reporting
        ↓
Sprint 6
├── Customer App
├── Rider App
├── Branch App
└── Staff Portal
        ↓
Sprint 7
├── AI Automation
├── Forecasting
├── Inventory Intelligence
└── Mianx.ai integration
```

**Near-term value:** Orders backend connects website, kitchen, riders, POS, and future mobile apps into one business workflow.

---

## 4. Sequencing rules (non-negotiable)

| Rule | Why |
|---|---|
| Keep WhatsApp ordering on **0304-1110495** | Core Multan intake |
| OTP on dedicated **Telepizza Login** only | D11 |
| Catalog freeze untouched | v1.2.0 |
| Slice **2D RLS** before POS/Kitchen/Rider UI unlock | Prevent cross-branch leaks |
| Slice 2C eng paused until 2C.0 READY | External ops |

---

## 5. Immediate next actions

| Team | Action |
|---|---|
| **1 Engineering** | **Await owner pick** — see `_documentation-audit/reports/SPRINT-04-NEXT-READINESS.md`. Recommended gate: **Slice 2D RLS** before POS/Kitchen; optional **4.4 My Orders** customer alignment. |
| **2 Operations** | Meta / dedicated auth number / Twilio Verify / template / CAPTCHA / pilot (2C stays paused until READY). |
| **3 AI Platform** | Continue Mianx.ai Agent Router / Memory / Task Engine / docs automation. |

---

## Related docs

| Doc | Role |
|---|---|
| `AUTHENTICATION_ARCHITECTURE.md` | Authz SSOT |
| `SLICE-2C0-OTP-OPERATIONS-READINESS.md` | OTP ops (paused) |
| `SPRINT-04-ORDERS-BACKEND-PLANNING.md` | Orders Domain plan |
| `_documentation-audit/reports/SPRINT-04-NEXT-READINESS.md` | Post–4.3 next slice options |
| `CUSTOMER_PHONE_OTP_ARCHITECTURE.md` | OTP architecture freeze |
