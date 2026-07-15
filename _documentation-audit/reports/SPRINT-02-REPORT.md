# Sprint 2 — Option B Audit-Driven Rebuild Report

**Date:** 2026-07-15
**Branch:** `feature/telepizza-brand-phase-1`
**Status:** Implementation complete locally — **awaiting owner approval**
**Constraints honored:** no commit · no push · no production migration apply · no merge

---

## STEP 1 — Repository clean audit

### Branch / working tree
- Branch: `feature/telepizza-brand-phase-1` (tracking origin)
- Working tree carries this rebuild as uncommitted changes (by design)

### Production snapshot (live, pre-apply)
| Check | Result |
|---|---|
| API `/healthz` `/readyz` | OK |
| `GET /api/v1/menu/catalog` | **13** categories · **58** items · **no** `toppings[]` · **no** `toppingCount` |
| Behari Kabab Pizza | price **549**, badge Starting Price, **0 variants** |
| Topping SKUs in DB/API | **0** |
| Toppings category | **absent** |

### Why production has `product_type` but zero toppings
1. `product_type` was created in foundation migration `20260713190000` (CHECK without `topping`).
2. Sprint 2 file `20260715120000_pizza_toppings_catalog.sql` exists in git but was **never applied** to production Supabase.
3. Production API deploy does not yet emit `toppings` / `toppingCount` (older catalog contract).

### File classification

| Path / change area | Class | Action |
|---|---|---|
| Toppings migrations, catalog visibility, customizer, menu-data toppings, API toppings contract, Sprint 2 reports/tests | **A — Required** | Rebuild/reconcile in this pass |
| Brand phase 1 website work, CORS env helper, supabase-js lock sync | **B — Existing unrelated / prior branch work** | Do not reverse |
| `.verify-bundle.mjs`, `docs/05-ai-agents/12-data-ai-team/*` | **C — Accidental/stale tooling & agent docs** | Leave alone; do not expand |
| `apps/website/package-lock.json`, stub `apps/website/src/*` | **C — Accidental** | Already removed earlier |
| `apps/website/.vercel/project.json` | **D — Local Vercel metadata** | Do not restage settings churn |
| Secrets / `.env*` | **D** | None staged |

Nothing newly deleted in this rebuild beyond prior accidental lockfile/stubs already handled.

---

## STEP 2 — Canonical architecture (Option B)

```text
Customer Menu (13 public categories)
  -> Pizza Customizer
      -> Extra Chicken / Extra Cheese / Extra Cheese Slice
         (prices from shared catalog toppings[])

Admin / POS / Kitchen / Inventory
  -> same menu_items rows where product_type = 'topping'
```

- Internal DB grouping `menu_categories.slug = toppings` for FK/admin org only
- Public browse excludes that category and all `product_type = topping`
- Standalone purchase of topping SKUs blocked
- Behari Kabab Pizza: KEEP @ temporary **549**, badge Starting Price, **no invented variants**

---

## STEP 3 — Migration safety decision

| Decision | Detail |
|---|---|
| Do **not** rewrite `20260715120000_*` | Already in shared branch history |
| Add forward repair `20260715153000_option_b_toppings_catalog_repair.sql` | Idempotent (`ON CONFLICT`), transactional (`BEGIN`/`COMMIT`), verification + rollback guidance |
| Production apply | Manual only — both migrations will no-op safely if partially applied |

---

## Files changed (this rebuild)

### Database
- `supabase/migrations/20260715153000_option_b_toppings_catalog_repair.sql` **(new)**

### Backend
- `backend/api/src/modules/menu/routes.ts` — `variantCount`, `dealCount`
- `backend/api/tests/catalog-visibility.test.ts` — missing-category + no-duplicate cases
- `backend/api/tests/app.test.ts` — meta assertions

### Website
- `apps/website/client/src/data/cart-config.ts` — null-safe catalog prices (no invent)
- `apps/website/client/src/lib/menu-catalog.ts` — split `items` / `toppings`
- `apps/website/client/src/contexts/MenuCatalogContext.tsx` — expose `toppings`
- `apps/website/client/src/components/menu/PizzaCustomizerDialog.tsx` — catalog toppings only; unavailable when price null
- `apps/website/client/src/hooks/useAddMenuItem.ts` — block standalone topping purchase
- `apps/website/client/src/lib/menu-utils.ts` — Starting from price label
- `apps/website/client/src/components/menu/ProductCard.tsx` / `pages/Menu.tsx` — Starting from display
- `apps/website/client/src/lib/telepizza-api.ts` — toppings required on catalog type

### Tests / scripts
- `tests/menu/option-b-catalog.test.mjs` **(new)**
- `tests/database/foundation-migrations.test.mjs` — repair migration assertions
- `package.json` — `test:db` includes `tests/menu`

### Report
- `_documentation-audit/reports/SPRINT-02-REPORT.md` (this file)

---

## STEP 6 — Test results

| Check | Result |
|---|---|
| `pnpm install --frozen-lockfile` | **PASS** |
| `pnpm check` | **PASS** |
| `pnpm test:db` | **PASS** (11/11) |
| `pnpm test:backend` | **PASS** (13/13) |
| `pnpm build:website` | **PASS** |
| `git diff --check` | **PASS** |

Focused coverage: migration SKUs + idempotency, public 13 categories, toppings excluded from public items, API visibility split (incl. missing internal category), S/M/L + slice price resolution, missing-price -> null, Behari no invented variants, cart ID distinctness for toppings.

---

## STEP 7 — Production apply instructions (manual)

Do **not** auto-apply. Owner/operator sequence:

1. **Backup** Supabase project `pyeowxvacgypohrbvgee` (dashboard backup / snapshot).
2. Apply pending migrations via linked CLI or SQL Editor:
   - `20260715120000_pizza_toppings_catalog.sql` (if not recorded)
   - `20260715153000_option_b_toppings_catalog_repair.sql` (always safe)
3. Confirm migration history lists both.
4. Run verification SQL from repair migration comments — expect:
   - public categories excluding toppings = **13**
   - topping SKUs = **3**
   - chicken/cheese size variants = **6**
   - behari row present @ 549 / Starting Price
5. Redeploy API (Render) so `/api/v1/menu/catalog` returns `toppings` + meta counts.
6. Redeploy website (Vercel).
7. Verify:
   ```bash
   curl -s https://telepizza-api.onrender.com/api/v1/menu/catalog | jq "{cats:.meta.categoryCount,items:.meta.itemCount,tops:.meta.toppingCount,deals:.meta.dealCount,variants:.meta.variantCount}"
   ```
   Expect `cats=13`, `items=58`, `tops=3`.
8. Browser: Menu has no Toppings chip; customizer shows live catalog prices; Behari shows Starting from Rs 549; WhatsApp message includes selected toppings.

Expected production result:
- Public categories **13**
- Public items **58** (toppings excluded)
- Internal toppings **3**
- API `toppingCount` **3**
- No duplicate topping rows
- No public Toppings category
- Website live Supabase mode + customizer priced from live catalog

---

## Remaining risks

1. Production API must be redeployed after migration or clients still see no `toppings[]`.
2. Direct PostgREST reads can still see topping rows (RLS public read) — website/API filters are the contract.
3. If catalog toppings are missing, customizer shows Unavailable (safe) rather than inventing prices.
4. Branch still contains Class C files (`.verify-bundle.mjs`, data-ai-team docs) from earlier commits — exclude from future Sprint 2 PR if desired.

---

## PASS / FAIL

| Gate | Status |
|---|---|
| Audit-driven Option B model | **PASS** (implemented) |
| Local check/tests/build | **PASS** |
| Production migration applied | **PENDING owner** |
| Overall Sprint 2 Stage 2 | **READY FOR OWNER APPROVAL** |

**No commit. No push. No production apply.**
