-- RC3 Workforce: attendance corrections + leave decision hardening.
-- Corrections never overwrite original attendance rows silently.

begin;

alter table public.hr_attendance
  add column if not exists scheduled_shift_id uuid references public.hr_scheduled_shifts (id) on delete set null;

alter table public.hr_attendance
  add column if not exists is_unscheduled boolean not null default false;

create table if not exists public.hr_attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references public.hr_attendance (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  employee_id uuid not null references public.hr_employees (id) on delete cascade,
  requested_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reason text not null,
  rejection_reason text,
  original_check_in timestamptz,
  original_check_out timestamptz,
  original_status text,
  proposed_check_in timestamptz,
  proposed_check_out timestamptz,
  proposed_status text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  check (
    proposed_check_out is null
    or proposed_check_in is null
    or proposed_check_out >= proposed_check_in
  )
);

comment on table public.hr_attendance_corrections is
  'Attendance correction requests. Original attendance row preserved until approved apply.';

create index if not exists idx_hr_attendance_corrections_branch
  on public.hr_attendance_corrections (branch_id, status);
create index if not exists idx_hr_attendance_corrections_attendance
  on public.hr_attendance_corrections (attendance_id);

-- Leave hardening columns
alter table public.hr_leave_requests
  add column if not exists decided_by uuid references auth.users (id) on delete set null;

alter table public.hr_leave_requests
  add column if not exists decided_at timestamptz;

alter table public.hr_leave_requests
  add column if not exists rejection_reason text;

-- Extend leave status to include CANCELLED (keep existing values)
alter table public.hr_leave_requests drop constraint if exists hr_leave_requests_status_check;
alter table public.hr_leave_requests
  add constraint hr_leave_requests_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'));

create table if not exists public.hr_leave_events (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null references public.hr_leave_requests (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  reason text,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_hr_leave_events_leave
  on public.hr_leave_events (leave_request_id, created_at desc);

alter table public.hr_attendance_corrections enable row level security;
alter table public.hr_leave_events enable row level security;

drop policy if exists "Staff select hr attendance corrections" on public.hr_attendance_corrections;
create policy "Staff select hr attendance corrections"
  on public.hr_attendance_corrections for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select hr leave events" on public.hr_leave_events;
create policy "Staff select hr leave events"
  on public.hr_leave_events for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.hr_attendance_corrections from public, anon, authenticated;
revoke all on public.hr_leave_events from public, anon, authenticated;
grant select on public.hr_attendance_corrections to authenticated;
grant select on public.hr_leave_events to authenticated;
grant all on public.hr_attendance_corrections to service_role;
grant all on public.hr_leave_events to service_role;

commit;
