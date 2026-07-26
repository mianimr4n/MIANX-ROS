# Dashboard UX Excellence — Commit Manifest

**Branch:** `feature/dashboard-ux-excellence`

**Base SHA:** `222a3a523459035e289452089f6c4a4bbfd85ae4`

**Date:** 2026-07-26

**Commit message:** `feat(dashboard): make role homes task-first and accessible`

## Approved include paths

### Product / UX

- `apps/website/client/index.html`
- `apps/website/client/src/index.css`
- `apps/website/client/src/components/admin/AdminKpiCard.tsx`
- `apps/website/client/src/components/admin/AdminSurface.tsx`
- `apps/website/client/src/components/admin/dashboard/DashboardActionCard.tsx`
- `apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx`
- `apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx`
- `apps/website/client/src/components/admin/dashboard/OperationsModuleGrid.tsx`
- `apps/website/client/src/components/admin/dashboard/RoleHomeShell.tsx`
- `apps/website/client/src/components/admin/kitchen/KitchenManagerShell.tsx`
- `apps/website/client/src/pages/admin/AdminBranchManager.tsx`
- `apps/website/client/src/pages/admin/AdminCashierHome.tsx`
- `apps/website/client/src/pages/admin/AdminConfigHome.tsx`
- `apps/website/client/src/pages/admin/AdminDashboard.tsx`
- `apps/website/client/src/pages/admin/AdminDeliveryHome.tsx`
- `apps/website/client/src/pages/admin/AdminHostHome.tsx`
- `apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`
- `apps/website/client/src/pages/admin/AdminLogin.tsx`
- `apps/website/client/src/pages/admin/AdminShell.tsx`
- `apps/website/client/src/pages/admin/AdminStaffHome.tsx`
- `apps/website/client/src/pages/admin/AdminWaiterHome.tsx`
- `apps/website/client/src/pages/ops/OpsDashboard.tsx`
- `apps/website/client/src/pages/ops/OpsDispatch.tsx`

### Tests / tooling

- `package.json` (`@axe-core/playwright` only)
- `pnpm-lock.yaml`
- `playwright.dashboard-ux.config.ts`
- `e2e/dashboard-ux/task-based-acceptance.spec.ts`
- `tests/website/d4-role-dashboards.test.mjs`
- `tests/website/d3-floor-dinein-frontend.test.mjs`
- `tests/website/d2-multibranch-operational-reliability.test.mjs`
- `tests/website/admin-kitchen-manager-dashboard-v1.test.mjs`
- `tests/website/canonical-single-price-menu-frontend.test.mjs` (CRLF-safe regex only)

### Docs / evidence

- `docs/testing/DASHBOARD_UX_BASELINE.md`
- `docs/testing/DASHBOARD_UX_COMMIT_MANIFEST.md`
- `docs/testing/acceptance-evidence/dashboard-ux-role-tasks.json`
- `docs/testing/acceptance-evidence/dashboard-ux-responsive.json`
- `docs/testing/acceptance-evidence/dashboard-ux-accessibility.json`
- `docs/testing/acceptance-evidence/dashboard-ux-visual-review.json`
- `docs/testing/acceptance-evidence/dashboard-ux-playwright-results.json`
- `docs/testing/acceptance-evidence/dashboard-ux-screenshots/*.png`

## Explicit excludes

- `scripts/.tmp_pw/**`
- `backend/api/.env.local`, `apps/website/.env.local`
- `test-results/**`, `apps/website/dist/**`, `.tmp/**`
- `docs/testing/acceptance-evidence/local-seed-summary.json`
- Unrelated D4 evidence JSON churn unless produced by this slice intentionally
- Production credentials / notification outbox / root planning files

## Staging rule

```bash
git add -- "exact/path"
```

Never `git add .` / `git add -A`.
