# POLISH-QA — Complete change classification

**Range:** `v1.5.0` (`830dbc8…`) → POLISH-QA baseline `a29e8d7…` (+ QA remediation on this branch)

## Surface counts (baseline range)

| Surface | Files (approx) |
| --- | --- |
| Documentation / evidence | 212 |
| Website runtime | 77 |
| Tests | 18 |
| E2E | 1 (+ QA suite on this PR) |
| Other (`scripts/rc1/kds-auth.mjs`) | 1 |
| Backend runtime | **0** |
| Supabase migrations / schema | **0** |
| `pnpm-lock.yaml` drift | **0** |

## Required conclusions

| Conclusion | Status |
| --- | --- |
| WEBSITE_RUNTIME_CHANGED | **YES** (POLISH-01…07 + QA contrast/logout harness) |
| BACKEND_RUNTIME_UNCHANGED | **YES** |
| DATABASE_SCHEMA_UNCHANGED | **YES** |
| MIGRATION_NOT_REQUIRED | **YES** |
| PRODUCTION_SQL_NOT_REQUIRED | **YES** |
| PROVIDER_SECRET_CHANGE_NOT_REQUIRED | **YES** |

## Per-slice runtime classification (summary)

| Slice | Runtime surface | Risk | Required test |
| --- | --- | --- | --- |
| #193 anchors | documentation | Low | Doc review |
| #194 audit | documentation | Low | Gate docs |
| POLISH-01 | website shell/nav | Low | Static + Owner logout |
| POLISH-02 | website Owner hierarchy | Low | Owner e2e |
| POLISH-03 | website operations honesty | Med | Ops static + headed |
| POLISH-04 | website business honesty | Low | Static honesty suites |
| POLISH-05 | website design/data states | Low | Static + a11y |
| POLISH-06 | website a11y/responsive | Low | axe + viewport |
| POLISH-07 | website perf/privacy | Med | Static perf-07 + e2e |
| POLISH-QA | tests + evidence + contrast fix | Low | Full certification |

## QA branch additional runtime files

| Path | Slice | Runtime surface | Risk | Required test |
| --- | --- | --- | --- | --- |
| `apps/website/.../DeliveryCards.tsx` | QA | website | Low | headed axe |
| `apps/website/.../DeliveryDrawer.tsx` | QA | website | Low | headed axe |
| `apps/website/.../OpsDispatch.tsx` | QA | website | Low | contrast |
| `e2e/polish-qa/*` | QA | tests | Low | Playwright |
| `playwright.polish-qa.config.ts` | QA | tests | Low | Playwright |
| `docs/testing/.../phase1-polish-qa/*` | QA | documentation | Low | Static evidence suite |
| `package.json` script `test:e2e:polish-qa` | QA | workflow | Low | Script present |
