## Summary
- Send Supabase `apikey` + `Authorization: Bearer` on `/auth/v1/health` connectivity probe when anon key is configured.
- Treat HTTP 401 **with** anon key as unhealthy (no longer silent reachability PASS).
- Unit tests cover headers, 401-with-key, 5xx, and redaction.

## Context
Production schema cutover is separate and already applied. This PR addresses the known observability 401 noise only. **Do not deploy until explicitly authorized.**

## Test plan
- [ ] `pnpm --filter @telepizza/api test` (observability suite)
- [ ] Confirm no Production deploy from this PR without Founder GO
