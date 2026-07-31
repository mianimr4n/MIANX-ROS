# RC4-5 Final Report

## Decision

**RC4_5_DOCUMENTS_INCOMPLETE**

## Why incomplete

1. `pnpm rc1:gate` failed on live scripts (`ECONNREFUSED` API `:4000`).
2. Playwright upload flows + axe (0 critical / 0 serious) were scaffolded but **not executed**.
3. Live cross-tenant download denial and storage round-trip were not exercised against Supabase.

## What is implemented (repository evidence)

- Private buckets + metadata migration `20260731170000_rc4_documents_binary_uploads.sql`
- Shared validation + storage helpers
- Supplier upload / signed download / archive with supplier isolation
- HR upload / signed download with `hr.manage|staff.manage|admin.access` + branch scope
- `document_access_events` audit (upload/download/archive)
- Dropzone UX (drag/drop, progress, errors, empty/loading)
- Unit + static API/website/HR RBAC tests
- Acceptance pack under `docs/testing/acceptance-evidence/rc4-documents/`

## Validation snapshot

| Gate | Result |
| --- | --- |
| `pnpm check` | PASS |
| `pnpm test` | PASS (555) |
| `pnpm rc1:gate` | FAIL (live API absent) |
| `git diff --check` | PASS |

## Audit events

| Action | Domain | Status |
| --- | --- | --- |
| upload | supplier, hr | Implemented |
| download | supplier, hr | Implemented |
| archive | supplier | Implemented |
| replace / delete | schema-ready | Not fully productized |

## STOP compliance

No finance / payroll / inventory / delivery / analytics redesign. No Production deployment.
