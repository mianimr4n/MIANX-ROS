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
| **Slice 2C** | 🟡 Architecture approved — waiting on WhatsApp Business / Twilio ops |
| Slice 2D | 🔒 Not started (RLS gate before POS unlock) |
| Sprint 4 Orders | ▶ Planning started → Domain build authorized in parallel |

The project is past prototype: release freeze, authentication, authorization model, and architecture docs form a solid base for the operational restaurant platform.

---

## 2. Parallel teams (owner strategy)

### Team A — Operations (External)

Depends on external approvals (can take 1–7+ days):

- Meta Business Verification  
- WhatsApp Business API (dedicated **Telepizza Login** sender)  
- Twilio Verify  
- Authentication templates  
- Production sender setup  

**Never** use **0304-1110495** for OTP (orders / support / branch / marketing only).  
Track: `docs/architecture/SLICE-2C0-OTP-OPERATIONS-READINESS.md` (**BLOCKED** / eng **PAUSED**)

### Team B — Backend (Development)

**Start Orders Domain (Sprint 4)** — restaurant core engine:

```text
Customer → Cart → Checkout → Order → Kitchen → Ready → Rider → Delivered
```

Build while WhatsApp provider is being approved.  
Plan: `docs/architecture/SPRINT-04-ORDERS-BACKEND-PLANNING.md`

### Team C — AI Platform (Mianx.ai)

Continue platform investment (speeds all future sprints / ERP projects):

- Agent Router  
- Memory Engine  
- Prompt OS  
- Task Engine  
- AI Workforce  
- Documentation standards  
- Autonomous development workflow  

*(Primarily outside Telepizza app code; Telepizza consumes later in Sprint 7.)*

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
| A | Execute Meta / WABA / Twilio / template / Turnstile checklist |
| B | Execute Sprint 4 Orders Domain slices (start **4.1** create hardening) |
| C | Continue Mianx.ai platform work outside this repo as scheduled |

---

## Related docs

| Doc | Role |
|---|---|
| `AUTHENTICATION_ARCHITECTURE.md` | Authz SSOT |
| `SLICE-2C0-OTP-OPERATIONS-READINESS.md` | OTP ops (paused) |
| `SPRINT-04-ORDERS-BACKEND-PLANNING.md` | Orders Domain plan |
| `CUSTOMER_PHONE_OTP_ARCHITECTURE.md` | OTP architecture freeze |
