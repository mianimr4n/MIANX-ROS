# Sprint 4.1 Close + Sprint 4.2 Readiness

**Date:** 2026-07-16  
**Architecture:** APPROVED / FROZEN (O1–O12)  
**Conflict resolutions:** R1–R4  
**Canonical PR:** [#35](https://github.com/mianimr4n/telepizza/pull/35) — **MERGED** (`630d0cc`)  
**This document:** Close report for **4.1** + readiness for remaining **4.2** — **no new mixed-slice code in this turn**

---

## 1. What PR #35 actually contains (inventory)

### A. Sprint 4.1 — schema / create foundation (correct slice)

| Item | Location | Notes |
|---|---|---|
| Migration | `supabase/migrations/20260716120000_sprint4_1_orders_quote_snapshots.sql` | Adds `contact_phone_e164`, `idempotency_key`, `idempotency_request_hash`, `pricing_snapshot`, cancel fields, `order_items.extras_snapshot`, `food_unit_price`, `order_status_logs` |
| Idempotency enforce (R3-A) | `routes.ts` + `supabase.ts` create | Required header; replay; `409 IDEMPOTENCY_CONFLICT` |
| Create path harden | `supabase.ts` | Delivery address required; ignore client money via pricing engine; rollback orphan order; status log `pending` |
| Phone E.164 | `pricing.ts` / create | `+923…` normalization |
| DB contract test | `tests/database/sprint4-1-orders-quote.test.mjs` | Static migration assertions |
| Prior helpers | `create-helpers.ts` (from earlier PR #34) | Still present; overlapping with pricing helpers |

**Production migration apply:** ❌ **Not done** (owner gate — no apply in this report).

### B. Sprint 4.2 — quote / pricing (landed early under wrong label)

| Item | Location | Notes |
|---|---|---|
| Pricing engine | `backend/api/src/services/orders/pricing.ts` | Catalog/variant/topping validation; ignores client prices |
| `POST /api/v1/orders/quote` | `routes.ts` | Non-creating quote |
| Create uses same engine | `supabase.ts` | Shared pricing for create |
| Pricing unit tests | `backend/api/tests/orders-pricing.test.ts` | Tamper / tier / unavailable |

**Mislabel:** Commit/PR title said “Sprint 4.1 quote engine…”. Per **R1**, that product work is **4.2**. Docs updated accordingly; code stays (already merged) — do not re-ship under a competing branch (**R4**).

---

## 2. Sprint 4.1 close verdict

| Gate | State |
|---|---|
| Schema foundation on `main` | ✅ via PR #35 |
| Idempotency contract on create | ✅ matches R3-A |
| Architecture O1–O12 frozen | ✅ this docs turn |
| Production migration applied | ❌ pending owner |
| Prod smoke after migration | ❌ blocked on apply |
| Slice label hygiene | ✅ docs corrected (quote ≠ 4.1) |

**SPRINT 4.1 CODE STATUS: COMPLETE ON MAIN (docs closed)**  
**SPRINT 4.1 PRODUCTION STATUS: BLOCKED ON MIGRATION APPROVAL**

Do **not** add more 4.1 feature code. Do **not** mix remaining quote contract work into a “4.1 fix” PR.

---

## 3. Sprint 4.2 readiness — remaining gaps only

Already present on `main` (early 4.2): quote route + pricing engine + create re-price.

**Still required to call Sprint 4.2 DONE** (implement in a dedicated 4.2 slice / PR):

| Gap | Required by |
|---|---|
| Quote response **`quoteId`** | Architecture §7.1 / R3 |
| Quote response **`expiresAt`** | Architecture §7.1 / R3 |
| Quote response **`warnings[]`** | Architecture §7.1 |
| Optional quote persistence / TTL table | O8 design (if quoteId must round-trip) |
| Tests for quote expiry + warning cases | Stage 11 |
| Relabel migration/test file names in docs only (optional rename later — avoid churn unless needed) | R1 hygiene |

**Explicitly out of 4.2:** staff lifecycle, kitchen, rider, OTP, website checkout rewrite (4.4), production migrate/deploy without approval.

---

## 4. Branch / PR policy (R4)

| Action | Allowed? |
|---|---|
| Continue from merged PR #35 baseline on `main` | ✅ |
| Create `feature/sprint-4-orders-pricing` as competing impl | ❌ |
| New branch only for **remaining 4.2 gaps** after owner authorizes 4.2 start | ✅ (when authorized) |
| Merge/deploy/prod migrate in this docs turn | ❌ |

---

## 5. Stop line

This turn: **docs only** (architecture freeze + conflict resolve + close/readiness).  
**No** further quote/pricing feature code until owner authorizes **Sprint 4.2 remaining gaps**.  
**No** production migration · **no** merge of this docs PR to main unless owner asks · **no** deploy.

### Final lines

**SPRINT 4.1: CLOSED (code on main) — production migration PENDING**  
**SPRINT 4.2: READY FOR AUTHORIZATION (remaining: quoteId / expiresAt / warnings)**  
**ARCHITECTURE: APPROVED / FROZEN (O1–O12)**
