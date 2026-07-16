-- =============================================================================
-- Sprint 3 / Slice 2D — Branch-scoped order RLS foundation
-- =============================================================================
-- Goals:
--   1) Catch up frozen ORDERS_ARCHITECTURE: nullable orders.auth_user_id
--   2) DB helpers derived only from auth.uid() + public.* tables
--   3) SELECT policies for customer-owned and branch-scoped order data
--   4) No anon access; no authenticated writes; service-role API unchanged
--
-- Non-goals:
--   Kitchen / rider / POS / Admin APIs, OTP, catalog changes, client writes
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Schema catch-up — orders.auth_user_id (frozen ORDERS_ARCHITECTURE §8/§9)
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create index if not exists idx_orders_auth_user_id
  on public.orders (auth_user_id)
  where auth_user_id is not null;

comment on column public.orders.auth_user_id is
  'Optional Supabase Auth identity for authenticated customer orders. Guest orders remain null; guest tracking stays API/phone-proof only.';

-- ---------------------------------------------------------------------------
-- 2) Helpers — SECURITY DEFINER, pinned search_path, no metadata privilege
-- ---------------------------------------------------------------------------

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from public.users u
  where u.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
  );
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Super-admin is DB-derived only (role code + non-customer user_type + active).
  -- Never read JWT metadata claims or request headers.
  select exists (
    select 1
    from public.users u
    join public.user_roles ur on ur.user_id = u.id
    join public.roles r on r.id = ur.role_id
    where u.auth_user_id = auth.uid()
      and u.status = 'active'
      and u.user_type <> 'customer'
      and r.code = 'super-admin'
  );
$$;

create or replace function public.current_user_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct ur.branch_id
  from public.users u
  join public.user_roles ur on ur.user_id = u.id
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and ur.branch_id is not null;
$$;

create or replace function public.current_user_has_branch_access(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_branch_id is not null
    and public.current_user_is_active()
    and (
      public.current_user_is_super_admin()
      or exists (
        select 1
        from public.current_user_branch_ids() bid
        where bid = p_branch_id
      )
    );
$$;

create or replace function public.current_customer_owns_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = p_order_id
      and public.current_user_is_active()
      and (
        (o.auth_user_id is not null and o.auth_user_id = auth.uid())
        or exists (
          select 1
          from public.customers c
          join public.users u on u.id = c.user_id
          where c.id = o.customer_id
            and u.auth_user_id = auth.uid()
            and u.status = 'active'
            and u.user_type = 'customer'
        )
      )
  );
$$;

revoke all on function public.current_app_user_id() from public;
revoke all on function public.current_user_is_active() from public;
revoke all on function public.current_user_is_super_admin() from public;
revoke all on function public.current_user_branch_ids() from public;
revoke all on function public.current_user_has_branch_access(uuid) from public;
revoke all on function public.current_customer_owns_order(uuid) from public;

grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.current_user_is_active() to authenticated, service_role;
grant execute on function public.current_user_is_super_admin() to authenticated, service_role;
grant execute on function public.current_user_branch_ids() to authenticated, service_role;
grant execute on function public.current_user_has_branch_access(uuid) to authenticated, service_role;
grant execute on function public.current_customer_owns_order(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Privilege posture — operational tables are not client-writable
-- ---------------------------------------------------------------------------
-- grant_public_access.sql previously granted write privileges for anon and authenticated.
-- Slice 2D revokes those writes. SELECT for authenticated is policy-gated; anon gets none.

revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;
revoke all on table public.order_status_logs from anon;
revoke all on table public.deliveries from anon;
revoke all on table public.payments from anon;

revoke insert, update, delete on table public.orders from authenticated;
revoke insert, update, delete on table public.order_items from authenticated;
revoke insert, update, delete on table public.order_status_logs from authenticated;
revoke insert, update, delete on table public.deliveries from authenticated;
revoke insert, update, delete on table public.payments from authenticated;

grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant select on table public.order_status_logs to authenticated;
grant select on table public.deliveries to authenticated;
-- payments: intentionally NO select grant / NO policy for authenticated in this slice.
-- Safe payment summary already lives on orders.payment_status / orders.total_amount.
revoke all on table public.payments from authenticated;
grant select, insert, update, delete on table public.payments to service_role;

grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.order_status_logs to service_role;
grant select, insert, update, delete on table public.deliveries to service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS reaffirm + drop stale Slice-2D policy names (idempotent)
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_logs enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Customers select own orders" on public.orders;
drop policy if exists "Staff select branch orders" on public.orders;
drop policy if exists "Customers select own order items" on public.order_items;
drop policy if exists "Staff select branch order items" on public.order_items;
drop policy if exists "Customers select own order status logs" on public.order_status_logs;
drop policy if exists "Staff select branch order status logs" on public.order_status_logs;
drop policy if exists "Customers select own deliveries" on public.deliveries;
drop policy if exists "Staff select branch deliveries" on public.deliveries;

-- ---------------------------------------------------------------------------
-- 5) orders — SELECT only
-- ---------------------------------------------------------------------------
create policy "Customers select own orders"
on public.orders
for select
to authenticated
using (
  public.current_user_is_active()
  and (
    (auth_user_id is not null and auth_user_id = auth.uid())
    or exists (
      select 1
      from public.customers c
      join public.users u on u.id = c.user_id
      where c.id = orders.customer_id
        and u.auth_user_id = auth.uid()
        and u.status = 'active'
        and u.user_type = 'customer'
    )
  )
);

create policy "Staff select branch orders"
on public.orders
for select
to authenticated
using (
  public.current_user_has_branch_access(branch_id)
);

-- ---------------------------------------------------------------------------
-- 6) order_items — SELECT through accessible parent order
-- ---------------------------------------------------------------------------
create policy "Customers select own order items"
on public.order_items
for select
to authenticated
using (
  public.current_customer_owns_order(order_id)
);

create policy "Staff select branch order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and public.current_user_has_branch_access(o.branch_id)
  )
);

-- ---------------------------------------------------------------------------
-- 7) order_status_logs — SELECT through accessible parent order
-- ---------------------------------------------------------------------------
-- Schema has no customer-vs-staff visibility flag. Safest Slice 2D rule:
-- customers may read lifecycle rows for own orders (same statuses already
-- exposed via guest/API tracking); staff read branch-accessible rows.
-- No client writes.

create policy "Customers select own order status logs"
on public.order_status_logs
for select
to authenticated
using (
  public.current_customer_owns_order(order_id)
);

create policy "Staff select branch order status logs"
on public.order_status_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_status_logs.order_id
      and public.current_user_has_branch_access(o.branch_id)
  )
);

-- ---------------------------------------------------------------------------
-- 8) deliveries — SELECT through parent order / branch
-- ---------------------------------------------------------------------------
-- Rider-specific assignment policies are DEFERRED (no broad rider access).

create policy "Customers select own deliveries"
on public.deliveries
for select
to authenticated
using (
  public.current_customer_owns_order(order_id)
);

create policy "Staff select branch deliveries"
on public.deliveries
for select
to authenticated
using (
  public.current_user_has_branch_access(branch_id)
);

-- ---------------------------------------------------------------------------
-- 9) payments — service-role only in this slice
-- ---------------------------------------------------------------------------
-- No authenticated/anon policies. Customers use orders.payment_status.
-- Staff payment detail APIs remain future work with explicit architecture.

-- ---------------------------------------------------------------------------
-- Verification
-- ---------------------------------------------------------------------------
-- 1) anon: select from orders → 0 rows / permission denied
-- 2) customer A: select own auth_user_id order → ok; customer B order → 0
-- 3) Royal Orchard staff: RO order ok; Northern Bypass → 0
-- 4) super-admin active: both branches ok
-- 5) suspended user: 0 rows
-- 6) service-role create/track/cancel unchanged
--
-- Rollback guidance:
--   drop policies listed above; drop helpers; drop column auth_user_id only if unused.
--   Do not re-open anon writes on operational tables.

commit;
