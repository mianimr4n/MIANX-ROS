-- =============================================================================
-- D3 — Floor plan, tables, dine-in sessions, waitlist and reservations
-- Additive. Extends canonical models (restaurant_tables, dine_in_sessions).
-- Mutations are service_role only; staff read via branch-scoped RLS.
--
-- Rollback notes (manual, if ever required — additive objects only):
--   drop function if exists public.close_dining_session_atomic(uuid, uuid, boolean, text);
--   drop function if exists public.transfer_session_tables_atomic(uuid, uuid[], uuid[], text, uuid);
--   drop function if exists public.seat_party_atomic(uuid, text, uuid, uuid, uuid[], integer, text, uuid, uuid, boolean);
--   drop function if exists public.create_reservation_atomic(text, text, uuid, jsonb, uuid[], uuid, boolean);
--   drop function if exists public.next_dining_session_number();
--   drop function if exists public.next_reservation_number();
--   drop table if exists public.table_service_audit;
--   drop table if exists public.reservation_communications;
--   drop table if exists public.dining_session_servers;
--   drop table if exists public.dining_session_tables;
--   drop table if exists public.waitlist_entries;
--   drop table if exists public.reservation_table_assignments;
--   drop table if exists public.reservations;
--   drop table if exists public.service_blackouts;
--   drop table if exists public.branch_booking_policies;
--   drop table if exists public.table_combination_members;
--   drop table if exists public.table_combinations;
--   -- restaurant_tables / dine_in_sessions: drop the added columns individually;
--   -- never drop the base tables (pre-existing production data).
--   drop table if exists public.service_areas;
--   drop table if exists public.restaurant_floors;
--   drop sequence if exists public.dining_sessions_number_seq;
--   drop sequence if exists public.reservations_number_seq;
--   -- Do NOT drop extension btree_gist blindly (verify no other dependents).
--
-- Test-only failure injection (local integration tests):
--   SET LOCAL telepizza.d3_force_fail = 'reservation'|'assignment'|'outbox'|'audit'
--                                      |'session'|'session_table'|'server'|'transfer'|'close';
--   Honored only when telepizza.d3_test_mode = 'on'. Never set in production.
-- =============================================================================

begin;

create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- 1) Floors
-- -----------------------------------------------------------------------------

create table if not exists public.restaurant_floors (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  code varchar(80) not null,
  display_name varchar(150) not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_restaurant_floors_branch_code unique (branch_id, code)
);

create index if not exists idx_restaurant_floors_branch
  on public.restaurant_floors (branch_id, sort_order);

drop trigger if exists set_restaurant_floors_updated_at on public.restaurant_floors;
create trigger set_restaurant_floors_updated_at
before update on public.restaurant_floors
for each row execute function public.set_updated_at();

comment on table public.restaurant_floors is
  'D3 — branch-scoped physical restaurant floors/levels.';

-- -----------------------------------------------------------------------------
-- 2) Service areas
-- -----------------------------------------------------------------------------

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  floor_id uuid not null references public.restaurant_floors (id) on delete restrict,
  code varchar(80) not null,
  display_name varchar(150) not null,
  description text,
  sort_order integer not null default 0,
  color_token varchar(40),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_service_areas_branch_code unique (branch_id, code)
);

create index if not exists idx_service_areas_branch
  on public.service_areas (branch_id, sort_order);

drop trigger if exists set_service_areas_updated_at on public.service_areas;
create trigger set_service_areas_updated_at
before update on public.service_areas
for each row execute function public.set_updated_at();

create or replace function public.enforce_service_area_branch_match()
returns trigger
language plpgsql
as $$
declare
  v_floor_branch uuid;
begin
  select branch_id into v_floor_branch from public.restaurant_floors where id = new.floor_id;
  if v_floor_branch is null or v_floor_branch <> new.branch_id then
    raise exception 'service_areas.floor_id must belong to the same branch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_service_areas_branch_match on public.service_areas;
create trigger trg_service_areas_branch_match
before insert or update of floor_id, branch_id
on public.service_areas
for each row execute function public.enforce_service_area_branch_match();

comment on table public.service_areas is
  'D3 — logical operational areas (hall, terrace, family, VIP) within a floor.';

-- -----------------------------------------------------------------------------
-- 3) Physical tables — extend canonical restaurant_tables (DB-R3)
--    Legacy status column (available|occupied|reserved|inactive) is preserved;
--    operational_status is the D3 canonical state machine.
-- -----------------------------------------------------------------------------

alter table public.restaurant_tables
  add column if not exists floor_id uuid references public.restaurant_floors (id) on delete set null,
  add column if not exists service_area_id uuid references public.service_areas (id) on delete set null,
  add column if not exists capacity_min integer not null default 1,
  add column if not exists capacity_max integer,
  add column if not exists shape text not null default 'square',
  add column if not exists position_x numeric(8, 2) not null default 0,
  add column if not exists position_y numeric(8, 2) not null default 0,
  add column if not exists width numeric(8, 2) not null default 80,
  add column if not exists height numeric(8, 2) not null default 80,
  add column if not exists rotation numeric(6, 2) not null default 0,
  add column if not exists is_accessible boolean not null default false,
  add column if not exists high_chair_supported boolean not null default false,
  add column if not exists operational_status text not null default 'available';

update public.restaurant_tables
set capacity_max = capacity
where capacity_max is null and capacity is not null;

update public.restaurant_tables
set operational_status = case status
    when 'available' then 'available'
    when 'reserved' then 'reserved'
    when 'occupied' then 'occupied'
    when 'inactive' then 'out_of_service'
    else 'available'
  end
where operational_status = 'available' and status <> 'available';

alter table public.restaurant_tables
  drop constraint if exists chk_restaurant_tables_shape;
alter table public.restaurant_tables
  add constraint chk_restaurant_tables_shape
  check (shape in ('square', 'rectangle', 'round', 'custom'));

alter table public.restaurant_tables
  drop constraint if exists chk_restaurant_tables_operational_status;
alter table public.restaurant_tables
  add constraint chk_restaurant_tables_operational_status
  check (operational_status in (
    'available', 'reserved', 'occupied', 'ordering', 'served',
    'bill_requested', 'payment_pending', 'cleaning', 'blocked', 'out_of_service'
  ));

alter table public.restaurant_tables
  drop constraint if exists chk_restaurant_tables_capacity_range;
alter table public.restaurant_tables
  add constraint chk_restaurant_tables_capacity_range
  check (capacity_min > 0 and (capacity_max is null or capacity_max >= capacity_min));

create index if not exists idx_restaurant_tables_branch_operational
  on public.restaurant_tables (branch_id, operational_status);

create or replace function public.enforce_restaurant_table_branch_match()
returns trigger
language plpgsql
as $$
declare
  v_branch uuid;
begin
  if new.floor_id is not null then
    select branch_id into v_branch from public.restaurant_floors where id = new.floor_id;
    if v_branch is null or v_branch <> new.branch_id then
      raise exception 'restaurant_tables.floor_id must belong to the same branch'
        using errcode = '23514';
    end if;
  end if;
  if new.service_area_id is not null then
    select branch_id into v_branch from public.service_areas where id = new.service_area_id;
    if v_branch is null or v_branch <> new.branch_id then
      raise exception 'restaurant_tables.service_area_id must belong to the same branch'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_restaurant_tables_branch_match on public.restaurant_tables;
create trigger trg_restaurant_tables_branch_match
before insert or update of floor_id, service_area_id, branch_id
on public.restaurant_tables
for each row execute function public.enforce_restaurant_table_branch_match();

-- -----------------------------------------------------------------------------
-- 4) Permitted table combinations
-- -----------------------------------------------------------------------------

create table if not exists public.table_combinations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  code varchar(80) not null,
  display_name varchar(150) not null,
  min_party_size integer not null default 1 check (min_party_size > 0),
  max_party_size integer check (max_party_size is null or max_party_size >= min_party_size),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_table_combinations_branch_code unique (branch_id, code)
);

drop trigger if exists set_table_combinations_updated_at on public.table_combinations;
create trigger set_table_combinations_updated_at
before update on public.table_combinations
for each row execute function public.set_updated_at();

create table if not exists public.table_combination_members (
  id uuid primary key default gen_random_uuid(),
  combination_id uuid not null references public.table_combinations (id) on delete cascade,
  table_id uuid not null references public.restaurant_tables (id) on delete cascade,
  sort_order integer not null default 0,
  constraint uq_table_combination_members unique (combination_id, table_id)
);

create or replace function public.enforce_combination_member_branch_match()
returns trigger
language plpgsql
as $$
declare
  v_combo_branch uuid;
  v_table_branch uuid;
begin
  select branch_id into v_combo_branch from public.table_combinations where id = new.combination_id;
  select branch_id into v_table_branch from public.restaurant_tables where id = new.table_id;
  if v_combo_branch is null or v_table_branch is null or v_combo_branch <> v_table_branch then
    raise exception 'table_combination_members: table and combination must share a branch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_table_combination_members_branch on public.table_combination_members;
create trigger trg_table_combination_members_branch
before insert or update
on public.table_combination_members
for each row execute function public.enforce_combination_member_branch_match();

-- -----------------------------------------------------------------------------
-- 5) Booking policies (server-authoritative availability configuration)
-- -----------------------------------------------------------------------------

create table if not exists public.branch_booking_policies (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null unique references public.branches (id) on delete cascade,
  booking_enabled boolean not null default false,
  online_booking_enabled boolean not null default false,
  min_advance_minutes integer not null default 30 check (min_advance_minutes >= 0),
  max_advance_days integer not null default 30 check (max_advance_days > 0),
  slot_interval_minutes integer not null default 30 check (slot_interval_minutes between 5 and 240),
  default_duration_minutes integer not null default 90 check (default_duration_minutes between 15 and 480),
  max_party_size_online integer not null default 10 check (max_party_size_online > 0),
  service_start_time time not null default '12:00',
  service_end_time time not null default '23:00',
  same_day_cutoff_minutes integer not null default 0 check (same_day_cutoff_minutes >= 0),
  cancellation_cutoff_minutes integer not null default 60 check (cancellation_cutoff_minutes >= 0),
  grace_period_minutes integer not null default 15 check (grace_period_minutes >= 0),
  no_show_after_minutes integer not null default 30 check (no_show_after_minutes >= 0),
  cleaning_buffer_minutes integer not null default 10 check (cleaning_buffer_minutes >= 0),
  overbooking_allowed boolean not null default false,
  deposit_required boolean not null default false,
  deposit_amount numeric(12, 2) check (deposit_amount is null or deposit_amount >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_branch_booking_policies_updated_at on public.branch_booking_policies;
create trigger set_branch_booking_policies_updated_at
before update on public.branch_booking_policies
for each row execute function public.set_updated_at();

comment on table public.branch_booking_policies is
  'D3 — branch-scoped reservation availability rules. Deposits are FOUNDATION (no gateway).';

-- -----------------------------------------------------------------------------
-- 6) Blackouts and special service periods
-- -----------------------------------------------------------------------------

create table if not exists public.service_blackouts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  floor_id uuid references public.restaurant_floors (id) on delete cascade,
  service_area_id uuid references public.service_areas (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text not null,
  booking_allowed boolean not null default false,
  walk_in_allowed boolean not null default false,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_service_blackouts_window check (end_at > start_at)
);

create index if not exists idx_service_blackouts_branch_window
  on public.service_blackouts (branch_id, start_at, end_at);

-- -----------------------------------------------------------------------------
-- 7) Reservations
-- -----------------------------------------------------------------------------

create sequence if not exists public.reservations_number_seq;

create or replace function public.next_reservation_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'RES-' || to_char(timezone('utc', now()), 'YYMMDD') || '-'
    || lpad(nextval('public.reservations_number_seq')::text, 6, '0');
end;
$$;

revoke all on function public.next_reservation_number() from public, anon, authenticated;
grant execute on function public.next_reservation_number() to service_role;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  reservation_number text not null unique,
  customer_id uuid references public.customers (id) on delete set null,
  guest_name varchar(150) not null,
  guest_phone varchar(30),
  guest_email varchar(255),
  preferred_language varchar(10),
  reservation_date date not null,
  start_at timestamptz not null,
  expected_end_at timestamptz not null,
  party_size integer not null check (party_size > 0),
  adults integer check (adults is null or adults >= 0),
  children integer check (children is null or children >= 0),
  high_chair_count integer not null default 0 check (high_chair_count >= 0),
  accessibility_required boolean not null default false,
  preferred_floor_id uuid references public.restaurant_floors (id) on delete set null,
  preferred_area_id uuid references public.service_areas (id) on delete set null,
  assigned_table_id uuid references public.restaurant_tables (id) on delete set null,
  reservation_status text not null default 'pending',
  booking_channel text not null default 'staff',
  special_requests text,
  internal_notes text,
  deposit_required boolean not null default false,
  deposit_amount numeric(12, 2) check (deposit_amount is null or deposit_amount >= 0),
  deposit_status text not null default 'none',
  confirmation_status text not null default 'unconfirmed',
  cancellation_reason text,
  cancelled_at timestamptz,
  no_show_at timestamptz,
  arrived_at timestamptz,
  seated_at timestamptz,
  completed_at timestamptz,
  idempotency_key text unique,
  idempotency_request_hash text,
  created_by uuid references public.users (id) on delete set null,
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_reservations_window check (expected_end_at > start_at),
  constraint chk_reservations_status check (reservation_status in (
    'inquiry', 'pending', 'confirmed', 'arrived', 'partially_seated',
    'seated', 'completed', 'cancelled', 'no_show', 'declined'
  )),
  constraint chk_reservations_channel check (booking_channel in (
    'phone', 'walk_in', 'website', 'admin', 'staff', 'whatsapp', 'partner'
  )),
  constraint chk_reservations_deposit_status check (deposit_status in (
    'none', 'required', 'paid', 'partially_paid', 'refunded', 'forfeited', 'failed'
  )),
  constraint chk_reservations_confirmation check (confirmation_status in (
    'unconfirmed', 'requested', 'confirmed'
  ))
);

create index if not exists idx_reservations_branch_start
  on public.reservations (branch_id, start_at);
create index if not exists idx_reservations_branch_status
  on public.reservations (branch_id, reservation_status);
create index if not exists idx_reservations_branch_date
  on public.reservations (branch_id, reservation_date);
create index if not exists idx_reservations_guest_phone
  on public.reservations (guest_phone);

drop trigger if exists set_reservations_updated_at on public.reservations;
create trigger set_reservations_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

comment on table public.reservations is
  'D3 — future bookings. Distinct from dine_in_sessions (live visits). Deposits FOUNDATION only.';

-- -----------------------------------------------------------------------------
-- 8) Reservation table assignments (DB-level double-booking protection)
-- -----------------------------------------------------------------------------

create table if not exists public.reservation_table_assignments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  table_id uuid not null references public.restaurant_tables (id) on delete restrict,
  reserved_range tstzrange not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.users (id) on delete set null,
  released_at timestamptz,
  release_reason text,
  constraint excl_reservation_table_overlap exclude using gist (
    table_id with =,
    reserved_range with &&
  ) where (released_at is null)
);

create index if not exists idx_reservation_table_assignments_res
  on public.reservation_table_assignments (reservation_id);
create index if not exists idx_reservation_table_assignments_table
  on public.reservation_table_assignments (table_id) where released_at is null;

create or replace function public.enforce_reservation_assignment_branch_match()
returns trigger
language plpgsql
as $$
declare
  v_res_branch uuid;
  v_table_branch uuid;
begin
  select branch_id into v_res_branch from public.reservations where id = new.reservation_id;
  select branch_id into v_table_branch from public.restaurant_tables where id = new.table_id;
  if v_res_branch is null or v_table_branch is null or v_res_branch <> v_table_branch then
    raise exception 'reservation_table_assignments: reservation and table must share a branch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservation_assignments_branch on public.reservation_table_assignments;
create trigger trg_reservation_assignments_branch
before insert or update of reservation_id, table_id
on public.reservation_table_assignments
for each row execute function public.enforce_reservation_assignment_branch_match();

-- -----------------------------------------------------------------------------
-- 9) Waitlist
-- -----------------------------------------------------------------------------

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  guest_name varchar(150) not null,
  guest_phone varchar(30),
  party_size integer not null check (party_size > 0),
  requested_area_id uuid references public.service_areas (id) on delete set null,
  accessibility_required boolean not null default false,
  high_chair_count integer not null default 0 check (high_chair_count >= 0),
  quoted_wait_minutes integer check (quoted_wait_minutes is null or quoted_wait_minutes >= 0),
  estimated_seat_at timestamptz,
  status text not null default 'waiting',
  priority integer not null default 0,
  notes text,
  notified_at timestamptz,
  arrived_at timestamptz,
  seated_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint chk_waitlist_status check (status in (
    'waiting', 'notified', 'arrived', 'seated', 'cancelled', 'left', 'expired'
  ))
);

create index if not exists idx_waitlist_branch_status_created
  on public.waitlist_entries (branch_id, status, created_at);

drop trigger if exists set_waitlist_entries_updated_at on public.waitlist_entries;
create trigger set_waitlist_entries_updated_at
before update on public.waitlist_entries
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10) Dining sessions — extend canonical dine_in_sessions (DB-R4)
--     Legacy status (open|ordering|billed|paid|closed|cancelled) preserved.
--     service_status is the D3 canonical lifecycle.
-- -----------------------------------------------------------------------------

create sequence if not exists public.dining_sessions_number_seq;

create or replace function public.next_dining_session_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'DS-' || to_char(timezone('utc', now()), 'YYMMDD') || '-'
    || lpad(nextval('public.dining_sessions_number_seq')::text, 6, '0');
end;
$$;

revoke all on function public.next_dining_session_number() from public, anon, authenticated;
grant execute on function public.next_dining_session_number() to service_role;

alter table public.dine_in_sessions
  add column if not exists session_number text,
  add column if not exists service_status text not null default 'seated',
  add column if not exists reservation_id uuid references public.reservations (id) on delete set null,
  add column if not exists waitlist_id uuid references public.waitlist_entries (id) on delete set null,
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists primary_server_user_id uuid references public.users (id) on delete set null,
  add column if not exists party_size integer check (party_size is null or party_size > 0),
  add column if not exists guest_name varchar(150),
  add column if not exists seated_at timestamptz,
  add column if not exists first_order_at timestamptz,
  add column if not exists bill_requested_at timestamptz,
  add column if not exists notes text,
  add column if not exists created_by uuid references public.users (id) on delete set null,
  add column if not exists updated_by uuid references public.users (id) on delete set null;

create unique index if not exists uq_dine_in_sessions_session_number
  on public.dine_in_sessions (session_number) where session_number is not null;

alter table public.dine_in_sessions
  drop constraint if exists chk_dine_in_sessions_service_status;
alter table public.dine_in_sessions
  add constraint chk_dine_in_sessions_service_status
  check (service_status in (
    'waiting_to_seat', 'seated', 'ordering', 'dining', 'bill_requested',
    'payment_pending', 'completed', 'cancelled', 'abandoned'
  ));

create index if not exists idx_dine_in_sessions_branch_service_status
  on public.dine_in_sessions (branch_id, service_status);

-- -----------------------------------------------------------------------------
-- 11) Dining-session table assignments (one active session per table)
-- -----------------------------------------------------------------------------

create table if not exists public.dining_session_tables (
  id uuid primary key default gen_random_uuid(),
  dine_in_session_id uuid not null references public.dine_in_sessions (id) on delete cascade,
  table_id uuid not null references public.restaurant_tables (id) on delete restrict,
  assigned_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  assignment_reason text not null default 'initial_seating',
  assigned_by uuid references public.users (id) on delete set null
);

create unique index if not exists uq_dining_session_tables_active_table
  on public.dining_session_tables (table_id) where released_at is null;
create index if not exists idx_dining_session_tables_session
  on public.dining_session_tables (dine_in_session_id);

create or replace function public.enforce_session_table_branch_match()
returns trigger
language plpgsql
as $$
declare
  v_session_branch uuid;
  v_table_branch uuid;
begin
  select branch_id into v_session_branch from public.dine_in_sessions where id = new.dine_in_session_id;
  select branch_id into v_table_branch from public.restaurant_tables where id = new.table_id;
  if v_session_branch is null or v_table_branch is null or v_session_branch <> v_table_branch then
    raise exception 'dining_session_tables: session and table must share a branch'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dining_session_tables_branch on public.dining_session_tables;
create trigger trg_dining_session_tables_branch
before insert or update of dine_in_session_id, table_id
on public.dining_session_tables
for each row execute function public.enforce_session_table_branch_match();

-- -----------------------------------------------------------------------------
-- 12) Server / waiter assignments
-- -----------------------------------------------------------------------------

create table if not exists public.dining_session_servers (
  id uuid primary key default gen_random_uuid(),
  dine_in_session_id uuid not null references public.dine_in_sessions (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'primary' check (role in ('primary', 'support')),
  assigned_at timestamptz not null default timezone('utc', now()),
  released_at timestamptz,
  assigned_by uuid references public.users (id) on delete set null
);

create unique index if not exists uq_dining_session_servers_active_primary
  on public.dining_session_servers (dine_in_session_id)
  where released_at is null and role = 'primary';
create index if not exists idx_dining_session_servers_session
  on public.dining_session_servers (dine_in_session_id);

-- -----------------------------------------------------------------------------
-- 13) Reservation communications outbox (provider-independent, honest)
-- -----------------------------------------------------------------------------

create table if not exists public.reservation_communications (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  reservation_id uuid references public.reservations (id) on delete cascade,
  waitlist_id uuid references public.waitlist_entries (id) on delete cascade,
  message_type text not null check (message_type in (
    'confirmation_requested', 'confirmation', 'reminder', 'cancellation', 'waitlist_ready'
  )),
  channel text not null default 'none' check (channel in (
    'none', 'manual', 'whatsapp', 'sms', 'email'
  )),
  status text not null default 'provider_unavailable' check (status in (
    'pending', 'sent', 'failed', 'skipped', 'provider_unavailable'
  )),
  provider_reference text,
  sent_at timestamptz,
  failure_reason text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_reservation_communications_res
  on public.reservation_communications (reservation_id);
create index if not exists idx_reservation_communications_branch_status
  on public.reservation_communications (branch_id, status);

comment on table public.reservation_communications is
  'D3 — provider-independent outbox. status=sent requires provider evidence; no provider is configured.';

-- -----------------------------------------------------------------------------
-- 14) Table-service audit trail
-- -----------------------------------------------------------------------------

create table if not exists public.table_service_audit (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  actor_user_id uuid references public.users (id) on delete set null,
  actor_type text not null default 'staff' check (actor_type in ('staff', 'system', 'customer', 'guest')),
  resource_type text not null,
  resource_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_table_service_audit_branch_created
  on public.table_service_audit (branch_id, created_at desc);
create index if not exists idx_table_service_audit_resource
  on public.table_service_audit (resource_type, resource_id);

-- -----------------------------------------------------------------------------
-- 15) Permissions and roles (configuration seed — no fabricated people)
-- -----------------------------------------------------------------------------

insert into public.permissions (module, action, code, description)
values
  ('floor', 'manage', 'floor.manage', 'Configure floors, service areas, tables, and combinations.'),
  ('reservation', 'read', 'reservation.read', 'Read reservations and waitlist entries.'),
  ('reservation', 'manage', 'reservation.manage', 'Create and manage reservations, waitlist, and blackouts.'),
  ('dinein', 'manage', 'dinein.manage', 'Seat guests, manage dining sessions, transfers, and bill requests.')
on conflict (code) do nothing;

insert into public.roles (name, code, description, is_system_role)
values
  ('Host / Front Desk', 'host', 'Reservations, waitlist, table assignment, and seating.', true),
  ('Waiter', 'waiter', 'Assigned table service, orders, and bill requests.', true)
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on (
  (r.code = 'super-admin' and p.code in ('floor.manage', 'reservation.read', 'reservation.manage', 'dinein.manage'))
  or (r.code = 'branch-manager' and p.code in ('floor.manage', 'reservation.read', 'reservation.manage', 'dinein.manage'))
  or (r.code = 'host' and p.code in ('reservation.read', 'reservation.manage', 'dinein.manage', 'branch.read', 'order.read'))
  or (r.code = 'waiter' and p.code in ('reservation.read', 'dinein.manage', 'order.read', 'order.manage', 'menu.read', 'branch.read'))
  or (r.code = 'cashier' and p.code in ('reservation.read', 'dinein.manage'))
)
on conflict (role_id, permission_id) do nothing;

-- -----------------------------------------------------------------------------
-- 16) RLS + grants (staff read branch-scoped; mutations via service_role)
-- -----------------------------------------------------------------------------

alter table public.restaurant_floors enable row level security;
alter table public.service_areas enable row level security;
alter table public.table_combinations enable row level security;
alter table public.table_combination_members enable row level security;
alter table public.branch_booking_policies enable row level security;
alter table public.service_blackouts enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_table_assignments enable row level security;
alter table public.waitlist_entries enable row level security;
alter table public.dining_session_tables enable row level security;
alter table public.dining_session_servers enable row level security;
alter table public.reservation_communications enable row level security;
alter table public.table_service_audit enable row level security;

drop policy if exists "Staff select branch floors" on public.restaurant_floors;
create policy "Staff select branch floors" on public.restaurant_floors
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch service areas" on public.service_areas;
create policy "Staff select branch service areas" on public.service_areas
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch combinations" on public.table_combinations;
create policy "Staff select branch combinations" on public.table_combinations
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch combination members" on public.table_combination_members;
create policy "Staff select branch combination members" on public.table_combination_members
for select to authenticated using (exists (
  select 1 from public.table_combinations tc
  where tc.id = table_combination_members.combination_id
    and public.current_user_has_branch_access(tc.branch_id)
));

drop policy if exists "Staff select branch booking policies" on public.branch_booking_policies;
create policy "Staff select branch booking policies" on public.branch_booking_policies
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch blackouts" on public.service_blackouts;
create policy "Staff select branch blackouts" on public.service_blackouts
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch reservations" on public.reservations;
create policy "Staff select branch reservations" on public.reservations
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch reservation assignments" on public.reservation_table_assignments;
create policy "Staff select branch reservation assignments" on public.reservation_table_assignments
for select to authenticated using (exists (
  select 1 from public.reservations r
  where r.id = reservation_table_assignments.reservation_id
    and public.current_user_has_branch_access(r.branch_id)
));

drop policy if exists "Staff select branch waitlist" on public.waitlist_entries;
create policy "Staff select branch waitlist" on public.waitlist_entries
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch session tables" on public.dining_session_tables;
create policy "Staff select branch session tables" on public.dining_session_tables
for select to authenticated using (exists (
  select 1 from public.dine_in_sessions s
  where s.id = dining_session_tables.dine_in_session_id
    and public.current_user_has_branch_access(s.branch_id)
));

drop policy if exists "Staff select branch session servers" on public.dining_session_servers;
create policy "Staff select branch session servers" on public.dining_session_servers
for select to authenticated using (exists (
  select 1 from public.dine_in_sessions s
  where s.id = dining_session_servers.dine_in_session_id
    and public.current_user_has_branch_access(s.branch_id)
));

drop policy if exists "Staff select branch reservation communications" on public.reservation_communications;
create policy "Staff select branch reservation communications" on public.reservation_communications
for select to authenticated using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch table service audit" on public.table_service_audit;
create policy "Staff select branch table service audit" on public.table_service_audit
for select to authenticated using (public.current_user_has_branch_access(branch_id));

revoke all on table public.restaurant_floors,
  public.service_areas,
  public.table_combinations,
  public.table_combination_members,
  public.branch_booking_policies,
  public.service_blackouts,
  public.reservations,
  public.reservation_table_assignments,
  public.waitlist_entries,
  public.dining_session_tables,
  public.dining_session_servers,
  public.reservation_communications,
  public.table_service_audit
from anon, authenticated;

grant select on table public.restaurant_floors,
  public.service_areas,
  public.table_combinations,
  public.table_combination_members,
  public.branch_booking_policies,
  public.service_blackouts,
  public.reservations,
  public.reservation_table_assignments,
  public.waitlist_entries,
  public.dining_session_tables,
  public.dining_session_servers,
  public.reservation_communications,
  public.table_service_audit
to authenticated;

grant select, insert, update, delete on table public.restaurant_floors,
  public.service_areas,
  public.table_combinations,
  public.table_combination_members,
  public.branch_booking_policies,
  public.service_blackouts,
  public.reservations,
  public.reservation_table_assignments,
  public.waitlist_entries,
  public.dining_session_tables,
  public.dining_session_servers,
  public.reservation_communications,
  public.table_service_audit
to service_role;

grant usage, select on sequence public.reservations_number_seq, public.dining_sessions_number_seq
to service_role;

-- -----------------------------------------------------------------------------
-- 17) Helpers
-- -----------------------------------------------------------------------------

create or replace function public.d3_legacy_table_status(p_operational text)
returns text
language sql
immutable
as $$
  select case
    when p_operational = 'available' then 'available'
    when p_operational = 'reserved' then 'reserved'
    when p_operational in ('occupied', 'ordering', 'served', 'bill_requested', 'payment_pending', 'cleaning') then 'occupied'
    else 'inactive'
  end;
$$;

create or replace function public.d3_force_fail(p_stage text)
returns void
language plpgsql
as $$
begin
  if current_setting('telepizza.d3_test_mode', true) = 'on'
     and current_setting('telepizza.d3_force_fail', true) = p_stage then
    raise exception 'D3_FORCE_FAIL_%', upper(p_stage) using errcode = 'P0001';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 18) Atomic reservation creation
-- -----------------------------------------------------------------------------

create or replace function public.create_reservation_atomic(
  p_idempotency_key text,
  p_request_hash text,
  p_branch_id uuid,
  p_reservation jsonb,
  p_table_ids uuid[] default '{}'::uuid[],
  p_actor_user_id uuid default null,
  p_override_capacity boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_status text;
  v_existing record;
  v_policy record;
  v_channel text;
  v_status text;
  v_res_id uuid;
  v_res_number text;
  v_start timestamptz;
  v_end timestamptz;
  v_party integer;
  v_table record;
  v_capacity_sum integer := 0;
  v_tid uuid;
begin
  if p_idempotency_key is null or length(trim(p_idempotency_key)) = 0 then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;
  if p_request_hash is null or length(trim(p_request_hash)) = 0 then
    raise exception 'IDEMPOTENCY_HASH_REQUIRED' using errcode = 'P0001';
  end if;

  select status into v_branch_status from public.branches where id = p_branch_id;
  if v_branch_status is null then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_branch_status = 'inactive' then
    raise exception 'BRANCH_INACTIVE' using errcode = 'P0001';
  end if;
  if v_branch_status <> 'operating' then
    raise exception 'BRANCH_NOT_OPERATIONAL' using errcode = 'P0001';
  end if;

  -- Idempotent replay / conflict
  select id, reservation_number, reservation_status, idempotency_request_hash
    into v_existing
  from public.reservations
  where idempotency_key = trim(p_idempotency_key)
  limit 1;
  if found then
    if v_existing.idempotency_request_hash is distinct from trim(p_request_hash) then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'id', v_existing.id,
      'reservationNumber', v_existing.reservation_number,
      'status', v_existing.reservation_status,
      'idempotentReplay', true
    );
  end if;

  v_channel := coalesce(nullif(p_reservation->>'booking_channel', ''), 'staff');
  select * into v_policy from public.branch_booking_policies where branch_id = p_branch_id;
  if found and not v_policy.booking_enabled
     and v_channel not in ('staff', 'admin', 'phone', 'walk_in') then
    raise exception 'BOOKING_DISABLED' using errcode = 'P0001';
  end if;
  if found and v_channel = 'website' and not v_policy.online_booking_enabled then
    raise exception 'ONLINE_BOOKING_DISABLED' using errcode = 'P0001';
  end if;

  v_start := (p_reservation->>'start_at')::timestamptz;
  v_end := (p_reservation->>'expected_end_at')::timestamptz;
  v_party := (p_reservation->>'party_size')::integer;
  if v_start is null or v_end is null or v_end <= v_start then
    raise exception 'RESERVATION_WINDOW_INVALID' using errcode = 'P0001';
  end if;
  if v_party is null or v_party <= 0 then
    raise exception 'RESERVATION_PARTY_SIZE_INVALID' using errcode = 'P0001';
  end if;
  if coalesce(nullif(trim(p_reservation->>'guest_name'), ''), '') = '' then
    raise exception 'RESERVATION_GUEST_NAME_REQUIRED' using errcode = 'P0001';
  end if;

  -- Blackout enforcement (branch-wide entries; floor/area handled by engine + here for branch scope)
  if exists (
    select 1 from public.service_blackouts b
    where b.branch_id = p_branch_id
      and b.floor_id is null and b.service_area_id is null
      and b.booking_allowed = false
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ) then
    raise exception 'RESERVATION_BLACKOUT' using errcode = 'P0001';
  end if;

  v_status := coalesce(nullif(p_reservation->>'reservation_status', ''), 'pending');
  if v_status not in ('inquiry', 'pending', 'confirmed') then
    raise exception 'RESERVATION_STATUS_INVALID' using errcode = 'P0001';
  end if;

  perform public.d3_force_fail('reservation');

  v_res_id := gen_random_uuid();
  v_res_number := public.next_reservation_number();

  begin
    insert into public.reservations (
      id, branch_id, reservation_number, customer_id, guest_name, guest_phone, guest_email,
      preferred_language, reservation_date, start_at, expected_end_at, party_size,
      adults, children, high_chair_count, accessibility_required,
      preferred_floor_id, preferred_area_id, reservation_status, booking_channel,
      special_requests, internal_notes, deposit_required, deposit_amount, deposit_status,
      confirmation_status, idempotency_key, idempotency_request_hash, created_by, updated_by
    ) values (
      v_res_id, p_branch_id, v_res_number,
      nullif(p_reservation->>'customer_id', '')::uuid,
      trim(p_reservation->>'guest_name'),
      nullif(p_reservation->>'guest_phone', ''),
      nullif(p_reservation->>'guest_email', ''),
      nullif(p_reservation->>'preferred_language', ''),
      coalesce(nullif(p_reservation->>'reservation_date', '')::date, (v_start at time zone 'utc')::date),
      v_start, v_end, v_party,
      nullif(p_reservation->>'adults', '')::integer,
      nullif(p_reservation->>'children', '')::integer,
      coalesce(nullif(p_reservation->>'high_chair_count', '')::integer, 0),
      coalesce((p_reservation->>'accessibility_required')::boolean, false),
      nullif(p_reservation->>'preferred_floor_id', '')::uuid,
      nullif(p_reservation->>'preferred_area_id', '')::uuid,
      v_status, v_channel,
      nullif(p_reservation->>'special_requests', ''),
      nullif(p_reservation->>'internal_notes', ''),
      coalesce((p_reservation->>'deposit_required')::boolean, false),
      nullif(p_reservation->>'deposit_amount', '')::numeric,
      case when coalesce((p_reservation->>'deposit_required')::boolean, false) then 'required' else 'none' end,
      'unconfirmed',
      trim(p_idempotency_key), trim(p_request_hash),
      p_actor_user_id, p_actor_user_id
    );
  exception
    when unique_violation then
      select id, reservation_number, reservation_status, idempotency_request_hash
        into v_existing
      from public.reservations
      where idempotency_key = trim(p_idempotency_key)
      limit 1;
      if found then
        if v_existing.idempotency_request_hash is distinct from trim(p_request_hash) then
          raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
        end if;
        return jsonb_build_object(
          'id', v_existing.id,
          'reservationNumber', v_existing.reservation_number,
          'status', v_existing.reservation_status,
          'idempotentReplay', true
        );
      end if;
      raise;
  end;

  -- Optional immediate table assignment (holds the window; exclusion prevents overlap)
  if p_table_ids is not null and array_length(p_table_ids, 1) > 0 then
    perform public.d3_force_fail('assignment');
    foreach v_tid in array p_table_ids loop
      select id, branch_id, is_active, operational_status,
             coalesce(capacity_max, capacity, capacity_min) as eff_capacity
        into v_table
      from public.restaurant_tables
      where id = v_tid
      for update;
      if not found then
        raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
      end if;
      if v_table.branch_id <> p_branch_id then
        raise exception 'TABLE_BRANCH_MISMATCH' using errcode = 'P0001';
      end if;
      if not v_table.is_active or v_table.operational_status in ('blocked', 'out_of_service') then
        raise exception 'TABLE_NOT_ASSIGNABLE' using errcode = 'P0001';
      end if;
      v_capacity_sum := v_capacity_sum + coalesce(v_table.eff_capacity, 0);
      begin
        insert into public.reservation_table_assignments (
          reservation_id, table_id, reserved_range, assigned_by
        ) values (
          v_res_id, v_tid, tstzrange(v_start, v_end, '[)'), p_actor_user_id
        );
      exception
        when exclusion_violation then
          raise exception 'RESERVATION_TABLE_CONFLICT' using errcode = 'P0001';
      end;
    end loop;
    if v_capacity_sum < v_party and not p_override_capacity then
      raise exception 'RESERVATION_CAPACITY_EXCEEDED' using errcode = 'P0001';
    end if;
    update public.reservations
    set assigned_table_id = p_table_ids[1]
    where id = v_res_id;
  end if;

  perform public.d3_force_fail('outbox');
  insert into public.reservation_communications (
    branch_id, reservation_id, message_type, channel, status, created_by
  ) values (
    p_branch_id, v_res_id, 'confirmation_requested', 'none', 'provider_unavailable', p_actor_user_id
  );

  perform public.d3_force_fail('audit');
  insert into public.table_service_audit (
    branch_id, actor_user_id, actor_type, resource_type, resource_id, action, after_data
  ) values (
    p_branch_id, p_actor_user_id, 'staff', 'reservation', v_res_id, 'reservation_created',
    jsonb_build_object(
      'reservationNumber', v_res_number, 'status', v_status, 'partySize', v_party,
      'startAt', v_start, 'expectedEndAt', v_end, 'channel', v_channel,
      'tableIds', to_jsonb(coalesce(p_table_ids, '{}'::uuid[]))
    )
  );

  return jsonb_build_object(
    'id', v_res_id,
    'reservationNumber', v_res_number,
    'status', v_status,
    'idempotentReplay', false,
    'tableIds', to_jsonb(coalesce(p_table_ids, '{}'::uuid[]))
  );
end;
$$;

revoke all on function public.create_reservation_atomic(text, text, uuid, jsonb, uuid[], uuid, boolean)
from public, anon, authenticated;
grant execute on function public.create_reservation_atomic(text, text, uuid, jsonb, uuid[], uuid, boolean)
to service_role;

-- -----------------------------------------------------------------------------
-- 19) Atomic seating (reservation / waitlist / walk-in → dining session)
-- -----------------------------------------------------------------------------

create or replace function public.seat_party_atomic(
  p_branch_id uuid,
  p_source text,
  p_reservation_id uuid,
  p_waitlist_id uuid,
  p_table_ids uuid[],
  p_party_size integer,
  p_guest_name text,
  p_server_user_id uuid,
  p_actor_user_id uuid,
  p_override_capacity boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_status text;
  v_table record;
  v_capacity_sum integer := 0;
  v_res record;
  v_wl record;
  v_session_id uuid;
  v_session_number text;
  v_tid uuid;
  v_guest text;
  v_party integer;
  v_customer_id uuid := null;
begin
  select status into v_branch_status from public.branches where id = p_branch_id;
  if v_branch_status is null then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_branch_status <> 'operating' then
    raise exception 'BRANCH_NOT_OPERATIONAL' using errcode = 'P0001';
  end if;

  if p_source not in ('reservation', 'waitlist', 'walk_in') then
    raise exception 'SEATING_SOURCE_INVALID' using errcode = 'P0001';
  end if;
  if p_table_ids is null or array_length(p_table_ids, 1) is null then
    raise exception 'SEATING_TABLES_REQUIRED' using errcode = 'P0001';
  end if;

  v_guest := nullif(trim(coalesce(p_guest_name, '')), '');
  v_party := p_party_size;

  if p_source = 'reservation' then
    if p_reservation_id is null then
      raise exception 'RESERVATION_ID_REQUIRED' using errcode = 'P0001';
    end if;
    select * into v_res from public.reservations where id = p_reservation_id for update;
    if not found then
      raise exception 'RESERVATION_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_res.branch_id <> p_branch_id then
      raise exception 'RESERVATION_BRANCH_MISMATCH' using errcode = 'P0001';
    end if;
    if v_res.reservation_status in ('seated', 'partially_seated', 'completed') then
      raise exception 'RESERVATION_ALREADY_SEATED' using errcode = 'P0001';
    end if;
    if v_res.reservation_status not in ('pending', 'confirmed', 'arrived') then
      raise exception 'RESERVATION_NOT_SEATABLE' using errcode = 'P0001';
    end if;
    v_guest := coalesce(v_guest, v_res.guest_name);
    v_party := coalesce(v_party, v_res.party_size);
    v_customer_id := v_res.customer_id;
  elsif p_source = 'waitlist' then
    if p_waitlist_id is null then
      raise exception 'WAITLIST_ID_REQUIRED' using errcode = 'P0001';
    end if;
    select * into v_wl from public.waitlist_entries where id = p_waitlist_id for update;
    if not found then
      raise exception 'WAITLIST_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_wl.branch_id <> p_branch_id then
      raise exception 'WAITLIST_BRANCH_MISMATCH' using errcode = 'P0001';
    end if;
    if v_wl.status = 'seated' then
      raise exception 'WAITLIST_ALREADY_SEATED' using errcode = 'P0001';
    end if;
    if v_wl.status not in ('waiting', 'notified', 'arrived') then
      raise exception 'WAITLIST_NOT_SEATABLE' using errcode = 'P0001';
    end if;
    v_guest := coalesce(v_guest, v_wl.guest_name);
    v_party := coalesce(v_party, v_wl.party_size);
    v_customer_id := v_wl.customer_id;
  end if;

  if v_party is null or v_party <= 0 then
    raise exception 'SEATING_PARTY_SIZE_INVALID' using errcode = 'P0001';
  end if;

  -- Lock and validate every table
  foreach v_tid in array p_table_ids loop
    select id, branch_id, is_active, operational_status,
           coalesce(capacity_max, capacity, capacity_min) as eff_capacity
      into v_table
    from public.restaurant_tables
    where id = v_tid
    for update;
    if not found then
      raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
    end if;
    if v_table.branch_id <> p_branch_id then
      raise exception 'TABLE_BRANCH_MISMATCH' using errcode = 'P0001';
    end if;
    if not v_table.is_active then
      raise exception 'TABLE_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    if v_table.operational_status not in ('available', 'reserved') then
      raise exception 'TABLE_NOT_AVAILABLE' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.dining_session_tables dst
      where dst.table_id = v_tid and dst.released_at is null
    ) then
      raise exception 'TABLE_ALREADY_OCCUPIED' using errcode = 'P0001';
    end if;
    v_capacity_sum := v_capacity_sum + coalesce(v_table.eff_capacity, 0);
  end loop;

  if v_capacity_sum < v_party and not p_override_capacity then
    raise exception 'SEATING_CAPACITY_EXCEEDED' using errcode = 'P0001';
  end if;

  -- Server must hold an active role in this branch (or be super-admin)
  if p_server_user_id is not null then
    if not exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p_server_user_id
        and (ur.branch_id = p_branch_id or r.code = 'super-admin')
    ) then
      raise exception 'SERVER_NOT_IN_BRANCH' using errcode = 'P0001';
    end if;
  end if;

  perform public.d3_force_fail('session');
  v_session_id := gen_random_uuid();
  v_session_number := public.next_dining_session_number();

  insert into public.dine_in_sessions (
    id, branch_id, restaurant_table_id, status, service_status, session_number,
    reservation_id, waitlist_id, customer_id, primary_server_user_id,
    party_size, guest_name, guest_count, opened_by_user_id, opened_at, seated_at,
    created_by, updated_by
  ) values (
    v_session_id, p_branch_id, p_table_ids[1], 'open', 'seated', v_session_number,
    p_reservation_id, p_waitlist_id,
    v_customer_id,
    p_server_user_id,
    v_party, v_guest, v_party, p_actor_user_id, timezone('utc', now()), timezone('utc', now()),
    p_actor_user_id, p_actor_user_id
  );

  perform public.d3_force_fail('session_table');
  foreach v_tid in array p_table_ids loop
    begin
      insert into public.dining_session_tables (
        dine_in_session_id, table_id, assignment_reason, assigned_by
      ) values (
        v_session_id, v_tid, 'initial_seating', p_actor_user_id
      );
    exception
      when unique_violation then
        raise exception 'TABLE_ALREADY_OCCUPIED' using errcode = 'P0001';
    end;
    update public.restaurant_tables
    set operational_status = 'occupied',
        status = public.d3_legacy_table_status('occupied'),
        updated_at = timezone('utc', now())
    where id = v_tid;
  end loop;

  if p_server_user_id is not null then
    perform public.d3_force_fail('server');
    insert into public.dining_session_servers (
      dine_in_session_id, user_id, role, assigned_by
    ) values (
      v_session_id, p_server_user_id, 'primary', p_actor_user_id
    );
  end if;

  if p_source = 'reservation' then
    update public.reservations
    set reservation_status = 'seated',
        arrived_at = coalesce(arrived_at, timezone('utc', now())),
        seated_at = timezone('utc', now()),
        updated_by = p_actor_user_id,
        updated_at = timezone('utc', now())
    where id = p_reservation_id;
    update public.reservation_table_assignments
    set released_at = timezone('utc', now()),
        release_reason = 'seated'
    where reservation_id = p_reservation_id and released_at is null;
  elsif p_source = 'waitlist' then
    update public.waitlist_entries
    set status = 'seated',
        seated_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = p_waitlist_id;
  end if;

  perform public.d3_force_fail('audit');
  insert into public.table_service_audit (
    branch_id, actor_user_id, actor_type, resource_type, resource_id, action, after_data
  ) values (
    p_branch_id, p_actor_user_id, 'staff', 'dining_session', v_session_id, 'party_seated',
    jsonb_build_object(
      'sessionNumber', v_session_number, 'source', p_source, 'partySize', v_party,
      'tableIds', to_jsonb(p_table_ids),
      'reservationId', p_reservation_id, 'waitlistId', p_waitlist_id,
      'serverUserId', p_server_user_id,
      'capacityOverride', p_override_capacity
    )
  );

  return jsonb_build_object(
    'id', v_session_id,
    'sessionNumber', v_session_number,
    'status', 'open',
    'serviceStatus', 'seated',
    'partySize', v_party,
    'tableIds', to_jsonb(p_table_ids)
  );
end;
$$;

revoke all on function public.seat_party_atomic(uuid, text, uuid, uuid, uuid[], integer, text, uuid, uuid, boolean)
from public, anon, authenticated;
grant execute on function public.seat_party_atomic(uuid, text, uuid, uuid, uuid[], integer, text, uuid, uuid, boolean)
to service_role;

-- -----------------------------------------------------------------------------
-- 20) Atomic table transfer / add / remove
-- -----------------------------------------------------------------------------

create or replace function public.transfer_session_tables_atomic(
  p_session_id uuid,
  p_add_table_ids uuid[],
  p_remove_table_ids uuid[],
  p_reason text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_table record;
  v_tid uuid;
  v_before uuid[];
  v_after uuid[];
  v_remaining integer;
begin
  select * into v_session from public.dine_in_sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.service_status in ('completed', 'cancelled', 'abandoned')
     or v_session.status in ('paid', 'closed', 'cancelled') then
    raise exception 'SESSION_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(table_id), '{}'::uuid[]) into v_before
  from public.dining_session_tables
  where dine_in_session_id = p_session_id and released_at is null;

  -- Validate removals belong to the session
  if p_remove_table_ids is not null then
    foreach v_tid in array p_remove_table_ids loop
      if not (v_tid = any (v_before)) then
        raise exception 'TABLE_NOT_IN_SESSION' using errcode = 'P0001';
      end if;
    end loop;
  end if;

  v_remaining := coalesce(array_length(v_before, 1), 0)
    - coalesce(array_length(p_remove_table_ids, 1), 0)
    + coalesce(array_length(p_add_table_ids, 1), 0);
  if v_remaining < 1 then
    raise exception 'SESSION_NEEDS_TABLE' using errcode = 'P0001';
  end if;

  perform public.d3_force_fail('transfer');

  -- Additions: lock + validate availability
  if p_add_table_ids is not null then
    foreach v_tid in array p_add_table_ids loop
      select id, branch_id, is_active, operational_status into v_table
      from public.restaurant_tables where id = v_tid for update;
      if not found then
        raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
      end if;
      if v_table.branch_id <> v_session.branch_id then
        raise exception 'TABLE_BRANCH_MISMATCH' using errcode = 'P0001';
      end if;
      if not v_table.is_active then
        raise exception 'TABLE_NOT_ACTIVE' using errcode = 'P0001';
      end if;
      if v_table.operational_status not in ('available', 'reserved') then
        raise exception 'TABLE_NOT_AVAILABLE' using errcode = 'P0001';
      end if;
      begin
        insert into public.dining_session_tables (
          dine_in_session_id, table_id, assignment_reason, assigned_by
        ) values (
          p_session_id, v_tid, coalesce(nullif(p_reason, ''), 'transfer'), p_actor_user_id
        );
      exception
        when unique_violation then
          raise exception 'TABLE_ALREADY_OCCUPIED' using errcode = 'P0001';
      end;
      update public.restaurant_tables
      set operational_status = 'occupied',
          status = public.d3_legacy_table_status('occupied'),
          updated_at = timezone('utc', now())
      where id = v_tid;
    end loop;
  end if;

  -- Removals: release + send to cleaning
  if p_remove_table_ids is not null then
    foreach v_tid in array p_remove_table_ids loop
      update public.dining_session_tables
      set released_at = timezone('utc', now()),
          assignment_reason = assignment_reason
      where dine_in_session_id = p_session_id and table_id = v_tid and released_at is null;
      update public.restaurant_tables
      set operational_status = 'cleaning',
          status = public.d3_legacy_table_status('cleaning'),
          updated_at = timezone('utc', now())
      where id = v_tid;
    end loop;
  end if;

  select coalesce(array_agg(table_id), '{}'::uuid[]) into v_after
  from public.dining_session_tables
  where dine_in_session_id = p_session_id and released_at is null;

  -- Keep the legacy primary-table pointer valid
  if not (v_session.restaurant_table_id = any (v_after)) then
    update public.dine_in_sessions
    set restaurant_table_id = v_after[1],
        updated_by = p_actor_user_id,
        updated_at = timezone('utc', now())
    where id = p_session_id;
  end if;

  insert into public.table_service_audit (
    branch_id, actor_user_id, actor_type, resource_type, resource_id, action, before_data, after_data, note
  ) values (
    v_session.branch_id, p_actor_user_id, 'staff', 'dining_session', p_session_id, 'tables_transferred',
    jsonb_build_object('tableIds', to_jsonb(v_before)),
    jsonb_build_object('tableIds', to_jsonb(v_after)),
    nullif(p_reason, '')
  );

  return jsonb_build_object(
    'id', p_session_id,
    'tableIds', to_jsonb(v_after)
  );
end;
$$;

revoke all on function public.transfer_session_tables_atomic(uuid, uuid[], uuid[], text, uuid)
from public, anon, authenticated;
grant execute on function public.transfer_session_tables_atomic(uuid, uuid[], uuid[], text, uuid)
to service_role;

-- -----------------------------------------------------------------------------
-- 21) Atomic session close (release tables → cleaning)
-- -----------------------------------------------------------------------------

create or replace function public.close_dining_session_atomic(
  p_session_id uuid,
  p_actor_user_id uuid,
  p_override boolean default false,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session record;
  v_tid uuid;
  v_tables uuid[];
begin
  select * into v_session from public.dine_in_sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.service_status in ('completed', 'cancelled', 'abandoned')
     or v_session.status in ('paid', 'closed', 'cancelled') then
    raise exception 'SESSION_ALREADY_CLOSED' using errcode = 'P0001';
  end if;

  -- Honest settlement gate: unsettled bills block close without an audited override.
  if exists (
    select 1 from public.restaurant_bills b
    where b.dine_in_session_id = p_session_id and b.status in ('open', 'billed')
  ) and not p_override then
    raise exception 'SESSION_BILL_OPEN' using errcode = 'P0001';
  end if;

  perform public.d3_force_fail('close');

  select coalesce(array_agg(table_id), '{}'::uuid[]) into v_tables
  from public.dining_session_tables
  where dine_in_session_id = p_session_id and released_at is null;

  update public.dining_session_tables
  set released_at = timezone('utc', now())
  where dine_in_session_id = p_session_id and released_at is null;

  if v_tables is not null then
    foreach v_tid in array v_tables loop
      update public.restaurant_tables
      set operational_status = 'cleaning',
          status = public.d3_legacy_table_status('cleaning'),
          updated_at = timezone('utc', now())
      where id = v_tid;
    end loop;
  end if;

  update public.dining_session_servers
  set released_at = timezone('utc', now())
  where dine_in_session_id = p_session_id and released_at is null;

  update public.dine_in_sessions
  set status = 'closed',
      service_status = 'completed',
      closed_at = timezone('utc', now()),
      updated_by = p_actor_user_id,
      updated_at = timezone('utc', now())
  where id = p_session_id;

  if v_session.reservation_id is not null then
    update public.reservations
    set reservation_status = 'completed',
        completed_at = timezone('utc', now()),
        updated_by = p_actor_user_id,
        updated_at = timezone('utc', now())
    where id = v_session.reservation_id and reservation_status = 'seated';
  end if;

  insert into public.table_service_audit (
    branch_id, actor_user_id, actor_type, resource_type, resource_id, action, before_data, after_data, note
  ) values (
    v_session.branch_id, p_actor_user_id, 'staff', 'dining_session', p_session_id, 'session_closed',
    jsonb_build_object('serviceStatus', v_session.service_status, 'tableIds', to_jsonb(v_tables)),
    jsonb_build_object('serviceStatus', 'completed', 'billOverride', p_override),
    nullif(p_note, '')
  );

  return jsonb_build_object(
    'id', p_session_id,
    'status', 'closed',
    'serviceStatus', 'completed',
    'releasedTableIds', to_jsonb(v_tables)
  );
end;
$$;

revoke all on function public.close_dining_session_atomic(uuid, uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.close_dining_session_atomic(uuid, uuid, boolean, text)
to service_role;

commit;
