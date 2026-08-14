-- =============================================================================
-- Phase 2.6 (AI) — ADR-013 + ADR-014 + ADR-015 combined migration
-- =============================================================================
-- Implements three AI-related ADRs in a single additive migration:
--
--   ADR-013 — AI Provider Boundary & Data Governance
--     • Table: ai_provider_configs (non-secret metadata only; keys in env vars per ADR-003)
--     • Table: ai_call_logs (per-call audit: actor, provider, model, prompt_sha256, tokens, cost, success)
--     • Permission: ai.use (granted to all admin staff)
--
--   ADR-014 — AI Human-Approval Gate Architecture
--     • Table: ai_action_approvals (pending → approved → executed state machine)
--     • Permission: ai.approve (granted to super-admin, branch-manager only)
--     • CHECK constraint on action_type (allowlist of permitted action types)
--
--   ADR-015 — AI Prompt & Data Retention Policy
--     • Table: ai_prompt_logs (hashed metadata only; raw prompts NEVER stored)
--     • UNIQUE on prompt_sha256 (one row per distinct hash)
--     • occurrence_count, avg_latency_ms, avg_cost_usd for trend analytics
--
-- All tables are additive. No existing data is modified.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Permission seeds: ai.use, ai.approve, ai.read
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('ai', 'use', 'ai.use', 'Use AI features via the backend proxy (prompts are redacted + logged).'),
  ('ai', 'approve', 'ai.approve', 'Approve or reject AI-suggested actions (state-mutating).'),
  ('ai', 'read', 'ai.read', 'Read AI call logs, prompt logs, and approval history.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Grant ai.use + ai.read to all admin staff
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code in ('ai.use', 'ai.read')
  and r.code in ('super-admin', 'branch-manager', 'customer-support')
on conflict do nothing;

-- Grant ai.approve to super-admin + branch-manager only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'ai.approve'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- ADR-013: ai_provider_configs (non-secret metadata)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_code varchar(50) not null unique,
  provider_name varchar(150) not null,
  config_ref varchar(100) not null,
  base_url text not null,
  default_model varchar(100) not null,
  max_tokens integer not null default 4096 check (max_tokens > 0 and max_tokens <= 200000),
  temperature numeric(3, 2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_provider_configs is
  'ADR-013: Non-secret AI provider metadata. API keys are NEVER stored here — they live in process.env (per ADR-003). config_ref is the env var prefix.';

create index if not exists idx_ai_provider_configs_active
  on public.ai_provider_configs (is_active, provider_code);

alter table public.ai_provider_configs enable row level security;

drop policy if exists "ai_provider_configs_staff_read" on public.ai_provider_configs;
create policy "ai_provider_configs_staff_read"
  on public.ai_provider_configs for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('ai.use', 'ai.read', 'admin.access')
    )
  );

revoke all on public.ai_provider_configs from public, anon;
grant select on public.ai_provider_configs to authenticated;
grant all on public.ai_provider_configs to service_role;

-- ---------------------------------------------------------------------------
-- ADR-013 + ADR-015: ai_call_logs (per-call audit; NO raw prompts)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_call_logs (
  id bigint primary key generated always as identity,
  actor_user_id uuid references auth.users (id) on delete set null,
  branch_id uuid references public.branches (id) on delete set null,
  provider varchar(50) not null,
  model varchar(100) not null,
  -- ADR-015: prompt_sha256 is the SHA-256 hash of the REDACTED prompt.
  -- Raw prompts are NEVER stored in this database.
  prompt_sha256 varchar(64) not null,
  prompt_token_count integer check (prompt_token_count >= 0),
  prompt_char_count integer check (prompt_char_count >= 0),
  prompt_language varchar(8),
  completion_token_count integer check (completion_token_count >= 0),
  latency_ms integer check (latency_ms >= 0),
  cost_usd numeric(10, 6) check (cost_usd >= 0),
  success boolean not null,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  called_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_call_logs is
  'ADR-013/015: Per-call AI audit log. Raw prompts NEVER stored — only SHA-256 hash of redacted prompt + token counts + cost.';

create index if not exists idx_ai_call_logs_actor
  on public.ai_call_logs (actor_user_id, called_at desc);

create index if not exists idx_ai_call_logs_provider
  on public.ai_call_logs (provider, called_at desc);

create index if not exists idx_ai_call_logs_called_at
  on public.ai_call_logs (called_at desc);

create index if not exists idx_ai_call_logs_prompt_hash
  on public.ai_call_logs (prompt_sha256);

alter table public.ai_call_logs enable row level security;

drop policy if exists "ai_call_logs_staff_read" on public.ai_call_logs;
create policy "ai_call_logs_staff_read"
  on public.ai_call_logs for select
  to authenticated
  using (
    branch_id is null
    or branch_id in (
      select ur.branch_id from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
    )
    or exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('ai.read', 'admin.access')
        and rol.code = 'super-admin'
    )
  );

revoke all on public.ai_call_logs from public, anon;
grant select on public.ai_call_logs to authenticated;
grant all on public.ai_call_logs to service_role;

-- ---------------------------------------------------------------------------
-- ADR-015: ai_prompt_logs (hashed metadata; one row per distinct hash)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_prompt_logs (
  id bigint primary key generated always as identity,
  prompt_sha256 varchar(64) not null unique,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  occurrence_count bigint not null default 1 check (occurrence_count >= 1),
  avg_latency_ms numeric(10, 2) not null default 0,
  avg_cost_usd numeric(10, 6) not null default 0,
  prompt_language varchar(8),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_prompt_logs is
  'ADR-015: Hashed prompt metadata for trend analytics. Raw prompts NEVER stored. One row per distinct prompt_sha256.';

create index if not exists idx_ai_prompt_logs_last_seen
  on public.ai_prompt_logs (last_seen_at desc);

create index if not exists idx_ai_prompt_logs_language
  on public.ai_prompt_logs (prompt_language);

alter table public.ai_prompt_logs enable row level security;

drop policy if exists "ai_prompt_logs_staff_read" on public.ai_prompt_logs;
create policy "ai_prompt_logs_staff_read"
  on public.ai_prompt_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('ai.read', 'admin.access')
    )
  );

revoke all on public.ai_prompt_logs from public, anon;
grant select on public.ai_prompt_logs to authenticated;
grant all on public.ai_prompt_logs to service_role;

-- Upsert helper for ai_prompt_logs (called by the proxy after each AI call)
create or replace function public.upsert_ai_prompt_log(
  p_prompt_sha256 varchar(64),
  p_latency_ms numeric,
  p_cost_usd numeric,
  p_prompt_language varchar(8),
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_existing public.ai_prompt_logs%rowtype;
begin
  if p_prompt_sha256 is null or length(p_prompt_sha256) != 64 then
    raise exception 'INVALID_PROMPT_HASH: must be 64-char SHA-256';
  end if;

  select * into v_existing from public.ai_prompt_logs where prompt_sha256 = p_prompt_sha256 for update;

  if not found then
    insert into public.ai_prompt_logs (
      prompt_sha256, first_seen_at, last_seen_at, occurrence_count,
      avg_latency_ms, avg_cost_usd, prompt_language, metadata
    )
    values (
      p_prompt_sha256,
      timezone('utc', now()),
      timezone('utc', now()),
      1,
      p_latency_ms,
      p_cost_usd,
      p_prompt_language,
      p_metadata
    )
    on conflict (prompt_sha256) do nothing;
  else
    update public.ai_prompt_logs
    set
      last_seen_at = timezone('utc', now()),
      occurrence_count = v_existing.occurrence_count + 1,
      avg_latency_ms = (v_existing.avg_latency_ms * v_existing.occurrence_count + p_latency_ms) / (v_existing.occurrence_count + 1),
      avg_cost_usd = (v_existing.avg_cost_usd * v_existing.occurrence_count + p_cost_usd) / (v_existing.occurrence_count + 1),
      updated_at = timezone('utc', now())
    where prompt_sha256 = p_prompt_sha256;
  end if;
end;
$func$;

comment on function public.upsert_ai_prompt_log is
  'ADR-015: Upsert prompt hash metadata. Increments occurrence_count + updates rolling averages.';

revoke all on function public.upsert_ai_prompt_log(varchar, numeric, numeric, varchar, jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_ai_prompt_log(varchar, numeric, numeric, varchar, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- ADR-014: ai_action_approvals (human-approval gate)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_action_approvals (
  id uuid primary key default gen_random_uuid(),
  ai_call_log_id bigint references public.ai_call_logs (id) on delete set null,
  action_type text not null check (
    action_type in (
      'order.cancel',
      'order.refund',
      'order.update_status',
      'customer.merge',
      'customer.adjust_loyalty',
      'inventory.adjust_stock',
      'inventory.create_po',
      'hr.adjust_schedule',
      'marketing.send_campaign'
    )
  ),
  action_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected', 'executed', 'failed', 'expired')
  ),
  requested_by uuid references auth.users (id) on delete set null,
  requested_at timestamptz not null default timezone('utc', now()),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_reason text,
  executed_at timestamptz,
  execution_result jsonb,
  execution_retry_count integer not null default 0 check (execution_retry_count >= 0 and execution_retry_count <= 3),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.ai_action_approvals is
  'ADR-014: AI human-approval gate. AI suggestions are advisory only; state-mutating actions require explicit human approval.';

create index if not exists idx_ai_action_approvals_status
  on public.ai_action_approvals (status, requested_at desc);

create index if not exists idx_ai_action_approvals_requested_by
  on public.ai_action_approvals (requested_by, requested_at desc);

create index if not exists idx_ai_action_approvals_decided_by
  on public.ai_action_approvals (decided_by, decided_at desc)
  where decided_by is not null;

create index if not exists idx_ai_action_approvals_expires
  on public.ai_action_approvals (expires_at)
  where status = 'pending';

alter table public.ai_action_approvals enable row level security;

-- Branch staff can read approvals (branch_id is in metadata if applicable)
drop policy if exists "ai_action_approvals_staff_read" on public.ai_action_approvals;
create policy "ai_action_approvals_staff_read"
  on public.ai_action_approvals for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('ai.read', 'ai.use', 'ai.approve', 'admin.access')
    )
  );

-- Only ai.approve holders can UPDATE status (approve/reject)
drop policy if exists "ai_action_approvals_approver_update" on public.ai_action_approvals;
create policy "ai_action_approvals_approver_update"
  on public.ai_action_approvals for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code = 'ai.approve'
    )
  );

-- ai.use holders can INSERT (create new pending approval from AI suggestion)
drop policy if exists "ai_action_approvals_use_insert" on public.ai_action_approvals;
create policy "ai_action_approvals_use_insert"
  on public.ai_action_approvals for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('ai.use', 'ai.approve')
    )
  );

revoke all on public.ai_action_approvals from public, anon;
grant select, insert, update on public.ai_action_approvals to authenticated;
grant all on public.ai_action_approvals to service_role;

-- Trigger to update updated_at
create or replace function public.set_ai_action_approvals_updated_at()
returns trigger
language plpgsql
as $func$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$func$;

drop trigger if exists set_ai_action_approvals_updated_at on public.ai_action_approvals;
create trigger set_ai_action_approvals_updated_at
  before update on public.ai_action_approvals
  for each row execute function public.set_ai_action_approvals_updated_at();

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
