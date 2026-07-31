-- RC4-3 Payroll calculation & approval foundation (additive).
-- Payment execution remains deferred. No paid_at without settlement.
-- Finance GL posting DEFERRED (RC4-8 not on main) — emit posting-ready events only.

begin;

-- Expand period/run statuses (keep legacy under_review + locked)
alter table public.hr_pay_periods drop constraint if exists hr_pay_periods_status_check;
alter table public.hr_pay_periods
  add constraint hr_pay_periods_status_check
  check (status in (
    'draft', 'calculated', 'under_review', 'review_required',
    'approved', 'payment_ready', 'paid', 'cancelled', 'reversed', 'locked'
  ));

alter table public.hr_payroll_runs drop constraint if exists hr_payroll_runs_status_check;
alter table public.hr_payroll_runs
  add constraint hr_payroll_runs_status_check
  check (status in (
    'draft', 'calculated', 'under_review', 'review_required',
    'approved', 'payment_ready', 'paid', 'cancelled', 'reversed', 'locked'
  ));

alter table public.hr_pay_periods
  add column if not exists pay_date date,
  add column if not exists locked_at timestamptz;

alter table public.hr_payroll_runs
  add column if not exists calculation_version text,
  add column if not exists calculated_at timestamptz,
  add column if not exists revision_of_run_id uuid references public.hr_payroll_runs (id) on delete set null,
  add column if not exists payment_ready_at timestamptz;

comment on column public.hr_payroll_runs.payment_ready_at is
  'Set when marked payment_ready. Does NOT imply paid. paymentTriggered remains false without settlement.';

-- Enrich payroll lines with snapshots (immutable once run approved/locked)
alter table public.hr_payroll_lines
  add column if not exists compensation_profile_id uuid references public.hr_compensation_profiles (id) on delete set null,
  add column if not exists gross_pay numeric(14, 2) not null default 0,
  add column if not exists net_pay numeric(14, 2) not null default 0,
  add column if not exists currency varchar(3) not null default 'PKR',
  add column if not exists line_status text not null default 'ok',
  add column if not exists input_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists formula_snapshot jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'hr_payroll_lines_line_status_check'
  ) then
    alter table public.hr_payroll_lines
      add constraint hr_payroll_lines_line_status_check
      check (line_status in ('ok', 'blocked', 'review_required', 'unavailable'));
  end if;
end $$;

create unique index if not exists uq_hr_payroll_lines_run_employee
  on public.hr_payroll_lines (payroll_run_id, employee_id);

-- One active (non-cancelled/reversed) root run per pay period; revisions use revision_of_run_id
create unique index if not exists uq_hr_payroll_runs_active_period
  on public.hr_payroll_runs (pay_period_id)
  where status not in ('cancelled', 'reversed') and revision_of_run_id is null;

-- Line component breakdown
create table if not exists public.hr_payroll_line_components (
  id uuid primary key default gen_random_uuid(),
  payroll_line_id uuid not null references public.hr_payroll_lines (id) on delete cascade,
  component_kind text not null check (component_kind in ('earning', 'deduction', 'adjustment')),
  component_code text not null,
  description text not null default '',
  amount numeric(14, 2) not null,
  taxable boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_hr_payroll_line_components_line
  on public.hr_payroll_line_components (payroll_line_id);

-- Configurable earning / deduction catalogs (no seeded statutory rates)
create table if not exists public.hr_earning_types (
  id uuid primary key default gen_random_uuid(),
  code varchar(40) not null unique,
  description text not null default '',
  taxable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hr_deduction_types (
  id uuid primary key default gen_random_uuid(),
  code varchar(40) not null unique,
  description text not null default '',
  requires_consent boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.hr_earning_types (code, description, taxable) values
  ('BASE', 'Base salary or wages', true),
  ('OVERTIME', 'Approved overtime', true),
  ('ALLOWANCE', 'Approved allowance', true),
  ('BONUS', 'Approved bonus', true),
  ('ADJUSTMENT', 'Manual earning adjustment', true)
on conflict (code) do nothing;

insert into public.hr_deduction_types (code, description, requires_consent) values
  ('UNPAID_LEAVE', 'Unpaid leave deduction', false),
  ('ABSENCE', 'Approved absence deduction', false),
  ('ADVANCE_RECOVERY', 'Salary advance recovery', true),
  ('OTHER', 'Other authorized deduction', true)
on conflict (code) do nothing;

-- Pakistan statutory rule configuration foundation (empty rates)
create table if not exists public.hr_statutory_rule_configs (
  id uuid primary key default gen_random_uuid(),
  jurisdiction text not null default 'PK',
  province text,
  rule_type text not null,
  threshold_amount numeric(14, 2),
  rate numeric(9, 6),
  fixed_amount numeric(14, 2),
  effective_from date not null,
  effective_to date,
  source_reference text,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  check (effective_to is null or effective_to >= effective_from)
);

comment on table public.hr_statutory_rule_configs is
  'Configurable statutory foundation. No hardcoded Pakistan rates. is_active defaults false until approved requirements exist.';

-- Exceptions
create table if not exists public.hr_payroll_exceptions (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid references public.hr_employees (id) on delete set null,
  exception_code text not null,
  severity text not null default 'review_required'
    check (severity in ('blocked', 'review_required', 'unavailable', 'info')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_hr_payroll_exceptions_run
  on public.hr_payroll_exceptions (payroll_run_id, status);

-- Payslips (sensitive; HTML/printable; PDF deferred)
create table if not exists public.hr_payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  payroll_line_id uuid not null references public.hr_payroll_lines (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  gross_pay numeric(14, 2) not null,
  net_pay numeric(14, 2) not null,
  currency varchar(3) not null default 'PKR',
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'payment_ready', 'paid')),
  payload jsonb not null default '{}'::jsonb,
  issued_at timestamptz not null default timezone('utc', now()),
  unique (payroll_run_id, employee_id)
);

-- Verified settlement only (empty until authorized payment workflow)
create table if not exists public.hr_payroll_settlements (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  currency varchar(3) not null default 'PKR',
  payment_reference text not null,
  settled_at timestamptz not null,
  actor_user_id uuid references public.users (id) on delete set null,
  provider text not null default 'manual_verified',
  idempotency_key text not null unique,
  status text not null default 'settled' check (status in ('settled', 'void')),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.hr_payroll_settlements is
  'Verified settlement events only. Without a row, payroll must not become paid / paymentTriggered.';

-- Finance posting-ready events (GL DEFERRED until RC4-8 mappings on target env)
create table if not exists public.hr_payroll_posting_events (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  event_type text not null check (event_type in ('payroll_accrual_ready', 'payroll_payment_ready')),
  status text not null default 'deferred'
    check (status in ('deferred', 'posted', 'failed', 'skipped')),
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  deferred_reason text not null default 'RC4-8 Finance Phase 2 mappings not available on this baseline; GL posting DEFERRED.',
  created_at timestamptz not null default timezone('utc', now())
);

-- RLS
alter table public.hr_payroll_line_components enable row level security;
alter table public.hr_earning_types enable row level security;
alter table public.hr_deduction_types enable row level security;
alter table public.hr_statutory_rule_configs enable row level security;
alter table public.hr_payroll_exceptions enable row level security;
alter table public.hr_payslips enable row level security;
alter table public.hr_payroll_settlements enable row level security;
alter table public.hr_payroll_posting_events enable row level security;

drop policy if exists "Staff select payroll line components" on public.hr_payroll_line_components;
create policy "Staff select payroll line components" on public.hr_payroll_line_components
  for select to authenticated
  using (exists (
    select 1 from public.hr_payroll_lines l
    join public.hr_payroll_runs r on r.id = l.payroll_run_id
    where l.id = payroll_line_id and public.current_user_has_branch_access(r.branch_id)
  ));

drop policy if exists "Staff select earning types" on public.hr_earning_types;
create policy "Staff select earning types" on public.hr_earning_types
  for select to authenticated using (true);

drop policy if exists "Staff select deduction types" on public.hr_deduction_types;
create policy "Staff select deduction types" on public.hr_deduction_types
  for select to authenticated using (true);

drop policy if exists "Staff select statutory configs" on public.hr_statutory_rule_configs;
create policy "Staff select statutory configs" on public.hr_statutory_rule_configs
  for select to authenticated using (true);

drop policy if exists "Staff select payroll exceptions" on public.hr_payroll_exceptions;
create policy "Staff select payroll exceptions" on public.hr_payroll_exceptions
  for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select payslips" on public.hr_payslips;
create policy "Staff select payslips" on public.hr_payslips
  for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select payroll settlements" on public.hr_payroll_settlements;
create policy "Staff select payroll settlements" on public.hr_payroll_settlements
  for select to authenticated using (exists (
    select 1 from public.hr_payroll_runs r
    where r.id = payroll_run_id and public.current_user_has_branch_access(r.branch_id)
  ));

drop policy if exists "Staff select payroll posting events" on public.hr_payroll_posting_events;
create policy "Staff select payroll posting events" on public.hr_payroll_posting_events
  for select to authenticated using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_payroll_line_components from public, anon, authenticated;
revoke all on public.hr_earning_types from public, anon, authenticated;
revoke all on public.hr_deduction_types from public, anon, authenticated;
revoke all on public.hr_statutory_rule_configs from public, anon, authenticated;
revoke all on public.hr_payroll_exceptions from public, anon, authenticated;
revoke all on public.hr_payslips from public, anon, authenticated;
revoke all on public.hr_payroll_settlements from public, anon, authenticated;
revoke all on public.hr_payroll_posting_events from public, anon, authenticated;

grant select on public.hr_payroll_line_components to authenticated;
grant select on public.hr_earning_types to authenticated;
grant select on public.hr_deduction_types to authenticated;
grant select on public.hr_statutory_rule_configs to authenticated;
grant select on public.hr_payroll_exceptions to authenticated;
grant select on public.hr_payslips to authenticated;
grant select on public.hr_payroll_settlements to authenticated;
grant select on public.hr_payroll_posting_events to authenticated;

grant all on public.hr_payroll_line_components to service_role;
grant all on public.hr_earning_types to service_role;
grant all on public.hr_deduction_types to service_role;
grant all on public.hr_statutory_rule_configs to service_role;
grant all on public.hr_payroll_exceptions to service_role;
grant all on public.hr_payslips to service_role;
grant all on public.hr_payroll_settlements to service_role;
grant all on public.hr_payroll_posting_events to service_role;

commit;
