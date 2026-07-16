# Sprint 4 — Orders Backend Planning

**Status:** PLAN-ONLY · **Authorized parallel track** while Slice 2C.0 OTP waits on Meta/Twilio  
**Date:** 2026-07-16  
**Baseline:** Slice 2B CLOSED (`8527f28`); catalog freeze **v1.2.0** (58 / 13 / 2)  
**Trigger:** Owner final lock of Slice 2C D11 + recommendation to pause OTP engineering and start Orders Backend planning  
**Related:** `SLICE-2C0-OTP-OPERATIONS-READINESS.md` (OTP **PAUSED / BLOCKED** on ops)

```text
OTP Operations (waiting on Meta/Twilio)     ← PAUSED engineering
            │
            ├──────────────┐
            │              │
            ▼              ▼
     Sprint 4 Planning   Orders Backend design
```

**Hard constraints for this planning phase:**

- Do **not** wait idle for WhatsApp OTP provider onboarding  
- Do **not** break WhatsApp ordering on **0304-1110495** (`wa.me`)  
- Do **not** mutate menu / pricing / catalog / toppings (v1.2.0 freeze)  
- Do **not** implement Slice 2C OTP code here  
- Do **not** unlock POS / Kitchen / Rider UIs until authz + RLS gates are defined  
- Prefer **plan → owner decisions → then code slices**  

---

## 0. Why parallel now

| Fact | Implication |
|---|---|
| Slice 2C technical architecture is complete | Engineering cannot unblock Meta/Twilio/WABA |
| Provider onboarding can take **1–7+ days** | Developers should not idle |
| Orders are the restaurant **core business engine** | Highest value parallel work |
| Current API already has thin create + track | Clear foundation to harden |

---

## 1. Current state (as-built)

### 1.1 API (`/api/v1/orders`)

| Endpoint | Auth today | Behavior |
|---|---|---|
| `POST /` | **None** | Create order (service-role Supabase when configured) |
| `GET /:orderNumber/tracking?phone=` | Phone match only | Tracking summary |

**Implemented when Supabase ready:** branch must be `operating`; server resolves menu prices; inserts `orders` + `order_items`; optional `deliveries` row; status starts `pending`; discount/tax/delivery_fee = `0`.

**Not implemented:** status machine, cancel, list-by-branch, kitchen queue, payments write, coupon engine, idempotency, JWT/`requirePermission`, extras as separate lines, transactional guarantee if item insert fails.

**Files:** `backend/api/src/modules/orders/routes.ts`, `services/orders/supabase.ts`, `services/orders/types.ts`

### 1.2 Website

| Path | Behavior |
|---|---|
| Cart drawer | Primary **WhatsApp** `wa.me` handoff to **0304-1110495** (no API) |
| Checkout `submitWebsiteOrder` | Tries API; on failure → **localStorage** `LOC-…`; success page still offers WhatsApp confirm |
| My Orders | **localStorage only** |
| Track Order | API when not `LOC-*` |

### 1.3 Database

| Asset | Notes |
|---|---|
| `orders`, `order_items`, `payments`, `deliveries`, `riders` | Foundation migration |
| RLS | **Enabled** on operational tables but **no** owner/branch policies yet (Slice 2D) |
| Permissions seeded | `order.read` / `order.create` / `order.manage` for staff roles; **customer permissions empty** |
| Missing vs OMS vision | `order_status_logs`, kitchen tickets, coupon tables, timeline |

### 1.4 Auth sequence (canonical)

Historical sequence in `AUTHENTICATION_ARCHITECTURE.md`:

```text
2C OTP → 2D RLS → Sprint 4 POS/Kitchen/Delivery
```

**Parallel adjustment (owner-approved strategy):**

```text
2C.0 OTP ops (PAUSED eng) ──┐
                            ├──▶ continue independently
Sprint 4 Orders Backend plan ┘
        ↓
Orders Backend slices (API truth, status, integrity)
        ↓
Slice 2D RLS (before staff POS/Kitchen unlock)
        ↓
Sprint 4 apps (POS / Kitchen / Delivery) consume authz spine
```

**Rule:** Do **not** ship cross-branch staff order UIs before Slice 2D. Backend planning and integrity work **can** proceed with service-role + explicit middleware gates in the interim, with RLS as a hard gate before POS unlock.

---

## 2. Goal of Sprint 4 Orders Backend (planning scope)

Make **server-side orders** the durable source of truth for Multan operations, while keeping WhatsApp ordering as a supported intake channel.

| Outcome | Description |
|---|---|
| Durable create | Reliable `POST /orders` with pricing integrity |
| Status lifecycle | Explicit transitions for kitchen / cashier / rider later |
| Tracking | Phone-gated customer track remains; authenticated “my orders” later |
| Staff read path | Branch-scoped list/detail behind permissions (after 2D or temporary SA-only) |
| WhatsApp coexistence | `orderSource=whatsapp` + **0304-1110495** handoff preserved |
| Catalog safety | No menu/price freeze breakage |

---

## 3. In scope vs out of scope (planning)

### In scope for Orders Backend plan → later slices

- Order create hardening (validation, pricing, atomic inserts)  
- Order status model + audit log  
- Tracking improvements  
- Staff order read APIs (permission-gated)  
- Link optional `customerId` when session exists  
- Idempotency / duplicate submit protection  
- Alignment with WhatsApp handoff (store WA-origin orders when staff enter them later)  
- Test plan + Multan smoke plan  
- Decision card for owner (OB1–OBn)  

### Out of scope (this planning doc / early slices)

- Slice 2C OTP implementation  
- Migrating **0304-1110495** to Cloud API  
- Full POS / Kitchen / Rider UI unlock  
- Payments gateway / online pay  
- Inventory / recipes  
- Menu/catalog edits  
- National multi-city expansion  

---

## 4. Proposed order lifecycle (V1 backend)

```text
pending
  → confirmed        (branch accepted — WhatsApp or staff)
  → preparing        (kitchen)
  → ready            (pickup / rider assignable)
  → out_for_delivery (delivery only)
  → completed
  → cancelled        (terminal; rules TBD)
```

| Transition | Who (later) | Permission (seeded names) |
|---|---|---|
| create | Website / staff | public create (interim) → `order.create` when gated |
| pending → confirmed | Cashier / BM / support | `order.manage` or narrower later |
| confirmed → preparing → ready | Kitchen / cashier | `order.manage` |
| ready → out_for_delivery → completed | Rider / cashier | `order.manage` + delivery scope |
| * → cancelled | BM / SA / support (policy) | `order.manage` |

Exact role matrix is an **owner decision** (see §8).

---

## 5. Proposed implementation slices (after owner decisions)

| Slice | Deliverable | Stop line |
|---|---|---|
| **4.0** | This plan + owner decision card (OB*) | No code |
| **4.1** | Create-path hardening: atomic order+items, server prices, extras persistence strategy, reject closed branch | No status UI |
| **4.2** | Status machine + `order_status_logs` + safe transition API | No POS UI |
| **4.3** | Staff list/detail by branch + `requirePermission` | No cross-branch without 2D |
| **4.4** | Website: authenticated/guest create policy; reduce localStorage-only “My Orders” drift | Keep WA handoff |
| **4.5** | Slice **2D** RLS for orders/payments/deliveries | Gate before POS unlock |
| **4.6** | POS / Kitchen / Rider consume APIs | After 2D PASS |

**Do not start 4.1 code until OB decisions in §8 are approved** (or owner explicitly authorizes “plan defaults”).

---

## 6. WhatsApp coexistence (non-negotiable)

```text
0304-1110495  = Orders + Support + Branch + future Marketing
Telepizza Login (new) = Auth OTP only (Slice 2C — paused)
```

| Rule | Detail |
|---|---|
| Keep `wa.me` checkout | Primary Multan intake until staff OMS is trusted |
| API create is additive | Not a forced replacement of WhatsApp in V1 |
| Fees/tax copy | May remain “confirmed on WhatsApp” until fee engine ships |
| Never send OTP on ordering number | Slice 2C D11 |

---

## 7. Security & RLS relationship

| Layer | Now | Target before POS |
|---|---|---|
| Public `POST /orders` | Open | Decide guest vs CAPTCHA vs JWT (OB2) |
| Tracking | Phone knowledge gate | Keep + rate-limit |
| Staff APIs | Missing | `requirePermission('order.read'|'order.manage')` + branch scope |
| RLS | On, empty policies | Slice **2D** owner + branch policies |
| Service role | Used by API | Keep for trusted server paths; never in browser |

**Risk if ignored:** staff POS before 2D → cross-branch data leaks.

---

## 8. Owner decision card (Orders Backend)

| ID | Question | Recommendation | Owner |
|---|---|---|---|
| **OB1** | Start Orders Backend planning/implementation **in parallel** with OTP ops wait? | **Yes** (this doc) | ☐ |
| **OB2** | Website `POST /orders` auth for Multan V1? | Keep **guest create** + CAPTCHA later; attach `customerId` when logged in | ☐ |
| **OB3** | Replace WhatsApp checkout with API-only? | **No** — keep WhatsApp handoff; API additive | ☐ |
| **OB4** | Persist toppings/extras as separate `order_items` lines vs folded price? | **Separate lines** (auditability) | ☐ |
| **OB5** | V1 status set? | `pending → confirmed → preparing → ready → out_for_delivery → completed` + `cancelled` | ☐ |
| **OB6** | Who can cancel? | Branch manager + super-admin (+ support?) | ☐ |
| **OB7** | Delivery fee / tax on API create? | **0 + note** until fee engine; WhatsApp confirms | ☐ |
| **OB8** | Slice 2D before any POS/Kitchen UI? | **Yes** (hard gate) | ☐ |
| **OB9** | Permission names | Keep seeded `order.*` (not `orders.*`) | ☐ |
| **OB10** | First code slice after plan approval? | **4.1 create hardening** | ☐ |

---

## 9. Test / acceptance sketch (later)

| Area | Check |
|---|---|
| Create | Operating branch only; server prices match catalog freeze |
| Atomicity | No orphan `orders` without items |
| Track | Correct phone → 200; wrong phone → 403; unknown → 404 |
| Status | Illegal transitions rejected |
| Staff | Cashier cannot read other branch (after 2D) |
| WhatsApp | `wa.me` **0304-1110495** regression PASS |
| Catalog | 58 / 13 / 2 unchanged |
| Auth | Staff invite + email login regression PASS |

---

## 10. Dependencies on Slice 2C

| 2C item | Orders impact |
|---|---|
| OTP paused | Orders plan proceeds without phone-login |
| Email/password customers | Can still attach `customerId` when session exists |
| After 2C READY | Stronger “my orders” ownership via phone identity |
| Do not block 4.1–4.2 on OTP | Correct |

---

## 11. Agent stop line (this document)

Until owner approves **OB1–OB10** (or explicitly authorizes defaults):

- Do **not** open Orders Backend implementation PRs  
- Do **not** unlock POS/Kitchen/Rider  
- Do **not** change catalog freeze  
- Do **not** resume Slice 2C.1 OTP code  

**OTP remains PAUSED on provider ops.**  
**This file is the Sprint 4 planning entry point — stop for owner OB card review.**

---

## Related documents

| Document | Role |
|---|---|
| `docs/architecture/SLICE-2C0-OTP-OPERATIONS-READINESS.md` | OTP paused / ops blockers |
| `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` | Authz SSOT + sequence |
| `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md` | Aspirational OMS SRS |
| `_documentation-audit/releases/v1.2.0/API-CONTRACT.md` | Current create/track contract |
| `docs/03-architecture/IMPLEMENTATION_ROADMAP.md` | Phase 7 restaurant operations |
