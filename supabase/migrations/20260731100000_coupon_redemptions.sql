-- RC3 Marketing: coupon redemptions + checkout enforcement support.
-- Additive. No fake codes.

begin;

alter table public.coupons
  add column if not exists max_redemptions integer
    check (max_redemptions is null or max_redemptions > 0);

alter table public.coupons
  add column if not exists per_customer_limit integer
    check (per_customer_limit is null or per_customer_limit > 0);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete restrict,
  branch_id uuid references public.branches (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  code varchar(40) not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  discount_applied numeric(12, 2) not null check (discount_applied >= 0),
  order_subtotal numeric(12, 2) not null check (order_subtotal >= 0),
  status text not null default 'applied'
    check (status in ('applied', 'reversed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_id)
);

comment on table public.coupon_redemptions is
  'One coupon redemption per order. Applied at create; quote validates without writing.';

create index if not exists idx_coupon_redemptions_coupon
  on public.coupon_redemptions (coupon_id, created_at desc);
create index if not exists idx_coupon_redemptions_customer
  on public.coupon_redemptions (customer_id);

alter table public.coupon_redemptions enable row level security;

drop policy if exists "Staff select coupon redemptions" on public.coupon_redemptions;
create policy "Staff select coupon redemptions"
  on public.coupon_redemptions
  for select
  to authenticated
  using (
    branch_id is null
    or public.current_user_has_branch_access(branch_id)
  );

revoke all on public.coupon_redemptions from public, anon, authenticated;
grant select on public.coupon_redemptions to authenticated;
grant all on public.coupon_redemptions to service_role;

-- Validate + compute discount (read path for quote). Does not write.
create or replace function public.coupon_validate_discount(
  p_code text,
  p_branch_id uuid,
  p_subtotal numeric,
  p_customer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric(12, 2);
  v_today date := (timezone('Asia/Karachi', now()))::date;
  v_redemption_count integer;
  v_customer_count integer;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'CODE_REQUIRED');
  end if;

  select * into v_coupon
  from public.coupons
  where upper(code) = upper(trim(p_code))
  for share;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'COUPON_NOT_FOUND');
  end if;

  if v_coupon.status = 'inactive' then
    return jsonb_build_object('valid', false, 'reason', 'COUPON_INACTIVE', 'couponId', v_coupon.id);
  end if;

  if v_coupon.status = 'expired'
     or (v_coupon.expiry_date is not null and v_coupon.expiry_date < v_today) then
    return jsonb_build_object('valid', false, 'reason', 'COUPON_EXPIRED', 'couponId', v_coupon.id);
  end if;

  if v_coupon.branch_id is not null and p_branch_id is not null
     and v_coupon.branch_id <> p_branch_id then
    return jsonb_build_object('valid', false, 'reason', 'COUPON_BRANCH_MISMATCH', 'couponId', v_coupon.id);
  end if;

  if coalesce(p_subtotal, 0) < coalesce(v_coupon.min_order, 0) then
    return jsonb_build_object(
      'valid', false,
      'reason', 'MIN_ORDER_NOT_MET',
      'couponId', v_coupon.id,
      'minOrder', v_coupon.min_order
    );
  end if;

  if v_coupon.max_redemptions is not null then
    select count(*)::integer into v_redemption_count
    from public.coupon_redemptions
    where coupon_id = v_coupon.id and status = 'applied';
    if v_redemption_count >= v_coupon.max_redemptions then
      return jsonb_build_object('valid', false, 'reason', 'COUPON_MAX_REDEMPTIONS', 'couponId', v_coupon.id);
    end if;
  end if;

  if v_coupon.per_customer_limit is not null and p_customer_id is not null then
    select count(*)::integer into v_customer_count
    from public.coupon_redemptions
    where coupon_id = v_coupon.id and customer_id = p_customer_id and status = 'applied';
    if v_customer_count >= v_coupon.per_customer_limit then
      return jsonb_build_object('valid', false, 'reason', 'COUPON_CUSTOMER_LIMIT', 'couponId', v_coupon.id);
    end if;
  end if;

  if v_coupon.discount_type = 'percent' then
    v_discount := round(p_subtotal * (v_coupon.discount_value / 100.0), 2);
  else
    v_discount := v_coupon.discount_value;
  end if;

  if v_discount > p_subtotal then
    v_discount := p_subtotal;
  end if;
  if v_discount < 0 then
    v_discount := 0;
  end if;

  return jsonb_build_object(
    'valid', true,
    'couponId', v_coupon.id,
    'code', v_coupon.code,
    'discountType', v_coupon.discount_type,
    'discountValue', v_coupon.discount_value,
    'discountApplied', v_discount,
    'minOrder', v_coupon.min_order,
    'branchId', v_coupon.branch_id
  );
end;
$$;

revoke all on function public.coupon_validate_discount(text, uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.coupon_validate_discount(text, uuid, numeric, uuid) to service_role;

comment on table public.coupons is
  'Coupon master. Quote validates via coupon_validate_discount; create writes coupon_redemptions.';

commit;
