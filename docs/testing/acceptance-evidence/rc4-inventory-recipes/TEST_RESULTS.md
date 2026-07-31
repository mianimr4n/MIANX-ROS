# RC4-9 Test Results

Starting SHA (pre-rebase tip): `a156b79a9419c6e9fd139681f4a6075ede48c88b`
Branch: `feature/rc4-inventory-recipes` (rebased onto `origin/main` including RC4-5)
Evidence date: 2026-07-31

## Local stack

| Step | Command / probe | Result |
| --- | --- | --- |
| Supabase | `pnpm local:start` + `pnpm local:reset` | Migration `20260731180000_rc4_inventory_recipes_cogs.sql` applied |
| Grants | AGENTS.md `GRANT` gap re-applied | PASS |
| Env | `write-local-env-from-supabase.mjs` | PASS |
| Seed | `pnpm local:seed` | PASS |
| API | `:4000` with `.env.local` | `/healthz` 200, `/readyz` 200 |
| Website | `:3000` | Loads |

## Gates

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm check` | **PASS** | Website + backend tsc |
| `pnpm test` | **PASS** | Node static 773 + Vitest 563 |
| `pnpm test:db` | **PASS** | Included in `pnpm test` |
| `pnpm rc1:gate` | **PASS** | 0 blocking failures (API live) |
| `git diff --check` | **PASS** | After whitespace fix |

## Live API QA

Script: `scripts/rc4-inventory-recipes-live-qa.mjs`
Artifact: `LIVE_QA_REPORT.json`

| Metric | Value |
| --- | --- |
| Checks | 27 |
| Passed | 27 |
| Failed | 0 |

Coverage: RBAC, recipe CRUD/activate/BOM sync, incompatible units blocked, kitchen preparing consume + stock delta, idempotent preparing, order cancel reverse + stock restore, deferred `cogs_ready` / `cogs_reverse_ready`.

## Playwright + axe

Config: `playwright.rc4-inventory-recipes.config.ts`
Suite: `e2e/rc4/inventory-recipes.spec.ts`

| Metric | Value |
| --- | --- |
| Passed | 1 |
| Failed | 0 |
| Axe critical/serious | 0 / 0 |
| Screenshot | `screenshots/recipes-panel.png` |
