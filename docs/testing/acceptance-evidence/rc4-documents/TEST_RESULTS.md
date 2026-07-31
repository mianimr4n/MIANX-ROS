# RC4-5 Test Results

## Commands

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm check` | **PASS** | Website + backend `tsc --noEmit` |
| `pnpm test` | **PASS** | 555 Vitest + Node static tests |
| `pnpm rc1:gate` | **FAIL** | Static suites PASS; live `auth-branch-matrix` + `kds-auth` → `ECONNREFUSED 127.0.0.1:4000` (API not running) |
| `git diff --check` | **PASS** (after EOF fix) | Whitespace |

## Automated coverage added

| Layer | Artifact | Coverage |
| --- | --- | --- |
| Unit | `backend/api/tests/document-validation.test.ts` | MIME allowlist, size, extension mismatch, path sanitization, storage path |
| API static | `backend/api/tests/rc3-supplier-portal.test.ts` | Upload/download/archive routes + isolation methods |
| HR RBAC static | `backend/api/tests/document-hr-rbac.test.ts` | HR upload/download gates + branch membership |
| Website static | `tests/website/rc4-documents.test.mjs` | Migration buckets, dropzone wiring, evidence pack |
| DB static | `tests/database/rc3-supplier-portal.test.mjs` | Legacy URL + binary upload coexist |
| Playwright scaffold | `e2e/rc4/documents.spec.ts` | HR panel + axe (requires local web + auth stack) |

## Live / browser

Playwright and live API RBAC were **not executed** — no API on `:4000` in this environment.

## Accessibility (axe)

| Surface | Critical | Serious | Status |
| --- | --- | --- | --- |
| Admin HR documents panel | n/a | n/a | Scaffolded only — not executed |

## Honesty

Static unit/API contract tests do **not** substitute for live storage + cross-tenant download denial against a running stack.
