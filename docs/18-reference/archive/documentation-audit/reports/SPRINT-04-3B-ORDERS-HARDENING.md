# Sprint 4.3 Phase B — Orders Hardening

**Date:** 2026-07-16
**Scope:** Guest cancel + canonical read + rate limits + website cancel UI
**Architecture:** O1–O12 APPROVED / FROZEN · O5 customer cancel window locked (pending, 15 min)
**Branch:** `cursor/sprint-4-3b-orders-hardening-continue-bf31`
**Base:** `main` (includes merged PR #41 website checkout + PR #42 guest cancel)

---

## Outcome

Phase B backend hardening and website cancel hookup are **complete on production**. See `SPRINT-04-3B-PRODUCTION-CLOSE.md`.

---

## Production

| Item | Result |
|---|---|
| Render API (PR #43 on main) | ✅ guest read + cancel live |
| Vercel website cancel UI | ✅ TrackOrder `/cancel` in bundle |
| Production smoke + cleanup | ✅ `SPRINT-04-3B-PRODUCTION-CLOSE.md` |

## Delivered

| Item | Result |
|---|---|
| `POST /api/v1/orders/:orderNumber/cancel` (guest phone proof) | ✅ merged PR #42 |
| `GET /api/v1/orders/:orderNumber?phone=` canonical guest read | ✅ |
| `GET /api/v1/orders/:orderNumber/tracking` kept as alias | ✅ |
| Shared `contactPhoneMatchesOrder` | ✅ |
| Customer cancel rules (`pending` only, 15-minute window) | ✅ |
| Guest access rate limits (track + cancel, per IP + order) | ✅ |
| Status log append on cancel | ✅ |
| Website `TrackOrder` cancel button (API orders only) | ✅ |
| Unit + route + static website tests | ✅ |

---

## API contract

### `GET /api/v1/orders/:orderNumber?phone=`

Same safe projection as `/tracking` — architecture §7.3 canonical read.

### `POST /api/v1/orders/:orderNumber/cancel`

| Field | Rule |
|---|---|
| Body `contactPhone` | Required — must match order phone |
| Allowed status | `pending` only |
| Window | 15 minutes from `created_at` (O5) |

### Rate limits (process-local)

| Action | Limit |
|---|---|
| Track / read | 30 req/min per IP per order number |
| Cancel | 10 req/min per IP per order number |

---

## Validation

| Command | Result |
|---|---|
| `pnpm check` | ✅ |
| `pnpm test:db` | ✅ |
| `pnpm test:backend` | ✅ |
| `pnpm build:website` | ✅ |

---

## Explicitly out of scope

| Item | Status |
|---|---|
| Production API / Vercel deploy | Owner gate |
| Staff transition APIs | Blocked on Slice 2D |
| Slice 2C OTP | Not authorized |
| Authenticated customer order list API drift fix | Future slice |

---

**SPRINT 4.3 PHASE B STATUS: PASS AND CLOSED**
