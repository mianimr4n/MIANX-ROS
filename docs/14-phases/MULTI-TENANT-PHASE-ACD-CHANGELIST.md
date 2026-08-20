# MIANX-ROS Multi-Tenant Upgrade — Changed Files

This zip contains every file changed while executing Phases A/C/D of the multi-tenant upgrade, in the same directory structure as the repo — extract at the repo root and let it overwrite. **Tested against a local Postgres 16 (migrations) and the real backend/frontend test suites (code) before packaging.**

## Apply order

1. **Migrations** (`supabase/migrations/`) — apply in filename order:
   - `20260822000000_mianx_ros_01_organizations_brands_foundation.sql` — already applied to production (Phase A, done in an earlier session)
   - `20260823000000_mianx_ros_02_brand_config_fields.sql` — **NEW, not yet applied** — run this one against production next
2. **Code + docs** — copy the rest of the files over the matching paths in your repo, then:
   ```bash
   pnpm install
   pnpm --filter @mianx/ros-api check      # backend typecheck — should be clean
   pnpm --filter @mianx/ros-api test       # backend tests — 1128/1128 passed here
   pnpm --filter mianx-ros-website check   # frontend typecheck — should be clean
   pnpm test:db                            # website static tests — 764/764 passed here
   ```
3. Commit and push.

## What changed, by phase

### Phase D — Platform identity & docs
- `README.md` — Mianx ROS platform framing, Telepizza listed as first tenant
- `docs/README.md`, `docs/DOCUMENTATION_MAP.md` — same rebrand, naming note added
- `docs/14-phases/MIANX-ROS-MASTER-ROADMAP.md` — renamed from `TELEPIZZA-MASTER-ROADMAP.md` (delete the old filename in git; content preserved, title updated)
- `docs/14-phases/README.md`, `docs/14-phases/PHASE-13-PLANNING.md` — links updated to the renamed roadmap file
- Package renames: `package.json` (`telepizza-platform` → `mianx-ros-platform`), `backend/api/package.json` (`@telepizza/api` → `@mianx/ros-api`), `apps/website/package.json` (`telepizza-pakistan` → `mianx-ros-website`)
- `.github/workflows/ci.yml`, `scripts/local-up.mjs`, `scripts/rc1-quality-gate.mjs` — updated to the new package names so CI and local scripts keep working

**Not touched, intentionally:** `docs/18-reference/`, `docs/testing/`, ADRs 001–041, release notes, `worklog.md`, `CHANGELOG.md` — historical implementation record, left as-is.

### Phase A + C — Multi-tenant foundation + dynamic brand
- `supabase/migrations/20260822000000_...` — `organizations` + `brands` tables (already live in production)
- `supabase/migrations/20260823000000_...` — **new**, extends `brands` with `legal_name`/`phone`/`hours`/`city`/`region`
- `backend/api/src/services/catalog/types.ts` — new `BrandConfig` type, `getBrandConfig()` added to `CatalogDataSource`
- `backend/api/src/services/catalog/supabase.ts` — `fetchBrandConfig()` implementation, reads `public.brands`, falls back to Telepizza's hardcoded values if the table has no active row
- `backend/api/src/modules/brand/routes.ts` — **new**, `GET /api/v1/brand` public endpoint
- `backend/api/src/modules/index.ts` — wires the new route + registers it in the `/healthz` module list
- `backend/api/tests/*.test.ts` (10 files) — added `getBrandConfig` mocks so existing `CatalogDataSource` test doubles keep compiling
- `backend/api/tests/app.test.ts` — updated the `/healthz` module-count assertion (13 → 14) and added a check for the new `brand` module
- `apps/website/client/src/lib/brand.ts` — added `fetchBrandConfig()` + `BrandValues` type as an **additive** async accessor. The existing synchronous `BRAND` export is untouched — every one of the 100+ files that already import it needs zero changes.

## What's explicitly NOT done yet (see MIANX-ROS-MASTER-UPGRADE-PROMPT.md)

- **Full Phase B** (real tenant isolation on staff/admin routes): investigation done, corrected design written up, but the actual per-service-file audit (checking `organizationId` scoping across `backend/api/src/services/*`) is not done — see the corrected Phase B section of the master prompt for exactly why and how.
- **Menu/catalog multi-tenancy**: `menu_categories`/`menu_items`/`menu_item_variants` have no tenant linkage at all today — this needs a product decision before any migration touches it (see Finding 2 in the master prompt).
- **Switching the site to actually render a second tenant's brand**: `fetchBrandConfig()` exists but nothing calls it yet at app boot — `BRAND` is still what every page renders. Wiring the app bootstrap to use the fetched value is the next step once you're ready to test it end to end.
