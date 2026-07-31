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
