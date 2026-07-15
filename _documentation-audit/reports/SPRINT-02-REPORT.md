# Sprint 2 Report — Pizza Cycle Stage 2 (Option B)

**Date:** 2026-07-15  
**Branch context:** `feature/telepizza-brand-phase-1` (local work; not committed)  
**Scope:** Pizza + shared **internal** Toppings catalog only  
**Governance:** Mianx.ai / Telepizza V1 Business Freeze Pack  

---

## Owner refinement (Stage 2 approval change)

**Approved with one change:** do **not** create a public customer “Toppings” menu category.

| Concept | Count / values |
|---|---|
| **Customer categories** | **13** (Pizza / Broast / Burgers / … / Deals) |
| **Internal catalog types** (Admin / POS / Kitchen / Inventory) | Food-style SKUs + **Deal · Drink · Topping · Addon** (product_type) |

Flow:

```text
Customer menu (13) → Pizza Customizer → Extra Cheese / Extra Chicken / Extra Cheese Slice
```

Toppings remain shared catalog products (`product_type = topping`) for customizer + future Admin/POS/Kitchen/Inventory — never a browse chip.

---

## Objectives

1. Record and apply owner approvals for BFR-001 / BFR-003 / BFR-012.  
2. Preserve verified V1 pizza prices (HYBRID — no GM mass-reprice).  
3. Keep Behari Kabab Pizza publicly available at current temporary price (REPRICE hold).  
4. Model toppings once in Supabase so Admin + Pizza Customizer share the same SKUs (BOTH / Option B).  
5. Keep Broast / Burgers / Auth / Orders / POS / ERP / AI untouched.

---

## Owner decisions applied

| ID | Decision | Effect in Stage 2 |
|---|---|---|
| **BFR-001** | **HYBRID** | No price overwrite from GM Jul 2026; current Website/DB pizza matrix remains V1 baseline |
| **BFR-003** | **REPRICE** | `behari-kabab-pizza` kept available @ temporary Rs 549; Admin can change later |
| **BFR-012** | **BOTH (Option B)** | Internal topping SKUs + catalog-driven customizer; **no** public Toppings category |

---

## Changes

### Database

| File | Change |
|---|---|
| `supabase/migrations/20260715120000_pizza_toppings_catalog.sql` | Extends `product_type` with `topping`; seeds **internal** Toppings grouping + SKUs; documents Option B (not a customer menu tab) |

### Website

| File | Change |
|---|---|
| `apps/website/client/src/lib/menu-visibility.ts` | Customer browse filters (hide toppings category + `product_type=topping`) |
| `apps/website/client/src/data/menu-data.ts` | Topping SKUs in static fallback; **not** in public `menuCategories` (still 13 + All) |
| `apps/website/client/src/contexts/MenuCatalogContext.tsx` | `availableCategories` excludes Toppings; full `items` kept for customizer |
| `apps/website/client/src/pages/Menu.tsx` | Browse grid excludes topping SKUs |
| `apps/website/client/src/lib/menu-catalog.ts` | Static categories from public list only |
| `apps/website/client/src/data/cart-config.ts` | Catalog-driven topping resolution |
| `apps/website/client/src/components/menu/PizzaCustomizerDialog.tsx` | Loads topping prices from shared catalog by slug |

### API

| File | Change |
|---|---|
| `backend/api/src/services/catalog/visibility.ts` | Splits customer browse vs `toppings[]` |
| `backend/api/src/services/catalog/types.ts` | `MenuCatalog.toppings` |
| `backend/api/src/services/catalog/supabase.ts` | Public catalog omits Toppings category; browse `items` exclude toppings; `toppings` array for SKUs |
| `backend/api/src/modules/menu/routes.ts` | `meta.toppingCount` |

### Governance / tests

| File | Change |
|---|---|
| `_documentation-audit/business-freeze-pack/BUSINESS-DECISION-REGISTER.md` | BFR-012 Option B note |
| `tests/database/foundation-migrations.test.mjs` | Asserts Option B wording + SKUs |
| `backend/api/tests/catalog-visibility.test.ts` | Unit test for browse split |
| `backend/api/tests/app.test.ts` | Catalog response includes `toppings`, no toppings category |

---

## Verification

| Check | Result |
|---|---|
| `pnpm check` | **PASS** |
| `pnpm test:db` | **PASS** (5/5) |
| `pnpm test:backend` | **PASS** (11/11) |
| `pnpm build:website` | **PASS** |

### Expected catalog shape (after migration apply)

| Metric | Customer browse | Internal / toppings field |
|---|---:|---:|
| Categories | **13** | Toppings grouping exists in DB but **not** in customer `/menu/catalog.categories` |
| Browse items | **58** | — |
| Topping SKUs | hidden from browse | **3** via `data.toppings` + customizer slug lookup |

Production today (migration not applied): still 13 / 58 / 0 toppings.

---

## Sprint 2 Definition of Done (updated)

- [x] Customer categories = **13** (no public Toppings tab)
- [x] Internal catalog supports topping product type + SKUs
- [x] Pizza Customizer loads toppings from shared catalog
- [x] Admin/POS/Kitchen can receive topping SKUs (`toppings` / product_type) without customer browse exposure
- [ ] Production migration apply (operator)
- [ ] Owner final Stage 2 approve → then continue Sprint 2 reconciliation

---

## Remaining blockers / next operator steps

1. Owner final Stage 2 approval after this Option B confirmation.  
2. Apply migration to production Supabase.  
3. Redeploy website + API.  
4. Post-apply: customer categories = 13; `meta.toppingCount` = 3; customizer prices match catalog.

**No commit. No push.** Stopped for review.
