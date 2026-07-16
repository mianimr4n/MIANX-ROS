# Sprint 4 — Next Readiness (Post 4.3 Close)

**Date:** 2026-07-16
**Baseline:** Catalog freeze v1.2.0 · O1–O12 FROZEN · WhatsApp **0304-1110495**

---

## Closed on `main`

| Slice | Status | Close report |
|---|---|---|
| Sprint 4.1 Orders foundation | ✅ PASS AND CLOSED (prod) | `SPRINT-04-1-PRODUCTION-CLOSE.md` |
| Sprint 4.2 Quote contract | ✅ merged PR #39 | architecture docs |
| Sprint 4.3 Website checkout | ✅ PASS AND CLOSED (prod) | `SPRINT-04-3-PRODUCTION-CLOSE.md` |
| Sprint 4.3 Phase B guest read/cancel | ✅ PASS AND CLOSED (prod) | `SPRINT-04-3B-PRODUCTION-CLOSE.md` |

**Production surfaces**

| Surface | URL | Status |
|---|---|---|
| Website | https://telepizza-website.vercel.app | ✅ quote/create checkout live |
| API | https://telepizza-api.onrender.com | ✅ `/healthz` `/readyz` 200 |
| Catalog | live Supabase | ✅ 13 / 58 / 3 / 40 / 7 · 2 branches |

---

## Not started (requires owner authorization)

| Track | Blocker | Notes |
|---|---|---|
| **Slice 2C** Phone/WhatsApp OTP UI | Ops — Meta/Twilio/WABA/CAPTCHA | Eng paused; ordering number never used for OTP |
| **Slice 2D** RLS for orders/payments/deliveries | Not started | **Hard gate** before POS/Kitchen/Rider UI |
| **Sprint 4.5** Staff order lifecycle APIs | Slice 2D + O9 | transition APIs, kitchen queue read |
| **Sprint 4.6** Rider delivery transitions | After 4.5 | |
| Kitchen / POS / Admin / payment gateway | Out of scope | |

---

## Recommended next slice (pick one — owner approval required)

### Option A — Slice 2D RLS (platform gate)

**Why:** Unlocks staff lifecycle (4.5+) and prevents cross-branch data leaks before any operational UI.

**Scope:** RLS policies on `orders`, `order_items`, `payments`, `deliveries`; middleware alignment; tests; no POS UI.

### Option B — Sprint 4.4 My Orders alignment (customer)

**Why:** Authenticated customers still see localStorage drift; backend can attach `auth_user_id` on create when session exists.

**Scope:** Website `Orders.tsx` + API list/read for own orders only; no OTP; no staff APIs.

### Option C — Slice 2C.0 ops (non-engineering)

**Why:** Unblocks future customer phone OTP when dedicated **Telepizza Login** sender is READY.

**Scope:** Meta/Twilio/pilot checklist only — no code until READY.

---

## Locked rules (carry forward)

- Server pricing authority only
- `Idempotency-Key` mandatory on create
- Guest checkout always supported
- WhatsApp **0304-1110495** unchanged
- No fake LOC-* confirmed orders when API configured
- Login/Register temporary until Slice 2C

---

**SPRINT 4.3 COMPLETE — AWAITING OWNER PICK FOR NEXT SLICE**
