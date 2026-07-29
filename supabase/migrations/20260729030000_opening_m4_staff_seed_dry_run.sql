-- Opening Operations Milestone 4 — staff seeding audit, live config snapshots, GO/NO-GO dry-run evidence
-- Additive only. Do NOT apply to Production in this delivery.
-- Rollback notes:
--   drop table if exists public.branch_dry_run_evidence cascade;
--   drop table if exists public.branch_dry_run_steps cascade;
--   drop table if exists public.branch_dry_run_sessions cascade;
--   drop table if exists public.branch_live_config_snapshots cascade;
--   drop table if exists public.branch_staff_seed_audit_events cascade;
--   drop table if exists public.branch_staff_seed_accounts cascade;
--   drop table if exists public.branch_staff_seed_runs cascade;
-- RLS: staff SELECT via current_user_has_branch_access; writes via service_role only.
-- NEVER store plaintext passwords, API keys, or payment credentials in these tables.

-- ---------------------------------------------------------------------------
-- 1) Staff seed runs (local simulation / authorized apply records)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_staff_seed_runs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  run_status text not null default 'PLANNED'
    check (run_status in (
      'PLANNED', 'SIMULATED_LOCAL', 'AWAITING_FOUNDER_AUTH', 'APPLIED_LOCAL',
      'BLOCKED_PRODUCTION', 'FAILED', 'EXPIRED', 'CANCELLED'
    )),
  environment_mode text not null default 'LOCAL_SIMULATION'
    check (environment_mode in ('LOCAL_SIMULATION', 'PRODUCTION_REQUIRES_AUTH')),
  production_apply_authorized boolean not null default false,
  founder_authorized_by uuid references public.users (id) on delete set null,
  founder_authorized_at timestamptz,
  seed_script_hash text not null,
  handover_file_hash text,
  handover_cipher_path text,
  key_file_path_hint text,
  local_test_only boolean not null default true,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_branch_staff_seed_no_prod_without_auth
    check (
      environment_mode <> 'PRODUCTION_REQUIRES_AUTH'
      or production_apply_authorized = false
      or founder_authorized_by is not null
    )
);

create index if not exists idx_branch_staff_seed_runs_branch
  on public.branch_staff_seed_runs (branch_id, run_status, created_at desc);

drop trigger if exists set_branch_staff_seed_runs_updated_at on public.branch_staff_seed_runs;
create trigger set_branch_staff_seed_runs_updated_at
before update on public.branch_staff_seed_runs
for each row execute function public.set_updated_at();

create table if not exists public.branch_staff_seed_accounts (
  id uuid primary key default gen_random_uuid(),
  seed_run_id uuid not null references public.branch_staff_seed_runs (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  email text not null,
  canonical_role_code text not null
    check (canonical_role_code in (
      'super-admin', 'branch-manager', 'kitchen', 'cashier', 'rider',
      'customer-support', 'host', 'waiter'
    )),
  display_label text,
  password_fingerprint text not null,
  temp_password_expires_at timestamptz not null,
  first_login_at timestamptz,
  password_changed_at timestamptz,
  account_status text not null default 'SEEDED'
    check (account_status in (
      'SEEDED', 'HANDED_OVER', 'FIRST_LOGIN', 'PASSWORD_CHANGED', 'EXPIRED', 'REVOKED'
    )),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_staff_seed_accounts unique (seed_run_id, email),
  constraint chk_branch_staff_seed_no_forbidden_roles
    check (canonical_role_code not in ('owner', 'founder', 'admin', 'delivery', 'general-staff', 'staff'))
);

create index if not exists idx_branch_staff_seed_accounts_branch
  on public.branch_staff_seed_accounts (branch_id, canonical_role_code);

drop trigger if exists set_branch_staff_seed_accounts_updated_at on public.branch_staff_seed_accounts;
create trigger set_branch_staff_seed_accounts_updated_at
before update on public.branch_staff_seed_accounts
for each row execute function public.set_updated_at();

create table if not exists public.branch_staff_seed_audit_events (
  id uuid primary key default gen_random_uuid(),
  seed_run_id uuid not null references public.branch_staff_seed_runs (id) on delete cascade,
  seed_account_id uuid references public.branch_staff_seed_accounts (id) on delete set null,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_staff_seed_audit_run
  on public.branch_staff_seed_audit_events (seed_run_id, created_at);

-- ---------------------------------------------------------------------------
-- 2) Live environment configuration snapshots
-- ---------------------------------------------------------------------------

create table if not exists public.branch_live_config_snapshots (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  snapshot_status text not null default 'CAPTURED'
    check (snapshot_status in ('CAPTURED', 'SUPERSEDED', 'EXPIRED', 'FAILED')),
  timezone text not null default 'Asia/Karachi',
  operating_hours_start text not null default '10:00',
  operating_hours_end text not null default '02:30',
  service_modes jsonb not null default '["dine-in","takeaway","delivery"]'::jsonb,
  branch_status_expected text not null default 'operating',
  northern_bypass_status_expected text not null default 'coming-soon',
  payment_methods jsonb not null default '{}'::jsonb,
  notification_channels jsonb not null default '{}'::jsonb,
  device_records jsonb not null default '{}'::jsonb,
  local_test_only boolean not null default true,
  captured_by uuid references public.users (id) on delete set null,
  captured_at timestamptz not null default timezone('utc', now()),
  snapshot_hash text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_live_config_timezone check (timezone = 'Asia/Karachi')
);

create index if not exists idx_branch_live_config_snapshots_branch
  on public.branch_live_config_snapshots (branch_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- 3) GO/NO-GO dry-run sessions + immutable evidence
-- ---------------------------------------------------------------------------

create table if not exists public.branch_dry_run_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  session_status text not null default 'NOT_STARTED'
    check (session_status in (
      'NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED'
    )),
  result text not null default 'NOT_ASSESSED'
    check (result in ('NOT_ASSESSED', 'PASS', 'CONDITIONAL_PASS', 'FAIL')),
  facilitator_user_id uuid references public.users (id) on delete set null,
  seed_run_id uuid references public.branch_staff_seed_runs (id) on delete set null,
  live_config_snapshot_id uuid references public.branch_live_config_snapshots (id) on delete set null,
  simulated_order_id text,
  simulated_ticket_id text,
  simulated_delivery_id text,
  readiness_percentage numeric(5,2),
  local_test_only boolean not null default true,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_dry_run_sessions_branch
  on public.branch_dry_run_sessions (branch_id, session_status, created_at desc);

drop trigger if exists set_branch_dry_run_sessions_updated_at on public.branch_dry_run_sessions;
create trigger set_branch_dry_run_sessions_updated_at
before update on public.branch_dry_run_sessions
for each row execute function public.set_updated_at();

create table if not exists public.branch_dry_run_steps (
  id uuid primary key default gen_random_uuid(),
  dry_run_id uuid not null references public.branch_dry_run_sessions (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  step_code text not null,
  step_order int not null check (step_order >= 1 and step_order <= 19),
  role_tag text not null,
  step_status text not null default 'PENDING'
    check (step_status in ('PENDING', 'PASSED', 'FAILED', 'SKIPPED')),
  evidence_summary text,
  screenshot_hash text,
  actor_user_id uuid references public.users (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_dry_run_steps unique (dry_run_id, step_code)
);

create index if not exists idx_branch_dry_run_steps_run
  on public.branch_dry_run_steps (dry_run_id, step_order);

create table if not exists public.branch_dry_run_evidence (
  id uuid primary key default gen_random_uuid(),
  dry_run_id uuid not null references public.branch_dry_run_sessions (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,
  evidence_hash text not null,
  decision text not null
    check (decision in ('GO', 'NO_GO', 'REVIEW_REQUIRED', 'NOT_DECIDED')),
  decided_by uuid references public.users (id) on delete set null,
  decided_at timestamptz not null default timezone('utc', now()),
  readiness_percentage numeric(5,2),
  simulated_order_id text,
  simulated_ticket_id text,
  simulated_delivery_id text,
  log_hash text not null,
  screenshot_hashes jsonb not null default '[]'::jsonb,
  snapshot_payload jsonb not null default '{}'::jsonb,
  northern_bypass_unchanged boolean not null default true,
  branch_status_unchanged boolean not null default true,
  local_test_only boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_dry_run_evidence_run unique (dry_run_id)
);

create or replace function public.prevent_dry_run_evidence_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'branch_dry_run_evidence rows are immutable';
end;
$$;

drop trigger if exists trg_prevent_dry_run_evidence_update on public.branch_dry_run_evidence;
create trigger trg_prevent_dry_run_evidence_update
before update or delete on public.branch_dry_run_evidence
for each row execute function public.prevent_dry_run_evidence_mutation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.branch_staff_seed_runs enable row level security;
alter table public.branch_staff_seed_accounts enable row level security;
alter table public.branch_staff_seed_audit_events enable row level security;
alter table public.branch_live_config_snapshots enable row level security;
alter table public.branch_dry_run_sessions enable row level security;
alter table public.branch_dry_run_steps enable row level security;
alter table public.branch_dry_run_evidence enable row level security;

drop policy if exists "Staff select branch staff seed runs" on public.branch_staff_seed_runs;
create policy "Staff select branch staff seed runs" on public.branch_staff_seed_runs
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch staff seed accounts" on public.branch_staff_seed_accounts;
create policy "Staff select branch staff seed accounts" on public.branch_staff_seed_accounts
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch staff seed audit" on public.branch_staff_seed_audit_events;
create policy "Staff select branch staff seed audit" on public.branch_staff_seed_audit_events
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch live config snapshots" on public.branch_live_config_snapshots;
create policy "Staff select branch live config snapshots" on public.branch_live_config_snapshots
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch dry run sessions" on public.branch_dry_run_sessions;
create policy "Staff select branch dry run sessions" on public.branch_dry_run_sessions
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch dry run steps" on public.branch_dry_run_steps;
create policy "Staff select branch dry run steps" on public.branch_dry_run_steps
  for select using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch dry run evidence" on public.branch_dry_run_evidence;
create policy "Staff select branch dry run evidence" on public.branch_dry_run_evidence
  for select using (public.current_user_has_branch_access(branch_id));

grant select on
  public.branch_staff_seed_runs,
  public.branch_staff_seed_accounts,
  public.branch_staff_seed_audit_events,
  public.branch_live_config_snapshots,
  public.branch_dry_run_sessions,
  public.branch_dry_run_steps,
  public.branch_dry_run_evidence
to authenticated;

grant select, insert, update, delete on
  public.branch_staff_seed_runs,
  public.branch_staff_seed_accounts,
  public.branch_staff_seed_audit_events,
  public.branch_live_config_snapshots,
  public.branch_dry_run_sessions,
  public.branch_dry_run_steps
to service_role;

-- Evidence: insert + select only (immutable).
grant select, insert on public.branch_dry_run_evidence to service_role;

comment on table public.branch_staff_seed_runs is
  'Opening M4 — staff seed runs. Plaintext passwords NEVER stored. Production apply requires explicit Founder auth.';
comment on table public.branch_staff_seed_accounts is
  'Opening M4 — seeded account metadata with password fingerprints only (no plaintext).';
comment on table public.branch_live_config_snapshots is
  'Opening M4 — live env config snapshots for dry-run. Northern Bypass stays coming-soon.';
comment on table public.branch_dry_run_evidence is
  'Opening M4 — immutable GO/NO-GO dry-run evidence. local_test_only never counts as Production opening.';
