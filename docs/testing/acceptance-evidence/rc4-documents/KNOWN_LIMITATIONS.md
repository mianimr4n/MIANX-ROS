# RC4-5 Known Limitations

1. **Transport is base64 JSON**, not multipart/`multipart/form-data`. Effective default max ~1.4 MiB under Express `2mb` JSON limit.
2. **No virus / malware scanning** — not implemented; not claimed.
3. **No magic-byte sniffing** beyond declared MIME + extension allowlist; content is not deep-inspected.
4. **Replace flow** is partial: schema supports `replaced_document_id`; dedicated replace UX/API is not fully productized (upload + archive cover primary ops).
5. **HR archive** via binary status exists on rows; supplier archive endpoint is implemented; hard delete not exposed.
6. **Legacy URL documents** remain supported; downloads for URL-only rows open the stored URL after authz.
7. **Playwright + axe** are scaffolded; full browser PASS not claimed without local execution evidence.
8. **Migration not applied to Production** — slice explicitly forbids Production deploy.
9. **Storage grants / bucket** require RC4-5 migration applied on the target environment before uploads succeed.
10. **CSV “where applicable”** — allowed by validator; domain-specific CSV parsers are not part of this slice.
