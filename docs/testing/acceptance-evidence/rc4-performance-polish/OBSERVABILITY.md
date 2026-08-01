# Observability

## Reused (RC4-6)

- `X-Request-ID` attach + CORS expose
- Structured request / slow_request logs
- Safe API error envelope with `requestId`

## RC4-7 additions

- Frontend `ApiRequestError` now captures `X-Request-ID` / body `error.requestId` for safe display on technical failures.
- Route loading fallback announces busy state (`role="status"`, `aria-live="polite"`).
- Build continues to emit versioned hashed asset names.

## Never logged

Secrets, JWTs, payroll details, bank details, full customer lists, signed URLs, provider credentials.
