-- RC3 Workforce: employee lifecycle extensions + audit events.
-- Additive. Preserves existing status enum. No fake seed data.

begin;

alter table public.hr_employees
  add column if not exists employee_number varchar(40);

alter table public.hr_employees
  add column if not exists emergency_contact_name varchar(150);

alter table public.hr_employees
  add column if not exists emergency_contact_phone varchar(40);

alter table public.hr_employees
  add column if not exists employment_type text
    check (employment_type is null or employment_type in ('full_time', 'part_time', 'contract', 'casual'));

alter table public.hr_employees
  add column if not exists deactivation_reason text;

alter table public.hr_employees
  add column if not exists deactivated_by uuid references auth.users (id) on delete set null;

alter table public.hr_employees
  add column if not exists deactivated_at timestamptz;

create unique index if not exists uq_hr_employees_branch_number
  on public.hr_employees (branch_id, employee_number)
  where employee_number is not null;

create table if not exists public.hr_employee_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_hr_employee_events_employee
  on public.hr_employee_events (employee_id, created_at desc);
create index if not exists idx_hr_employee_events_branch
  on public.hr_employee_events (branch_id, created_at desc);

alter table public.hr_employee_events enable row level security;

drop policy if exists "Staff select hr employee events" on public.hr_employee_events;
create policy "Staff select hr employee events"
  on public.hr_employee_events
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_employee_events from public, anon, authenticated;
grant select on public.hr_employee_events to authenticated;
grant all on public.hr_employee_events to service_role;

comment on table public.hr_employee_events is
  'Audit trail for HR employee create/update/deactivate/reactivate/branch-transfer/role-change.';

commit;
