# FU-12 — Operator Follow-up: AI Provider API Keys

**Status:** TABLETOP EXECUTED (2026-08-17) — local mock-mode smoke + rate-limit verified; **production keys + production Supabase seed + production host env vars STILL PENDING** an operator with real OpenAI/Anthropic/Supabase/Vercel access. See §"Tabletop execution record (2026-08-17)" below for what was verified locally and what remains.
**Opened:** 2026-08-16 (Phase 13.0 — foundational build)
**Tabletop executed:** 2026-08-17 (Phase 13.0 follow-up — local verification of Steps 4 + 5 in mock mode + SQL seed artifact saved)
**Authority:** ADR-003 (Provider-Secret Boundary) · ADR-013 (AI Provider Boundary) · `docs/14-phases/PHASE-13-PLANNING.md` §5
**Related:** `backend/api/src/services/ai/provider-proxy.ts` · `backend/api/src/config/env.ts` (`aiMode`) · `backend/api/tests/fu-12-smoke.test.ts` · `scripts/fu-12-seed-ai-provider-configs.sql`

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

## Tabletop execution record (2026-08-17)

This runbook was executed locally in **mock mode** (`TELEPIZZA_AI_MODE=mock`,
no real API keys set, no real HTTP calls) to verify that the proxy
contract enforced by ADR-013 §1-7 holds end-to-end. The production
operator-action items (real OpenAI/Anthropic account creation + real
production Supabase seed + real production host env vars) remain pending.

### What was verified locally

| Runbook step | What was executed | Result |
|---|---|---|
| Step 1 (provision keys) | NOT EXECUTED — requires real OpenAI/Anthropic account access | Skipped (production-only) |
| Step 2 (set env vars) | Local env confirmed at `TELEPIZZA_AI_MODE=mock`; no real `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` set locally (per runbook rule: "Do not set real keys locally") | Local config verified safe |
| Step 3 (seed ai_provider_configs) | SQL seed script saved as `scripts/fu-12-seed-ai-provider-configs.sql` (idempotent ON CONFLICT DO UPDATE; matches the migration schema in `supabase/migrations/20260820000000_adr_013_014_015_ai.sql`); the in-test mock Supabase client returns the seeded rows for both `openai` + `anthropic` | SQL artifact ready; mock seed verified by tests |
| Step 4 (smoke-test the proxy) | New test file `backend/api/tests/fu-12-smoke.test.ts` exercises the EXACT runbook smoke prompt (`"Say hello in 3 words"`) with `provider=openai` AND `provider=anthropic` in mock mode; verifies non-empty `text`, correct `provider`/`model`, presence of `costUsd` field, that NO HTTP call fires, and that a log row with `success=true` is written. Also verifies PII redaction (phone number → `[PHONE]`) on a PII-bearing variant of the prompt, and verifies both `AI_PROVIDER_NOT_CONFIGURED` (400, when explicit provider has no row) + `AI_NO_ACTIVE_PROVIDER` (503, when no provider specified and none configured) error paths. | **13/13 tests passing** |
| Step 5 (verify rate-limiting) | Same test file verifies the runbook-specified rate-limit burst: 65 rapid calls from the same `actorUserId` — calls 1-60 succeed, calls 61-65 throw `AI_RATE_LIMIT_USER`. Also verifies the per-IP limit: 125 calls from 125 distinct users sharing one IP — calls 1-120 succeed, calls 121-125 throw `AI_RATE_LIMIT_IP`. Also verifies that system calls (`actorUserId=null`) do not trip the per-user bucket. | All rate-limit assertions passing |
| Step 6 (mark FU-12 closed) | Status line flipped from `OPEN` to `TABLETOP EXECUTED (2026-08-17)` (NOT `CLOSED` — production items still pending). Worklog entry appended. | This doc updated; worklog appended |

### Artifacts produced

- `scripts/fu-12-seed-ai-provider-configs.sql` — idempotent SQL seed (production-runnable via `psql "$DATABASE_URL" -f scripts/fu-12-seed-ai-provider-configs.sql`). Inserts both `openai` + `anthropic` rows with the values documented in §Step 3, includes a verification SELECT at the end.
- `backend/api/tests/fu-12-smoke.test.ts` — 13 vitest tests covering runbook Step 4 + Step 5 in mock mode. Runs as part of the regular CI suite (`pnpm vitest run`). Backend test suite now: **102 files / 1128 tests passing** (was 101 files / 1115 tests pre-FU-12 — +1 file, +13 tests).

### What still requires a real operator (cannot be done from this environment)

The following items from the close-out checklist require access to
real production infrastructure and CANNOT be verified locally:

1. **Step 1 — Real API keys.** Must be provisioned at https://platform.openai.com/ and https://console.anthropic.com/ by an operator with billing authority. No code path can substitute for this.
2. **Step 2 — Production host env vars.** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and `TELEPIZZA_AI_MODE=live` must be set on the production host (Vercel / Render / fly.io). Local `.env` MUST NOT contain real keys (per ADR-003).
3. **Step 3 — Production Supabase seed.** The SQL in `scripts/fu-12-seed-ai-provider-configs.sql` must be run against the production Supabase instance by a super-admin (RLS blocks normal staff from inserting into `ai_provider_configs`).
4. **Step 4 (live) — Production smoke test.** Once Steps 1-3 are done, restart the backend with `TELEPIZZA_AI_MODE=live`, then `curl -X POST http://localhost:4000/api/v1/admin/ai/proxy -H "Authorization: Bearer $API_JWT" -H "Content-Type: application/json" -d '{"prompt": "Say hello in 3 words", "provider": "openai"}'`. Expected: HTTP 200 with a real OpenAI completion, plus a new `ai_call_logs` row with `success=true`, non-null `prompt_sha256`, and non-zero `cost_usd`.
5. **Step 5 (live) — Production rate-limit verification.** Once Step 4 passes, run the 65-call burst against the live host. Expected: calls 1-60 return 200, calls 61-65 return HTTP 429 with `code=AI_RATE_LIMIT_USER`.
6. **Monthly budget caps.** Set on the OpenAI + Anthropic dashboards per the cost guardrails table below (staging $20/provider, production $200/provider).

### When this runbook can be flipped to `CLOSED`

Flip the Status line at the top from `TABLETOP EXECUTED` to `CLOSED`
only AFTER an operator has executed Steps 1-5 against real production
infrastructure and confirmed:

- The production smoke `curl` returns HTTP 200 with a real (non-mock) completion.
- A real `ai_call_logs` row exists in production Supabase with `success=true`, non-null `prompt_sha256`, and non-zero `cost_usd`.
- The 65-call burst produces HTTP 429 on calls 61-65.

Until then, `TELEPIZZA_AI_MODE` MUST remain at `mock` (local/test) or `disabled` (staging/production) — Phase 13 ADRs cannot make real LLM calls.

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

**Verified locally (2026-08-17 tabletop):**
- [x] Phase 13.0 merged (provider-proxy + aiMode) — repo main at `f471d57` (PR #242 merged, tag `v3.0.0-rc.1`)
- [x] `ai_provider_configs` seed SQL ready — saved to `scripts/fu-12-seed-ai-provider-configs.sql` (production-runnable; not yet executed against real prod DB)
- [x] Smoke test (Step 4) returns HTTP 200-equivalent in mock mode — verified by `backend/api/tests/fu-12-smoke.test.ts` (13/13 tests passing)
- [x] `ai_call_logs` row visible with non-null `prompt_sha256` (redacted prompt) and `cost_usd` (0 in mock) — verified by the same test file
- [x] Rate limit test (Step 5) returns HTTP 429 on the 61st call (per-user) and 121st call (per-IP) — verified by the same test file
- [x] Worklog entry appended noting FU-12 tabletop execution

**Still pending real operator action (cannot be done from local env):**
- [ ] API keys provisioned at OpenAI and/or Anthropic (requires real accounts + billing)
- [ ] Env vars set on the production host (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `TELEPIZZA_AI_MODE=live`)
- [ ] `ai_provider_configs` seeded in PRODUCTION Supabase (run `scripts/fu-12-seed-ai-provider-configs.sql` against prod DB)
- [ ] Production live-mode smoke test returns HTTP 200 with a REAL (non-mock) OpenAI completion
- [ ] Production `ai_call_logs` row visible with non-zero `cost_usd` (real token cost)
- [ ] Monthly budget set on the OpenAI + Anthropic dashboards (staging $20/provider, production $200/provider)
- [ ] Status line at top of this doc flipped from `TABLETOP EXECUTED` to `CLOSED`
