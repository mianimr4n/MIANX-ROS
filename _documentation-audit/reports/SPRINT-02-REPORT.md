# Sprint 2 — Option B Final Report

**Date:** 2026-07-15  
**Release:** **v1.2.0**  
**Git SHA:** `697554a` (`main`, PR #24)  
**Status:** Phases A + B + C **PASS** — Release Freeze **LOCKED** — Sprint 3 auth next (catalog frozen)

---

## Executive verdict

| Gate | Status |
|---|---|
| Option B architecture | **PASS** |
| Phase A — code merge | **PASS** |
| Phase B — production migrations | **PASS** |
| Phase C — live customer UX | **PASS** |
| Release Phase + baseline lock | **PASS** (`v1.2.0` / Known Good) |
| Official Sprint 2 close | **PASS** (frozen) |
| Sprint 3 Auth | **Authorized** — menu/pricing/catalog/business rules stay frozen |

**Customer-critical production is green.** Baseline `v1.2.0` is the rollback point.

---

## Locked BFRs

| BFR | Decision |
|---|---|
| BFR-001 | **HYBRID** — live Supabase menu reads allowed; API catalog remains published contract |
| BFR-003 | **REPRICE** — Behari Kabab Pizza **Rs 549**, Starting Price, **no invented variants** |
| BFR-012 | **BOTH Option B** — toppings = internal SKUs for customizer + Admin/POS; not public category |

---

## Production snapshot (verified Release Phase)

| Check | Result |
|---|---|
| Website | https://telepizza-website.vercel.app |
| API | https://telepizza-api.onrender.com |
| Supabase | `pyeowxvacgypohrbvgee` |
| `/readyz` | **200** |
| `verify-production-api.mjs` | **PASS** |
| Public categories | **13** |
| Public items | **58** |
| Internal toppings | **3** (`extra-chicken`, `extra-cheese`, `extra-cheese-slice`) |
| `variantCount` | **40** |
| `dealCount` | **7** |
| Chicken/Cheese sizes | 50 / 100 / 150 |
| Extra Cheese Slice | **60** |
| Behari | **549**, badge Starting Price, **0** variants |
| Public Toppings tab | **Absent** |
| Phase C cart example | Tele Special 12″ Large + Extra Chicken + Extra Cheese Slice = **Rs 1,780** (×2 = **3,560**) |

---

## Phase summary

### Phase A — Code
- Commit `7cb90e4` → PR **#24** → merged `697554a`
- API emits `data.toppings` + extended meta
- Website browse/customizer/cart/WhatsApp Option B behavior

### Phase B — Database
- Applied on production:
  - `20260715120000_pizza_toppings_catalog.sql`
  - `20260715153000_option_b_toppings_catalog_repair.sql`
- Counts and SKUs verified against live API/DB expectations

### Phase C — Live UX
- Live banner: `Live menu loaded from Supabase (58 items)`
- 13 categories; 58 items; no topping cards
- Customizer prices correct; cart + WhatsApp modifier lines correct
- Behari Starting from Rs 549; desktop + mobile smoke PASS
- Full check matrix: **27/27 PASS** (see Phase C audit in session)

### Release Phase
Artifacts under `_documentation-audit/releases/v1.2.0/`:
- `RELEASE-v1.2.0.md`
- `RELEASE-CHECKLIST.md`
- `API-CONTRACT.md`
- `DATABASE-SCHEMA-SUMMARY.md`
- `MENU-CATALOG-SUMMARY.md` + `.json`
- `ROLLBACK-CHECKLIST.md`
- Local + remote git tag **`v1.2.0`** on `697554a`
- `PRODUCTION-BASELINE-LOCKED.md` — **KNOWN GOOD / LOCKED**

---

## Remaining owner actions

~~Pending freeze~~ — **Complete.** Next: Sprint 3 on `feature/sprint-3-auth` without mutating v1.2.0 catalog freeze.

---

## Risks (accepted)

1. Direct PostgREST can still return topping rows; website/API filters are the customer contract.
2. Missing topping price must stay **Unavailable** (never invent).
3. Destructive DB rollback of toppings is last-resort only (see rollback checklist).
