# RC4-5 Known Limitations

1. **Transport is base64 JSON**, not multipart/`multipart/form-data`. Effective default max ~1.4 MiB under Express `2mb` JSON limit (bucket limit remains 5 MiB).
2. **No virus / malware scanning** — not implemented; not claimed.
3. **No magic-byte sniffing** beyond declared MIME + extension allowlist; content is not deep-inspected.
4. **Replace flow** is partial: schema supports `replaced_document_id`; dedicated replace UX/API is not fully productized (upload + archive cover primary ops).
5. **Hard delete** is not exposed; archive sets status/`archived_at`.
6. **Legacy URL documents** remain supported; downloads for URL-only rows open the stored URL after authz.
7. **Signed URL full wall-clock expiry wait** — live gate asserts the **120s** contract and currently-valid download; waiting >120s for natural expiry is not required for acceptance.
8. **Migration not applied to Production** — slice explicitly forbids Production deploy.
9. **Storage grants / bucket** require RC4-5 migrations applied on the target environment before uploads succeed; local stack also needs the known `GRANT` gap fix from `AGENTS.md` after reset.
10. **CSV “where applicable”** — allowed by validator; domain-specific CSV parsers are not part of this slice.
11. **Playwright** validates UI surfaces, axe, and role denial screenshots; end-to-end binary bytes are proven primarily via live API QA (`scripts/rc4-documents-live-qa.mjs`) against the same authorized endpoints.
