-- =============================================================================
-- HR & Workforce — employee directory foundation
-- Additive only. Service-role writes via API; authenticated staff may read
-- branch-scoped rows via current_user_has_branch_access.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) hr_employees
-- ---------------------------------------------------------------------------
create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  full_name varchar(150) not null,
  email varchar(150) not null,
  phone varchar(40),
  role varchar(150) not null,
  status text not null default 'active' check (
    status in ('active', 'inactive', 'on_leave', 'terminated')
  ),
  hired_at date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, email)
);

comment on table public.hr_employees is
  'HR employee directory records (branch-scoped). Distinct from auth staff provisioning.';

create index if not exists idx_hr_employees_branch_id on public.hr_employees (branch_id);
create index if not exists idx_hr_employees_status on public.hr_employees (status);
create index if not exists idx_hr_employees_full_name on public.hr_employees (full_name);

drop trigger if exists set_hr_employees_updated_at on public.hr_employees;
create trigger set_hr_employees_updated_at
before update on public.hr_employees
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) RLS + grants (API uses service_role; staff may SELECT within branch scope)
-- ---------------------------------------------------------------------------
alter table public.hr_employees enable row level security;

drop policy if exists "Staff select branch hr_employees" on public.hr_employees;
create policy "Staff select branch hr_employees"
  on public.hr_employees
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_employees from public, anon, authenticated;
grant select on public.hr_employees to authenticated;
grant all on public.hr_employees to service_role;

commit;
