# Sprint 4 — Orders Backend Planning

**Status:** ACTIVE — **quality over speed** · Slice **4.1** in PR review (do not start 4.2 until 4.1 CLOSED)  
**Date:** 2026-07-16  
**Baseline:** Slice 2B CLOSED (`8527f28`); catalog freeze **v1.2.0** (58 / 13 / 2)  
**Milestone:** `docs/architecture/PROJECT-MILESTONE-AND-ROADMAP.md`  
**Trigger:** Owner milestone + parallel Team A (ops) / Team B (Orders) / Team C (Mianx.ai)  
**Related:** `SLICE-2C0-OTP-OPERATIONS-READINESS.md` (OTP **PAUSED / BLOCKED** on Meta/Twilio)

```text
Team A — OTP ops (Meta/Twilio)     ← external wait (non-blocking)
Team B — Orders Domain Sprint 4    ← ACTIVE (one slice at a time)
Team C — Mianx.ai platform         ← parallel investment
```

### Owner-expanded Sprint 4 theme (central business engine)

```text
Customer
   ↓
Cart
   ↓
Checkout
   ↓
Order Created
   ↓
Branch
   ↓
Kitchen
   ↓
Ready
   ↓
Rider
   ↓
Delivered / Cancelled
```

Everything else (POS, Kitchen Display, Rider App, Admin, Notifications, AI) connects to this lifecycle.  
**Protect quality over speed.** Each slice must be independently shippable.

---

## Discipline workflow (mandatory — same as Sprint 1–3)

```text
1. Architecture first (clear design + decisions)
2. Small implementation slice
3. Tests pass
4. PR review
5. Merge
6. Production migration / deploy (if any)
7. Smoke test
8. Close the slice
9. Only then → next slice
```

**Do not skip steps. Do not start the next Orders slice until the current slice is CLOSED.**

### Definition of Done (every Sprint 4 slice)

| # | Gate | Required |
|---|---|---|
| 1 | Architecture / decisions recorded | Yes |
| 2 | Scope limited to one slice stop-line | Yes |
| 3 | `pnpm check` + relevant tests green | Yes |
| 4 | PR reviewed (security/regressions) | Yes |
| 5 | Merged to `main` | Yes |
| 6 | Migrations applied if the slice ships SQL | If any |
| 7 | Production/smoke: create+track, WhatsApp `0304-1110495`, staff auth, catalog 58/13/2 | Yes |
| 8 | Close note / status update | Yes |
| 9 | Next slice authorized only after close | Yes |

**Hard constraints:**

- Do **not** rush features ahead of DoD  
- Do **not** break WhatsApp ordering on **0304-1110495** (`wa.me`)  
- Do **not** mutate menu / pricing / catalog / toppings (v1.2.0 freeze)  
- Do **not** implement Slice 2C OTP code here  
- Do **not** unlock POS / Kitchen / Rider UIs until Slice **2D** RLS  
- Parallel Team A/C work must not skip Team B slice close discipline  

---

## 0. Why parallel now

| Fact | Implication |
|---|---|
| Slice 2C technical architecture is complete | Engineering cannot unblock Meta/Twilio/WABA |
| Provider onboarding can take **1–7+ days** | Team A prepares externally; Team B does not idle |
| Orders are the restaurant **core business engine** | Highest value parallel work |
| Current API already has thin create + track | Clear foundation to harden **one slice at a time** |

---

## 1. Current state (as-built)

### 1.1 API (`/api/v1/orders`)

| Endpoint | Auth today | Behavior |
|---|---|---|
| `POST /` | **None** | Create order (service-role Supabase when configured) |
| `GET /:orderNumber/tracking?phone=` | Phone match only | Tracking summary |

**Implemented when Supabase ready:** branch must be `operating`; server resolves menu prices; inserts `orders` + `order_items`; optional `deliveries` row; status starts `pending`; discount/tax/delivery_fee = `0`.

**Not implemented yet (later slices):** status machine, cancel API, list-by-branch, kitchen queue, payments write, coupon engine, idempotency keys, JWT/`requirePermission` on create, extras as separate DB lines.

**4.1 in flight (PR #34):** delivery address required; unavailable variant reject; extras folded into instructions; rollback orphan order if items/delivery insert fails.

**Files:** `backend/api/src/modules/orders/routes.ts`, `services/orders/supabase.ts`, `services/orders/types.ts`, `services/orders/create-helpers.ts`

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

Aligned with foundation schema check constraint:

```text
pending
  → confirmed
  → preparing
  → ready
  → dispatched          (delivery in transit; schema name — not out_for_delivery)
  → completed
  → cancelled           (terminal; rules per OB6)
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

| Slice | Deliverable | Status | Stop line |
|---|---|---|---|
| **4.0** | Plan + OB defaults + discipline/DoD | ✅ Done (this doc) | — |
| **4.1** | Create-path hardening | 🟡 **PR review** (#34) — close before 4.2 | No status UI |
| **4.2** | Status machine + `order_status_logs` + safe transition API | 🔒 Blocked until 4.1 CLOSED | No POS UI |
| **4.3** | Staff list/detail by branch + `requirePermission` | 🔒 After 4.2 | No cross-branch without 2D |
| **4.4** | Website: attach session customer when present; reduce My Orders drift | 🔒 After 4.3 | Keep WA handoff |
| **4.5** | Slice **2D** RLS for orders/payments/deliveries | 🔒 Hard gate | Before POS unlock |
| **4.6+** | Kitchen / rider / payment / notification APIs → then apps | 🔒 After 2D PASS | Apps in Sprint 5+ |

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
| **OB1** | Start Orders Backend **in parallel** with OTP ops wait? | **Yes** | ✅ Authorized |
| **OB2** | Website `POST /orders` auth for Multan V1? | Keep **guest create**; attach `customerId` when logged in; CAPTCHA later | ✅ Default adopted |
| **OB3** | Replace WhatsApp checkout with API-only? | **No** — keep WhatsApp handoff; API additive | ✅ Default adopted |
| **OB4** | Persist toppings/extras as separate lines vs folded price? | Fold price + append labels into `instructions` until extras table (4.1); separate lines in later slice | ✅ Provisional |
| **OB5** | V1 status set? | Schema: `pending → confirmed → preparing → ready → dispatched → completed` + `cancelled` | ✅ Default adopted |
| **OB6** | Who can cancel? | Branch manager + super-admin (+ support later) | ✅ Default adopted |
| **OB7** | Delivery fee / tax on API create? | **0 + note** until fee engine; WhatsApp confirms | ✅ Default adopted |
| **OB8** | Slice 2D before any POS/Kitchen UI? | **Yes** (hard gate) | ✅ Default adopted |
| **OB9** | Permission names | Keep seeded `order.*` | ✅ Default adopted |
| **OB10** | First code slice after plan? | **4.1 create hardening** | ✅ Authorized |

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

**Now:** Complete the Sprint 1–3 discipline cycle for **slice 4.1** only:

1. PR review on #34  
2. Merge  
3. Deploy (API auto) — no OTP migrations  
4. Smoke: `POST /orders`, tracking, `wa.me` **0304-1110495**, staff login, catalog 58/13/2  
5. Close 4.1  
6. **Only then** architecture + implement **4.2** (status machine)

Still forbidden without new owner authorization:

- Skipping DoD / starting 4.2 before 4.1 CLOSED  
- POS / Kitchen / Rider **UI unlock** (needs Slice 2D)  
- Catalog / pricing mutations  
- Slice 2C.1 OTP code (until 2C.0 READY)  
- Migrating **0304-1110495** onto Cloud API  

**OTP remains PAUSED on provider ops.**  
**Quality over speed — one closable Orders slice at a time.**

---

## Related documents

| Document | Role |
|---|---|
| `docs/architecture/SLICE-2C0-OTP-OPERATIONS-READINESS.md` | OTP paused / ops blockers |
| `docs/architecture/AUTHENTICATION_ARCHITECTURE.md` | Authz SSOT + sequence |
| `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md` | Aspirational OMS SRS |
| `_documentation-audit/releases/v1.2.0/API-CONTRACT.md` | Current create/track contract |
| `docs/03-architecture/IMPLEMENTATION_ROADMAP.md` | Phase 7 restaurant operations |
