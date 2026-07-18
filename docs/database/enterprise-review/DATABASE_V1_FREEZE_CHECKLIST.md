# Database V1 Freeze Checklist

**Status:** INCOMPLETE — NOT FROZEN  
**Date:** 2026-07-18  
**Branch:** `docs/enterprise-database-architecture-review`  
**Linked project:** `pyeowxvacgypohrbvgee`  
**Mode:** Analysis & design only — **no migrations applied, no production mutation, no SQL Editor writes**

**Verdict:**

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Done on linked production **and** present on `main` |
| 📐 | Designed (open PR / architecture) — **not** on `main` / prod |
| ❌ | Missing design or missing apply |
| ⏭ | Explicitly out of V1 freeze scope |

**Actual vs designed:** R0–R2 are **live**. R3–R6 are **designed only** (PRs #69–#72 OPEN). Do not treat designed SQL as production truth.

---

## Phase 0 — Safety (every freeze attempt)

- [x] Linked project ref = `pyeowxvacgypohrbvgee`
- [x] Docs-only engagement; no production mutation
- [x] No credentials exposed
- [x] No Admin / POS / Kitchen / Rider UI in this PR
- [ ] Latest freeze attempt: `migration list --linked` re-verified on clean `main`
- [ ] Latest freeze attempt: `db push --linked --dry-run` clean on `main` (expect up to date through R2 only)

---

## A — Privilege & drift (DB-R0 / DB-R1)

| Gate | State | Class |
|---|---|---|
| P0 grant + DEFINER EXECUTE hardening applied | ✅ Live (`20260718130000`) | REQUIRED BEFORE V1 FREEZE |
| P1 unmanaged `public.profiles` retired | ✅ Live (`20260718130100`); `profiles` absent on prod per R7 re-audit | REQUIRED BEFORE V1 FREEZE |
| Stale open PRs #65 / #66 closed or superseded | ❌ Still OPEN (content landed via #67 path) | SAFE FOR FEATURE PHASE (hygiene) |

---

## B — Catalog & modifiers (DB-R2)

| Gate | State | Class |
|---|---|---|
| Modifier tables on prod | ✅ `modifier_groups`, `modifier_options`, `item_modifier_groups`, `order_item_modifiers`, `branch_modifier_options` | REQUIRED BEFORE V1 FREEZE |
| Owner alignment migration | ✅ `20260718130200` | REQUIRED BEFORE V1 FREEZE |
| Catalog freeze facts documented | ✅ Board target **13 / 58 / 3 / 40 / 7 · 2 branches** | REQUIRED BEFORE V1 FREEZE |
| Live count vs freeze board reconciled | ❌ R7 saw **15 / 67** categories/items — governance follow-up | SAFE FOR FEATURE PHASE (P2) |
| Branch option hide rows populated as needed | ⏭ Default-open (`branch_modifier_options` = 0) OK | SAFE FOR FEATURE PHASE |

---

## C — Core restaurant foundations (DB-R3…R6)

| Gate | Designed? | Live on prod? | PR | Class |
|---|---|---|---|---|
| `restaurant_tables` + QR hash | 📐 | ❌ | #69 | REQUIRED BEFORE V1 FREEZE |
| `dine_in_sessions` + order nullable FKs | 📐 | ❌ | #70 | REQUIRED BEFORE V1 FREEZE |
| `kitchen_tickets` + `kitchen_ticket_items` | 📐 | ❌ | #71 (**polluted** — War Room blocked) | REQUIRED BEFORE V1 FREEZE |
| `kitchen_stations` (multi-station routing) | Architecture yes; R5 PR **defers** | ❌ | — | SAFE FOR FEATURE PHASE if one-ticket-per-order accepted |
| `restaurant_bills` + `bill_orders` | 📐 | ❌ | #72 | REQUIRED BEFORE V1 FREEZE |
| `pos_sessions` | Architecture REQUIRED; R6 PR **omits** | ❌ | — | Owner gate — see Recommendations |
| Dedicated RBAC permission codes for table/kitchen/POS | Partial helpers in PRs | ❌ not fully seeded as DB-R7 | — | REQUIRED BEFORE V1 FREEZE (with apply) |

**Stack rule:** Apply R3 → R4 → R5 → R6 in order. Do not apply R4+ until R3 is on remote.

---

## D — Freeze declaration gates

| Gate | Result |
|---|---|
| Migration history `main` ≡ remote through R2 | ✅ (per DB-R7 re-audit) |
| R3–R6 present on remote | ❌ FAIL |
| R3–R6 merged to `main` | ❌ FAIL (PRs OPEN) |
| PR #71 clean (no governance pollution) | ❌ FAIL — War Room blocked |
| Owner signed freeze checklist | ❌ |
| Official freeze declaration LOCKED | ❌ **WITHHELD** |

---

## E — Explicitly not required for V1 freeze

⏭ Admin / POS / Kitchen / Rider **UI**  
⏭ `payment_splits`, bill split UX, merge/move tables UX  
⏭ Inventory / BOM / vendors / purchase / stock  
⏭ Loyalty / wallet / coupons / promotions engines  
⏭ Notifications / devices / push tokens  
⏭ Reviews / feedback product tables  
⏭ Per-branch physical databases  
⏭ Full payment-provider capture beyond skeleton `payments`

---

## Catalog freeze facts (board)

| Metric | Freeze board | Notes |
|---|---|---|
| Categories | 13 | Live may show 15 — reconcile, do not silently mutate pricing |
| Items | 58 | Live may show 67 |
| Topping SKUs | 3 | Keep until post-modifier verification |
| Variants | 40 | |
| Deals (board) | 7 | |
| Branches | 2 | |

---

## Sign-off block (blank until PASS)

| Role | Name | Date | Decision |
|---|---|---|---|
| Human Owner | | | ☐ APPROVE FREEZE / ☐ REJECT |
| Lead Database Architect | Enterprise review (this pack) | 2026-07-18 | **REJECT — BLOCKED** |

```text
DATABASE V1 FREEZE: BLOCKED — REMEDIATION REQUIRED
```
