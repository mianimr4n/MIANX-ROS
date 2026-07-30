-- REQ-ADM-160: Loyalty points foundation.
-- Note: 20260730210000 is reserved for pos_z_report_events — this uses 20260730240000.

begin;

insert into public.permissions (module, action, code, description)
values
  ('loyalty', 'manage', 'loyalty.manage', 'Manage loyalty accounts, earn points, and view balances.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'loyalty.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

create table if not exists public.loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  points_balance integer not null default 0 check (points_balance >= 0),
  tier text not null default 'member' check (tier in ('member', 'silver', 'gold', 'platinum')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (customer_id)
);

comment on table public.loyalty_accounts is
  'REQ-ADM-160 loyalty ledger header. Earn rate: 1 point per 100 PKR on completed orders.';

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid not null references public.loyalty_accounts (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  points integer not null check (points <> 0),
  type text not null check (type in ('earn', 'burn', 'adjust', 'expire')),
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

-- One earn per order (idempotent).
create unique index if not exists loyalty_transactions_earn_order_uidx
  on public.loyalty_transactions (order_id)
  where type = 'earn' and order_id is not null;

create index if not exists idx_loyalty_accounts_customer on public.loyalty_accounts (customer_id);
create index if not exists idx_loyalty_transactions_account on public.loyalty_transactions (loyalty_account_id);
create index if not exists idx_loyalty_transactions_created on public.loyalty_transactions (created_at desc);

drop trigger if exists set_loyalty_accounts_updated_at on public.loyalty_accounts;
create trigger set_loyalty_accounts_updated_at
before update on public.loyalty_accounts
for each row execute function public.set_updated_at();

alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_transactions enable row level security;

drop policy if exists "Staff select loyalty_accounts" on public.loyalty_accounts;
create policy "Staff select loyalty_accounts"
  on public.loyalty_accounts for select to authenticated using (true);

drop policy if exists "Staff select loyalty_transactions" on public.loyalty_transactions;
create policy "Staff select loyalty_transactions"
  on public.loyalty_transactions for select to authenticated using (true);

revoke all on public.loyalty_accounts from public, anon, authenticated;
revoke all on public.loyalty_transactions from public, anon, authenticated;
grant select on public.loyalty_accounts to authenticated;
grant select on public.loyalty_transactions to authenticated;
grant all on public.loyalty_accounts to service_role;
grant all on public.loyalty_transactions to service_role;

-- Atomic earn: 1 point per 100 PKR of order total_amount (floor).
create or replace function public.loyalty_earn_for_order_atomic(
  p_order_id uuid,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_account public.loyalty_accounts%rowtype;
  v_points integer;
  v_txn_id uuid;
  v_existing uuid;
begin
  if p_order_id is null then
    raise exception 'ORDER_ID_REQUIRED' using errcode = 'P0001';
  end if;

  select id, customer_id, status, total_amount, order_number
    into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'ORDER_NOT_COMPLETED' using errcode = 'P0001';
  end if;

  if v_order.customer_id is null then
    raise exception 'ORDER_HAS_NO_CUSTOMER' using errcode = 'P0001';
  end if;

  select id into v_existing
  from public.loyalty_transactions
  where order_id = p_order_id and type = 'earn'
  limit 1;

  if found then
    select * into v_account from public.loyalty_accounts where customer_id = v_order.customer_id;
    return jsonb_build_object(
      'orderId', p_order_id,
      'points', 0,
      'pointsBalance', coalesce(v_account.points_balance, 0),
      'idempotentReplay', true,
      'transactionId', v_existing
    );
  end if;

  v_points := floor(coalesce(v_order.total_amount, 0) / 100)::integer;
  if v_points <= 0 then
    return jsonb_build_object(
      'orderId', p_order_id,
      'points', 0,
      'pointsBalance', 0,
      'idempotentReplay', false,
      'transactionId', null,
      'skipped', true,
      'reason', 'amount_below_threshold'
    );
  end if;

  insert into public.loyalty_accounts (customer_id, points_balance, tier)
  values (v_order.customer_id, 0, 'member')
  on conflict (customer_id) do nothing;

  select * into v_account
  from public.loyalty_accounts
  where customer_id = v_order.customer_id
  for update;

  insert into public.loyalty_transactions (
    loyalty_account_id, order_id, points, type, note
  ) values (
    v_account.id,
    p_order_id,
    v_points,
    'earn',
    'Earn 1pt/100 PKR on completed order ' || coalesce(v_order.order_number, p_order_id::text)
  )
  returning id into v_txn_id;

  update public.loyalty_accounts
  set points_balance = points_balance + v_points,
      updated_at = timezone('utc', now())
  where id = v_account.id;

  return jsonb_build_object(
    'orderId', p_order_id,
    'customerId', v_order.customer_id,
    'accountId', v_account.id,
    'points', v_points,
    'pointsBalance', v_account.points_balance + v_points,
    'tier', v_account.tier,
    'idempotentReplay', false,
    'transactionId', v_txn_id
  );
end;
$$;

revoke all on function public.loyalty_earn_for_order_atomic(uuid, uuid) from public, anon, authenticated;
grant execute on function public.loyalty_earn_for_order_atomic(uuid, uuid) to service_role;

commit;
