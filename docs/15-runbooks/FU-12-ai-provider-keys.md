# FU-12 — Operator Follow-up: AI Provider API Keys

**Status:** OPEN (no code blocker — owner-action items only)
**Opened:** 2026-08-16 (Phase 13.0 — foundational build)
**Authority:** ADR-003 (Provider-Secret Boundary) · ADR-013 (AI Provider Boundary) · `docs/14-phases/PHASE-13-PLANNING.md` §5
**Related:** `backend/api/src/services/ai/provider-proxy.ts` · `backend/api/src/config/env.ts` (`aiMode`)

---

## Summary

Phase 13 (AI and Automation) cannot make a real LLM call until the
owner (or operator) provisions the AI provider API keys. This is **not
a code blocker** — the proxy and `aiMode` env-var wiring ship in
Phase 13.0 — but until this follow-up is closed, `TELEPIZZA_AI_MODE`
must remain at `mock` (local/test) or `disabled` (staging/production).

Closing this follow-up unblocks all five Phase 13 ADRs (ADR-042
through ADR-046).

---

## Prerequisites

| # | Item | Notes |
|---|---|---|
| 1 | Phase 13.0 merged (provider-proxy + aiMode) | Required — the proxy must exist before keys are useful |
| 2 | OpenAI account (or Anthropic, or both) | Create at https://platform.openai.com/ or https://console.anthropic.com/ |
| 3 | Billing verified on each provider account | Both providers reject calls without a payment method on file |
| 4 | Production Supabase access (to seed `ai_provider_configs` rows) | Super-admin only — RLS blocks normal staff from inserting provider configs |

---

## Steps to close FU-12

### Step 1 — Provision API keys at the provider

**OpenAI:**
1. Sign in at https://platform.openai.com/.
2. Navigate to **Organization → API keys → Create new secret key**.
3. Name the key `telepizza-prod` (or `telepizza-staging`).
4. Set a monthly spending limit (recommended: $50 USD/month for staging, $200 USD/month for production).
5. Copy the secret key (`sk-...`) — it will not be shown again.

**Anthropic:**
1. Sign in at https://console.anthropic.com/.
2. Navigate to **Settings → API Keys → Create Key**.
3. Name the key `telepizza-prod`.
4. Set billing at **Settings → Billing**.
5. Copy the secret key (`sk-ant-...`).

### Step 2 — Set env vars on the host

For **production** (Vercel / Render / fly.io / your host):

```bash
OPENAI_API_KEY=sk-...the-actual-key...
ANTHROPIC_API_KEY=sk-ant-...the-actual-key...
TELEPIZZA_AI_MODE=live
```

For **staging** (smoke-test environment, real provider call allowed):

```bash
OPENAI_API_KEY=sk-...staging-key-with-low-limit...
TELEPIZZA_AI_MODE=live
```

For **local/test** (NEVER set real keys here — local defaults to
`TELEPIZZA_AI_MODE=mock` which never makes an HTTP call):

```bash
# Do not set OPENAI_API_KEY / ANTHROPIC_API_KEY locally
TELEPIZZA_AI_MODE=mock
```

> ⚠️ **Per ADR-003**, AI provider API keys are **secrets** and MUST
> live in environment variables only. NEVER commit them to git,
> NEVER put them in `.env` (only `.env.example` for documentation),
> NEVER store them in the database.

### Step 3 — Seed `ai_provider_configs` rows

Connect to the production Supabase database (or staging) and insert
the non-secret metadata rows. **Secrets are NOT stored here** — only
metadata. The `config_ref` column documents which env var holds the
actual key.

```sql
-- OpenAI provider config (non-secret metadata only)
insert into public.ai_provider_configs (
  provider_code, provider_name, config_ref, base_url,
  default_model, max_tokens, temperature, is_active, metadata
) values (
  'openai',
  'OpenAI',
  'OPENAI_API_KEY',
  'https://api.openai.com/v1',
  'gpt-4o-mini',
  4096,
  0.7,
  true,
  jsonb_build_object('region', 'us', 'cost_per_1k_input_usd', 0.00015, 'cost_per_1k_output_usd', 0.0006)
)
on conflict (provider_code) do update set
  is_active = true,
  base_url = excluded.base_url,
  default_model = excluded.default_model,
  updated_at = timezone('utc', now());

-- Anthropic provider config
insert into public.ai_provider_configs (
  provider_code, provider_name, config_ref, base_url,
  default_model, max_tokens, temperature, is_active, metadata
) values (
  'anthropic',
  'Anthropic',
  'ANTHROPIC_API_KEY',
  'https://api.anthropic.com',
  'claude-3-5-sonnet',
  4096,
  0.7,
  true,
  jsonb_build_object('region', 'us', 'cost_per_1k_input_usd', 0.003, 'cost_per_1k_output_usd', 0.015)
)
on conflict (provider_code) do update set
  is_active = true,
  base_url = excluded.base_url,
  default_model = excluded.default_model,
  updated_at = timezone('utc', now());
```

### Step 4 — Smoke-test the proxy

Restart the backend with the new env vars, then call the proxy
end-to-end:

```bash
# Should return a real OpenAI completion (or mock stub in local)
curl -X POST http://localhost:4000/api/v1/admin/ai/proxy \
  -H "Authorization: Bearer $API_JWT" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello in 3 words", "provider": "openai"}'

# Verify the call was logged to ai_call_logs
psql $DATABASE_URL -c "
  select id, provider, model, success, prompt_sha256, prompt_token_count,
         completion_token_count, cost_usd, called_at
  from ai_call_logs
  order by called_at desc
  limit 5;
"
```

A successful run shows:
- HTTP 200 with a non-empty `text` field
- A new row in `ai_call_logs` with `success=true` and a non-null `prompt_sha256`
- `prompt_sha256` is the SHA-256 hash of the **redacted** prompt (raw prompts are NEVER stored — ADR-015)

### Step 5 — Verify rate-limiting and budget alerts

Make 65 rapid calls in under 60 seconds (script below). The 61st call
should return HTTP 429 `AI_RATE_LIMIT_USER`.

```bash
for i in $(seq 1 65); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/api/v1/admin/ai/proxy \
    -H "Authorization: Bearer $API_JWT" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": \"echo $i\"}"
done
```

After the smoke test, check `ai_call_logs` for the cost column — if
the daily cost exceeds the budget threshold, set up an alert in your
monitoring tool of choice. The proxy records `cost_usd` per call.

### Step 6 — Mark FU-12 CLOSED

Update `docs/15-runbooks/FU-12-ai-provider-keys.md` (this file)
Status line at the top from `OPEN` to `CLOSED`. Then add a row to
`worklog.md` under the next Phase 13.x work entry:

```markdown
- FU-12 CLOSED: OpenAI + Anthropic provider keys provisioned in
  production. ai_provider_configs seeded with both rows. Smoke test
  returned a 200 with a valid ai_call_logs row. Rate limit verified
  at 60 calls/min/user.
```

---

## Failure modes and recovery

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 AI_API_KEY_MISSING` | Env var not set on the host | Re-set `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` and restart the backend |
| `503 AI_NO_ACTIVE_PROVIDER` | No rows in `ai_provider_configs` with `is_active=true` | Run the SQL in Step 3 |
| `502 AI_PROVIDER_HTTP_ERROR` | Provider returned 4xx/5xx | Check error_message in ai_call_logs; verify billing on the provider dashboard |
| `429 AI_RATE_LIMIT_USER` | More than 60 calls/min/user | Wait 60 seconds for the in-memory bucket to expire; this is by-design |
| `429 AI_RATE_LIMIT_IP` | More than 120 calls/min/IP | Same as above |
| `503 AI_DISABLED` | `TELEPIZZA_AI_MODE=disabled` | Set to `live` (production) or `mock` (local); never `live` in local/test |
| `ai_call_logs` rows missing | logService.logCall failed silently | Check Supabase connectivity; the proxy intentionally does not throw on log failures to avoid masking LLM responses |

---

## Cost guardrails

The proxy estimates per-call cost using the May 2025 public list
prices stored in `COST_PER_1K_INPUT` and `COST_PER_1K_OUTPUT` inside
`provider-proxy.ts`. These are **estimates** — real billing comes
from the provider. Estimated cost is stored in `ai_call_logs.cost_usd`
for analytics and budget-alerting.

Recommended monthly budgets (tune after 30 days of real traffic):

| Environment | Provider | Monthly budget (USD) | Notes |
|---|---|---|---|
| Staging | OpenAI | $20 | Smoke tests + integration tests only |
| Staging | Anthropic | $20 | Same as above |
| Production | OpenAI | $200 | Demand forecast + sentiment + campaign gen |
| Production | Anthropic | $200 | Long-context reasoning (kitchen prediction, fraud signals) |

---

## Acceptance criteria (close-out checklist)

- [ ] Phase 13.0 merged (provider-proxy + aiMode)
- [ ] API keys provisioned at OpenAI and/or Anthropic
- [ ] Env vars set on the production host
- [ ] `ai_provider_configs` seeded with the SQL in Step 3
- [ ] Smoke test (Step 4) returns HTTP 200
- [ ] `ai_call_logs` row visible with non-null `prompt_sha256` and `cost_usd`
- [ ] Rate limit test (Step 5) returns HTTP 429 on the 61st call
- [ ] Monthly budget set on the provider dashboard (Step 1 §4)
- [ ] Status line at top of this doc flipped from `OPEN` to `CLOSED`
- [ ] Worklog entry appended noting FU-12 closure
