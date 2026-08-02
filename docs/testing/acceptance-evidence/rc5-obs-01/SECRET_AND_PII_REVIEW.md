# RC5-OBS-01 — Secret and PII review

## Repository secret-scan process

| Check | Result |
| --- | --- |
| Dedicated `secret-scan` npm/CI job | **Not present** in root `package.json` / `.github/workflows/ci.yml` |
| Manual diff inspection (this PR) | Required and performed before push |
| Patterns scanned (presence only; values not pasted into reports) | `sb_secret_`, `Authorization:`, `Bearer `, JWT-shaped strings, `cookie`, DB password assignments, reset-password URL fragments |

## Controls in this slice

| Control | Applied |
| --- | --- |
| No platform credentials in Git | Yes |
| No raw Production log dumps | Yes |
| Request IDs only partially redacted in evidence | Yes |
| Public health probes without Authorization | Yes |
| Existing API log redaction not weakened | Yes (docs-only; no code change to `redact.ts`) |
| Alert secrets | N/A — alerts not enabled |

## Allowed evidence content

- Sanitized timestamps, HTTP status codes, partial request IDs
- Public `gitSha` from `/healthz` / `/readyz`
- Runbook steps and official documentation URLs

## Forbidden (none included)

- Passwords, tokens, JWTs, cookies, service-role keys
- Full Authorization headers
- Customer PII / complete auth log lines
- Private connection strings
