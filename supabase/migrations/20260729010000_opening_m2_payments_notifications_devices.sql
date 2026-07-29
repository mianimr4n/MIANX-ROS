-- Opening Operations M2 — payments, notifications, device verification.
-- Forward-only. Local/test only in this task — do not apply to Production here.
-- Rollback notes:
--   drop tables branch_payment_methods, branch_payment_provider_verifications,
--     branch_card_terminal_verifications, branch_cash_procedure_approvals,
--     branch_notification_channels, branch_device_verifications,
--     and their *_events siblings;
--   revert branch_notification_settings extended columns if added.
-- Secrets: NEVER store API keys, tokens, card numbers, CVV, or passwords in these tables.
-- RLS strategy: authenticated SELECT via current_user_has_branch_access; mutations via service_role only.

begin;

-- ---------------------------------------------------------------------------
-- 1) Accepted payment methods (branch-scoped)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_payment_methods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  method_code text not null
    check (method_code in ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE_PAYMENT')),
  display_name varchar(120) not null,
  enabled boolean not null default false,
  configuration_status text not null default 'NOT_CONFIGURED'
    check (configuration_status in (
      'NOT_CONFIGURED', 'CONFIGURED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'ERROR', 'DISABLED'
    )),
  verification_status text not null default 'NOT_CONFIGURED'
    check (verification_status in (
      'NOT_CONFIGURED', 'CONFIGURED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'ERROR', 'DISABLED'
    )),
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  effective_from timestamptz,
  effective_until timestamptz,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_payment_methods_branch_code unique (branch_id, method_code)
);

create index if not exists idx_branch_payment_methods_branch
  on public.branch_payment_methods (branch_id, enabled, verification_status);

drop trigger if exists set_branch_payment_methods_updated_at on public.branch_payment_methods;
create trigger set_branch_payment_methods_updated_at
before update on public.branch_payment_methods
for each row execute function public.set_updated_at();

create table if not exists public.branch_payment_method_events (
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid not null references public.branch_payment_methods (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_payment_method_events_method
  on public.branch_payment_method_events (payment_method_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Payment provider verification (metadata only — no secrets)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_payment_provider_verifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  payment_method_id uuid references public.branch_payment_methods (id) on delete set null,
  provider_name varchar(120) not null,
  provider_environment text not null default 'TEST'
    check (provider_environment in ('TEST', 'SANDBOX', 'PRODUCTION')),
  provider_status text not null default 'NOT_CONFIGURED'
    check (provider_status in (
      'NOT_CONFIGURED', 'CONFIGURED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'FAILED', 'EXPIRED'
    )),
  terminal_required boolean not null default false,
  terminal_verified boolean not null default false,
  verification_method text,
  verification_summary text,
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_payment_provider_branch
  on public.branch_payment_provider_verifications (branch_id, provider_status);

drop trigger if exists set_branch_payment_provider_verifications_updated_at
  on public.branch_payment_provider_verifications;
create trigger set_branch_payment_provider_verifications_updated_at
before update on public.branch_payment_provider_verifications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Card terminal onsite verification
-- ---------------------------------------------------------------------------

create table if not exists public.branch_card_terminal_verifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  terminal_label varchar(120) not null,
  terminal_provider varchar(120),
  physical_location varchar(200),
  verification_result text not null default 'NOT_VERIFIED'
    check (verification_result in (
      'NOT_VERIFIED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'FAILED', 'EXPIRED', 'NOT_APPLICABLE'
    )),
  verification_note text,
  evidence_type text
    check (evidence_type is null or evidence_type in (
      'ONSITE_CHECK', 'SUPPLIER_CONFIRMATION', 'MANUAL_TEST', 'DOCUMENTED_CONTINGENCY', 'LOCAL_TEST_ONLY'
    )),
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  recheck_due_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_card_terminal_branch
  on public.branch_card_terminal_verifications (branch_id, verification_result);

drop trigger if exists set_branch_card_terminal_verifications_updated_at
  on public.branch_card_terminal_verifications;
create trigger set_branch_card_terminal_verifications_updated_at
before update on public.branch_card_terminal_verifications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) Cash handling procedure approval
-- ---------------------------------------------------------------------------

create table if not exists public.branch_cash_procedure_approvals (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  procedure_documented boolean not null default false,
  procedure_reviewed boolean not null default false,
  cash_drawer_process_approved boolean not null default false,
  shift_reconciliation_approved boolean not null default false,
  discrepancy_escalation_defined boolean not null default false,
  documentation_status text not null default 'DOCUMENTED'
    check (documentation_status in ('DOCUMENTED', 'REVIEWED', 'VERIFIED_ONSITE')),
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_cash_procedure_one unique (branch_id)
);

drop trigger if exists set_branch_cash_procedure_approvals_updated_at
  on public.branch_cash_procedure_approvals;
create trigger set_branch_cash_procedure_approvals_updated_at
before update on public.branch_cash_procedure_approvals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) Notification channels (purpose × channel)
-- ---------------------------------------------------------------------------

create table if not exists public.branch_notification_channels (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  purpose_code text not null
    check (purpose_code in ('CUSTOMER_ORDER', 'KITCHEN_ALERT', 'RIDER_ALERT', 'ESCALATION')),
  channel_code text not null
    check (channel_code in ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'PHONE_MANUAL')),
  enabled boolean not null default false,
  provider_name varchar(120),
  provider_status text not null default 'NOT_CONFIGURED'
    check (provider_status in (
      'NOT_CONFIGURED', 'CONFIGURED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'FAILED', 'UNAVAILABLE'
    )),
  destination_reference text,
  test_status text not null default 'NOT_TESTED'
    check (test_status in ('NOT_TESTED', 'TEST_REQUIRED', 'PASSED', 'FAILED', 'EXPIRED')),
  local_test_only boolean not null default false,
  tested_by uuid references public.users (id) on delete set null,
  tested_at timestamptz,
  failure_reason text,
  notes text,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_notification_channels unique (branch_id, purpose_code, channel_code)
);

create index if not exists idx_branch_notification_channels_branch
  on public.branch_notification_channels (branch_id, purpose_code, enabled);

drop trigger if exists set_branch_notification_channels_updated_at
  on public.branch_notification_channels;
create trigger set_branch_notification_channels_updated_at
before update on public.branch_notification_channels
for each row execute function public.set_updated_at();

create table if not exists public.branch_notification_channel_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.branch_notification_channels (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------------------------
-- 6) Device and infrastructure verification
-- ---------------------------------------------------------------------------

create table if not exists public.branch_device_verifications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  device_type text not null
    check (device_type in (
      'POS_DEVICE', 'KDS_DEVICE', 'RECEIPT_PRINTER', 'CARD_TERMINAL',
      'RIDER_DEVICE', 'PRIMARY_INTERNET', 'BACKUP_INTERNET', 'UPS_POWER_BACKUP'
    )),
  device_label varchar(150) not null,
  location varchar(200),
  verification_status text not null default 'NOT_VERIFIED'
    check (verification_status in (
      'NOT_VERIFIED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'FAILED', 'EXPIRED', 'NOT_APPLICABLE'
    )),
  evidence_type text
    check (evidence_type is null or evidence_type in (
      'ONSITE_CHECK', 'SUPPLIER_CONFIRMATION', 'MANUAL_TEST', 'DOCUMENTED_CONTINGENCY', 'LOCAL_TEST_ONLY'
    )),
  evidence_summary text,
  serial_or_asset_reference varchar(120),
  verified_by uuid references public.users (id) on delete set null,
  verified_at timestamptz,
  expires_at timestamptz,
  recheck_due_at timestamptz,
  failure_reason text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_device_verifications_branch
  on public.branch_device_verifications (branch_id, device_type, verification_status);

create index if not exists idx_branch_device_verifications_expiry
  on public.branch_device_verifications (expires_at)
  where expires_at is not null;

drop trigger if exists set_branch_device_verifications_updated_at
  on public.branch_device_verifications;
create trigger set_branch_device_verifications_updated_at
before update on public.branch_device_verifications
for each row execute function public.set_updated_at();

create table if not exists public.branch_device_verification_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.branch_device_verifications (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_branch_device_verification_events_device
  on public.branch_device_verification_events (device_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 7) RLS + grants
-- ---------------------------------------------------------------------------

alter table public.branch_payment_methods enable row level security;
alter table public.branch_payment_method_events enable row level security;
alter table public.branch_payment_provider_verifications enable row level security;
alter table public.branch_card_terminal_verifications enable row level security;
alter table public.branch_cash_procedure_approvals enable row level security;
alter table public.branch_notification_channels enable row level security;
alter table public.branch_notification_channel_events enable row level security;
alter table public.branch_device_verifications enable row level security;
alter table public.branch_device_verification_events enable row level security;

drop policy if exists "Staff select branch payment methods" on public.branch_payment_methods;
create policy "Staff select branch payment methods" on public.branch_payment_methods
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch payment method events" on public.branch_payment_method_events;
create policy "Staff select branch payment method events" on public.branch_payment_method_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch payment providers" on public.branch_payment_provider_verifications;
create policy "Staff select branch payment providers" on public.branch_payment_provider_verifications
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch card terminals" on public.branch_card_terminal_verifications;
create policy "Staff select branch card terminals" on public.branch_card_terminal_verifications
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch cash procedures" on public.branch_cash_procedure_approvals;
create policy "Staff select branch cash procedures" on public.branch_cash_procedure_approvals
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch notification channels" on public.branch_notification_channels;
create policy "Staff select branch notification channels" on public.branch_notification_channels
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch notification channel events" on public.branch_notification_channel_events;
create policy "Staff select branch notification channel events" on public.branch_notification_channel_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch device verifications" on public.branch_device_verifications;
create policy "Staff select branch device verifications" on public.branch_device_verifications
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch device verification events" on public.branch_device_verification_events;
create policy "Staff select branch device verification events" on public.branch_device_verification_events
for select to authenticated using (public.current_user_has_branch_access(branch_id));

grant select on table
  public.branch_payment_methods,
  public.branch_payment_method_events,
  public.branch_payment_provider_verifications,
  public.branch_card_terminal_verifications,
  public.branch_cash_procedure_approvals,
  public.branch_notification_channels,
  public.branch_notification_channel_events,
  public.branch_device_verifications,
  public.branch_device_verification_events
to authenticated;

grant select, insert, update, delete on table
  public.branch_payment_methods,
  public.branch_payment_method_events,
  public.branch_payment_provider_verifications,
  public.branch_card_terminal_verifications,
  public.branch_cash_procedure_approvals,
  public.branch_notification_channels,
  public.branch_notification_channel_events,
  public.branch_device_verifications,
  public.branch_device_verification_events
to service_role;

comment on table public.branch_payment_methods is
  'Opening M2 — branch accepted payment methods. No secrets. Disabled methods do not satisfy readiness.';
comment on table public.branch_payment_provider_verifications is
  'Opening M2 — provider metadata/verification only. Never store API keys or tokens.';
comment on table public.branch_notification_channels is
  'Opening M2 — purpose/channel config. LOCAL_TEST_ONLY / local_test_only does not satisfy Production readiness.';
comment on table public.branch_device_verifications is
  'Opening M2 — physical device/infrastructure verification. LOCAL_TEST_ONLY does not satisfy Production readiness.';

commit;
