# Sprint 4.3 — Website Checkout Production Close

**Date:** 2026-07-16
**Scope:** Website checkout quote/create integration — production rollout only
**Architecture:** O1–O12 APPROVED / FROZEN
**Catalog freeze:** v1.2.0 unchanged (13 / 58 / 3 / 40 / 7 · 2 branches)
**Ordering WhatsApp:** 0304-1110495 (unchanged)
**No DB migration in this slice**

---

## Phase 1 — PR review (#44)

**Verdict: PASS** — no blockers; implementation already on `main`.

| Area | Result |
|---|---|
| Quote lifecycle (canonical cart, server totals, expiry, stale guard) | ✅ |
| Idempotency (stable key, fingerprint rotation, double-submit guard) | ✅ |
| Order submission (quoteId, guest/auth, no spoof headers, cart clear gate) | ✅ |
| LOC-* fallback (labeled pending/local; no fake API success) | ✅ |
| WhatsApp 0304-1110495 / wa.me manual fallback | ✅ |
| Phone E.164 + delivery address rules | ✅ |
| UI states + OrderSuccess receipt | ✅ |
| Security (no secrets, sanitized errors, no client money trust) | ✅ |
| Scope hygiene (website checkout files only in PR #44 delta) | ✅ |

**PR #44 delta (on top of merged #41 core):** `Checkout.tsx`, `OrderSuccess.tsx`, checkout tests, close report doc.

**Not touched:** Login/Register, menu/catalog data, auth/OTP, staff invites, Kitchen/Rider/POS.

---

## Phase 2 — Validation (post-merge `main` @ `87e0493`)

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ |
| `pnpm check` | ✅ |
| `pnpm test:db` | ✅ 57 pass |
| `pnpm test:backend` | ✅ 78 pass |
| `pnpm build:website` | ✅ |
| `git diff --check` | ✅ |

Catalog static regression: **13 categories / 58 items / 3 toppings / 40 variants / 7 deals**. Auth + staff-invite tests green.

---

## Phase 3 — Merge

| Item | Value |
|---|---|
| PR | [#44](https://github.com/mianimr4n/telepizza/pull/44) |
| Branch | `feature/sprint-4-3-website-checkout` |
| Merge commit | `87e04938688c7fce0bc9e229ee058bf51d858b24` |
| GitHub CI | ✅ Vercel + checks green (pre-merge) |
| Working tree | ✅ clean on `main` |

---

## Phase 4 — Production deploy

| Surface | Action | Result |
|---|---|---|
| **Vercel** `telepizza-website` | Auto-deploy from merge commit `87e0493` | ✅ |
| Production bundle | `/assets/index-C6k9B0GE.js` | ✅ contains `telepizza-api.onrender.com/api/v1` |
| **Render API** | No redeploy required (already healthy on quote/create stack) | ✅ |
| `GET /healthz` | 200 | ✅ |
| `GET /readyz` | 200 | ✅ |

### Environment verification (names only — values not recorded)

| Variable | Surface | Present |
|---|---|---|
| `VITE_API_BASE_URL` | Vercel production | ✅ `https://telepizza-api.onrender.com/api/v1` (verified via bundle) |
| `VITE_SUPABASE_URL` | Vercel production | ✅ (site loads menu live mode) |
| `VITE_SUPABASE_ANON_KEY` | Vercel production | ✅ (site loads menu live mode) |
| Service-role keys | Vercel | ❌ not exposed (confirmed — not in frontend bundle) |

---

## Phase 5 — Production smoke

### A. Guest delivery

| Check | Result |
|---|---|
| Quote `POST /orders/quote` (tele-special Small + Extra Chicken) | ✅ 200 total **549** |
| Create with `quoteId` + `Idempotency-Key` | ✅ 201 `TP-MRNB4ESW-4833` |
| Server ignored `unitPrice: 1` / hacked name | ✅ priced 549 (499 + 50 topping) |
| Tracking `?phone=03459876543` | ✅ 200 status `pending` |
| `contact_phone_e164` | ✅ `+923459876543` |

### B. Guest pickup

| Check | Result |
|---|---|
| Quote without delivery address | ✅ 200 |
| Create pickup | ✅ 201 `TP-MRNB4IX1-2274` total **499** |
| `order_type` | ✅ `pickup` |

### C. Quote / idempotency

| Check | Result |
|---|---|
| Same key + same payload replay | ✅ 200 same `orderNumber` |
| Same key + changed payload (no quoteId) | ✅ 409 `IDEMPOTENCY_CONFLICT` |
| Same key + changed payload with bound `quoteId` | ✅ 409 `QUOTE_PAYLOAD_MISMATCH` (safe — no duplicate) |
| Missing `Idempotency-Key` | ✅ 400 `IDEMPOTENCY_KEY_REQUIRED` |
| Delivery without address | ✅ 400 `DELIVERY_ADDRESS_REQUIRED` |

### D. Website regression

| Check | Result |
|---|---|
| `/` `/menu` `/checkout` `/login` `/register` | ✅ 200 |
| Bundle WhatsApp `0304-1110495` + `wa.me` | ✅ |
| Bundle `requireApiSuccess` (no fake LOC success when API configured) | ✅ |
| Live catalog API counts | ✅ 13 / 58 / 3 / 40 / 7 |
| Branches | ✅ 2 (`royal-orchard` operating, `northern-bypass` coming-soon) |

### E. LOC-* / authenticated paths

| Check | Result |
|---|---|
| LOC-* in production (API configured) | ✅ not triggered — `requireApiSuccess: true` blocks fake success |
| Authenticated Bearer checkout | ⏭ not executed live (no test customer session); static/code review ✅ `session?.access_token` |

### F. Quote expiry / double-click (UI)

| Check | Result |
|---|---|
| 5-minute expiry + requote | ✅ unit/static tests; live wait skipped |
| Double-click guard | ✅ `submitInFlight` in source + static tests |

---

## Phase 6 — Cleanup

Smoke orders deleted from production (`orders`, `order_items`, `order_status_logs`, `deliveries`):

- `TP-MRNB4ESW-4833`, `TP-MRNB4IX1-2274`, `TP-MRNB5IAR-9372`, `TP-MRNB6NMB-2198`, `TP-MRNB683P-3647`

**Post-cleanup order count:** **1** (pre-existing only)

| order_number | Notes |
|---|---|
| `TP-MRMSVWJG-4784` | Pre-existing real row — **untouched** |

---

## Blockers

None.

---

## Out of scope (not started)

Slice 2C OTP · Kitchen · Rider · POS · Admin · payment gateway · Sprint 4.4.

---

**SPRINT 4.3 WEBSITE CHECKOUT: PASS AND CLOSED**
