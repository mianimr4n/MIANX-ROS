# Sprint 4.3 — Website Checkout Integration

**Date:** 2026-07-16  
**Scope:** Website checkout quote/create integration only  
**Architecture:** O1–O12 APPROVED / FROZEN  
**Catalog freeze:** v1.2.0 unchanged (13 categories / 58 items / 3 toppings / 40 variants / 7 deals / 2 branches)  
**Ordering WhatsApp:** 0304-1110495 (unchanged)

---

## Outcome

Website checkout now uses the Sprint 4.2 quote contract end-to-end: server totals on load, signed `quoteId` on create, stable `Idempotency-Key` per attempt, guest checkout preserved, Bearer token when authenticated, WhatsApp fallback retained, and cart clears only on confirmed API success.

---

## PR and branch

| Item | Value |
|---|---|
| PR | [#40](https://github.com/mianimr4n/telepizza/pull/40) (draft) |
| Branch | `cursor/feature-sprint-4-3-website-checkout-bf31` |
| Base | `main` (includes PR #39 Sprint 4.2 merge `bd2d0f4`) |

---

## Requirements checklist

| Requirement | Result |
|---|---|
| Quote on checkout load (`POST /api/v1/orders/quote`) | ✅ |
| Server totals only in summary (not client subtotal when quote ready) | ✅ |
| Quote expiry UI + refresh before submit | ✅ |
| Stale quote responses ignored (`quoteRequestSeq` guard) | ✅ |
| `Idempotency-Key` stable per attempt; rotates on fingerprint change | ✅ |
| Guest checkout preserved | ✅ |
| Bearer token on create when `session.access_token` present | ✅ |
| `quoteId` passed on create | ✅ |
| Error mapping (`QUOTE_*`, `IDEMPOTENCY_*`, `VALIDATION_ERROR`, etc.) | ✅ |
| Cart **not** cleared on API failure or LOC-* fallback | ✅ |
| WhatsApp fallback `wa.me/923041110495` | ✅ |
| LOC-* only when API unavailable; no fake success when API configured | ✅ |
| Login / Register pages untouched | ✅ |
| Slice 2C OTP code untouched | ✅ |
| Menu / catalog business data untouched | ✅ |

---

## Files changed

| File | Purpose |
|---|---|
| `apps/website/client/src/lib/phone.ts` | Pakistan E.164 normalization (`+923…`) |
| `apps/website/client/src/lib/checkout-order.ts` | Quote payload builder, fingerprint, expiry helpers, error map, WhatsApp URL |
| `apps/website/client/src/lib/submit-order.ts` | `quoteId` + idempotency + bearer; `CheckoutSubmitError`; `requireApiSuccess` |
| `apps/website/client/src/lib/api.ts` | `ApiRequestError.code` from API envelope |
| `apps/website/client/src/lib/telepizza-api.ts` | `quoteOrder()`, `createOrderWithIdempotency()` |
| `apps/website/client/src/lib/telepizza-types.ts` | `QuoteOrderResponse`, `quoteId` on create payload |
| `apps/website/client/src/pages/Checkout.tsx` | Quote lifecycle UI, server totals, refresh, submit gate |
| `tests/website/checkout-integration.test.mjs` | Static + mirrored logic coverage |

---

## Validation

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ (preinstalled) |
| `pnpm check` | ✅ |
| `pnpm test:db` | ✅ 43 tests |
| `pnpm test:backend` | ✅ 66 tests |
| `pnpm build:website` | ✅ |
| `git diff --check` | ✅ |

---

## Explicitly out of scope (this slice)

| Item | Status |
|---|---|
| Production Vercel deploy | ❌ not in this turn |
| Backend cancel / hardened read APIs (architecture 4.3) | → **Phase B** |
| Slice 2C OTP UI / endpoints | ❌ not authorized |
| Staff lifecycle APIs | ❌ blocked on Slice 2D |
| Menu / catalog mutations | ❌ frozen |

---

## Phase B — next authorized work

Per `ORDERS_ARCHITECTURE.md` Stage 12, after website quote/create integration the next backend slice is **hardened create/read/cancel + guest tracking** (`POST /api/v1/orders/:id/cancel`, customer cancel window O5, status logs). Phase B started on branch `cursor/sprint-4-3b-orders-hardening-bf31`.

---

**SPRINT 4.3 WEBSITE CHECKOUT STATUS: PASS**
