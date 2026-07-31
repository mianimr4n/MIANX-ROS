# RC3 Integration — Test Matrix

| ID | Area | Method | Command / artifact | Required for CERTIFIED |
| --- | --- | --- | --- | --- |
| G1 | Typecheck | CLI | `pnpm check` | Y |
| G2 | Unit/integration tests | CLI | `pnpm test` | Y |
| G3 | RC1 quality gate | CLI | `pnpm rc1:gate` | Y |
| G4 | Whitespace | CLI | `git diff --check` | Y |
| M1 | Clean install migrations | Script | `node scripts/rc3-integration-migrate-cert.mjs` | Y |
| M2 | Repeatability reset | same | `migration-repeatability.log` | Y |
| M3 | Schema + RLS | same | `schema-validation.json` | Y |
| M4 | Upgrade path | Static + note | `migration-certification.json` upgradePath | Y (honest if snapshot unavailable) |
| R1 | Reconciliation | Script | `node scripts/rc3-integration-reconciliation.mjs` → `reconciliation-report.json` | Y |
| S1 | Security matrix | Script | `node scripts/rc3-integration-security-matrix.mjs` → `security-matrix.json` | Y |
| S2 | Supplier A/B isolation | Script | `node scripts/rc3-supplier-isolation-matrix.mjs` | Y |
| Q1 | Playwright + axe integration | Script | `node scripts/rc3-integration-qa.mjs` → `qa-report.json` | Y |
| Q2 | Slice QA reuse | Scripts | `rc3-finance-qa`, `rc3-workforce-qa`, `rc3-supplier-portal-qa` | Supporting |
| W1–W6 | Closed-loop workflows | API/SQL + Playwright | See `workflow-results.json` | Y for critical paths |

## Playwright journeys (required list)

Tracked in `qa-report.json` journeys + security/isolation scripts. Journeys not fully automated end-to-end are listed as limitations/blockers in `FINAL_REPORT.md`.
