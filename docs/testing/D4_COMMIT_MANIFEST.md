# D4 Commit Manifest — role dashboards completion

Stage ONLY the paths listed below with `git add -- "exact/path"`.

## Frontend — shared primitives + role homes
- apps/website/client/src/App.tsx
- apps/website/client/src/lib/admin-access.ts
- apps/website/client/src/components/admin/dashboard/DashboardActionCard.tsx
- apps/website/client/src/components/admin/dashboard/ExecutiveFilterBar.tsx
- apps/website/client/src/components/admin/dashboard/LiveOperationsPanels.tsx
- apps/website/client/src/components/admin/dashboard/OpeningReadinessSummary.tsx
- apps/website/client/src/components/admin/dashboard/RoleHomeShell.tsx
- apps/website/client/src/components/admin/kitchen/KitchenCard.tsx
- apps/website/client/src/components/admin/kitchen/KitchenDetailsPanel.tsx
- apps/website/client/src/pages/admin/AdminBranchManager.tsx
- apps/website/client/src/pages/admin/AdminCashierHome.tsx
- apps/website/client/src/pages/admin/AdminConfigHome.tsx
- apps/website/client/src/pages/admin/AdminDashboard.tsx
- apps/website/client/src/pages/admin/AdminDeliveryHome.tsx
- apps/website/client/src/pages/admin/AdminHostHome.tsx
- apps/website/client/src/pages/admin/AdminIndexRedirect.tsx
- apps/website/client/src/pages/admin/AdminKitchen.tsx
- apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx
- apps/website/client/src/pages/admin/AdminLogin.tsx
- apps/website/client/src/pages/admin/AdminShell.tsx
- apps/website/client/src/pages/admin/AdminStaffHome.tsx
- apps/website/client/src/pages/admin/AdminWaiterHome.tsx
- apps/website/client/src/pages/ops/OpsDashboard.tsx

## Backend — dashboard + readiness
- backend/api/src/modules/admin/dashboard.ts
- backend/api/src/modules/admin/routes.ts
- backend/api/src/services/branches/readiness.ts
- backend/api/src/services/dashboard/summaries.ts
- backend/api/tests/d4-branch-readiness.truth.test.ts
- backend/api/tests/d4-dashboard.authz.test.ts
- backend/api/tests/d4-dashboard.scope.d4.test.ts

## Schema
- supabase/migrations/20260726120000_d4_platform_health_permission.sql

## Tests / e2e / scripts / docs (D4 only)
- e2e/d3/helpers.ts
- e2e/d4/accessibility.spec.ts
- e2e/d4/helpers.ts
- e2e/d4/responsive.spec.ts
- e2e/d4/role-matrix.spec.ts
- playwright.d4.config.ts
- scripts/d4/fixture-role-matrix.mjs
- docs/features/D4-ROLE-DASHBOARDS.md
- docs/testing/acceptance-evidence/d4-accessibility.json
- docs/testing/acceptance-evidence/d4-playwright-results.json
- docs/testing/acceptance-evidence/d4-responsive.json
- docs/testing/acceptance-evidence/d4-role-matrix.json
- tests/website/d4-role-dashboards.test.mjs
- tests/database/canonical-single-price-menu.test.mjs

## Explicitly EXCLUDED
- Catalog stub `items→skus` churn in auth/customer/staff-invites tests (menu follow-up)
- D3 evidence JSON churn
- docs/admin founder screenshots and review docs
- docs/founder, docs/staff planning docs
- PROJECT_*.md, ROADMAP.md
- apps/website/dist/**
- scripts/.tmp_pw/**
- backend/api/.notification-outbox/**
- .env*
- production dumps
