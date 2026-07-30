-- =============================================================================
-- HR core complete — attendance, leave requests, employee documents
-- Additive only. Service-role writes via API; authenticated staff may SELECT
-- within branch scope via current_user_has_branch_access.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Optional hr.manage permission (granted to roles that already have staff.manage)
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values ('hr', 'manage', 'hr.manage', 'Manage HR attendance, leave, and employee documents.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'hr.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 1) hr_attendance
-- ---------------------------------------------------------------------------
create table if not exists public.hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text not null default 'PRESENT'
    check (status in ('PRESENT', 'ABSENT', 'LATE', 'LEAVE')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    check_out_time is null
    or check_in_time is null
    or check_out_time >= check_in_time
  )
);

comment on table public.hr_attendance is
  'HR attendance ledger — check-in/out events with PRESENT|ABSENT|LATE|LEAVE status.';

create index if not exists idx_hr_attendance_branch on public.hr_attendance (branch_id);
create index if not exists idx_hr_attendance_employee on public.hr_attendance (employee_id);
create index if not exists idx_hr_attendance_status on public.hr_attendance (status);
create index if not exists idx_hr_attendance_check_in on public.hr_attendance (check_in_time desc);

drop trigger if exists set_hr_attendance_updated_at on public.hr_attendance;
create trigger set_hr_attendance_updated_at
before update on public.hr_attendance
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) hr_leave_requests
-- ---------------------------------------------------------------------------
create table if not exists public.hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type text not null
    check (leave_type in ('CASUAL', 'SICK', 'ANNUAL')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_date >= start_date)
);

comment on table public.hr_leave_requests is
  'HR leave requests — CASUAL|SICK|ANNUAL with PENDING|APPROVED|REJECTED workflow.';

create index if not exists idx_hr_leave_requests_branch on public.hr_leave_requests (branch_id);
create index if not exists idx_hr_leave_requests_employee on public.hr_leave_requests (employee_id);
create index if not exists idx_hr_leave_requests_status on public.hr_leave_requests (status);
create index if not exists idx_hr_leave_requests_dates on public.hr_leave_requests (start_date, end_date);

drop trigger if exists set_hr_leave_requests_updated_at on public.hr_leave_requests;
create trigger set_hr_leave_requests_updated_at
before update on public.hr_leave_requests
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) hr_employee_documents
-- ---------------------------------------------------------------------------
create table if not exists public.hr_employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  document_type text not null
    check (document_type in ('CNIC', 'CONTRACT', 'CERTIFICATE')),
  file_url text not null,
  uploaded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.hr_employee_documents is
  'HR employee document links (CNIC|CONTRACT|CERTIFICATE). Stores URL references only.';

create index if not exists idx_hr_employee_documents_employee
  on public.hr_employee_documents (employee_id);
create index if not exists idx_hr_employee_documents_type
  on public.hr_employee_documents (document_type);

-- ---------------------------------------------------------------------------
-- 4) RLS + grants
-- ---------------------------------------------------------------------------
alter table public.hr_attendance enable row level security;
alter table public.hr_leave_requests enable row level security;
alter table public.hr_employee_documents enable row level security;

drop policy if exists "Staff select branch hr_attendance" on public.hr_attendance;
create policy "Staff select branch hr_attendance"
  on public.hr_attendance
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch hr_leave_requests" on public.hr_leave_requests;
create policy "Staff select branch hr_leave_requests"
  on public.hr_leave_requests
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch hr_employee_documents" on public.hr_employee_documents;
create policy "Staff select branch hr_employee_documents"
  on public.hr_employee_documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.hr_employees e
      where e.id = hr_employee_documents.employee_id
        and public.current_user_has_branch_access(e.branch_id)
    )
  );

revoke all on public.hr_attendance from public, anon, authenticated;
revoke all on public.hr_leave_requests from public, anon, authenticated;
revoke all on public.hr_employee_documents from public, anon, authenticated;

grant select on public.hr_attendance to authenticated;
grant select on public.hr_leave_requests to authenticated;
grant select on public.hr_employee_documents to authenticated;

grant all on public.hr_attendance to service_role;
grant all on public.hr_leave_requests to service_role;
grant all on public.hr_employee_documents to service_role;

commit;
