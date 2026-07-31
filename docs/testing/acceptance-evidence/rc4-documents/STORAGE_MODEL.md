# RC4-5 Storage Model

## Buckets

| Bucket | Public | Max size | Purpose |
| --- | --- | --- | --- |
| `supplier-documents` | No | 5 MiB | PO attachments, invoices, delivery notes, certificates, supporting docs |
| `hr-employee-documents` | No | 5 MiB | Contracts, CNIC/ID, certificates, policy acknowledgements, other HR |

## Object path

```text
{sanitizedTenantKey}/{yyyy}/{mm}/{uuid}.{ext}
```

- Supplier tenant key = `supplier_id`
- HR tenant key = employee `branch_id`
- Client filenames stored only as sanitized `original_filename` metadata

## Metadata tables

### `supplier_documents`

Adds: `storage_bucket`, `storage_path`, `checksum_sha256`, `original_filename`, `archived_at`, `replaced_document_id`.  
Payload check: `file_url` **or** (`storage_path` + `storage_bucket`).

### `hr_employee_documents`

Adds: mime/size/storage/checksum/original_filename/title/`uploaded_by`/status/archive.  
Types expanded with `POLICY` and `OTHER`.

### `document_access_events`

Audit row per upload / download / replace / archive / delete with actor, branch, supplier, employee, `request_id`, metadata JSON.

## Abstraction

Shared modules:

- `backend/api/src/services/documents/validation.ts`
- `backend/api/src/services/documents/storage.ts`

No redesign of broader storage architecture beyond these private buckets + metadata columns.
