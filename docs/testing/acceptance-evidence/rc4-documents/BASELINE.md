# RC4-5 Documents — Baseline

| Field | Value |
| --- | --- |
| Slice | RC4-5 Documents & Binary Uploads |
| Branch | `feature/rc4-documents` |
| Base | `origin/main` @ `9d41f3a` (RC4-6 Observability merged) |
| Scope | Supplier Portal documents + HR employee documents + shared validation/storage |
| Out of scope | Finance, payroll, inventory, delivery, analytics redesign; Production deploy |

## Pre-slice state (repository evidence)

- Supplier/HR documents were **URL references only** (`file_url`).
- UI stated binary upload was not configured.
- Only live binary path elsewhere: menu product images (`menu-product-images` public/signed pattern).
- No shared document validation layer; no `document_access_events` audit table.

## Post-slice intent

Replace deferred binary handling with private Supabase Storage buckets, server-side validation, signed downloads, tenant isolation, and access audit — without redesigning procurement or HR broadly.

## Live completion pass (2026-07-31)

| Field | Value |
| --- | --- |
| Start SHA | `03de61f15ae87bf9d09f9f825ca65595b31d1afb` |
| Status entering pass | `RC4_5_DOCUMENTS_INCOMPLETE` (no live stack / Playwright / axe) |
| Live QA | `LIVE_QA_REPORT.json` — 50/50 PASS |
| Playwright | `playwright-results.json` — 3/3 PASS; axe 0 critical / 0 serious |
| Decision | `RC4_5_DOCUMENTS_COMPLETE` (see `FINAL_REPORT.md`) |
