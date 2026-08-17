-- ===========================================================================
-- FU-12 Step 3 — Seed ai_provider_configs rows (OpenAI + Anthropic)
-- ===========================================================================
-- Runbook: docs/15-runbooks/FU-12-ai-provider-keys.md §Step 3
-- Authority: ADR-003 (Provider-Secret Boundary) · ADR-013 (AI Provider Boundary)
-- Schema: supabase/migrations/20260820000000_adr_013_014_015_ai.sql
--
-- IMPORTANT — Secrets boundary:
--   This file inserts NON-SECRET metadata only. The actual API keys live
--   in process.env (OPENAI_API_KEY / ANTHROPIC_API_KEY) per ADR-003 and
--   are NEVER stored in the database. The `config_ref` column documents
--   which env var holds the real key.
--
-- Idempotent: uses ON CONFLICT (provider_code) DO UPDATE so it is safe
-- to re-run. Requires super-admin (RLS blocks normal staff from inserting
-- into ai_provider_configs).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/fu-12-seed-ai-provider-configs.sql
-- ===========================================================================

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

-- Verify both rows are seeded and active.
select
  provider_code,
  provider_name,
  config_ref,
  base_url,
  default_model,
  max_tokens,
  temperature,
  is_active,
  metadata
from public.ai_provider_configs
where provider_code in ('openai', 'anthropic')
order by provider_code;
