# RC4-5 Test Results

Starting SHA: `03de61f15ae87bf9d09f9f825ca65595b31d1afb`  
Branch: `feature/rc4-documents`  
Evidence date: 2026-07-31

## Local stack commands (exact)

| Step | Command | Port / notes |
| --- | --- | --- |
| Docker | Start Docker Desktop (Windows) | Required for Supabase |
| Supabase | `pnpm local:start` | API `54321`, DB `54322`, Studio `54323`, Storage on API |
| Env files | `pnpm local:env` (`node scripts/write-local-env-from-supabase.mjs`) | Writes `backend/api/.env.local` + website env |
| Reset DB | `pnpm local:reset` | Applies all migrations (incl. RC4-5) |
| Grants gap | `GRANT USAGE/SELECT/INSERT/UPDATE/DELETE` on `public` to `anon`, `authenticated`, `service_role` (see `AGENTS.md`) | Re-apply after reset |
| Seed | `pnpm local:seed` then `node scripts/seed-rc3-supplier-portal.mjs` | Staff + Supplier A/B fixtures under `scripts/.tmp_pw/` |
| Website | `pnpm dev:website` | `http://127.0.0.1:3000` |
| API | Load `backend/api/.env.local` into process env, then `pnpm --filter @telepizza/api dev` | `http://127.0.0.1:4000` |

### Stack confirmation

| Probe | Result |
| --- | --- |
| `GET http://127.0.0.1:4000/healthz` | **200** |
| `GET http://127.0.0.1:4000/readyz` | **200** (requires env-loaded API) |
| Website `http://127.0.0.1:3000` | Loads |
| Supabase Storage `http://127.0.0.1:54321/storage/v1` | Reachable (auth required for bucket ops) |

## Migration validation

| Check | Result |
| --- | --- |
| Clean apply via `pnpm local:reset` | **PASS** — includes `20260731170000_rc4_documents_binary_uploads.sql` |
| Follow-up archive status | **PASS** — `20260731171000_rc4_documents_archive_status.sql` (`archived` allowed) |
| Buckets `supplier-documents`, `hr-employee-documents` | Exist, **private** (`public=false`), **5 MiB** limit, MIME allowlist |
| Tables | `supplier_documents`, `hr_employee_documents`, `document_access_events` present |
| Indexes / FKs / RLS | Present per migration |
| Production apply | **Not performed** (forbidden for this slice) |

## Gate commands

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm check` | **PASS** | Website + backend `tsc --noEmit` |
| `pnpm test` | **PASS** | Includes `test:db` + backend Vitest |
| `pnpm test:db` | **PASS** | Static SQL/Node suites (769 Node tests in full `pnpm test` tree) |
| `pnpm rc1:gate` | **PASS** | Blocking failures: **0** (API live on `:4000`) |
| `git diff --check` | **PASS** | CRLF warnings only on unrelated evidence JSON |

## Live API QA (`node scripts/rc4-documents-live-qa.mjs`)

Artifact: `LIVE_QA_REPORT.json`

| Metric | Value |
| --- | --- |
| Checks | 50 |
| Passed | 50 |
| Failed | 0 |
| Signed URL expiry contract | **120 seconds** |

### Supplier isolation matrix (live)

| Check | Result |
| --- | --- |
| A upload PDF + metadata | PASS |
| B upload PNG | PASS |
| A cannot list B | PASS |
| B cannot list A | PASS |
| A signed download own file (HTTP 200) | PASS |
| A cannot download B (404) | PASS |
| A cannot archive B (404) | PASS |
| Public bucket URL denied | PASS |
| A archive + post-archive download 409 | PASS |

### HR authorization / branch isolation (live)

| Check | Result |
| --- | --- |
| Unauthenticated upload | **401** PASS |
| Supplier user | **403** PASS |
| Cashier (no HR) | **403** PASS |
| Admin/HR upload + list + signed download | PASS |
| Manipulated `employee_id` | **404** PASS |
| Archive | PASS |

### File validation (live)

| Case | Result |
| --- | --- |
| Allow PDF / PNG / JPEG / DOCX / CSV | PASS |
| Reject `.exe` / HTML | **415** PASS |
| MIME/extension mismatch | **400** PASS |
| Empty payload | **400** PASS |
| Oversized | **413** PASS |

Magic-byte inspection and antivirus scanning are **not** implemented (see `KNOWN_LIMITATIONS.md`).

### Signed URL (live)

| Check | Result |
| --- | --- |
| Bucket not publicly readable | PASS |
| Signed URL only after authz | PASS |
| Expiry contract 120s | PASS (full wait not required for gate) |
| No service-role credential leak in responses/report | PASS |

### Audit (live)

| Domain | upload | download | archive | Cross-tenant success event |
| --- | --- | --- | --- | --- |
| Supplier | PASS | PASS | PASS | None (`count=0`) |
| HR | PASS | PASS | PASS | — |

## Playwright

Config: `playwright.rc4-documents.config.ts`  
Suite: `e2e/rc4/documents.spec.ts`  
Artifact: `playwright-results.json`

| Metric | Value |
| --- | --- |
| Expected (passed) | **3** |
| Unexpected (failed) | **0** |
| Skipped | **0** |

Coverage: HR panel empty/loading + dropzone + axe desktop/mobile; supplier documents panel + axe desktop/mobile; cashier role denial screenshot. Full binary round-trips are covered by live API QA against the same endpoints the UI uses.

## Accessibility (axe)

| Surface | Critical | Serious | Status |
| --- | --- | --- | --- |
| Admin HR documents (desktop) | **0** | **0** | PASS |
| Admin HR documents (mobile 390×844) | **0** | **0** | PASS |
| Supplier documents (desktop) | **0** | **0** | PASS |
| Supplier documents (mobile) | **0** | **0** | PASS |

Moderate/minor axe findings (if any) were not blocking; none critical/serious.

## Defects fixed during live validation

1. **Supplier archive 500** — `supplier_documents.status` CHECK omitted `archived` → migration `20260731171000_rc4_documents_archive_status.sql`.
2. **HR archive missing** — added `archiveDocument` + `POST /admin/hr/documents/:id/archive` (+ unit mock coverage).
