-- =============================================================================
-- DB-R5: Kitchen tickets foundation (one ticket per order)
-- Forward-only. Depends on orders / order_items / branches (already on main).
-- Aligns with owner contract: UNIQUE order_id; ticket items recommended.
--
-- Deferred (not freeze-required here):
--   kitchen_stations / station routing — Phase 8 / later slice.
--   Kitchen Display UI (DB-R6+ / Phase 8).
--
-- Ticket creation: Option B — backend service on order → confirmed
--   (idempotent upsert/ignore duplicate). No create trigger in this slice.
--
-- RLS matrix:
--   super-admin          → full (via helper + service_role for server writes)
--   kitchen              → SELECT/UPDATE own branch
--   branch-manager       → SELECT/UPDATE own branch
--   customer / anon / rider / cashier → NO access
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) kitchen_tickets — one row per order
-- ---------------------------------------------------------------------------

create table if not exists public.kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete restrict,
  status text not null default 'queued' check (
    status in ('queued', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')
  ),
  priority integer not null default 0,
  sequence_number integer,
  accepted_by_user_id uuid references public.users (id) on delete set null,
  accepted_at timestamptz,
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_kitchen_tickets_branch_id
  on public.kitchen_tickets (branch_id);

create index if not exists idx_kitchen_tickets_branch_status
  on public.kitchen_tickets (branch_id, status);

create index if not exists idx_kitchen_tickets_status
  on public.kitchen_tickets (status);

drop trigger if exists set_kitchen_tickets_updated_at on public.kitchen_tickets;
create trigger set_kitchen_tickets_updated_at
before update on public.kitchen_tickets
for each row execute function public.set_updated_at();

comment on table public.kitchen_tickets is
  'Kitchen tickets: one ticket per order (UNIQUE order_id). Stations deferred.';
comment on column public.kitchen_tickets.accepted_by_user_id is
  'Staff app user (public.users.id) who accepted the ticket — never auth.users.';

-- ---------------------------------------------------------------------------
-- 2) Branch match: kitchen_tickets.branch_id must equal orders.branch_id
-- ---------------------------------------------------------------------------

create or replace function public.enforce_kitchen_ticket_branch_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  order_branch_id uuid;
begin
  select o.branch_id into order_branch_id
  from public.orders o
  where o.id = new.order_id;

  if order_branch_id is null then
    raise exception 'order_id % not found', new.order_id
      using errcode = '23503';
  end if;

  if new.branch_id is distinct from order_branch_id then
    raise exception 'kitchen_tickets.branch_id must match orders.branch_id'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_kitchen_tickets_branch_match on public.kitchen_tickets;
create trigger trg_kitchen_tickets_branch_match
before insert or update of branch_id, order_id
on public.kitchen_tickets
for each row execute function public.enforce_kitchen_ticket_branch_match();

revoke all on function public.enforce_kitchen_ticket_branch_match() from public, anon;
grant execute on function public.enforce_kitchen_ticket_branch_match() to service_role;

-- ---------------------------------------------------------------------------
-- 3) kitchen_ticket_items — line snapshots for KOT display
-- ---------------------------------------------------------------------------

create table if not exists public.kitchen_ticket_items (
  id uuid primary key default gen_random_uuid(),
  kitchen_ticket_id uuid not null
    references public.kitchen_tickets (id) on delete cascade,
  order_item_id uuid not null
    references public.order_items (id) on delete cascade,
  item_name_snapshot text not null,
  modifiers_snapshot jsonb not null default '[]'::jsonb,
  quantity integer not null check (quantity > 0),
  is_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_kitchen_ticket_items_ticket_order_item
    unique (kitchen_ticket_id, order_item_id)
);

create index if not exists idx_kitchen_ticket_items_ticket_id
  on public.kitchen_ticket_items (kitchen_ticket_id);

comment on table public.kitchen_ticket_items is
  'Kitchen ticket line items with frozen name/modifier snapshots from order_items.';

-- ---------------------------------------------------------------------------
-- 4) RLS helper — kitchen / branch-manager / super-admin only
-- ---------------------------------------------------------------------------

create or replace function public.current_user_can_access_kitchen_tickets(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Super-admin: full access. Kitchen + branch-manager: own branch only.
  -- Rider, cashier, customer-support, customer: denied (even with branch assignment).
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
          and r.code in ('kitchen', 'branch-manager')
          and ur.branch_id = p_branch_id
      )
    );
$$;

revoke all on function public.current_user_can_access_kitchen_tickets(uuid) from public, anon;
grant execute on function public.current_user_can_access_kitchen_tickets(uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) RLS policies
-- ---------------------------------------------------------------------------

alter table public.kitchen_tickets enable row level security;
alter table public.kitchen_ticket_items enable row level security;

drop policy if exists "Kitchen select branch tickets" on public.kitchen_tickets;
create policy "Kitchen select branch tickets"
on public.kitchen_tickets
for select
to authenticated
using (
  public.current_user_can_access_kitchen_tickets(branch_id)
);

drop policy if exists "Kitchen update branch tickets" on public.kitchen_tickets;
create policy "Kitchen update branch tickets"
on public.kitchen_tickets
for update
to authenticated
using (
  public.current_user_can_access_kitchen_tickets(branch_id)
)
with check (
  public.current_user_can_access_kitchen_tickets(branch_id)
);

-- Super-admin INSERT/DELETE via service_role (API). No authenticated INSERT/DELETE.
-- No anon policies. Rider/cashier/customer blocked by helper.

drop policy if exists "Kitchen select branch ticket items" on public.kitchen_ticket_items;
create policy "Kitchen select branch ticket items"
on public.kitchen_ticket_items
for select
to authenticated
using (
  exists (
    select 1
    from public.kitchen_tickets kt
    where kt.id = kitchen_ticket_items.kitchen_ticket_id
      and public.current_user_can_access_kitchen_tickets(kt.branch_id)
  )
);

drop policy if exists "Kitchen update branch ticket items" on public.kitchen_ticket_items;
create policy "Kitchen update branch ticket items"
on public.kitchen_ticket_items
for update
to authenticated
using (
  exists (
    select 1
    from public.kitchen_tickets kt
    where kt.id = kitchen_ticket_items.kitchen_ticket_id
      and public.current_user_can_access_kitchen_tickets(kt.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.kitchen_tickets kt
    where kt.id = kitchen_ticket_items.kitchen_ticket_id
      and public.current_user_can_access_kitchen_tickets(kt.branch_id)
  )
);

-- ---------------------------------------------------------------------------
-- 6) Grants (post-R0): no anon; authenticated SELECT/UPDATE; service_role DML
-- ---------------------------------------------------------------------------

revoke all on table public.kitchen_tickets from anon, authenticated;
revoke all on table public.kitchen_ticket_items from anon, authenticated;

grant select, update on table public.kitchen_tickets to authenticated;
grant select, update on table public.kitchen_ticket_items to authenticated;

grant select, insert, update, delete on table public.kitchen_tickets to service_role;
grant select, insert, update, delete on table public.kitchen_ticket_items to service_role;

commit;
