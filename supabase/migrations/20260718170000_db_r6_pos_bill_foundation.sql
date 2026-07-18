-- =============================================================================
-- DB-R6: Minimum POS / Table Bill Foundation (Dine-in Only)
-- Forward-only. REQUIRES DB-R4 (dine_in_sessions) applied first.
-- Aligns with POS-BILLING-FOUNDATION.md with owner overrides this turn:
--   - Junction table name: bill_orders (alias of architecture restaurant_bill_orders)
--   - Status CHECK: open|billed|paid|voided (no refunded)
--   - Omit pos_sessions / payment_splits / payment_method complexity (minimal)
-- Does NOT: POS UI, kitchen UI, delivery/pickup bill flows, DB-R7.
--
-- Auto-link: Option B — backend service on dine-in order → confirmed
--   (idempotent attach to session open bill; create bill if none).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) restaurant_bills
-- ---------------------------------------------------------------------------

create table if not exists public.restaurant_bills (
  id uuid primary key default gen_random_uuid(),
  dine_in_session_id uuid not null
    references public.dine_in_sessions (id) on delete restrict,
  branch_id uuid not null
    references public.branches (id) on delete restrict,
  bill_number text not null,
  status text not null default 'open' check (
    status in ('open', 'billed', 'paid', 'voided')
  ),
  subtotal numeric(10, 2) not null default 0,
  tax_amount numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  opened_by_user_id uuid references public.users (id) on delete set null,
  closed_by_user_id uuid references public.users (id) on delete set null,
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_restaurant_bills_branch_bill_number unique (branch_id, bill_number),
  constraint chk_restaurant_bills_money_nonneg check (
    subtotal >= 0
    and tax_amount >= 0
    and discount_amount >= 0
    and grand_total >= 0
  )
);

create index if not exists idx_restaurant_bills_session_id
  on public.restaurant_bills (dine_in_session_id);

create index if not exists idx_restaurant_bills_branch_id
  on public.restaurant_bills (branch_id);

create index if not exists idx_restaurant_bills_branch_status
  on public.restaurant_bills (branch_id, status);

-- At most one open bill per dine-in session (auto-link target).
create unique index if not exists uq_restaurant_bills_one_open_per_session
  on public.restaurant_bills (dine_in_session_id)
  where status = 'open';

drop trigger if exists set_restaurant_bills_updated_at on public.restaurant_bills;
create trigger set_restaurant_bills_updated_at
before update on public.restaurant_bills
for each row execute function public.set_updated_at();

comment on table public.restaurant_bills is
  'Dine-in table bills (POS check header). Delivery/pickup unused.';
comment on column public.restaurant_bills.bill_number is
  'Unique per branch. Format e.g. RO-YYYYMMDD-#### (branch prefix + UTC date + seq).';
comment on column public.restaurant_bills.status is
  'open | billed | paid | voided. Owner this turn: no refunded.';

-- ---------------------------------------------------------------------------
-- 2) bill_orders (architecture alias: restaurant_bill_orders)
-- ---------------------------------------------------------------------------

create table if not exists public.bill_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_bill_id uuid not null
    references public.restaurant_bills (id) on delete cascade,
  order_id uuid not null unique
    references public.orders (id) on delete restrict,
  added_at timestamptz not null default timezone('utc', now()),
  constraint uq_bill_orders_bill_order unique (restaurant_bill_id, order_id)
);

create index if not exists idx_bill_orders_bill_id
  on public.bill_orders (restaurant_bill_id);

comment on table public.bill_orders is
  'Bill↔order membership. Owner name bill_orders; architecture alias restaurant_bill_orders.';
comment on column public.bill_orders.order_id is
  'UNIQUE: an order belongs to at most one bill.';

-- ---------------------------------------------------------------------------
-- 3) Branch match: restaurant_bills.branch_id = dine_in_sessions.branch_id
-- ---------------------------------------------------------------------------

create or replace function public.enforce_restaurant_bill_branch_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_branch_id uuid;
begin
  select s.branch_id into session_branch_id
  from public.dine_in_sessions s
  where s.id = new.dine_in_session_id;

  if session_branch_id is null then
    raise exception 'dine_in_session_id % not found', new.dine_in_session_id
      using errcode = '23503';
  end if;

  if new.branch_id is distinct from session_branch_id then
    raise exception 'restaurant_bills.branch_id must match dine_in_sessions.branch_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restaurant_bills_branch_match on public.restaurant_bills;
create trigger trg_restaurant_bills_branch_match
before insert or update of branch_id, dine_in_session_id
on public.restaurant_bills
for each row execute function public.enforce_restaurant_bill_branch_match();

revoke all on function public.enforce_restaurant_bill_branch_match() from public, anon;
grant execute on function public.enforce_restaurant_bill_branch_match() to service_role;

-- ---------------------------------------------------------------------------
-- 4) Immutability: paid/voided bills cannot be updated
-- ---------------------------------------------------------------------------

create or replace function public.enforce_restaurant_bill_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status in ('paid', 'voided') then
    raise exception 'restaurant_bills in status % are immutable', old.status
      using errcode = '23514';
  end if;

  -- Allowed transitions: open → billed|paid|voided; billed → paid|voided
  if new.status is distinct from old.status then
    if not (
      (old.status = 'open' and new.status in ('billed', 'paid', 'voided'))
      or (old.status = 'billed' and new.status in ('paid', 'voided'))
    ) then
      raise exception 'invalid restaurant_bills status transition % → %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_restaurant_bills_immutability on public.restaurant_bills;
create trigger trg_restaurant_bills_immutability
before update on public.restaurant_bills
for each row execute function public.enforce_restaurant_bill_immutability();

revoke all on function public.enforce_restaurant_bill_immutability() from public, anon;
grant execute on function public.enforce_restaurant_bill_immutability() to service_role;

-- ---------------------------------------------------------------------------
-- 5) bill_orders: only open/billed bills accept new order links
-- ---------------------------------------------------------------------------

create or replace function public.enforce_bill_orders_bill_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bill_status text;
begin
  select b.status into bill_status
  from public.restaurant_bills b
  where b.id = new.restaurant_bill_id;

  if bill_status is null then
    raise exception 'restaurant_bill_id % not found', new.restaurant_bill_id
      using errcode = '23503';
  end if;

  if bill_status not in ('open', 'billed') then
    raise exception 'cannot add orders to restaurant_bills in status %', bill_status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bill_orders_bill_open on public.bill_orders;
create trigger trg_bill_orders_bill_open
before insert on public.bill_orders
for each row execute function public.enforce_bill_orders_bill_open();

revoke all on function public.enforce_bill_orders_bill_open() from public, anon;
grant execute on function public.enforce_bill_orders_bill_open() to service_role;

-- ---------------------------------------------------------------------------
-- 6) Bill number helper (RO-YYYYMMDD-#### style; branch-aware prefix)
-- ---------------------------------------------------------------------------

create or replace function public.next_restaurant_bill_number(p_branch_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_prefix text;
  v_day text;
  v_seq integer;
begin
  select b.branch_code into v_code
  from public.branches b
  where b.id = p_branch_id;

  if v_code is null then
    raise exception 'branch_id % not found', p_branch_id
      using errcode = '23503';
  end if;

  -- royal-orchard → RO; northern-bypass → NB; fallback first 2 alnum uppercased
  select upper(string_agg(left(part, 1), '' order by ordinality))
  into v_prefix
  from unnest(string_to_array(v_code, '-')) with ordinality as t(part, ordinality);

  if v_prefix is null or length(v_prefix) < 2 then
    v_prefix := upper(left(regexp_replace(v_code, '[^a-zA-Z0-9]', '', 'g'), 2));
  end if;

  v_day := to_char(timezone('utc', now()), 'YYYYMMDD');

  select coalesce(max(
    nullif(substring(rb.bill_number from '[0-9]{4}$'), '')::integer
  ), 0) + 1
  into v_seq
  from public.restaurant_bills rb
  where rb.branch_id = p_branch_id
    and rb.bill_number like (v_prefix || '-' || v_day || '-%');

  return v_prefix || '-' || v_day || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.next_restaurant_bill_number(uuid) from public, anon;
grant execute on function public.next_restaurant_bill_number(uuid) to service_role;

comment on function public.next_restaurant_bill_number(uuid) is
  'Allocates next bill_number for a branch (PREFIX-YYYYMMDD-####). service_role only.';

-- ---------------------------------------------------------------------------
-- 7) RLS helper — cashier / branch-manager / super-admin
-- ---------------------------------------------------------------------------

create or replace function public.current_user_can_access_restaurant_bills(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Super-admin: full. Cashier + branch-manager: own branch only.
  -- Kitchen, rider, customer-support, customer, anon: denied.
  select
    p_branch_id is not null
    and public.current_user_is_active()
    and (
      public.current_user_is_super_admin()
      or exists (
        select 1
        from public.users u
        join public.user_roles ur on ur.user_id = u.id
        join public.roles r on r.id = ur.role_id
        where u.auth_user_id = auth.uid()
          and u.status = 'active'
          and u.user_type <> 'customer'
          and r.code in ('cashier', 'branch-manager')
          and ur.branch_id = p_branch_id
      )
    );
$$;

revoke all on function public.current_user_can_access_restaurant_bills(uuid) from public, anon;
grant execute on function public.current_user_can_access_restaurant_bills(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) RLS policies
-- ---------------------------------------------------------------------------

alter table public.restaurant_bills enable row level security;
alter table public.bill_orders enable row level security;

drop policy if exists "POS select branch restaurant bills" on public.restaurant_bills;
create policy "POS select branch restaurant bills"
on public.restaurant_bills
for select
to authenticated
using (
  public.current_user_can_access_restaurant_bills(branch_id)
);

drop policy if exists "POS update branch restaurant bills" on public.restaurant_bills;
create policy "POS update branch restaurant bills"
on public.restaurant_bills
for update
to authenticated
using (
  public.current_user_can_access_restaurant_bills(branch_id)
)
with check (
  public.current_user_can_access_restaurant_bills(branch_id)
);

-- No authenticated INSERT/DELETE — API uses service_role for create/link.
-- No anon policies. Kitchen/rider/customer blocked by helper.

drop policy if exists "POS select branch bill orders" on public.bill_orders;
create policy "POS select branch bill orders"
on public.bill_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.restaurant_bills b
    where b.id = bill_orders.restaurant_bill_id
      and public.current_user_can_access_restaurant_bills(b.branch_id)
  )
);

-- bill_orders mutations are service_role only (auto-link + close orchestration).

-- ---------------------------------------------------------------------------
-- 9) Grants (post-R0): no anon; authenticated SELECT/UPDATE; service_role DML
-- ---------------------------------------------------------------------------

revoke all on table public.restaurant_bills from anon, authenticated;
revoke all on table public.bill_orders from anon, authenticated;

grant select, update on table public.restaurant_bills to authenticated;
grant select on table public.bill_orders to authenticated;

grant select, insert, update, delete on table public.restaurant_bills to service_role;
grant select, insert, update, delete on table public.bill_orders to service_role;

commit;
