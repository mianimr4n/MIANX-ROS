# RC5-OBS-01 — Secret and PII review

## Repository secret-scan process

| Check | Result |
| --- | --- |
| Dedicated `secret-scan` npm/CI job | **Not present** in root `package.json` / `.github/workflows/ci.yml` |
| Manual diff inspection (this PR, including proof update) | Required and performed before push |
| Patterns scanned (presence only; values not pasted into reports) | `sb_secret_`, `Authorization:`, `Bearer `, JWT-shaped strings, `cookie`, DB password assignments, reset-password URL fragments |

## Controls in this slice

| Control | Applied |
| --- | --- |
| No platform credentials in Git | Yes |
| No raw Production log dumps | Yes |
| No screenshots | Yes |
| Request IDs only partially redacted (`obs-20260802…4853Z`) | Yes |
| No IP addresses, user-agents, user IDs, emails | Yes |
| No tokens, cookies, Authorization headers | Yes |
| Public/read-only health probes without Authorization in evidence | Yes |
| Existing API log redaction not weakened | Yes (docs-only; no code change to `redact.ts`) |
| Alert secrets | N/A — alerts remain `PROPOSED_NOT_ENABLED` |
| Operator attestation: sensitive token in matched Render log | **NO** (sanitized fact) |

## Allowed evidence content

- Sanitized UTC windows and HTTP status codes
- Partial request IDs only
- Boolean / count results for Dashboard searches (`YES`/`NO`, `0` hits in a named window)
- Runbook steps and official documentation URLs

## Forbidden (none included)

- Passwords, tokens, JWTs, cookies, service-role keys
- Full Authorization headers
- Full request IDs
- Customer PII / complete auth log lines
- IP addresses / user-agent strings
- Private connection strings
- Screenshots or raw Production log bodies

## Window-scoped search honesty

Supabase `42703` / `42P01` / `42501` zero counts apply **only** to UTC window **2026-08-02 07:45Z–07:55Z**.
