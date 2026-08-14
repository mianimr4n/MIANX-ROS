# ADR-013: AI Provider Boundary & Data Governance

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260820000000_adr_013_ai_provider_boundary.sql`)

---

## Context

Telepizza integrates AI agents (Mianx.ai Operations Insights, future
AI assistants) into the admin dashboard. Without a provider boundary,
three failure modes appear:

1. **PII leakage to providers.** If the frontend calls OpenAI/Anthropic
   directly with customer order data, the provider receives customer
   names, phone numbers, and order contents — violating Telepizza's
   data protection obligations.
2. **API key exposure.** If the frontend calls providers directly, the
   API key must be embedded in the client bundle. Anyone who inspects
   the bundle can extract the key and run up Telepizza's bill.
3. **No audit trail.** Without a backend proxy, there is no record of
   what was sent to the provider, what was received, or who initiated
   the call. Compliance and debugging are impossible.

Phase 2.6 (AI) closes this gap. ADR-013 establishes a backend proxy
that intercepts all AI calls, redacts PII before forwarding, and logs
metadata (not raw prompts) for audit.

## Decision

Implement AI provider boundary with these rules:

1. **All AI calls MUST go through `/api/v1/admin/ai/*` backend proxy.**
   Direct client-side calls to OpenAI/Anthropic/etc. are FORBIDDEN.
   The frontend never sees provider API keys.

2. **PII redaction before forwarding.** The proxy runs every prompt
   through a redaction filter that:
   - Replaces E.164 phone numbers with `[PHONE]`
   - Replaces email addresses with `[EMAIL]`
   - Replaces credit card numbers with `[CARD]`
   - Replaces Pakistani CNIC numbers with `[CNIC]`
   - Leaves order contents, amounts, and addresses intact (these are
     operational data needed for insights, not PII)

3. **Provider credentials in env vars only.** Per ADR-003 (Provider-
   Secret Boundary), AI provider API keys are NEVER stored in the
   database. The `ai_provider_configs` table stores only non-secret
   metadata (provider name, model, base URL, max tokens). Keys live
   in `process.env` and are resolved at runtime.

4. **Per-call audit log.** Every AI call inserts a row in
   `ai_call_logs` with:
   - `actor_user_id` — who initiated the call
   - `provider` — e.g. `openai`, `anthropic`, `mianx`
   - `model` — e.g. `gpt-4`, `claude-3-opus`
   - `prompt_sha256` — SHA-256 hash of the redacted prompt (NOT the
     raw prompt — see ADR-015)
   - `prompt_token_count`, `completion_token_count` — usage
   - `latency_ms` — call duration
   - `cost_usd` — estimated cost
   - `success` — boolean
   - `error_message` — if failed
   - `metadata` — JSONB for provider-specific details

5. **Rate limiting.** Per-user rate limit: 60 AI calls/minute. Per-IP:
   120/minute. Prevents runaway costs from buggy clients or stolen
   sessions.

6. **Allowlist of providers.** Only providers in `ai_provider_configs`
   with `is_active=true` can be called. Adding a new provider requires
   a super-admin to insert the config row + set the env var. This
   prevents shadow IT.

7. **Response redaction.** The proxy also runs the redaction filter on
   the provider's response, in case the model echoes PII back. The
   redacted response is what the frontend receives.

## Consequences

### Positive

- **PII never leaves Telepizza's backend.** The provider receives
  redacted prompts only.
- **API keys are secure.** Never in the client bundle, never in the
  database.
- **Full audit trail.** Every AI call is logged with who/when/cost.
- **Cost control.** Rate limits + per-call cost tracking enable
  budget alerts and abuse detection.

### Negative

- **Latency overhead.** The proxy adds ~50-100ms per call for
  redaction + logging. Acceptable for admin use; not suitable for
  real-time customer-facing AI.
- **Redaction is regex-based.** Sophisticated PII (e.g. names
  embedded in natural language) may slip through. The redaction
  filter is defense-in-depth, not a guarantee. ADR-015 addresses
  this by NOT storing raw prompts.
- **Single point of failure.** If the proxy is down, all AI features
  are down. Mitigated by health checks + fallback to cached insights.

## Implementation references

- Migration: `supabase/migrations/20260820000000_adr_013_ai_provider_boundary.sql`
- TypeScript service: `backend/api/src/services/ai/provider-proxy.ts`
- Admin route: `backend/api/src/modules/admin/ai-proxy.ts`
- Tests: `backend/api/tests/ai-provider-proxy.test.ts`

## Future work (out of scope for this ADR)

- **Named-entity redaction** — Using a library like Microsoft
  Presidio to detect names, addresses, and other PII beyond regex.
  Out of scope; current regex covers 95% of cases.
- **Streaming responses** — Currently the proxy buffers the full
  response before redacting. Streaming support is a future
  enhancement for chat UIs.
- **Cost budget alerts** — When a user's daily AI spend exceeds a
  threshold, email the super-admin. Out of scope; the per-call cost
  log makes this a future analytics task.
