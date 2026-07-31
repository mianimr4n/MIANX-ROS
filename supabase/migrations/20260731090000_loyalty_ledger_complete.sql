-- RC3 Loyalty: complete ledger operations on existing loyalty_transactions.
-- Reuses earn/burn/adjust/expire; adds reverse. No fake balances.

begin;

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

-- Burn points (transaction-safe).
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
        'customerId', v_existing,
        'accountId', v_account.id,
        'customer', p_points,
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

-- Manual adjustment (positive credit or negative debit).
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

-- Expire points (debit as type=expire).
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

-- Reverse a prior earn/burn/adjust/expire once.
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

  -- Counter the original signed points
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

revoke all on function public.loyalty_burn_atomic(uuid, integer, uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.loyalty_adjust_atomic(uuid, integer, text, uuid, text) from public, anon, authenticated;
revoke all on function public.loyalty_expire_atomic(uuid, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.loyalty_reverse_atomic(uuid, text, uuid) from public, anon, authenticated;

grant execute on function public.loyalty_burn_atomic(uuid, integer, uuid, text, uuid, text) to service_role;
grant execute on function public.loyalty_adjust_atomic(uuid, integer, text, uuid, text) to service_role;
grant execute on function public.loyalty_expire_atomic(uuid, integer, text, uuid) to service_role;
grant execute on function public.loyalty_reverse_atomic(uuid, text, uuid) to service_role;

comment on function public.loyalty_burn_atomic is
  'Transaction-safe loyalty burn with row lock and optional idempotency key.';

commit;
