# ADR-015: AI Prompt & Data Retention Policy

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260820000200_adr_015_ai_prompt_retention.sql`)

---

## Context

AI prompt logs are valuable for debugging ("why did the model give
that answer?") and for fine-tuning ("collect good examples for
future training"). But they also create two risks:

1. **PII accumulation.** If raw prompts are stored, customer PII
   (names, phones, order details) accumulates in the database. Even
   with ADR-013's redaction, some PII may slip through (e.g. a
   customer's name embedded in a natural-language order description).
   Over time, the prompt log becomes a PII honeypot.
2. **Storage cost.** AI prompts can be large (especially with context
   windows of 100K+ tokens). Storing raw prompts indefinitely is
   expensive and provides diminishing value (most prompts are never
   re-read).

Phase 2.6 (AI) closes this gap. ADR-015 establishes that raw prompts
are NEVER stored in the application database — only hashed metadata
is kept, for audit and cost tracking.

## Decision

Implement AI prompt retention with these rules:

1. **Raw prompts are NEVER stored in the database.** The
   `ai_call_logs` table (ADR-013) stores only:
   - `prompt_sha256` — SHA-256 hash of the redacted prompt (NOT the
     raw prompt, NOT the redacted prompt as plaintext)
   - `prompt_token_count` — token count (for cost tracking)
   - `prompt_char_count` — character count (for size analytics)
   - `prompt_language` — detected language code (e.g. `en`, `ur`)
     — useful for routing to language-specific models

2. **Raw prompts MAY be stored in the provider's dashboard.** OpenAI,
   Anthropic, etc. all retain prompts on their side for 30 days
   (default) or longer (with retention settings). For deep debugging,
   operators can use the provider's dashboard — Telepizza does not
   duplicate this data.

3. **`ai_prompt_logs` table for hashed metadata.** Separate from
   `ai_call_logs` (which tracks the call lifecycle), `ai_prompt_logs`
   stores per-prompt metadata for analytics:
   - `prompt_sha256` — UNIQUE; one row per distinct prompt
   - `first_seen_at` — first time this prompt hash was seen
   - `last_seen_at` — most recent occurrence
   - `occurrence_count` — how many times this prompt has been sent
   - `avg_latency_ms` — average response time
   - `avg_cost_usd` — average cost
   - `metadata` — JSONB with non-PII analytics fields (e.g. topic
     category, detected intent)

4. **Prompt hash is computed AFTER redaction.** This ensures the hash
   is deterministic for the same redacted prompt, enabling analytics
   ("how often do we see this kind of prompt?") without storing the
   prompt itself.

5. **Completion text is NEVER stored.** The model's response is
   delivered to the caller and then discarded. Only metadata
   (token count, latency, success/failure) is logged. If the caller
   wants to persist the response, they must store it themselves in
   their own table (e.g. an `ai_insights` table for generated
   summaries) — and that table is subject to normal PII retention
   rules.

6. **90-day retention for `ai_call_logs`.** Rows older than 90 days
   are deleted by a scheduled job. The hash metadata in
   `ai_prompt_logs` is retained indefinitely (it's just a hash + 
   counters, no PII).

7. **24-month retention for `ai_prompt_logs`.** The hash + counter
   data is retained for 24 months for trend analytics. After 24
   months, rows are archived to cold storage.

8. **No foreign keys to raw prompts.** Other tables (e.g.
   `ai_approvals.action_payload`) may reference the AI call by id,
   but they CANNOT reference the raw prompt. This forces all prompt
   data to flow through the proxy, where redaction + hashing occurs.

## Consequences

### Positive

- **No PII honeypot.** Even if the database is leaked, no prompt
  text is exposed — only hashes.
- **Storage cost is bounded.** `ai_call_logs` rows are < 1 KB each;
  90-day retention keeps the table small. `ai_prompt_logs` is even
  smaller (one row per distinct hash).
- **Analytics are still possible.** Trend analysis ("how many AI
  calls per day? what's the avg cost?") works on the hashed metadata.
- **Provider dashboard is the source of truth for raw prompts.**
  Operators use the provider's tools for deep debugging, not
  Telepizza's database.

### Negative

- **Deep debugging requires provider access.** If a user reports
  "the AI gave a weird answer last Tuesday", the operator must:
  1. Look up the `ai_call_logs` row by timestamp + actor
  2. Note the `prompt_sha256` and provider call id
  3. Log into the provider's dashboard and search by call id
  This is more steps than just querying a local prompt table, but
  it's the price of not storing PII.
- **No fine-tuning dataset.** If Telepizza wants to fine-tune a model
  on its own data, the raw prompts must be collected separately (via
  an opt-in mechanism with explicit consent). Out of scope for
  ADR-015.
- **Hash collisions are possible but harmless.** Two different prompts
  could produce the same SHA-256 hash (probability: ~1 in 2^128).
  If this happens, the analytics would conflate them. Acceptable for
  analytics; not for audit.

## Implementation references

- Migration: `supabase/migrations/20260820000200_adr_015_ai_prompt_retention.sql`
- TypeScript service: `backend/api/src/services/ai/prompt-log-service.ts`
- Tests: `backend/api/tests/ai-prompt-log-service.test.ts`

## Future work (out of scope for this ADR)

- **90-day cleanup job** — Scheduled job that DELETEs `ai_call_logs`
  rows older than 90 days. Out of scope; the schema supports it.
- **Opt-in prompt storage** — A separate `ai_prompt_raw_opt_in` table
  for users who explicitly consent to having their prompts stored
  for fine-tuning. Out of scope; requires consent management UI.
- **Prompt classification** — Automatic classification of prompts
  into categories (e.g. "order status query", "refund request") for
  better analytics. Out of scope; the `metadata->>'topic'` field
  supports manual classification.
