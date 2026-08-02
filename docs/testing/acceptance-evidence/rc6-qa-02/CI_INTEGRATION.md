# RC6-QA-02 — CI integration

## Job

| Field | Value |
| --- | --- |
| Workflow | `.github/workflows/ci.yml` |
| Job id | `owner-playwright` |
| Step | `Run RC6-QA-02 Owner Playwright smoke` |
| Command | `pnpm test:e2e:owner` |
| Config | `playwright.rc5-qa-01.config.ts` (shared path; RC6-QA-02 semantics) |
| Failure artifacts | `rc6-qa-02-owner-playwright-${{ run_id }}-${{ run_attempt }}` |
| Artifact paths | `playwright-report-rc5-qa-01/`, `test-results/rc5-qa-01/` (failure only) |
| Retention | 7 days |
| continue-on-error | **No** |

## Local ephemeral stack (unchanged)

1. `npx supabase start`
2. Write local env from status + mask secrets
3. `pnpm local:guard` + assert loopback E2E targets
4. `pnpm local:seed` (Owner fixture) + mask handover file
5. Start API + wait `/healthz` + `/readyz`
6. Start Vite on `localhost:3000`
7. Run Playwright
8. `if: always()` stop processes + `supabase stop` + delete local handover/env

## Environment variables

| Var | Value |
| --- | --- |
| `CI` | `true` |
| `D3_E2E_BASE_URL` | `http://localhost:3000` |
| `D3_E2E_API_URL` | `http://127.0.0.1:4000` |

No Production environment variables. No Production credentials.

## Playwright policy

| Setting | Value |
| --- | --- |
| Retries | CI `1` / local `0` |
| Workers | `1` |
| Global timeout (CI) | 30 minutes |
| Trace | retain-on-failure |
| Screenshot | only-on-failure |
| Video | off |
| storageState | undefined (never committed) |

## Branch protection

**Not modified** (Q-05 out of scope).
