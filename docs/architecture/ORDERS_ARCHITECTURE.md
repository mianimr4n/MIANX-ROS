# Sprint 4 — Orders Domain Architecture

**Status:** ✅ **APPROVED / FROZEN** for implementation (O1–O12 locked)  
**Type:** Complete blueprint for production Orders Backend  
**Date:** 2026-07-16  
**Owner decisions:** O1–O12 **APPROVED** with recommended defaults (do not silently change)  
**Conflict resolutions:** R1–R4 approved — see `SPRINT-04-1-CONFLICT-REPORT.md`  
**Baseline:** Sprint 1–2 CLOSED · Sprint 3.5 + Slice 2B CLOSED · Slice 2C OTP **BLOCKED** on provider ops  
**Catalog freeze:** **13 categories / 58 items / 3 toppings / 40 variants / 7 deals** (v1.2.0)  
**Ordering WhatsApp:** **0304-1110495** — must remain unchanged  
**Authz SSOT:** DB-backed `AuthPrincipal` only  

```text
Website → Checkout → Order → Branch → Kitchen → Rider → Delivery → Admin/POS
```

**Hard constraints:**

- Never trust frontend prices, totals, role, user id, or branch id for authorization  
- Preserve anonymous cart + current WhatsApp ordering flow  
- Staff lifecycle APIs locked until Slice 2D (O9/O10)  
- No silent changes to O1–O12  

**Related:** `AUTHENTICATION_ARCHITECTURE.md`, `SLICE-2C0-OTP-OPERATIONS-READINESS.md`, `SPRINT-04-IMPLEMENTATION-BRIEF.md`, `SPRINT-04-1-CLOSE-AND-4-2-READINESS.md`

---

## Stage 1 — Current-state findings (inspected)

### 1.1 Database (foundation + later migrations)

| Table | Exists | Notes |
|---|---|---|
| `orders` | ✅ | Status CHECK: `pending, confirmed, preparing, ready, dispatched, completed, cancelled` |
| `order_items` | ✅ | Snapshot-ish `product_name`/`variant_name` + live FKs; **no** topping line table; extras not first-class |
| `payments` | ✅ | Separate `status`; **API never inserts** today |
| `deliveries` | ✅ | 1:1 with order; status: `pending, assigned, picked-up, delivered, failed, cancelled` |
| `riders` | ✅ | Branch-scoped |
| `branches` | ✅ | `operating \| coming-soon \| inactive` |
| `users` / `customers` | ✅ | `customers.phone` NOT NULL; website create does not link |
| `menu_items` / `menu_item_variants` | ✅ | Toppings = `product_type='topping'` SKUs (`extra-chicken`, `extra-cheese`, `extra-cheese-slice`) |
| `order_status_logs` | ❌ | Missing |
| Customer `addresses` | ❌ | Missing |
| Idempotency keys | ✅ (PR #35 migration) | `orders.idempotency_key` unique partial index + request hash |
| Order audit / cancel reason columns | ❌ | Missing (`notes` only) |

**RLS:** Enabled on `orders`, `order_items`, `payments`, `deliveries` — **zero SELECT/INSERT/UPDATE policies** on those tables. API uses **service role** (bypasses RLS).

**Seeded permissions:** `order.read` / `order.create` / `order.manage` (+ delivery/payment perms). **Customer role permissions = empty.**

### 1.2 Backend (`backend/api`)

| Surface | As-built |
|---|---|
| `POST /api/v1/orders` | No JWT · Zod body · creates `pending` order |
| `GET /api/v1/orders/:orderNumber/tracking?phone=` | No JWT · phone digit match |
| Pricing | Server overwrites food variant price from DB; **still trusts `extras[].price`** |
| Totals | `discount=0`, `tax=0`, `delivery_fee=0`, `total=subtotal` |
| Rollback | Delete order if items/delivery insert fails (cascade) — present on current tree |
| `AuthPrincipal` on orders | **Not used** |
| Quote API | **Missing** |
| Status transitions | **Missing** |
| Staff list/lifecycle | **Missing** (apps return 501 elsewhere) |

### 1.3 Website

| Surface | As-built |
|---|---|
| Cart | In-memory `CartContext`; anonymous OK; not persisted |
| Toppings | Client resolves size-tier prices from catalog (`cart-config.ts`) |
| Checkout | Name + phone + address (if delivery); guest allowed |
| Branch | `localStorage` `telepizza.selectedBranchId` |
| Submit | `POST /orders` if API configured; else / on fail → `LOC-*` localStorage |
| WhatsApp | `wa.me/923041110495` from branch phone — **must keep** |
| My Orders | **localStorage only** (auth-gated UI) |
| `customerId` / Bearer on create | **Never sent** |
| Quote | **Not used** |

### 1.4 Tests

- Helper + route validation tests exist; **no** live Supabase pricing/idempotency/RLS contract suite for orders.

---

## Stage 2 — Gap analysis

### Reuse

- Tables `orders` / `order_items` / `payments` / `deliveries` / `riders`  
- Create + tracking endpoints as starting point  
- Menu catalog as pricing source of truth  
- `AuthPrincipal` + `requirePermission` / `requireBranchAccess` middleware (not yet on orders)  
- WhatsApp handoff + anonymous cart UX  
- Email/password sessions for optional customer attach later  

### Stubbed / incomplete

- Payments write path  
- Status machine + history  
- Staff/kitchen/rider APIs  
- Server quote  
- Guest→customer linking  
- Delivery fee / tax / discount engines  

### Unsafe / incomplete

| Risk | Detail |
|---|---|
| Pricing | Client `extras[].price` trusted; no topping SKU re-price by size on server |
| Authz | Open create; service role only; RLS policies empty |
| Identity | Optional `customerId` unused; no ownership binding |
| Idempotency | Double-submit can create duplicates |
| Totals | Fees always 0; frontend totals display-only but API doesn’t re-verify a quote |
| Branch | Client sends `branchCode` (OK if validated operating); must never use spoof headers for authz |
| Dual truth | API orders vs `LOC-*` localStorage vs WhatsApp-only carts |

### Must wait for customer phone OTP (Slice 2C)

- Phone-primary login UX  
- Strong “my orders by phone identity” without email  
- OTP-linked guest merge automation  

**Does not block:** guest checkout, server pricing, status machine schema, staff lifecycle design (implementation of staff APIs waits on **Slice 2D RLS** + owner lock).

---

## Stage 3 — Canonical order model (recommended)

### 3.1 Do not adopt the long example blindly

Proposed example (`draft → submitted → … → delivered` + `rejected`/`refunded` on order) **diverges** from production CHECK constraints and splits concerns that already exist on `payments` / `deliveries`.

### 3.2 Smallest safe V1 state machine (orders.status)

**Keep existing enum** (forward-compatible; no rename of `dispatched`):

```text
pending
  → confirmed
  → preparing
  → ready
  → dispatched        # delivery in transit (maps to “out_for_delivery” in product language)
  → completed         # delivered / picked up / dine-in done

pending|confirmed|preparing|ready → cancelled
```

| Product language | DB `orders.status` |
|---|---|
| Submitted / placed | `pending` |
| Branch accepted | `confirmed` |
| Kitchen cooking | `preparing` |
| Ready for pickup/rider | `ready` |
| Out for delivery | `dispatched` |
| Delivered / done | `completed` |
| Cancelled | `cancelled` |
| Rejected by branch | `cancelled` + `cancel_reason_code = rejected_by_branch` (column proposed) |
| Refunded | **Not** an order status — use `payment_status = refunded` |

**Explicitly defer adding** `draft`, `submitted`, `assigned`, `out_for_delivery`, `delivered`, `rejected` as order.status values in V1 (avoid dual vocab + migration churn). Rider assignment lives on **`deliveries.status`**.

### 3.3 Allowed transitions (orders)

| From | To | Actor (permission) | Notes |
|---|---|---|---|
| — | `pending` | Public/guest create (policy O2) / staff `order.create` | Create only |
| `pending` | `confirmed` | `order.manage` (cashier/BM/kitchen per seed) | Branch accept |
| `confirmed` | `preparing` | `order.manage` | Kitchen start |
| `preparing` | `ready` | `order.manage` | Kitchen done |
| `ready` | `dispatched` | `order.manage` or delivery.assign | Delivery only |
| `ready` | `completed` | `order.manage` | Pickup / dine-in |
| `dispatched` | `completed` | `order.manage` / rider delivery.update | Delivered |
| `pending`/`confirmed` | `cancelled` | Customer (rules below) or staff | |
| `preparing`/`ready` | `cancelled` | Staff only (BM/SA) | Stricter |
| `dispatched`/`completed`/`cancelled` | * | **None** (terminal except payment refunds) | |

Illegal transitions → `409 ORDER_INVALID_TRANSITION`.

### 3.4 Customer cancellation rules (recommend O5)

| Status | Customer cancel? |
|---|---|
| `pending` | Yes (within N minutes — default **15**) |
| `confirmed` | Yes only if branch policy allows (default **No** in Multan V1 — staff only) |
| Later | No — call branch / WhatsApp support |

### 3.5 Branch rejection

- Transition to `cancelled` with reason `rejected_by_branch` + free-text note  
- Actor: BM / cashier with `order.manage`  

### 3.6 Kitchen / rider

- Kitchen: `confirmed → preparing → ready`  
- Rider: mutate **`deliveries`**: `pending → assigned → picked-up → delivered` (and mirror order `ready → dispatched → completed`)  
- Never let rider change other branches’ orders  

### 3.7 Payment vs delivery separation

| Concern | Column / table |
|---|---|
| Fulfillment | `orders.status` |
| Money | `orders.payment_status` + `payments` rows |
| Logistics | `deliveries.status` |

COD Multan V1: create with `payment_status=pending`; mark `paid` when cashier collects (later slice).

### 3.8 Status history / audit

Append-only `order_status_logs`:

- `order_id`, `from_status`, `to_status`, `actor_user_id` (nullable for system), `actor_type` (`customer|staff|system|guest`), `reason_code`, `note`, `created_at`  
- No deletes; service-role or SECURITY DEFINER writer only  

---

## Stage 4 — Pricing integrity

### 4.1 Rule

**Server calculates all authoritative money fields from Postgres catalog.**  
Frontend totals / `unitPrice` / `extras[].price` / `subtotal` / `total` are **display-only** and must be ignored for persistence (may be accepted only for mismatch detection / telemetry).

### 4.2 Quote + create validation pipeline

For each line:

1. Resolve `menu_item` by slug; must exist, `is_available`, not hidden topping-as-standalone abuse  
2. Resolve variant by `variantLabel` / `size_code`; must be `is_available`  
3. Resolve each topping by **SKU slug** (`extra-chicken` …); price from topping variant matching pizza size tier (`small|medium|large` via same rules as `cart-config.ts`)  
4. Reject unknown / unavailable topping or missing size tier price  
5. Quantity ∈ positive int with max cap (recommend ≤ 20 / line, ≤ 50 lines)  
6. Branch by `branchCode` must be `operating`  
7. Snapshot: store `product_name`, `variant_name`, **`unit_price` (food only)**, **`extras_snapshot` jsonb**, **`line_unit_price`**, `line_total` at order time  
8. Subtotal = Σ line totals  
9. Delivery fee / discount / tax from **server policy** (V1: all **0** unless O7 changes)  
10. Grand total = subtotal − discount + tax + delivery_fee  

### 4.3 Immutable snapshots

| Field | Purpose |
|---|---|
| `order_items.product_name` / `variant_name` | Display forever |
| `order_items.unit_price` / `total_price` | Money forever |
| Proposed `extras_snapshot` jsonb | `[{slug, label, price}]` at order time |
| Proposed `pricing_version` / `quoted_at` on order | Audit |
| Keep FKs `menu_item_id` / `variant_id` | Analytics; nullable-safe if SKU later removed |

Future menu price edits **must not** rewrite historical `order_items` prices.

### 4.4 Quote endpoint purpose

`POST /orders/quote` returns server totals **without** persisting an order. Response must include **`quoteId`**, **`expiresAt`**, and **`warnings`** (Sprint **4.2**). Create always re-prices server-side and requires **`Idempotency-Key`** (O3 / R3).

---

## Stage 5 — Customer and guest ordering

### 5.1 Recommended V1 policy

| Mode | Policy |
|---|---|
| **Guest checkout** | **Allowed** (preserve today); require name + phone (+ address if delivery) |
| Authenticated email/password | Optional; if Bearer present, attach `auth_user_id` / resolve `customers` row when possible |
| Future WhatsApp OTP customer | Same attach path when 2C READY — **do not block Orders V1** |
| Phone storage | Normalize to E.164 **`+923XXXXXXXXX`** on server; accept `03…` input |
| Guest → login link | Later: match verified phone/email + explicit confirm (no silent merge) — after 2C/D6 patterns |
| Duplicate accounts | Unique `users.phone` / `customers.phone`; conflicts → support |

### 5.2 Required fields

| Order type | Required |
|---|---|
| All | `contact_name`, `contact_phone`, ≥1 item, `branchCode`, `orderType`, `orderSource` |
| Delivery | `delivery_address` (snapshot text V1; structured address table later) |
| Pickup / dine-in | Address optional |

### 5.3 Lookup

- Guest: tracking by `order_number` + phone (existing) + rate limit  
- Auth customer: list own orders via JWT → principal → customer/user link (after schema attach)  

---

## Stage 6 — Branch routing

| Topic | Design |
|---|---|
| Selection | V1: **customer-selected** `branchCode` (website already stores selection) |
| Auto-resolve | Defer radius/geo (O9); stub interface only |
| Operating | Reject if not `operating` |
| Types | `delivery` / `pickup` / `dine-in` as today |
| Immutability | `branch_id` **immutable after `confirmed`**; before that BM/SA may reassign (rare) |
| Staff authz | `requireBranchAccess(order.branch_id)` — **never** trust `x-telepizza-branch` / body branch for authz |
| Super-admin | Global read/manage |

---

## Stage 7 — API contracts (V1 customer / public)

Staff lifecycle endpoints are **designed but LOCKED** until Slice 2D RLS + owner approval (see §7.3).

### 7.1 `POST /api/v1/orders/quote`

| | |
|---|---|
| Auth | Optional Bearer |
| Body | branchCode, orderType, items[{menuItemSlug, variantLabel?, quantity, toppings?:[{slug}]}], couponCode? |
| **Ignore** | client unitPrice / extras.price / totals |
| Response | currency PKR, lines with snapshots, subtotal, discount, tax, deliveryFee, total, **`quoteId`**, **`expiresAt`**, **`warnings[]`** |
| Persist order? | **No** |
| Idempotency | Not required on quote (non-creating) |
| Errors | `BRANCH_UNAVAILABLE`, `MENU_ITEM_NOT_FOUND`, `VARIANT_*`, `TOPPING_*`, `VALIDATION_ERROR` |
| Rate limit | Per IP (+ phone if present) |

### 7.2 `POST /api/v1/orders`

| | |
|---|---|
| Auth | Optional Bearer (attach customer if present) |
| Headers | **`Idempotency-Key` required** (O3 / R3-A) |
| Body | quote fields + contactName, contactPhone, deliveryAddress?, notes?, orderSource, optional quoteId |
| Behavior | Re-price server-side (do not trust prior quote blindly if expired); insert order+items(+delivery); log status `pending` |
| Response | id, orderNumber, status, totals, createdAt |
| Never return | service secrets, other customers’ data, internal cost |

### 7.3 `GET /api/v1/orders/:idOrNumber`

| | |
|---|---|
| Auth | Bearer **or** `?phone=` for guest tracking (prefer migrate tracking under this or keep `/tracking`) |
| Authz | Owner phone/customer match **or** staff permission + branch |
| Response | Safe public/staff projection by role |

### 7.4 `GET /api/v1/orders`

| | |
|---|---|
| Auth | Bearer required |
| Customer | Own orders only |
| Staff | Locked until 2D — then branch-scoped `order.read` |

### 7.5 `POST /api/v1/orders/:id/cancel`

| | |
|---|---|
| Auth | Bearer or phone proof (O5) |
| Rules | Per cancellation matrix §3.4 |
| Effect | status `cancelled` + log + reason |

### 7.6 Staff lifecycle (LOCKED — design only)

```text
POST /api/v1/staff/orders/:id/transition  { toStatus, note? }
GET  /api/v1/staff/orders?branchId=&status=
POST /api/v1/staff/deliveries/:id/assign
POST /api/v1/staff/deliveries/:id/transition
```

Require `AuthPrincipal` + `order.manage` / `delivery.*` + branch access. **No implementation until O10 + Slice 2D.**

### 7.7 Idempotency (approved contract — R3-A)

| Rule | Behavior |
|---|---|
| Required on | **`POST /api/v1/orders` only** |
| Missing key | `400 IDEMPOTENCY_KEY_REQUIRED` |
| Same key + same canonical payload | Return **original** create result (`200` replay / equivalent) — **no duplicate order** |
| Same key + different canonical payload | `409 IDEMPOTENCY_CONFLICT` |
| Quote | Non-creating; **no** mandatory Idempotency-Key; return `quoteId` + `expiresAt` for later create |
| Shared foundation | Hash canonical payload; store on `orders.idempotency_key` + `idempotency_request_hash` |

Canonical payload for hash **excludes** all client money fields (unitPrice, extras.price, totals).

### 7.8 Rate limiting

- Quote/create: tight per IP; create also per normalized phone  
- Tracking: per IP + order number  

---

## Stage 8 — Database changes (proposed — do not write yet)

Forward-only migrations (after approval):

| Change | Purpose |
|---|---|
| `orders.cancel_reason_code` / `cancel_note` | Reject/cancel |
| `orders.auth_user_id` nullable | Link guest/auth without forcing `customers` row |
| `orders.contact_phone_e164` | Canonical +92 storage |
| `orders.idempotency_key` UNIQUE nullable | Dedup |
| `orders.pricing_snapshot` jsonb | Fee policy echo |
| `order_items.extras_snapshot` jsonb | Topping snapshots |
| `order_items.topping_slugs` or keep only jsonb | Prefer jsonb V1 |
| `order_status_logs` table | Audit |
| Indexes | `(branch_id, status)`, `(contact_phone_e164)`, `(auth_user_id)`, idempotency unique |
| Optional `order_quotes` TTL table | If O8 uses quoteId |

**Non-goals in first migration:** addresses table, full payment capture, radius tables.

---

## Stage 9 — RLS and security plan

### 9.1 Intended policies (Slice 2D timing — O10)

| Who | Policy intent |
|---|---|
| Customer | SELECT own orders where `auth_user_id = auth.uid()` or customer link |
| Guest | **No** broad SELECT; lookup via Edge/API with phone challenge only |
| Branch staff | SELECT/UPDATE orders where `branch_id` ∈ assigned branches AND permission |
| Rider | SELECT/UPDATE deliveries assigned to self; related order read limited |
| Super-admin | All |
| Anon | No direct table access |
| Service role | Backend writes |

### 9.2 Middleware vs RLS

| Control | Middleware | RLS |
|---|---|---|
| JWT verify | ✅ | — |
| Permission codes | ✅ `requirePermission` | ✅ defense in depth |
| Branch scope | ✅ `requireBranchAccess` | ✅ |
| Spoof headers | ✅ ignore | ✅ |
| Guest tracking | ✅ rate limit + phone | No guest SELECT |
| Price integrity | ✅ service only | N/A |

**Until 2D:** keep service-role API but add middleware on staff routes; do not open PostgREST anon to orders.

---

## Stage 10 — Failure and recovery

| Failure | Response |
|---|---|
| Duplicate submit | Idempotency-Key replay |
| Timeout after create | Client retries same key → same order |
| Branch closes mid-checkout | Quote/create fail `BRANCH_UNAVAILABLE`; WhatsApp fallback |
| Price change mid-checkout | Re-price on create; if quote mismatch beyond epsilon → `PRICE_CHANGED` |
| Item unavailable | `VARIANT_UNAVAILABLE` / `MENU_ITEM_NOT_FOUND` |
| API/Supabase outage | Website keeps WhatsApp + local `LOC-*` |
| Payment failure | Stay `payment_status=failed`; order may remain `pending/confirmed` (COD) |
| Rider unavailable | Order stays `ready`; delivery `pending` |
| Rollback | Delete order on partial insert; or use transaction/RPC |
| Refunds | Payment row only; order may stay `completed` + payment `refunded` |

---

## Stage 11 — Testing plan

| Layer | Cases |
|---|---|
| DB contract | CHECKs, FKs, unique idempotency, status log append-only |
| Transitions | Matrix legal/illegal |
| Pricing tamper | Client lies about unitPrice/extras → server ignores |
| Topping/variant | Size-tier price; unavailable reject |
| Idempotency | Same key / conflict body |
| Ownership | Guest phone; auth user; cross-user deny |
| Branch | Cross-branch staff deny; spoof header deny |
| Suspended user | Deny authenticated actions |
| API | Quote/create/cancel/track |
| Website smoke | Checkout, WhatsApp `0304-1110495`, track |
| Regression | Catalog **13/58/3/40/7**; email login; staff invite 2B |

---

## Stage 12 — Implementation slices (R1 locked)

| Slice | Scope | Status note |
|---|---|---|
| **4.0** | Architecture + O1–O12 freeze | ✅ APPROVED / FROZEN |
| **4.1** | Schema foundation: status logs, snapshots columns, idempotency columns, phone_e164, cancel fields; create harden | ✅ Landed in **PR #35** |
| **4.2** | Server **quote** + pricing engine + `quoteId` / `expiresAt` / `warnings` | 🟡 Partial early land in PR #35; finish remaining gaps as **4.2 only** |
| **4.3** | Hardened create/read/cancel + guest tracking | After 4.2 close |
| **4.4** | Website checkout uses quote/create; keep WhatsApp + local fallback | After 4.3 |
| **4.5** | Staff transition APIs + kitchen queue read | **Requires O9 + Slice 2D** |
| **4.6** | Rider assign + delivery transitions | After 4.5 |
| **4.7** | Production rollout, smoke, close | Gate next sprint UIs |

**R1:** Quote / server pricing product work is **Sprint 4.2**, not 4.1.  
**R4:** Canonical workstream was **PR #35** (merged). Do **not** create competing `feature/sprint-4-orders-pricing`.

---

## Owner decision card (O1–O12) — APPROVED

| ID | Question | Decision (locked) | Owner |
|---|---|---|---|
| **O1** | Keep DB order statuses as-is (`dispatched`/`completed`)? | **Yes** — keep + product aliases | ✅ |
| **O2** | Guest checkout in V1? | **Yes** | ✅ |
| **O3** | Require `Idempotency-Key` on create? | **Yes** (enforce — R3-A) | ✅ |
| **O4** | Server must ignore all client money fields? | **Yes** | ✅ |
| **O5** | Customer cancel window? | **pending only, 15 min** | ✅ |
| **O6** | Delivery fee / tax / discount V1? | **All 0** until fee engine | ✅ |
| **O7** | Branch selection model? | **Customer-selected**; geo later | ✅ |
| **O8** | Quote before create? | **Quote recommended; create always re-prices** | ✅ |
| **O9** | When unlock staff lifecycle APIs? | **After Slice 2D RLS PASS** | ✅ |
| **O10** | RLS vs middleware? | Middleware for staff ASAP; **RLS before POS/Kitchen UI** | ✅ |
| **O11** | Payments in Sprint 4? | **Schema + COD status only**; no gateway | ✅ |
| **O12** | WhatsApp `0304-1110495` flow? | **Preserve** | ✅ |

Do **not** silently change any O1–O12 decision.

---

## Blockers

| Blocker | Type |
|---|---|
| O1–O12 | ✅ Resolved |
| Slice 2C OTP provider | **Ops** — does not block Orders 4.1–4.4 |
| Slice 2D RLS | Blocks staff lifecycle **4.5+** and UI unlock |
| Production apply of `20260716120000_…` | **Owner approval** required |

---

## Final status

**SPRINT 4 ARCHITECTURE: APPROVED / FROZEN**

See `SPRINT-04-1-CLOSE-AND-4-2-READINESS.md` for PR #35 inventory and remaining Sprint 4.2 gaps.
