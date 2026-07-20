# RELEASE v1.2.0 — Telepizza Sprint 2

| Property | Value |
|---|---|
| Version | **v1.2.0** |
| Codename | Sprint 2 — Option B pizza toppings catalog |
| Release date | 2026-07-15 |
| Git commit (tag target) | `697554a` (`main`) |
| Git tag | `v1.2.0` (**local only — not pushed**) |
| Owner approval | **APPROVED** — Release Freeze v1.2.0 |
| Production baseline | **KNOWN GOOD / LOCKED** |
| Sprint 3 | Branch `feature/sprint-3-auth` after freeze — auth scope only |

---

## Summary

v1.2.0 delivers Sprint 2 Option B: internal pizza topping SKUs shared by the pizza customizer (and future Admin/POS), without a public Toppings browse category. Production database migrations are applied; API exposes `data.toppings` + catalog meta counts; website Phase C live UX smoke **PASS**.

### Locked business rules carried into this release

- **BFR-001 HYBRID** — website can use live Supabase menu reads; API remains canonical for `/api/v1/menu/catalog`.
- **BFR-003 REPRICE** — Behari Kabab Pizza kept at **Rs 549**, badge **Starting Price**, **no invented size variants**.
- **BFR-012 BOTH Option B** — toppings are internal catalog SKUs; not a public category; not standalone customer products.

---

## Production targets

| Service | URL / ID |
|---|---|
| Website | https://telepizza-website.vercel.app |
| API | https://telepizza-api.onrender.com |
| Supabase | `pyeowxvacgypohrbvgee` |

---

## What shipped

### Database (applied in Phase B)

1. `20260715120000_pizza_toppings_catalog.sql`
2. `20260715153000_option_b_toppings_catalog_repair.sql`

### Application (merged Phase A — PR #24 → `697554a`)

- API catalog: `{ categories, items, toppings }` + meta `categoryCount`, `itemCount`, `toppingCount`, `variantCount`, `dealCount`
- Website: browse excludes toppings; customizer loads live topping prices; missing price → unavailable (no invent); Behari “Starting from Rs 549”

---

## Production verification snapshot (Release Phase)

| Check | Result |
|---|---|
| `node scripts/verify-production-api.mjs https://telepizza-api.onrender.com` | **PASS** |
| `/healthz` / `/readyz` | **200** |
| Catalog meta | categories **13**, items **58**, toppings **3**, variants **40**, deals **7** |
| Topping SKUs | `extra-chicken`, `extra-cheese`, `extra-cheese-slice` |
| Size prices (chicken/cheese) | Small **50** / Medium **100** / Large **150** |
| Extra Cheese Slice | **Rs 60** |
| Behari Kabab Pizza | price **549**, badge **Starting Price**, **0** variants |
| Phase C live UX smoke | **PASS** (see Sprint 2 report) |

---

## Sprint gates

| Phase | Status |
|---|---|
| A — Code merge | **PASS** (PR #24 → main `697554a`) |
| B — Production migrations | **PASS** |
| C — Live customer UX | **PASS** |
| Release package | **COMPLETE** |
| D — Owner Sprint 2 close / freeze | **PASS** (baseline LOCKED) |
| Sprint 3 Auth | **Authorized after freeze** (catalog/business rules out of scope) |

---

## Artifacts in this package

| File | Purpose |
|---|---|
| `RELEASE-v1.2.0.md` | This release note |
| `RELEASE-CHECKLIST.md` | Go-live / acceptance checklist |
| `API-CONTRACT.md` | Exported REST contract for v1.2.0 |
| `DATABASE-SCHEMA-SUMMARY.md` | Schema + migration inventory |
| `MENU-CATALOG-SUMMARY.md` | Human catalog summary |
| `MENU-CATALOG-SUMMARY.json` | Machine-readable live catalog export |
| `ROLLBACK-CHECKLIST.md` | Rollback steps |

Related: `_documentation-audit/reports/SPRINT-02-REPORT.md`

---

## Non-goals (explicitly out of scope)

- Authentication / Sprint 3
- New features beyond Option B toppings
- Application code changes in Release Phase
- Database mutations in Release Phase
- Pushing git tag `v1.2.0` (local tag only until approved)

---

## Freeze decision

Owner approved Release Freeze v1.2.0. Production baseline is **LOCKED** (see `PRODUCTION-BASELINE-LOCKED.md`).

Post-freeze order:

1. Commit release documentation
2. Push tag `v1.2.0`
3. Open `feature/sprint-3-auth` for Sprint 3 (auth only; do not touch frozen catalog rules)
