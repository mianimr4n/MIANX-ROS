-- Loyalty schema compatibility repair (forward-only, idempotent).
-- Root cause: foundation created loyalty_transactions without actor_user_id;
-- RC3 ledger migration 20260731090000 adds it. Deployed API/RPCs require the column.
-- This migration re-asserts columns + RPCs safely for hosts where schema lagged code.

begin;

-- Ensure ledger columns exist (no-op when 20260731090000 already applied).
alter table public.loyalty_transactions
  drop constraint if exists loyalty_transactions_type_check;

alter table public.loyalty_transactions
  add constraint loyalty_transactions_type_check
  check (type in ('earn', 'burn', 'adjust', 'expire', 'reverse'));

alter table public.loyalty_transactions
  add column if not exists actor_user_id uuid references auth.users (id) on delete set null;

alter table public.loyalty_transactions
  add column if not exists reverses_transaction_id uuid references public.loyalty_transactions (id) on delete set null;

alter table public.loyalty_transactions
  add column if not exists expires_at timestamptz;

alter table public.loyalty_transactions
  add column if not exists idempotency_key text;

create unique index if not exists uq_loyalty_txn_idempotency
  on public.loyalty_transactions (loyalty_account_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists uq_loyalty_txn_reverse_once
  on public.loyalty_transactions (reverses_transaction_id)
  where type = 'reverse' and reverses_transaction_id is not null;

comment on column public.loyalty_transactions.actor_user_id is
  'Auth user who performed the ledger mutation (staff or system null). Required by loyalty list + burn/adjust/expire/reverse RPCs.';

-- Earn: persist actor_user_id (foundation accepted the param but did not store it).
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
    loyalty_account_id, order_id, points, type, note, actor_user_id
  ) values (
    v_account.id,
    p_order_id,
    v_points,
    'earn',
    'Earn 1pt/100 PKR on completed order ' || coalesce(v_order.order_number, p_order_id::text),
    p_actor_user_id
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

-- Re-assert burn/adjust/expire/reverse so function bodies match columns.
create or replace function public.loyalty_burn_atomic(
  p_customer_id uuid,
  p_points integer,
  p_order_id uuid default null,
  p_note text default null,
  p_actor_user_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.loyalty_accounts%rowtype;
  v_txn_id uuid;
  v_existing uuid;
begin
  if p_customer_id is null then
    raise exception 'CUSTOMER_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'POINTS_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;

  insert into public.loyalty_accounts (customer_id, points_balance, tier)
  values (p_customer_id, 0, 'member')
  on conflict (customer_id) do nothing;

  select * into v_account
  from public.loyalty_accounts
  where customer_id = p_customer_id
  for update;

  if p_idempotency_key is not null then
    select id into v_existing
    from public.loyalty_transactions
    where loyalty_account_id = v_account.id
      and idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return jsonb_build_object(
        'transactionId', v_existing,
        'accountId', v_account.id,
        'points', p_points,
        'pointsBalance', v_account.points_balance,
        'type', 'burn',
        'idempotentReplay', true
      );
    end if;
  end if;

  if v_account.points_balance < p_points then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  insert into public.loyalty_transactions (
    loyalty_account_id, order_id, points, type, note, actor_user_id, idempotency_key
  ) values (
    v_account.id, p_order_id, -p_points, 'burn',
    coalesce(p_note, 'Points redeemed'),
    p_actor_user_id, p_idempotency_key
  )
  returning id into v_txn_id;

  update public.loyalty_accounts
  set points_balance = points_balance - p_points,
      updated_at = timezone('utc', now())
  where id = v_account.id;

  return jsonb_build_object(
    'transactionId', v_txn_id,
    'accountId', v_account.id,
    'customerId', p_customer_id,
    'points', p_points,
    'pointsBalance', v_account.points_balance - p_points,
    'type', 'burn',
    'idempotentReplay', false
  );
end;
$$;

create or replace function public.loyalty_adjust_atomic(
  p_customer_id uuid,
  p_points integer,
  p_note text,
  p_actor_user_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.loyalty_accounts%rowtype;
  v_txn_id uuid;
  v_existing uuid;
  v_new_balance integer;
begin
  if p_customer_id is null then
    raise exception 'CUSTOMER_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_points is null or p_points = 0 then
    raise exception 'POINTS_MUST_BE_NONZERO' using errcode = 'P0001';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'ADJUST_NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  insert into public.loyalty_accounts (customer_id, points_balance, tier)
  values (p_customer_id, 0, 'member')
  on conflict (customer_id) do nothing;

  select * into v_account
  from public.loyalty_accounts
  where customer_id = p_customer_id
  for update;

  if p_idempotency_key is not null then
    select id into v_existing
    from public.loyalty_transactions
    where loyalty_account_id = v_account.id
      and idempotency_key = p_idempotency_key
    limit 1;
    if found then
      return jsonb_build_object(
        'transactionId', v_existing,
        'accountId', v_account.id,
        'points', p_points,
        'pointsBalance', v_account.points_balance,
        'type', 'adjust',
        'idempotentReplay', true
      );
    end if;
  end if;

  v_new_balance := v_account.points_balance + p_points;
  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  insert into public.loyalty_transactions (
    loyalty_account_id, points, type, note, actor_user_id, idempotency_key
  ) values (
    v_account.id, p_points, 'adjust', trim(p_note), p_actor_user_id, p_idempotency_key
  )
  returning id into v_txn_id;

  update public.loyalty_accounts
  set points_balance = v_new_balance,
      updated_at = timezone('utc', now())
  where id = v_account.id;

  return jsonb_build_object(
    'transactionId', v_txn_id,
    'accountId', v_account.id,
    'customerId', p_customer_id,
    'points', p_points,
    'pointsBalance', v_new_balance,
    'type', 'adjust',
    'idempotentReplay', false
  );
end;
$$;

create or replace function public.loyalty_expire_atomic(
  p_customer_id uuid,
  p_points integer,
  p_note text default null,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.loyalty_accounts%rowtype;
  v_txn_id uuid;
  v_expire integer;
begin
  if p_customer_id is null then
    raise exception 'CUSTOMER_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_points is null or p_points <= 0 then
    raise exception 'POINTS_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;

  select * into v_account
  from public.loyalty_accounts
  where customer_id = p_customer_id
  for update;

  if not found then
    raise exception 'LOYALTY_ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_expire := least(p_points, v_account.points_balance);
  if v_expire <= 0 then
    return jsonb_build_object(
      'accountId', v_account.id,
      'points', 0,
      'pointsBalance', v_account.points_balance,
      'type', 'expire',
      'skipped', true
    );
  end if;

  insert into public.loyalty_transactions (
    loyalty_account_id, points, type, note, actor_user_id
  ) values (
    v_account.id, -v_expire, 'expire',
    coalesce(p_note, 'Points expired'),
    p_actor_user_id
  )
  returning id into v_txn_id;

  update public.loyalty_accounts
  set points_balance = points_balance - v_expire,
      updated_at = timezone('utc', now())
  where id = v_account.id;

  return jsonb_build_object(
    'transactionId', v_txn_id,
    'accountId', v_account.id,
    'customerId', p_customer_id,
    'points', v_expire,
    'pointsBalance', v_account.points_balance - v_expire,
    'type', 'expire',
    'skipped', false
  );
end;
$$;

create or replace function public.loyalty_reverse_atomic(
  p_transaction_id uuid,
  p_note text,
  p_actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orig public.loyalty_transactions%rowtype;
  v_account public.loyalty_accounts%rowtype;
  v_txn_id uuid;
  v_delta integer;
  v_new_balance integer;
begin
  if p_transaction_id is null then
    raise exception 'TRANSACTION_ID_REQUIRED' using errcode = 'P0001';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'REVERSE_NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_orig
  from public.loyalty_transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'LOYALTY_TRANSACTION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_orig.type = 'reverse' then
    raise exception 'CANNOT_REVERSE_A_REVERSAL' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.loyalty_transactions
    where reverses_transaction_id = p_transaction_id and type = 'reverse'
  ) then
    raise exception 'ALREADY_REVERSED' using errcode = 'P0001';
  end if;

  select * into v_account
  from public.loyalty_accounts
  where id = v_orig.loyalty_account_id
  for update;

  v_delta := -v_orig.points;
  v_new_balance := v_account.points_balance + v_delta;
  if v_new_balance < 0 then
    raise exception 'INSUFFICIENT_POINTS' using errcode = 'P0001';
  end if;

  insert into public.loyalty_transactions (
    loyalty_account_id, order_id, points, type, note, actor_user_id, reverses_transaction_id
  ) values (
    v_account.id, v_orig.order_id, v_delta, 'reverse', trim(p_note),
    p_actor_user_id, p_transaction_id
  )
  returning id into v_txn_id;

  update public.loyalty_accounts
  set points_balance = v_new_balance,
      updated_at = timezone('utc', now())
  where id = v_account.id;

  return jsonb_build_object(
    'transactionId', v_txn_id,
    'accountId', v_account.id,
    'reversedTransactionId', p_transaction_id,
    'points', v_delta,
    'pointsBalance', v_new_balance,
    'type', 'reverse'
  );
end;
$$;

revoke all on function public.loyalty_earn_for_order_atomic(uuid, uuid) from public, anon, authenticated;
revoke all on function public.loyalty_burn_atomic(uuid, integer, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.loyalty_adjust_atomic(uuid, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public.loyalty_expire_atomic(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.loyalty_reverse_atomic(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.loyalty_earn_for_order_atomic(uuid, uuid) to service_role;
grant execute on function public.loyalty_burn_atomic(uuid, integer, uuid, text, uuid, text) to service_role;
grant execute on function public.loyalty_adjust_atomic(uuid, integer, text, uuid, text) to service_role;
grant execute on function public.loyalty_expire_atomic(uuid, integer, text, uuid) to service_role;
grant execute on function public.loyalty_reverse_atomic(uuid, text, uuid) to service_role;

commit;
