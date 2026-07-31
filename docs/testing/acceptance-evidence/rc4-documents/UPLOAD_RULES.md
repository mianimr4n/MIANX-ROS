# RC4-5 Upload Rules

## Allowed MIME / extensions

| MIME | Extension |
| --- | --- |
| `application/pdf` | `.pdf` |
| `image/png` | `.png` |
| `image/jpeg` | `.jpg` / `.jpeg` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |
| `text/csv` / `application/csv` | `.csv` |

All other types are rejected (`415 UNSUPPORTED_MEDIA_TYPE`).

## Size limits

| Layer | Limit |
| --- | --- |
| Default API max | **1,400,000 bytes** (`DEFAULT_DOC_MAX_BYTES`) — fits Express JSON **2mb** body with base64 overhead |
| Env override | `TELEPIZZA_DOC_MAX_BYTES` (min 10_000; hard-capped at **5 MiB**) |
| Storage bucket | **5,242,880 bytes** (5 MiB) mime allowlist on `supplier-documents` / `hr-employee-documents` |

## Validation order

1. Normalize declared `Content-Type` (strip parameters).
2. Allowlist MIME check.
3. Decode base64; reject empty / oversize.
4. Sanitize original filename (basename only; strip path traversal).
5. If client extension present, require it to match declared MIME family.
6. Compute SHA-256 checksum of bytes.
7. Generate storage path: `{tenantKey}/{yyyy}/{mm}/{uuid}.{ext}` — **never** use client path segments.

## Transport

Binary payloads are sent as **base64 JSON** fields (`dataBase64`, `contentType`, `originalFilename`) — same pattern as menu product images — not multipart (deferred; Express JSON limit).
