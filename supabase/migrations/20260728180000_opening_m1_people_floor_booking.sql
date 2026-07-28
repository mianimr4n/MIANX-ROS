-- Opening Operations M1 — people, floor/table notes, booking policy lifecycle.
-- Forward-only. Local/test only in this task — do not apply to Production here.
-- Rollback notes:
--   drop policy lifecycle columns / versions table;
--   restore unique(branch_id) on branch_booking_policies if versions dropped;
--   drop user_roles assignment lifecycle columns;
--   drop restaurant_tables.accessibility_notes / is_combinable;
--   restore invite allow-list without host/waiter.

begin;

-- ---------------------------------------------------------------------------
-- 1) Staff assignment lifecycle on user_roles (authorization membership source)
-- ---------------------------------------------------------------------------

alter table public.user_roles
  add column if not exists assignment_status text not null default 'ACTIVE',
  add column if not exists invitation_id uuid references public.staff_invites (id) on delete set null,
  add column if not exists assigned_by uuid references public.users (id) on delete set null,
  add column if not exists assigned_at timestamptz not null default timezone('utc', now()),
  add column if not exists verified_by uuid references public.users (id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists deactivated_by uuid references public.users (id) on delete set null,
  add column if not exists deactivated_at timestamptz,
  add column if not exists notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_user_roles_assignment_status'
  ) then
    alter table public.user_roles
      add constraint chk_user_roles_assignment_status
      check (assignment_status in ('INVITED', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'REVOKED'));
  end if;
end $$;

create index if not exists idx_user_roles_branch_status
  on public.user_roles (branch_id, assignment_status);

create index if not exists idx_user_roles_invitation
  on public.user_roles (invitation_id)
  where invitation_id is not null;

drop trigger if exists set_user_roles_updated_at on public.user_roles;
create trigger set_user_roles_updated_at
before update on public.user_roles
for each row execute function public.set_updated_at();

comment on column public.user_roles.assignment_status is
  'Opening M1 — operational assignment lifecycle. ACTIVE counts for readiness.';

-- Soft uniqueness for active branch assignments (hard unique already on user/role/branch).
-- History is preserved by status transitions on the same row + event log below.

create table if not exists public.staff_assignment_events (
  id uuid primary key default gen_random_uuid(),
  user_role_id uuid not null references public.user_roles (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete set null,
  user_id uuid not null references public.users (id) on delete cascade,
  role_id uuid not null references public.roles (id) on delete restrict,
  event_type text not null,
  from_status text,
  to_status text,
  actor_user_id uuid references public.users (id) on delete set null,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_staff_assignment_events_type check (
    event_type in (
      'ASSIGNED',
      'STATUS_CHANGED',
      'DEACTIVATED',
      'REACTIVATED',
      'SUSPENDED',
      'REVOKED',
      'VERIFIED',
      'NOTE_UPDATED'
    )
  )
);

create index if not exists idx_staff_assignment_events_assignment
  on public.staff_assignment_events (user_role_id, created_at desc);

create index if not exists idx_staff_assignment_events_branch
  on public.staff_assignment_events (branch_id, created_at desc);

alter table public.staff_assignment_events enable row level security;

drop policy if exists "Staff select branch assignment events" on public.staff_assignment_events;
create policy "Staff select branch assignment events" on public.staff_assignment_events
for select to authenticated using (
  branch_id is null or public.current_user_has_branch_access(branch_id)
);

grant select on table public.staff_assignment_events to authenticated;
grant select, insert, update, delete on table public.staff_assignment_events to service_role;

comment on table public.staff_assignment_events is
  'Opening M1 — append-only operational staff assignment history. No hard deletes of history rows.';

-- ---------------------------------------------------------------------------
-- 2) Invite allow-list: host + waiter (canonical opening roles)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_staff_invite_rules()
returns trigger
language plpgsql
as $$
declare
  role_code text;
  branch_status text;
begin
  new.email := lower(trim(new.email));

  select code into role_code
  from public.roles
  where id = new.role_id;

  if role_code is null then
    raise exception 'staff invite role_id is invalid';
  end if;

  if role_code in ('customer', 'super-admin') then
    raise exception 'role % cannot be assigned via staff invite', role_code;
  end if;

  if role_code not in (
    'branch-manager',
    'cashier',
    'kitchen',
    'rider',
    'customer-support',
    'host',
    'waiter'
  ) then
    raise exception 'role % is not inviteable', role_code;
  end if;

  if new.branch_id is null then
    raise exception 'branch_id is required for every staff invite';
  end if;

  select status into branch_status
  from public.branches
  where id = new.branch_id;

  if branch_status is null then
    raise exception 'branch_id does not exist';
  end if;

  if branch_status is distinct from 'operating' then
    raise exception 'branch must be operating';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Table accessibility notes + combinable flag
-- ---------------------------------------------------------------------------

alter table public.restaurant_tables
  add column if not exists accessibility_notes text,
  add column if not exists is_combinable boolean not null default false;

comment on column public.restaurant_tables.accessibility_notes is
  'Opening M1 — free-text accessibility notes (is_accessible remains the boolean probe).';
comment on column public.restaurant_tables.is_combinable is
  'Opening M1 — whether this table may participate in combinations.';

-- ---------------------------------------------------------------------------
-- 4) Booking policy versioning + approval lifecycle
-- ---------------------------------------------------------------------------

alter table public.branch_booking_policies
  add column if not exists version integer not null default 1,
  add column if not exists status text not null default 'DRAFT',
  add column if not exists minimum_party_size integer not null default 1,
  add column if not exists waitlist_enabled boolean not null default true,
  add column if not exists same_day_booking_enabled boolean not null default true,
  add column if not exists table_hold_minutes integer not null default 15,
  add column if not exists special_notes text,
  add column if not exists effective_from timestamptz,
  add column if not exists effective_until timestamptz,
  add column if not exists approved_by uuid references public.users (id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists created_by uuid references public.users (id) on delete set null,
  add column if not exists submitted_by uuid references public.users (id) on delete set null,
  add column if not exists submitted_at timestamptz,
  add column if not exists retired_by uuid references public.users (id) on delete set null,
  add column if not exists retired_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_branch_booking_policies_status'
  ) then
    alter table public.branch_booking_policies
      add constraint chk_branch_booking_policies_status
      check (status in ('DRAFT', 'REVIEW_REQUIRED', 'APPROVED', 'ACTIVE', 'RETIRED'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_branch_booking_policies_party_range'
  ) then
    alter table public.branch_booking_policies
      add constraint chk_branch_booking_policies_party_range
      check (minimum_party_size >= 1 and max_party_size_online >= minimum_party_size);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'chk_branch_booking_policies_table_hold'
  ) then
    alter table public.branch_booking_policies
      add constraint chk_branch_booking_policies_table_hold
      check (table_hold_minutes >= 0 and table_hold_minutes <= 240);
  end if;
end $$;

-- Replace single-row unique(branch_id) with versioned uniqueness.
alter table public.branch_booking_policies drop constraint if exists branch_booking_policies_branch_id_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'uq_branch_booking_policies_branch_version'
  ) then
    alter table public.branch_booking_policies
      add constraint uq_branch_booking_policies_branch_version unique (branch_id, version);
  end if;
end $$;

-- At most one ACTIVE policy per branch.
create unique index if not exists uq_branch_booking_policies_one_active
  on public.branch_booking_policies (branch_id)
  where status = 'ACTIVE';

-- Existing rows: treat as ACTIVE only when booking_enabled; otherwise DRAFT.
update public.branch_booking_policies
set status = case when booking_enabled then 'ACTIVE' else 'DRAFT' end,
    version = coalesce(version, 1),
    effective_from = coalesce(effective_from, created_at)
where true;

create index if not exists idx_branch_booking_policies_branch_status
  on public.branch_booking_policies (branch_id, status);

comment on column public.branch_booking_policies.status is
  'Opening M1 — DRAFT | REVIEW_REQUIRED | APPROVED | ACTIVE | RETIRED. Only ACTIVE satisfies readiness.';

commit;
