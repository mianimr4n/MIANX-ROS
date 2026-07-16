# Sprint 4 — Orders Domain Implementation Brief

**Status:** Architecture ✅ **APPROVED / FROZEN** · O1–O12 locked · Orders Core 4.1–4.3 **CLOSED**
**Date:** 2026-07-16
**Master sequence:** `TELEPIZZA-MASTER-ROADMAP.md` (Phases 0–15 **LOCKED**)
**Canonical architecture:** `docs/architecture/ORDERS_ARCHITECTURE.md`
**Lifecycle (next):** `SPRINT-04-4-ORDER-LIFECYCLE-ARCHITECTURE.md` (**plan-only**)
**Authz SSOT:** `docs/architecture/AUTHENTICATION_ARCHITECTURE.md`
**OTP ops (paused):** `docs/architecture/SLICE-2C0-OTP-OPERATIONS-READINESS.md`
**Conflict resolutions:** R1–R4 approved — `SPRINT-04-1-CONFLICT-REPORT.md`
**Catalog freeze:** 13 / 58 / 3 / 40 / 7
**Verified business contact (current):** 0304-1110495 (re-verify Phase 15)

---

## Slice map (R1 locked)

| Slice | Scope | Label rule |
|---|---|---|
| **4.1** | Schema / snapshots / idempotency columns / create harden foundation | **Not** “quote product” |
| **4.2** | Quote engine + server pricing + `quoteId` / `expiresAt` / `warnings` | Quote work lives here |

Do not label quote/pricing work as Sprint 4.1 in prompts or reports.

---

## Idempotency contract (R3-A)

- `POST /api/v1/orders` **requires** `Idempotency-Key`
- Same key + same canonical payload → original result (no duplicate order)
- Same key + different payload → `409 IDEMPOTENCY_CONFLICT`
- Quote is non-creating; no mandatory idempotency header; response must carry `quoteId` + `expiresAt`

---

## Decision card O1–O12 — APPROVED

| ID | Locked decision |
|---|---|
| O1 | Keep existing status enums |
| O2 | Guest checkout yes |
| O3 | Idempotency-Key required on create |
| O4 | Ignore all client money fields |
| O5 | Customer cancel: pending only, 15 min |
| O6 | Fees/tax/discount = 0 in V1 |
| O7 | Customer-selected branch |
| O8 | Quote recommended; create always re-prices |
| O9 | Staff APIs after Slice 2D |
| O10 | Middleware first; RLS before POS/Kitchen UI |
| O11 | COD status only; no payment gateway |
| O12 | Preserve WhatsApp 0304-1110495 |

Do not silently change these decisions.

---

## PR / branch (R4)

- Canonical stream: **PR #35** (merged to `main`)
- Do **not** create `feature/sprint-4-orders-pricing` as a competing branch

---

## Agent stop line

- No production migration without owner approval
- No lifecycle API / Kitchen / Rider / POS code until Sprint 4.4 is **APPROVED / FROZEN** and Slice 2D gates staff UI
- No final production number lock before Phase 15
- Stop and report on any new architecture conflict

**SPRINT 4 CORE: CLOSED · 4.4 LIFECYCLE ARCHITECTURE: OWNER REVIEW**
