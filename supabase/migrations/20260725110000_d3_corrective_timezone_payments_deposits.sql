-- =============================================================================
-- D3 Corrective Pass — timezone, payment settlement, bill splits, deposits,
-- public booking tokens, notification worker foundations.
--
-- Depends on:
--   20260725100000_d3_floor_dinein_reservations.sql
--   20260725101000_d3_pos_dinein_order_link.sql
--   20260718170000_db_r6_pos_bill_foundation.sql
--
-- Additive / rollback-aware. Does NOT invent production seed data.
-- Does NOT activate northern-bypass.
-- =============================================================================

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Per-branch IANA timezone
-- -----------------------------------------------------------------------------

alter table public.branches
  add column if not exists timezone text;

update public.branches
set timezone = 'Asia/Karachi'
where timezone is null or btrim(timezone) = '';

alter table public.branches
  alter column timezone set default 'Asia/Karachi';

alter table public.branches
  alter column timezone set not null;

-- Reject obviously empty/invalid shapes. Full IANA validation lives in the API
-- (Node Intl / Temporal). Postgres cannot cheaply enumerate all IANA zones.
alter table public.branches drop constraint if exists chk_branches_timezone_shape;
alter table public.branches
  add constraint chk_branches_timezone_shape check (
    timezone ~ '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)+$'
    or timezone in ('UTC', 'Etc/UTC')
  );

comment on column public.branches.timezone is
  'IANA timezone identifier for branch-local business date, hours, availability, and reports.';

create or replace function public.branch_local_date(p_branch_id uuid, p_at timestamptz default timezone('utc', now()))
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
begin
  select timezone into v_tz from public.branches where id = p_branch_id;
  if v_tz is null then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0001';
  end if;
  return (p_at at time zone v_tz)::date;
end;
$$;

revoke all on function public.branch_local_date(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.branch_local_date(uuid, timestamptz) to service_role, authenticated;

create or replace function public.branch_wall_to_utc(
  p_branch_id uuid,
  p_local_date date,
  p_local_time time
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz text;
  v_ts timestamptz;
begin
  select timezone into v_tz from public.branches where id = p_branch_id;
  if v_tz is null then
    raise exception 'BRANCH_NOT_FOUND' using errcode = 'P0001';
  end if;
  -- Interpret (date || time) as wall-clock in the branch TZ, return UTC timestamptz.
  v_ts := (p_local_date::text || ' ' || p_local_time::text)::timestamp at time zone v_tz;
  return v_ts;
end;
$$;

revoke all on function public.branch_wall_to_utc(uuid, date, time) from public, anon, authenticated;
grant execute on function public.branch_wall_to_utc(uuid, date, time) to service_role;

-- -----------------------------------------------------------------------------
-- 2) Payments extension — settlement-ready ledger
-- -----------------------------------------------------------------------------

-- Allow bill-level settlements (order_id optional when restaurant_bill_id present).
alter table public.payments alter column order_id drop not null;

alter table public.payments
  add column if not exists branch_id uuid references public.branches (id) on delete restrict,
  add column if not exists dining_session_id uuid references public.dine_in_sessions (id) on delete set null,
  add column if not exists restaurant_bill_id uuid references public.restaurant_bills (id) on delete set null,
  add column if not exists received_by uuid references public.users (id) on delete set null,
  add column if not exists terminal_device_ref text,
  add column if not exists idempotency_key text,
  add column if not exists completed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists refunded_at timestamptz,
  add column if not exists voided_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists cash_tendered numeric(12, 2),
  add column if not exists cash_change numeric(12, 2),
  add column if not exists audit_metadata jsonb not null default '{}'::jsonb;

-- Expand status vocabulary (keep legacy 'paid' as synonym of completed).
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments drop constraint if exists chk_payments_status;
do $$
begin
  alter table public.payments
    add constraint chk_payments_status check (status in (
      'pending', 'authorized', 'completed', 'paid', 'failed',
      'voided', 'partially_refunded', 'refunded'
    ));
exception when duplicate_object then null;
end $$;

alter table public.payments drop constraint if exists chk_payments_order_or_bill;
alter table public.payments
  add constraint chk_payments_order_or_bill check (
    order_id is not null or restaurant_bill_id is not null
  );

alter table public.payments drop constraint if exists chk_payments_cash_change;
alter table public.payments
  add constraint chk_payments_cash_change check (
    (cash_tendered is null and cash_change is null)
    or (cash_tendered is not null and cash_change is not null and cash_tendered >= 0 and cash_change >= 0)
  );

create unique index if not exists uq_payments_idempotency_branch
  on public.payments (branch_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_payments_branch_status
  on public.payments (branch_id, status);

create index if not exists idx_payments_session
  on public.payments (dining_session_id)
  where dining_session_id is not null;

create index if not exists idx_payments_bill
  on public.payments (restaurant_bill_id)
  where restaurant_bill_id is not null;

comment on table public.payments is
  'Operational payment ledger. Opening methods: cash, card_terminal, bank_manual, complimentary. No online card gateway claimed.';

-- -----------------------------------------------------------------------------
-- 3) Bill split allocations
-- -----------------------------------------------------------------------------

create table if not exists public.bill_splits (
  id uuid primary key default gen_random_uuid(),
  restaurant_bill_id uuid not null references public.restaurant_bills (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete restrict,
  strategy text not null check (strategy in ('equal', 'by_item', 'by_quantity', 'by_amount')),
  party_count integer not null check (party_count >= 1),
  currency text not null default 'PKR',
  original_total numeric(12, 2) not null check (original_total >= 0),
  allocation_sum numeric(12, 2) not null check (allocation_sum >= 0),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint chk_bill_splits_reconcile check (allocation_sum = original_total)
);

create table if not exists public.bill_split_allocations (
  id uuid primary key default gen_random_uuid(),
  bill_split_id uuid not null references public.bill_splits (id) on delete cascade,
  allocation_index integer not null check (allocation_index >= 0),
  label text,
  amount numeric(12, 2) not null check (amount >= 0),
  remaining_amount numeric(12, 2) not null check (remaining_amount >= 0),
  order_item_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bill_split_id, allocation_index)
);

create index if not exists idx_bill_splits_bill on public.bill_splits (restaurant_bill_id);
create index if not exists idx_bill_split_alloc_split on public.bill_split_allocations (bill_split_id);

alter table public.bill_splits enable row level security;
alter table public.bill_split_allocations enable row level security;

drop policy if exists "Staff select branch bill splits" on public.bill_splits;
create policy "Staff select branch bill splits" on public.bill_splits
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select bill split allocations" on public.bill_split_allocations;
create policy "Staff select bill split allocations" on public.bill_split_allocations
  for select to authenticated
  using (exists (
    select 1 from public.bill_splits s
    where s.id = bill_split_id and public.current_user_has_branch_access(s.branch_id)
  ));

revoke all on public.bill_splits from public, anon, authenticated;
revoke all on public.bill_split_allocations from public, anon, authenticated;
grant select on public.bill_splits, public.bill_split_allocations to authenticated;
grant all on public.bill_splits, public.bill_split_allocations to service_role;

-- -----------------------------------------------------------------------------
-- 4) Deposit lifecycle (working, not schema-only)
-- -----------------------------------------------------------------------------

-- Expand reservation deposit_status vocabulary.
alter table public.reservations drop constraint if exists chk_reservations_deposit_status;
alter table public.reservations
  add constraint chk_reservations_deposit_status check (deposit_status in (
    'none', 'not_required', 'required', 'pending', 'paid', 'partially_paid',
    'failed', 'refunded', 'forfeited', 'waived'
  ));

create table if not exists public.reservation_deposits (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  status text not null default 'pending' check (status in (
    'pending', 'paid', 'partially_paid', 'failed', 'refunded', 'forfeited', 'waived'
  )),
  method text not null check (method in (
    'cash', 'card_terminal', 'bank_manual', 'provider', 'waiver'
  )),
  external_reference text,
  payment_id uuid references public.payments (id) on delete set null,
  applied_to_bill_id uuid references public.restaurant_bills (id) on delete set null,
  applied_at timestamptz,
  waived_reason text,
  forfeited_reason text,
  refund_reason text,
  received_by uuid references public.users (id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  forfeited_at timestamptz,
  waived_at timestamptz
);

create unique index if not exists uq_reservation_deposits_idem
  on public.reservation_deposits (branch_id, idempotency_key)
  where idempotency_key is not null;

-- A deposit credit may apply to a bill at most once.
create unique index if not exists uq_reservation_deposits_applied_once
  on public.reservation_deposits (reservation_id)
  where applied_to_bill_id is not null;

create index if not exists idx_reservation_deposits_res
  on public.reservation_deposits (reservation_id);

alter table public.reservation_deposits enable row level security;
drop policy if exists "Staff select branch reservation deposits" on public.reservation_deposits;
create policy "Staff select branch reservation deposits" on public.reservation_deposits
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.reservation_deposits from public, anon, authenticated;
grant select on public.reservation_deposits to authenticated;
grant all on public.reservation_deposits to service_role;

drop trigger if exists set_reservation_deposits_updated_at on public.reservation_deposits;
create trigger set_reservation_deposits_updated_at
before update on public.reservation_deposits
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5) Public booking cancellation tokens
-- -----------------------------------------------------------------------------

alter table public.reservations
  add column if not exists cancellation_token_hash text,
  add column if not exists cancellation_token_expires_at timestamptz,
  add column if not exists cancellation_token_revoked_at timestamptz,
  add column if not exists privacy_accepted_at timestamptz,
  add column if not exists public_guest_locale text;

create index if not exists idx_reservations_cancel_hash
  on public.reservations (cancellation_token_hash)
  where cancellation_token_hash is not null and cancellation_token_revoked_at is null;

-- -----------------------------------------------------------------------------
-- 6) Notification outbox worker columns
-- -----------------------------------------------------------------------------

alter table public.reservation_communications
  add column if not exists retry_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists provider_code text,
  add column if not exists provider_message_id text,
  add column if not exists idempotency_key text,
  add column if not exists template_code text,
  add column if not exists recipient_masked text,
  add column if not exists payload jsonb not null default '{}'::jsonb;

-- Expand status for worker terminals.
alter table public.reservation_communications drop constraint if exists reservation_communications_status_check;
alter table public.reservation_communications drop constraint if exists chk_reservation_communications_status;
do $$
begin
  alter table public.reservation_communications
    add constraint chk_reservation_communications_status check (status in (
      'pending', 'queued', 'sending', 'sent', 'failed', 'skipped',
      'provider_unavailable', 'dead_letter'
    ));
exception when duplicate_object then null;
end $$;

create unique index if not exists uq_reservation_communications_idem
  on public.reservation_communications (idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_reservation_communications_worker
  on public.reservation_communications (status, next_attempt_at)
  where status in ('pending', 'queued', 'failed');

-- Branch sender configuration (provider-independent).
create table if not exists public.branch_notification_settings (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  email_enabled boolean not null default false,
  email_from_address text,
  email_from_name text,
  email_reply_to text,
  whatsapp_enabled boolean not null default false,
  provider_mode text not null default 'disabled'
    check (provider_mode in ('disabled', 'mock', 'sandbox', 'live', 'dev_smtp')),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id) on delete set null
);

alter table public.branch_notification_settings enable row level security;
drop policy if exists "Staff select branch notification settings" on public.branch_notification_settings;
create policy "Staff select branch notification settings" on public.branch_notification_settings
  for select to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.branch_notification_settings from public, anon, authenticated;
grant select on public.branch_notification_settings to authenticated;
grant all on public.branch_notification_settings to service_role;

-- -----------------------------------------------------------------------------
-- 7) Permissions for settlement / deposits / public booking admin
-- -----------------------------------------------------------------------------

insert into public.permissions (module, action, code, description)
values
  ('payment', 'settle', 'payment.settle', 'Record and settle dine-in / POS payments'),
  ('payment', 'void', 'payment.void', 'Void or refund operational payments'),
  ('payment', 'override_close', 'payment.override_close', 'Close dining session with unpaid bill (audited emergency)'),
  ('deposit', 'manage', 'deposit.manage', 'Collect, waive, forfeit, or refund reservation deposits')
on conflict (code) do nothing;

-- Grant settlement to cashier, branch-manager, admin, super-admin, waiter (settle only).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code in ('payment.settle')
  and r.code in ('super-admin', 'admin', 'branch-manager', 'cashier', 'waiter')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code in ('payment.void', 'payment.override_close', 'deposit.manage')
  and r.code in ('super-admin', 'admin', 'branch-manager')
on conflict do nothing;

-- Hosts can manage deposits (front-desk).
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'deposit.manage' and r.code = 'host'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- 8) Atomic payment settlement RPC
-- -----------------------------------------------------------------------------

create or replace function public.d3c_force_fail(p_stage text)
returns void
language plpgsql
as $$
begin
  if current_setting('telepizza.d3_test_mode', true) = 'on'
     and current_setting('telepizza.d3_force_fail', true) = p_stage then
    raise exception 'D3C_FORCED_FAILURE:%', p_stage using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.settle_bill_payment_atomic(
  p_idempotency_key text,
  p_branch_id uuid,
  p_restaurant_bill_id uuid,
  p_amount numeric,
  p_method text,
  p_actor_user_id uuid,
  p_cash_tendered numeric default null,
  p_external_reference text default null,
  p_terminal_device_ref text default null,
  p_note text default null,
  p_currency text default 'PKR'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bill record;
  v_paid numeric := 0;
  v_remaining numeric;
  v_change numeric := 0;
  v_payment_id uuid;
  v_status text := 'completed';
  v_existing record;
  v_session_id uuid;
  v_order_id uuid;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED' using errcode = 'P0001';
  end if;
  if p_method not in ('cash', 'card_terminal', 'bank_manual', 'complimentary') then
    raise exception 'PAYMENT_METHOD_INVALID' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'PAYMENT_AMOUNT_INVALID' using errcode = 'P0001';
  end if;

  -- Idempotent replay
  select * into v_existing
  from public.payments
  where branch_id = p_branch_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object(
      'id', v_existing.id,
      'status', v_existing.status,
      'amount', v_existing.amount,
      'idempotentReplay', true,
      'restaurantBillId', v_existing.restaurant_bill_id
    );
  end if;

  select * into v_bill from public.restaurant_bills where id = p_restaurant_bill_id for update;
  if not found then
    raise exception 'BILL_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_bill.branch_id <> p_branch_id then
    raise exception 'BILL_BRANCH_MISMATCH' using errcode = 'P0001';
  end if;
  if v_bill.status in ('paid', 'voided') then
    raise exception 'BILL_NOT_SETTLEABLE' using errcode = 'P0001';
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where restaurant_bill_id = p_restaurant_bill_id
    and status in ('completed', 'paid');

  v_remaining := v_bill.grand_total - v_paid;
  if v_remaining < 0 then
    v_remaining := 0;
  end if;

  if p_method = 'complimentary' then
    -- Complimentary may cover remaining in full; amount must match remaining.
    if p_amount <> v_remaining then
      raise exception 'COMPLIMENTARY_AMOUNT_MISMATCH' using errcode = 'P0001';
    end if;
  elsif p_amount > v_remaining then
    -- Overpayment only allowed for cash with explicit tendered/change.
    if p_method <> 'cash' then
      raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode = 'P0001';
    end if;
  end if;

  if p_method = 'cash' then
    if p_cash_tendered is null then
      p_cash_tendered := p_amount;
    end if;
    if p_cash_tendered < p_amount then
      raise exception 'CASH_TENDERED_INSUFFICIENT' using errcode = 'P0001';
    end if;
    v_change := p_cash_tendered - p_amount;
    -- Applied amount cannot exceed remaining for reconciliation.
    if p_amount > v_remaining then
      raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode = 'P0001';
    end if;
  end if;

  -- Attach an order if the bill has exactly one (optional).
  select bo.order_id into v_order_id
  from public.bill_orders bo
  where bo.restaurant_bill_id = p_restaurant_bill_id
  order by bo.added_at
  limit 1;

  v_session_id := v_bill.dine_in_session_id;

  perform public.d3c_force_fail('payment_insert');

  insert into public.payments (
    order_id, branch_id, dining_session_id, restaurant_bill_id,
    payment_method, amount, currency, status,
    received_by, terminal_device_ref, idempotency_key,
    transaction_reference, cash_tendered, cash_change,
    completed_at, audit_metadata, paid_at
  ) values (
    v_order_id, p_branch_id, v_session_id, p_restaurant_bill_id,
    p_method, p_amount, coalesce(nullif(p_currency, ''), 'PKR'), v_status,
    p_actor_user_id, p_terminal_device_ref, p_idempotency_key,
    p_external_reference, p_cash_tendered, case when p_method = 'cash' then v_change else null end,
    timezone('utc', now()),
    jsonb_build_object('note', p_note, 'method', p_method),
    timezone('utc', now())
  )
  returning id into v_payment_id;

  perform public.d3c_force_fail('payment_audit');

  insert into public.table_service_audit (
    branch_id, actor_user_id, actor_type, resource_type, resource_id, action, after_data, note
  ) values (
    p_branch_id, p_actor_user_id, 'staff', 'payment', v_payment_id, 'payment_settled',
    jsonb_build_object(
      'billId', p_restaurant_bill_id, 'amount', p_amount, 'method', p_method,
      'remainingBefore', v_remaining, 'change', v_change
    ),
    nullif(p_note, '')
  );

  -- Recalc remaining; mark bill paid when fully settled.
  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where restaurant_bill_id = p_restaurant_bill_id
    and status in ('completed', 'paid');

  if v_paid >= v_bill.grand_total then
    update public.restaurant_bills
    set status = 'paid',
        closed_by_user_id = p_actor_user_id,
        closed_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    where id = p_restaurant_bill_id;

    update public.dine_in_sessions
    set service_status = 'payment_pending',
        updated_at = timezone('utc', now())
    where id = v_session_id
      and service_status in ('bill_requested', 'dining', 'ordering', 'seated');
  else
    update public.restaurant_bills
    set status = 'billed',
        updated_at = timezone('utc', now())
    where id = p_restaurant_bill_id and status = 'open';
  end if;

  return jsonb_build_object(
    'id', v_payment_id,
    'status', v_status,
    'amount', p_amount,
    'cashChange', v_change,
    'billStatus', (select status from public.restaurant_bills where id = p_restaurant_bill_id),
    'remainingBalance', greatest(v_bill.grand_total - v_paid, 0),
    'idempotentReplay', false
  );
end;
$$;

revoke all on function public.settle_bill_payment_atomic(text, uuid, uuid, numeric, text, uuid, numeric, text, text, text, text)
from public, anon, authenticated;
grant execute on function public.settle_bill_payment_atomic(text, uuid, uuid, numeric, text, uuid, numeric, text, text, text, text)
to service_role;

-- -----------------------------------------------------------------------------
-- 9) Tighten session close: unpaid balance blocks unless audited override
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
  v_open_bill record;
  v_paid numeric;
  v_balance numeric;
begin
  select * into v_session from public.dine_in_sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_session.service_status in ('completed', 'cancelled', 'abandoned')
     or v_session.status in ('paid', 'closed', 'cancelled') then
    raise exception 'SESSION_ALREADY_CLOSED' using errcode = 'P0001';
  end if;

  -- Settlement gate: any open/billed bill with remaining balance blocks close
  -- unless an audited manager override is supplied with a reason.
  for v_open_bill in
    select * from public.restaurant_bills
    where dine_in_session_id = p_session_id and status in ('open', 'billed')
    for update
  loop
    select coalesce(sum(amount), 0) into v_paid
    from public.payments
    where restaurant_bill_id = v_open_bill.id
      and status in ('completed', 'paid');
    v_balance := v_open_bill.grand_total - v_paid;
    if v_balance > 0 then
      if not p_override then
        raise exception 'SESSION_UNPAID_BALANCE' using errcode = 'P0001';
      end if;
      if nullif(btrim(coalesce(p_note, '')), '') is null then
        raise exception 'UNPAID_OVERRIDE_REASON_REQUIRED' using errcode = 'P0001';
      end if;
    end if;
  end loop;

  -- Also block legacy open bills with zero lines still marked open when override absent
  -- (grand_total 0 is fine to close).
  if exists (
    select 1 from public.restaurant_bills b
    where b.dine_in_session_id = p_session_id and b.status in ('open', 'billed') and b.grand_total > 0
      and not exists (
        select 1 from public.payments p
        where p.restaurant_bill_id = b.id and p.status in ('completed', 'paid')
        having coalesce(sum(p.amount), 0) >= b.grand_total
      )
  ) and not p_override then
    raise exception 'SESSION_UNPAID_BALANCE' using errcode = 'P0001';
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
    'serviceStatus', 'completed',
    'releasedTableIds', to_jsonb(coalesce(v_tables, '{}'::uuid[])),
    'billOverride', p_override
  );
end;
$$;

revoke all on function public.close_dining_session_atomic(uuid, uuid, boolean, text)
from public, anon, authenticated;
grant execute on function public.close_dining_session_atomic(uuid, uuid, boolean, text)
to service_role;

-- -----------------------------------------------------------------------------
-- 10) Deterministic equal split helper (used by API; also callable in tests)
-- -----------------------------------------------------------------------------

create or replace function public.split_amount_equal(p_total numeric, p_parts integer)
returns numeric[]
language plpgsql
immutable
as $$
declare
  v_base numeric(12, 2);
  v_remainder integer;
  v_result numeric[];
  i integer;
begin
  if p_parts is null or p_parts < 1 then
    raise exception 'SPLIT_PARTS_INVALID' using errcode = 'P0001';
  end if;
  if p_total is null or p_total < 0 then
    raise exception 'SPLIT_TOTAL_INVALID' using errcode = 'P0001';
  end if;
  -- Work in cents to avoid float drift.
  v_base := trunc((p_total * 100) / p_parts) / 100.0;
  v_remainder := ((p_total * 100)::integer) - ((v_base * 100)::integer * p_parts);
  v_result := '{}'::numeric[];
  for i in 1..p_parts loop
    if i <= v_remainder then
      v_result := array_append(v_result, v_base + 0.01);
    else
      v_result := array_append(v_result, v_base);
    end if;
  end loop;
  return v_result;
end;
$$;

revoke all on function public.split_amount_equal(numeric, integer) from public, anon, authenticated;
grant execute on function public.split_amount_equal(numeric, integer) to service_role;

commit;
