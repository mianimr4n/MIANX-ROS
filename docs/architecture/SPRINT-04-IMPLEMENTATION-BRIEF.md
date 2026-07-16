# Sprint 4 — Orders Domain Pre-Implementation Brief

**Status:** Implementation in progress on `cursor/sprint-4-1-orders-quote-bf31` (owner-approved slice scope)  
**Canonical architecture:** `docs/architecture/ORDERS_ARCHITECTURE.md`  
**Date:** 2026-07-16  

### Slice 4.1 scope (this PR)

- Order Quote Engine (`POST /api/v1/orders/quote`)
- Server-side pricing (ignore client totals/prices)
- Idempotency-Key on create
- Order / line snapshots + status log on create
- Forward-only migration (apply to production **only with owner approval**)

### Explicitly out of scope

- Staff lifecycle / kitchen / rider APIs  
- OTP / Slice 2C  
- Website checkout rewrite (4.4)  
- Production migration/deploy without approval  

---

## 0. Baseline confirmation

| Item | Status |
|---|---|
| Sprint 1–2 | ✅ CLOSED |
| Sprint 3.5 authz | ✅ CLOSED |
| Slice 2B staff invites | ✅ CLOSED |
| Slice 2C WhatsApp OTP | 🟡 Architecture approved · **BLOCKED** on provider ops |
| Email/password auth | ✅ Must remain working |
| `AuthPrincipal` only | ✅ |
| Catalog 13/58/3/40/7 | ✅ Freeze |
| Orders create + track API | ✅ Thin as-built |
| Status machine / quote / RLS policies | ❌ Not production-ready |

---

## 1. Goal

Design and (after approval) ship a **production Orders Backend** that becomes the central business engine:

```text
Customer → Cart → Checkout → Order Created → Branch → Kitchen → Ready → Rider → Delivered / Cancelled
```

Later clients (Website, WhatsApp ordering, POS, Kitchen Display, Rider App, Admin, Reporting, AI) all attach to this lifecycle.

---

## 2. Hard constraints

- No branch / feature code / migrations / commit / push / deploy in this plan phase  
- No menu, prices, toppings, catalog, or branch **data** edits  
- No customer/staff auth changes; no OTP implementation  
- No POS / Admin / Kitchen / Rider **UI**  
- Never trust frontend prices, totals, role, user id, or branch id for authorization  
- Preserve anonymous cart + WhatsApp `wa.me` to **0304-1110495**  
- DB-backed `AuthPrincipal` remains the only privilege source  

---

## 3. Current-state summary (inspect)

| Layer | Finding |
|---|---|
| DB | `orders` statuses already: pending→…→dispatched→completed/cancelled; payments & deliveries separate; **no** status logs / idempotency |
| RLS | Enabled on order tables; **no policies** — API uses service role |
| API | Unauthenticated `POST /orders` + phone tracking; trusts topping **extras prices** from client |
| Website | Guest checkout; local `LOC-*` fallback; My Orders = localStorage; no quote; no `customerId` |
| Authz middleware | Exists but **not** wired to orders routes |

Full gap analysis: `ORDERS_ARCHITECTURE.md` Stages 1–2.

---

## 4. Recommended canonical architecture (short)

1. **State machine:** Keep existing DB enums; map product “out for delivery” → `dispatched`, “delivered” → `completed`. Rejection → `cancelled` + reason. Refunds → `payment_status` only.  
2. **Pricing:** Server quote/create from catalog; ignore client money; snapshot names/prices/toppings.  
3. **Identity:** Guest checkout V1; normalize phone `+923…`; optional Bearer attach; OTP linking later.  
4. **Branch:** Customer-selected `branchCode`; must be `operating`; immutable after `confirmed`; staff scope via principal — never spoof headers.  
5. **APIs:** `quote`, `create` (+ Idempotency-Key), read, cancel; staff transitions **locked** until Slice 2D.  
6. **WhatsApp:** Remain first-class ordering channel alongside API.  

---

## 5. Exact blockers

| Blocker | Owner? |
|---|---|
| Decision card **O1–O12** | Yes — blocks implementation |
| Meta/Twilio OTP (2C) | Ops — **does not** block Orders 4.1–4.4 |
| Slice 2D RLS | Blocks staff lifecycle **4.5+** and UI unlock |

---

## 6. Decision card O1–O12

| ID | Question | Recommendation | Owner |
|---|---|---|---|
| **O1** | Keep existing order status enums? | **Yes** (`dispatched`/`completed`) | ☐ |
| **O2** | Guest checkout V1? | **Yes** | ☐ |
| **O3** | Idempotency-Key required on create? | **Yes** | ☐ |
| **O4** | Ignore all client money fields? | **Yes** | ☐ |
| **O5** | Customer cancel rule? | **pending only, 15 minutes** | ☐ |
| **O6** | Fee/tax/discount V1? | **0** until fee engine | ☐ |
| **O7** | Branch model? | **Customer-selected** | ☐ |
| **O8** | Quote before create? | **Quote + always re-price on create** | ☐ |
| **O9** | Staff lifecycle APIs when? | **After Slice 2D PASS** | ☐ |
| **O10** | RLS vs middleware? | Middleware for staff ASAP; **RLS before POS/Kitchen UI** | ☐ |
| **O11** | Payments in Sprint 4? | **COD status fields only** — no gateway | ☐ |
| **O12** | Keep WhatsApp 0304-1110495 ordering? | **Yes — preserve** | ☐ |

Approve this brief + O1–O12 before any implementation slice starts.

---

## 7. Proposed implementation slices

| Slice | Deliverable | Depends on |
|---|---|---|
| **4.0** | Architecture freeze (this + `ORDERS_ARCHITECTURE.md`) | O1–O12 |
| **4.1** | Schema: status logs, snapshots, idempotency, phone_e164, cancel fields | 4.0 |
| **4.2** | Quote + pricing engine (topping SKUs / size tiers) | 4.1 |
| **4.3** | Create / read / cancel + guest tracking harden | 4.2 |
| **4.4** | Website checkout integration (keep WA + local fallback) | 4.3 |
| **4.5** | Branch/kitchen staff lifecycle APIs | O9 + Slice 2D |
| **4.6** | Rider / delivery transitions | 4.5 |
| **4.7** | Production rollout + smoke + close | 4.4 (customer path) / 4.6 (full) |

**Discipline:** architecture → small slice → tests → PR → merge → deploy → smoke → close → **only then** next.

---

## 8. Parallel tracks (non-blocking)

| Track | Work |
|---|---|
| Engineering | Orders 4.x after O1–O12 |
| Operations | WhatsApp Business / Twilio Verify / CAPTCHA / pilot (Slice 2C) |
| AI Platform | Mianx.ai Agent Router / Memory / Task Engine |

---

## 9. Agent stop line

Until owner approves **O1–O12**:

- Do **not** create an Orders implementation branch  
- Do **not** write migrations or order feature code  
- Do **not** unlock POS / Kitchen / Rider / Admin UIs  
- Do **not** resume Slice 2C.1 OTP code  
- Do **not** change catalog freeze data  

**SPRINT 4 STATUS: READY FOR OWNER REVIEW**

**Stop for owner review.**
