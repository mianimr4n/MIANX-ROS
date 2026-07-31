-- RC3 Workforce: payroll data foundation only — no payment processing.

begin;

create table if not exists public.hr_compensation_profiles (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  salary_type text not null
    check (salary_type in ('monthly', 'hourly', 'daily')),
  base_rate numeric(14, 2) not null check (base_rate >= 0),
  currency varchar(3) not null default 'PKR',
  effective_from date not null,
  effective_to date,
  is_active boolean not null default true,
  approved_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (effective_to is null or effective_to >= effective_from)
);

comment on table public.hr_compensation_profiles is
  'Effective-dated compensation. No bank credentials. Empty until configured.';

-- One active open-ended profile per employee (effective_to null)
create unique index if not exists uq_hr_compensation_active_open
  on public.hr_compensation_profiles (employee_id)
  where is_active = true and effective_to is null;

create index if not exists idx_hr_compensation_branch
  on public.hr_compensation_profiles (branch_id, employee_id);

create table if not exists public.hr_pay_periods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft'
    check (status in ('draft', 'calculated', 'under_review', 'approved', 'locked', 'cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (period_end >= period_start),
  unique (branch_id, period_start, period_end)
);

create table if not exists public.hr_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  pay_period_id uuid not null references public.hr_pay_periods (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'calculated', 'under_review', 'approved', 'locked', 'cancelled')),
  calculation_status text not null default 'unavailable'
    check (calculation_status in ('unavailable', 'partial', 'complete')),
  calculation_note text,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  locked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.hr_payroll_runs is
  'Payroll foundation runs. calculation_status defaults unavailable — no Pakistan payroll guesswork. No payment flag.';

create table if not exists public.hr_payroll_lines (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete restrict,
  earnings numeric(14, 2) not null default 0 check (earnings >= 0),
  deductions numeric(14, 2) not null default 0 check (deductions >= 0),
  adjustments numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.hr_payroll_events (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.hr_compensation_profiles enable row level security;
alter table public.hr_pay_periods enable row level security;
alter table public.hr_payroll_runs enable row level security;
alter table public.hr_payroll_lines enable row level security;
alter table public.hr_payroll_events enable row level security;

drop policy if exists "Staff select hr compensation" on public.hr_compensation_profiles;
create policy "Staff select hr compensation"
  on public.hr_compensation_profiles for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr pay periods" on public.hr_pay_periods;
create policy "Staff select hr pay periods"
  on public.hr_pay_periods for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr payroll runs" on public.hr_payroll_runs;
create policy "Staff select hr payroll runs"
  on public.hr_payroll_runs for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr payroll lines" on public.hr_payroll_lines;
create policy "Staff select hr payroll lines"
  on public.hr_payroll_lines for select to authenticated
  using (
    exists (
      select 1 from public.hr_payroll_runs r
      where r.id = payroll_run_id
        and public.current_user_has_branch_access(r.branch_id)
    )
  );

drop policy if exists "Staff select hr payroll events" on public.hr_payroll_events;
create policy "Staff select hr payroll events"
  on public.hr_payroll_events for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_compensation_profiles from public, anon, authenticated;
revoke all on public.hr_pay_periods from public, anon, authenticated;
revoke all on public.hr_payroll_runs from public, anon, authenticated;
revoke all on public.hr_payroll_lines from public, anon, authenticated;
revoke all on public.hr_payroll_events from public, anon, authenticated;

grant select on public.hr_compensation_profiles to authenticated;
grant select on public.hr_pay_periods to authenticated;
grant select on public.hr_payroll_runs to authenticated;
grant select on public.hr_payroll_lines to authenticated;
grant select on public.hr_payroll_events to authenticated;

grant all on public.hr_compensation_profiles to service_role;
grant all on public.hr_pay_periods to service_role;
grant all on public.hr_payroll_runs to service_role;
grant all on public.hr_payroll_lines to service_role;
grant all on public.hr_payroll_events to service_role;

commit;
