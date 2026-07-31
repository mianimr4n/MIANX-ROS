-- RC3 Workforce: shift templates + scheduled shifts with overlap prevention.
-- NEW — no existing roster tables.

begin;

create table if not exists public.hr_shift_templates (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name varchar(120) not null,
  operational_role varchar(150),
  start_time time not null,
  end_time time not null,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 480),
  days_of_week smallint[] not null default '{}',
  is_active boolean not null default true,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, name)
);

comment on table public.hr_shift_templates is
  'Reusable branch shift templates. Overnight allowed (end_time may be before start_time). Empty until created.';

create index if not exists idx_hr_shift_templates_branch
  on public.hr_shift_templates (branch_id, is_active);

create table if not exists public.hr_scheduled_shifts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete restrict,
  template_id uuid references public.hr_shift_templates (id) on delete set null,
  shift_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  break_minutes integer not null default 0 check (break_minutes >= 0 and break_minutes <= 480),
  operational_role varchar(150),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  cancel_reason text,
  change_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

comment on table public.hr_scheduled_shifts is
  'Branch employee shift assignments. Overlap blocked for non-cancelled statuses.';

create index if not exists idx_hr_scheduled_shifts_branch_date
  on public.hr_scheduled_shifts (branch_id, shift_date desc);
create index if not exists idx_hr_scheduled_shifts_employee
  on public.hr_scheduled_shifts (employee_id, starts_at);
create index if not exists idx_hr_scheduled_shifts_status
  on public.hr_scheduled_shifts (status);

-- Prevent overlapping active shifts for the same employee (exclusion constraint).
create extension if not exists btree_gist;

alter table public.hr_scheduled_shifts
  drop constraint if exists hr_scheduled_shifts_no_overlap;

alter table public.hr_scheduled_shifts
  add constraint hr_scheduled_shifts_no_overlap
  exclude using gist (
    employee_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status <> 'cancelled');

create table if not exists public.hr_shift_events (
  id uuid primary key default gen_random_uuid(),
  scheduled_shift_id uuid not null references public.hr_scheduled_shifts (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_hr_shift_events_shift
  on public.hr_shift_events (scheduled_shift_id, created_at desc);

alter table public.hr_shift_templates enable row level security;
alter table public.hr_scheduled_shifts enable row level security;
alter table public.hr_shift_events enable row level security;

drop policy if exists "Staff select hr shift templates" on public.hr_shift_templates;
create policy "Staff select hr shift templates"
  on public.hr_shift_templates for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr scheduled shifts" on public.hr_scheduled_shifts;
create policy "Staff select hr scheduled shifts"
  on public.hr_scheduled_shifts for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr shift events" on public.hr_shift_events;
create policy "Staff select hr shift events"
  on public.hr_shift_events for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_shift_templates from public, anon, authenticated;
revoke all on public.hr_scheduled_shifts from public, anon, authenticated;
revoke all on public.hr_shift_events from public, anon, authenticated;
grant select on public.hr_shift_templates to authenticated;
grant select on public.hr_scheduled_shifts to authenticated;
grant select on public.hr_shift_events to authenticated;
grant all on public.hr_shift_templates to service_role;
grant all on public.hr_scheduled_shifts to service_role;
grant all on public.hr_shift_events to service_role;

commit;
