-- =============================================================================
-- Inventory backend — stock items + immutable movement ledger
-- Additive only. Service-role writes via API; authenticated staff may SELECT
-- branch-scoped rows via current_user_has_branch_access.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Permission: inventory.manage (branch-manager + keep admin.access path)
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('inventory', 'manage', 'inventory.manage', 'Manage inventory stock items, adjustments, and movement ledger.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'inventory.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 1) inventory_items
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  sku varchar(80) not null,
  name varchar(200) not null,
  category varchar(120),
  unit varchar(40) not null default 'unit',
  current_stock numeric(14, 3) not null default 0,
  minimum_stock numeric(14, 3) not null default 0,
  reorder_level numeric(14, 3) not null default 0,
  cost_price numeric(14, 2),
  status text not null default 'active' check (
    status in ('active', 'inactive', 'discontinued')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, sku),
  check (current_stock >= 0),
  check (minimum_stock >= 0),
  check (reorder_level >= 0)
);

comment on table public.inventory_items is
  'Branch-scoped inventory stock item master with on-hand quantity.';

create index if not exists idx_inventory_items_branch_id on public.inventory_items (branch_id);
create index if not exists idx_inventory_items_status on public.inventory_items (status);
create index if not exists idx_inventory_items_name on public.inventory_items (name);

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) stock_movements (immutable ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'receipt',
      'adjustment',
      'transfer_in',
      'transfer_out',
      'waste',
      'sale_consumption'
    )
  ),
  quantity numeric(14, 3) not null,
  reference_type varchar(80),
  reference_id uuid,
  reason text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (quantity <> 0)
);

comment on table public.stock_movements is
  'Immutable stock movement ledger. Adjustments update inventory_items.current_stock via API.';

create index if not exists idx_stock_movements_item_id on public.stock_movements (inventory_item_id);
create index if not exists idx_stock_movements_branch_id on public.stock_movements (branch_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements (created_at desc);
create index if not exists idx_stock_movements_type on public.stock_movements (movement_type);

-- ---------------------------------------------------------------------------
-- 3) RLS + grants
-- ---------------------------------------------------------------------------
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists "Staff select branch inventory_items" on public.inventory_items;
create policy "Staff select branch inventory_items"
  on public.inventory_items
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch stock_movements" on public.stock_movements;
create policy "Staff select branch stock_movements"
  on public.stock_movements
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.inventory_items from public, anon, authenticated;
revoke all on public.stock_movements from public, anon, authenticated;

grant select on public.inventory_items to authenticated;
grant select on public.stock_movements to authenticated;

grant all on public.inventory_items to service_role;
grant all on public.stock_movements to service_role;

commit;
