# Sprint 4.3 — Website Checkout Integration (Final)

**Date:** 2026-07-16
**Branch:** `feature/sprint-4-3-website-checkout`
**Base:** `main` (Sprint 4.2 quote contract merged)
**Architecture:** O1–O12 APPROVED / FROZEN
**Catalog freeze:** v1.2.0 unchanged
**Ordering WhatsApp:** 0304-1110495 (unchanged)

---

## Phase 1 — Checkout audit (pre-implementation baseline)

### Current flow (before Sprint 4.3)

| Step | Behavior |
|---|---|
| Cart | `CartContext` + `CartDrawer` — client subtotal, WhatsApp deep link |
| Checkout | Form collect name/phone/address → `submitWebsiteOrder` |
| API off | `LOC-*` localStorage order, WhatsApp confirm |
| API on (pre-4.3) | Partial quote wiring; unstable idempotency; cart could clear on failure |

### Reusable code

| Asset | Location |
|---|---|
| Cart state | `contexts/CartContext.tsx` |
| Branch selection | `contexts/BranchContext.tsx` |
| Auth session | `contexts/AuthContext.tsx` |
| API client | `lib/api.ts`, `lib/telepizza-api.ts` |
| Local orders | `lib/customer-store.ts` |
| WhatsApp builder | `CartDrawer`, later `checkout-order.ts` |

### Unsafe behavior (fixed in Sprint 4.3)

| Issue | Fix |
|---|---|
| Client totals trusted | Server quote totals displayed |
| No quote expiry | 5-min `expiresAt` lifecycle + requote |
| Stale quote races | `quoteRequestSeq` guard |
| Unstable idempotency | Fingerprint-rotated `Idempotency-Key` |
| Fake API success via LOC-* | `requireApiSuccess: true` when API configured |
| Cart cleared on failure | Clear only after `source === "api"` |
| LOC shown as confirmed | OrderSuccess labels local vs API |

### Files changed (Sprint 4.3)

| File | Role |
|---|---|
| `lib/phone.ts` | E.164 normalization |
| `lib/checkout-order.ts` | Quote payload, fingerprint, expiry, errors, WA URL |
| `lib/submit-order.ts` | Quote/create with idempotency + bearer |
| `lib/api.ts` | Error `code` propagation |
| `lib/telepizza-api.ts` | `quoteOrder`, `createOrderWithIdempotency` |
| `lib/telepizza-types.ts` | Quote/create types |
| `pages/Checkout.tsx` | Quote lifecycle, server totals, submit |
| `pages/OrderSuccess.tsx` | Receipt with server total/status vs LOC label |
| `tests/website/checkout-integration.test.mjs` | Phase 11 coverage |

### Files not touched

Login, Register, StaffAccept, Menu, Home, catalog data/migrations, auth architecture, staff invites, OTP, Kitchen/Rider/POS, payment gateway, production config.

---

## Quote lifecycle

```
Cart change / checkout load
  → buildQuoteRequest(cart, branch, orderType, phone)
  → POST /api/v1/orders/quote
  → store quoteId, expiresAt, server items, server totals, warnings
  → UI: loading → ready | expiring | expired | error
  → stale responses discarded (seq guard)
  → on submit: requote if expired
  → POST /api/v1/orders + quoteId + Idempotency-Key [+ Bearer]
```

Server `expiresAt` is authoritative (5 minutes). Client clock used only for display countdown.

---

## Idempotency behavior

| Rule | Implementation |
|---|---|
| One key per checkout attempt | `crypto.randomUUID()` on mount |
| Reuse on retry / double-click | Same key until fingerprint changes |
| Rotate on material change | `checkoutAttemptFingerprint` effect |
| Double-submit guard | `submitInFlight` ref + `isSubmitting` |
| Conflict surfaced | `IDEMPOTENCY_CONFLICT` → user message |

---

## Guest checkout

- Name + Pakistani phone required (no login)
- Phone normalized `03XXXXXXXXX` → `+923XXXXXXXXX`
- Delivery address required only for delivery
- No `customerId` sent from frontend

---

## Authenticated checkout

- `Authorization: Bearer {session.access_token}` when session exists
- Backend resolves identity; no role/branch headers from client
- Guest flow unchanged when logged out

---

## WhatsApp fallback

- Number locked: **0304-1110495** (`wa.me/923041110495`)
- Manual `wa.me` — no auto-send
- Available on Checkout + OrderSuccess + CartDrawer
- Not labeled as confirmed API order

---

## LOC-* fallback (retained V1)

| Rule | Behavior |
|---|---|
| When | API not configured, or `requireApiSuccess` false |
| Label | `LOC-*` / local — pending, not branch-confirmed |
| Cart | Not cleared when API configured but submit fails |
| Auto-resubmit | None — explicit user action only |
| OrderSuccess | Warns "not confirmed by branch" |

---

## Test results

| Suite | Result |
|---|---|
| `pnpm check` | ✅ |
| `pnpm test:db` | ✅ (47 website + db tests) |
| `pnpm test:backend` | ✅ (78) |
| `pnpm build:website` | ✅ |
| `git diff --check` | ✅ |

Phase 11 cases covered in `tests/website/checkout-integration.test.mjs` (cart→quote, server totals, expiry, fingerprint, stale guard, idempotency, double-submit, guest, bearer, phone, address rules, cart retention, LOC labeling, regressions).

---

## Blockers

| Blocker | Status |
|---|---|
| Production Vercel deploy | Owner gate — not in this PR |
| Slice 2C OTP | Not authorized |
| Staff/Kitchen/Rider APIs | Out of scope |

---

## Production rollout plan (owner)

1. Merge PR to `main`
2. Set `VITE_API_BASE_URL` on Vercel to `https://telepizza-api.onrender.com/api/v1`
3. Smoke: menu → cart → checkout quote → create → track
4. Verify WhatsApp `0304-1110495` regression
5. No new Supabase migrations required for website-only slice

---

**SPRINT 4.3 WEBSITE CHECKOUT: PASS**
