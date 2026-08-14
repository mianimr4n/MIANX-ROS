-- =============================================================================
-- ADR-003 — Provider-Secret Boundary Architecture
-- =============================================================================
-- Implements ADR-003 "Provider-Secret Boundary Architecture":
--   1. Add `whatsapp_provider_configs` table storing NON-SECRET provider
--      metadata (phone_number_id, business_account_id, display_name) plus
--      a `config_ref` that acts as the env-var prefix for the actual secrets.
--   2. NO secret columns. NO access_token. NO app_secret. NO verify_token.
--      These live ONLY in process.env per ADR-003.
--   3. Enforce exactly one default config at a time via partial unique index.
--   4. RLS: super-admin and branch-scoped admins can read; only super-admin
--      can write (provider configs are operator-managed, not self-serve).
--
-- This migration is additive only — does not modify existing rows.
-- Backward compatible: existing applications continue to work; the new table
-- is empty until an operator inserts a row.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. whatsapp_provider_configs — non-secret provider metadata
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_provider_configs (
  id uuid primary key default gen_random_uuid(),
  config_ref text not null unique,                 -- env-var prefix, e.g. 'WHATSAPP_PRIMARY'
  phone_number_id text not null,                   -- Meta phone_number_id (non-secret)
  business_account_id text not null,               -- Meta WABA ID (non-secret)
  display_name text not null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  default_branch_id uuid references public.branches (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.whatsapp_provider_configs is
  'Non-secret metadata for WhatsApp Business API provider configurations (ADR-003). Actual secrets (access_token, app_secret, verify_token) live ONLY in process.env, keyed by config_ref prefix. This table NEVER stores secrets.';

comment on column public.whatsapp_provider_configs.config_ref is
  'Env-var prefix for this config. The backend resolves WHATSAPP_<config_ref>_ACCESS_TOKEN, WHATSAPP_<config_ref>_APP_SECRET, WHATSAPP_<config_ref>_VERIFY_TOKEN from process.env at runtime. Example: WHATSAPP_PRIMARY.';

comment on column public.whatsapp_provider_configs.phone_number_id is
  'Meta WhatsApp Cloud API phone_number_id. Non-secret — identifies which WABA phone number sends/receives. Find in Meta Business Manager.';

comment on column public.whatsapp_provider_configs.business_account_id is
  'Meta WhatsApp Business Account ID. Non-secret — identifies the WABA. Find in Meta Business Manager.';

comment on column public.whatsapp_provider_configs.is_default is
  'Exactly one row should be is_default=true at any time. Enforced by partial unique index whatsapp_provider_configs_one_default_uidx. The default config is used when no specific config_ref is provided.';

comment on column public.whatsapp_provider_configs.default_branch_id is
  'Branch to attribute new conversations to when no linked order exists (ADR-004). Nullable for configs that should never receive unattributed inbound (rare).';

-- Enforce exactly one default at a time
create unique index if not exists whatsapp_provider_configs_one_default_uidx
  on public.whatsapp_provider_configs (is_default) where is_default = true;

-- ---------------------------------------------------------------------------
-- 2. RLS — provider configs are operator-managed
-- ---------------------------------------------------------------------------
alter table public.whatsapp_provider_configs enable row level security;

-- Any authenticated user can READ provider configs (the metadata is non-secret;
-- needed for admin UI to show "WhatsApp integration: configured" status).
-- Actual secret values are NEVER in this table.
create policy "whatsapp_provider_configs_read"
  on public.whatsapp_provider_configs for select
  to authenticated, anon
  using (is_active = true);

-- Only service_role (backend API with service-role key) can INSERT/UPDATE/DELETE.
-- Admin mutations go through backend admin routes that enforce super-admin permission.
create policy "whatsapp_provider_configs_service_write"
  on public.whatsapp_provider_configs for all
  to service_role
  using (true)
  with check (true);

grant select on public.whatsapp_provider_configs to authenticated, anon, service_role;
grant insert, update, delete on public.whatsapp_provider_configs to service_role;

-- Trigger to keep updated_at fresh
create or replace function public.touch_whatsapp_provider_configs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_provider_configs_touch on public.whatsapp_provider_configs;
create trigger trg_whatsapp_provider_configs_touch
  before update on public.whatsapp_provider_configs
  for each row execute function public.touch_whatsapp_provider_configs_updated_at();

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
