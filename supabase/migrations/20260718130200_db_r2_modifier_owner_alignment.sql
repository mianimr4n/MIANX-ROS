-- =============================================================================
-- DB-R2 follow-up: align modifier tables with owner requirements when the
-- original 20260718120000 shape was already applied locally (idempotent).
-- Fresh installs that run the refined 120000 already have these objects.
-- Does NOT delete topping SKUs or mutate order_items history.
-- =============================================================================

-- item_modifier_groups: branch_id + is_available + unique (…, branch_id)
alter table public.item_modifier_groups
  add column if not exists branch_id uuid references public.branches (id) on delete cascade;

alter table public.item_modifier_groups
  add column if not exists is_available boolean not null default true;

alter table public.item_modifier_groups
  drop constraint if exists uq_item_modifier_groups;

create unique index if not exists uq_item_modifier_groups_item_group_branch
  on public.item_modifier_groups (menu_item_id, modifier_group_id, branch_id)
  nulls not distinct;

create index if not exists idx_item_modifier_groups_branch
  on public.item_modifier_groups (branch_id)
  where branch_id is not null;

-- order_item_modifiers: unit_price / total_price snapshots
alter table public.order_item_modifiers
  add column if not exists unit_price numeric(12, 2) not null default 0;

alter table public.order_item_modifiers
  add column if not exists total_price numeric(12, 2) not null default 0;

-- Backfill from price_delta where snapshots were written under the older shape
update public.order_item_modifiers
set
  unit_price = coalesce(nullif(unit_price, 0), price_delta),
  total_price = coalesce(
    nullif(total_price, 0),
    price_delta * greatest(quantity, 1)
  )
where unit_price = 0 or total_price = 0;

-- branch_modifier_options (per-branch option availability; absent ⇒ available)
create table if not exists public.branch_modifier_options (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null
    references public.branches (id) on delete cascade,
  modifier_option_id uuid not null
    references public.modifier_options (id) on delete cascade,
  is_available boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint uq_branch_modifier_options unique (branch_id, modifier_option_id)
);

create index if not exists idx_branch_modifier_options_branch
  on public.branch_modifier_options (branch_id);

alter table public.branch_modifier_options enable row level security;

drop policy if exists "Public can read branch modifier options" on public.branch_modifier_options;
create policy "Public can read branch modifier options"
on public.branch_modifier_options
for select
using (true);

drop trigger if exists set_branch_modifier_options_updated_at on public.branch_modifier_options;
create trigger set_branch_modifier_options_updated_at
before update on public.branch_modifier_options
for each row execute function public.set_updated_at();

revoke all on table public.branch_modifier_options from anon, authenticated;
grant select on table public.branch_modifier_options to anon, authenticated;
grant select, insert, update, delete on table public.branch_modifier_options to service_role;

-- Refresh public read policy to include is_available
drop policy if exists "Public can read active item modifier groups" on public.item_modifier_groups;
create policy "Public can read active item modifier groups"
on public.item_modifier_groups
for select
using (
  is_active = true
  and is_available = true
  and exists (
    select 1
    from public.menu_items mi
    where mi.id = item_modifier_groups.menu_item_id
      and mi.is_available = true
  )
);

-- Reinforce locked catalog grants on modifier tables (post-R0 model)
revoke all on table public.modifier_groups from anon, authenticated;
revoke all on table public.modifier_options from anon, authenticated;
revoke all on table public.item_modifier_groups from anon, authenticated;
revoke all on table public.order_item_modifiers from anon, authenticated;

grant select on table public.modifier_groups to anon, authenticated;
grant select on table public.modifier_options to anon, authenticated;
grant select on table public.item_modifier_groups to anon, authenticated;
grant select on table public.order_item_modifiers to authenticated;

grant select, insert, update, delete on table public.modifier_groups to service_role;
grant select, insert, update, delete on table public.modifier_options to service_role;
grant select, insert, update, delete on table public.item_modifier_groups to service_role;
grant select, insert, update, delete on table public.order_item_modifiers to service_role;
