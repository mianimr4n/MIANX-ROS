# RC6-QA-02 — Current coverage audit (pre-expansion)

**Baseline SHA (post-UI-01 / QA-02 branch point):** `1b3a44a9512be21d5a346b8e707a379ead4b3497`  
**Branch:** `test/rc6-qa-02-owner-ci-path-expansion`  
**Prior slice:** RC5-QA-01 Owner critical smoke

## Existing Owner CI flow

| Item | Value |
| --- | --- |
| Job | `owner-playwright` in `.github/workflows/ci.yml` |
| Command | `pnpm test:e2e:owner` |
| Config | `playwright.rc5-qa-01.config.ts` |
| Spec | `e2e/rc5/owner-critical-smoke.spec.ts` |
| Guard | `e2e/rc5/owner-smoke-readonly.guard.spec.ts` |
| Environment | Local ephemeral Supabase + local API `:4000` + Vite `:3000` |
| Fixture | `pnpm local:seed` → `admin@telepizza.pk` via gitignored `scripts/.tmp_pw/staff-handover.local.json` |
| Login helper | `browserLogin` / `enterpriseAccount` in `e2e/d3/helpers.ts` |
| Base URL | `D3_E2E_BASE_URL=http://localhost:3000` (loopback-only guard) |

## Pre-QA-02 authenticated coverage

| Path / behavior | Covered? |
| --- | --- |
| Owner password login | Yes |
| `/admin/dashboard` shell | Yes |
| Session persistence / refresh | No |
| Logout | No |
| Protected-route after logout | No |
| `/admin/branch` | No |
| `/admin/orders` | No |
| `/admin/kitchen` | No |
| `/admin/delivery` | No |
| `/admin/kitchen-dashboard` | No |
| `/admin/reports` | Deferred (RC5 residual) |

## Infrastructure notes (unchanged contract)

| Topic | Policy |
| --- | --- |
| Storage state | Not committed; `storageState: undefined` |
| Trace / screenshot | retain-on-failure / only-on-failure; video off |
| Artifacts | Uploaded only on failure; 7-day retention; not committed |
| Retries | CI `1`; local `0` |
| Workers | `1` (serial) |
| Cleanup | `if: always()` stop API/web + `supabase stop` + remove local handover/env |
| continue-on-error | Not used |
| Production credentials | Refused by local guards |

## Gaps closed by QA-02

Readonly Owner ops navigation, `/admin/reports`, session refresh, logout + gate, authenticated dashboard axe spot-check — see `OWNER_PATH_MATRIX.md`.
