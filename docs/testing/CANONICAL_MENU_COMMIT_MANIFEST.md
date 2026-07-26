# Canonical Menu — Exact Future Commit Manifest

**Not staged. Not committed. Founder authorization required before any commit.**

Branch: `feature/aug14-role-dashboards-completion`
Base: `6377b7ecdc75d01bec7389f1b07ceaffbaecbc2d`

## Include in the future scoped menu commit

### MENU DATABASE
- `supabase/migrations/20260725120000_expand_and_activate_real_menu_catalog.sql` — **INCLUDED** (Founder price lock 2026-07-26: expanded prices are authoritative)
- `supabase/migrations/20260725130000_canonical_single_price_menu_domain.sql`
- `supabase/migrations/20260725140000_canonical_menu_price_audit_atomic.sql`

### MENU BACKEND
- `backend/api/src/modules/admin/menu.ts`
- `backend/api/src/services/menu/management.ts`
- `backend/api/src/modules/admin/routes.ts` *(menu router mount only — review diff)*
- `backend/api/src/modules/index.ts` *(if menu wiring only)*
- `backend/api/src/app-dependencies.ts` *(menuManagement injection)*
- `backend/api/src/modules/menu/routes.ts`
- `backend/api/src/modules/orders/routes.ts`
- `backend/api/src/modules/admin/pos.ts`
- `backend/api/src/services/catalog/supabase.ts`
- `backend/api/src/services/catalog/types.ts`
- `backend/api/src/services/catalog/visibility.ts`
- `backend/api/src/services/orders/pricing.ts`
- `backend/api/src/services/orders/quote-token.ts`
- `backend/api/src/services/orders/supabase.ts`
- `backend/api/src/services/orders/types.ts`
- `backend/api/src/services/branches/readiness.ts` *(menu-readiness uses `menu_items.is_available` — justified)*

### MENU FRONTEND
- Admin menu components under `apps/website/client/src/components/admin/menu/`
- POS product grid/configure under `apps/website/client/src/components/admin/pos/`
- Customer menu components/contexts/pages listed in worktree as SKU conversions
- `apps/website/client/src/lib/admin-menu-api.ts`
- `apps/website/client/src/lib/admin-menu.ts`, `admin-pos.ts`, `menu-*.ts`, `telepizza-*.ts`, cart/checkout/reorder
- `apps/website/client/src/data/menu-data.ts` *(generated derivative — NON-AUTHORITATIVE)*
- `apps/website/client/src/pages/admin/AdminMenu.tsx`, `AdminPos.tsx`
- Customer pages: Menu, ProductDetail, Home, Checkout, Favorites, CategoryStrip, etc.

### MENU TEST
- `backend/api/tests/admin-menu.authz.test.ts`
- `backend/api/tests/canonical-menu-price-chain.e2e.test.ts`
- `backend/api/tests/menu-price-audit-atomic.test.ts`
- `backend/api/tests/canonical-menu-api-parity.test.ts`
- `backend/api/tests/orders-pricing.test.ts`, `catalog-visibility.test.ts`, `app.test.ts` *(SKU shape)*
- `tests/database/canonical-single-price-menu.test.mjs`
- `tests/database/canonical-menu-corrective-audit.test.mjs`
- `tests/website/canonical-single-price-menu-frontend.test.mjs`
- `tests/catalog/canonical-menu.test.mjs`, `tests/menu/option-b-catalog.test.mjs`
- `tests/website/admin-menu-management-v1.test.mjs`, customer-ordering, fav-01
- `e2e/menu/canonical-menu-price-journey.spec.ts`
- `e2e/menu/admin-menu-ui-review.spec.ts`
- `playwright.menu.config.ts`

### MENU CATALOG / SCRIPTS
- `scripts/generate-menu-fallback-from-canonical.mjs`
- `scripts/reconcile-canonical-menu-counts.mjs`
- `scripts/reconcile-menu-catalog-full.mjs`
- `scripts/scan-variant-runtime-refs.mjs`
- `scripts/verify-canonical-menu-migration-safety.mjs`
- `scripts/verify-menu-audit-and-historical.mjs`
- `scripts/verify-canonical-menu-api-parity-live.mjs`
- `scripts/verify-menu-price-definition-conflicts.mjs`
- `scripts/sql/prove-menu-price-audit-rollback.sql`
- `scripts/sql/review-menu-sku-naming.sql`
- `scripts/build-canonical-menu.mjs` *(DO NOT RUN IN PRODUCTION banner)*
- `scripts/dry-run-canonical-menu-migration.mjs`

### MENU DOCUMENTATION / EVIDENCE
- `docs/architecture/CANONICAL-MENU-DOMAIN.md`
- `docs/README.md` *(canonical menu link only)*
- `docs/testing/acceptance-evidence/menu-catalog-reconciliation.json`
- `docs/testing/acceptance-evidence/menu-variant-runtime-references.json`
- `docs/testing/acceptance-evidence/canonical-menu-migration-safety.json`
- `docs/testing/acceptance-evidence/canonical-menu-audit-and-historical.json`
- `docs/testing/acceptance-evidence/canonical-menu-api-parity-live.json`
- `docs/testing/acceptance-evidence/canonical-menu-price-definition-conflicts.json`
- `docs/testing/acceptance-evidence/canonical-menu-playwright-journey.json`
- `docs/testing/acceptance-evidence/canonical-menu-playwright-results.json`
- `docs/testing/acceptance-evidence/canonical-menu-admin-ui-review.json`
- `docs/testing/CANONICAL_MENU_COMMIT_MANIFEST.md` *(this file)*

## Explicitly EXCLUDE (D4 / unrelated)

- All `apps/website/client/src/pages/admin/Admin*Home.tsx` role homes
- `apps/website/client/src/components/admin/dashboard/**`
- `docs/features/D4-ROLE-DASHBOARDS.md`, `docs/founder/**`, `docs/staff/**`, most `docs/admin/**`
- `backend/api/tests/d4-*.ts`, `tests/website/d4-*.mjs`, `e2e/d4/**`, `playwright.d4.config.ts`, `scripts/d4/**`
- `backend/api/src/services/dashboard/**`, `backend/api/src/modules/admin/dashboard.ts` *(unless readiness diff is inseparable — prefer split)*
- D3 acceptance-evidence JSON/PNG churn
- `PROJECT_*.md`, `ROADMAP.md`, `.phase1-dump/**`, `apps/website/dist/**`, notification outbox
- `AdminBranchManager.tsx`, `AdminDashboard.tsx`, `AdminIndexRedirect.tsx`, `AdminLogin.tsx`, `OpsDashboard.tsx` unless diff is menu-only
- `scripts/.tmp_pw/**`, `.env*`, `test-results/**`, Playwright traces/screenshots

## Branch separation plan (do not execute in this pass)

1. Keep D4 work on `feature/aug14-role-dashboards-completion`.
2. When Founder authorizes menu commit: `git switch -c feature/canonical-single-price-menu` from current HEAD.
3. Soft-reset or selective `git add` of MENU paths only (never `git add .`).
4. Commit menu slice; leave D4 unstaged on the original branch (or cherry-pick the menu commit onto a clean menu branch from `6377b7e`).
5. Preferred safer sequence: from `6377b7e`, create menu branch, cherry-pick/apply only menu paths via patch, keep D4 branch untouched.

## Commit message (when authorized)

```text
feat(menu): canonical single-price SKU domain with transactional audit

Convert size variants into sellable SKUs, expose one catalog API, add Admin
Menu price editing with atomic audit RPC, and deprecate menu_item_variants
writes without dropping the table.
```

## Pre-commit blockers

1. ~~Bootstrap `completionStatus = BLOCKED_OWNER_EVIDENCE_REQUIRED`.~~ → `OWNER_PRICES_LOCKED_EXPAND_20260725120000`
2. ~~75 SKU price conflicts~~ → **0** after Founder decision 2026-07-26
3. Founder authorized scoped menu commit / PR / merge (production migration still NOT authorized)
