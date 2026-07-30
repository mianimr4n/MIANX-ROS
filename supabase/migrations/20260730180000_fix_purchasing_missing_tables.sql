-- =============================================================================
-- Purchasing completion — ensure supplier/PO tables + add requisitions & GRN
-- Additive only. Idempotent create-if-not-exists for prior purchasing migration.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Ensure purchasing.manage (safe if already seeded)
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('purchasing', 'manage', 'purchasing.manage', 'Manage suppliers, purchase orders, requisitions, and goods receiving.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'purchasing.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 1) Ensure suppliers + purchase_orders exist (fix for unapplied prior mig)
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name varchar(200) not null,
  contact_person varchar(150),
  phone varchar(40),
  email varchar(150),
  address text,
  status text not null default 'active' check (
    status in ('active', 'inactive')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_suppliers_branch_id on public.suppliers (branch_id);
create index if not exists idx_suppliers_status on public.suppliers (status);
create index if not exists idx_suppliers_name on public.suppliers (name);

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  po_number varchar(40) not null,
  status text not null default 'draft' check (
    status in (
      'draft',
      'submitted',
      'approved',
      'ordered',
      'partially_received',
      'received',
      'cancelled'
    )
  ),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  expected_delivery_date date,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, po_number)
);

create index if not exists idx_purchase_orders_branch_id on public.purchase_orders (branch_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders (supplier_id);
create index if not exists idx_purchase_orders_status on public.purchase_orders (status);
create index if not exists idx_purchase_orders_created_at on public.purchase_orders (created_at desc);

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) purchase_requisitions
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  title varchar(200) not null,
  status text not null default 'draft' check (
    status in ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled')
  ),
  notes text,
  requested_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.purchase_requisitions is
  'Branch-scoped purchase requisitions (header). Line items Coming Soon.';

create index if not exists idx_purchase_requisitions_branch_id on public.purchase_requisitions (branch_id);
create index if not exists idx_purchase_requisitions_status on public.purchase_requisitions (status);
create index if not exists idx_purchase_requisitions_created_at on public.purchase_requisitions (created_at desc);

drop trigger if exists set_purchase_requisitions_updated_at on public.purchase_requisitions;
create trigger set_purchase_requisitions_updated_at
before update on public.purchase_requisitions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) goods_receiving (GRN headers)
-- ---------------------------------------------------------------------------
create table if not exists public.goods_receiving (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  grn_number varchar(40) not null,
  status text not null default 'draft' check (
    status in ('draft', 'posted', 'cancelled')
  ),
  received_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (branch_id, grn_number)
);

comment on table public.goods_receiving is
  'Branch-scoped goods receiving / GRN headers. Line-level inventory posting Coming Soon.';

create index if not exists idx_goods_receiving_branch_id on public.goods_receiving (branch_id);
create index if not exists idx_goods_receiving_po_id on public.goods_receiving (purchase_order_id);
create index if not exists idx_goods_receiving_status on public.goods_receiving (status);
create index if not exists idx_goods_receiving_created_at on public.goods_receiving (created_at desc);

drop trigger if exists set_goods_receiving_updated_at on public.goods_receiving;
create trigger set_goods_receiving_updated_at
before update on public.goods_receiving
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) RLS + grants
-- ---------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_requisitions enable row level security;
alter table public.goods_receiving enable row level security;

drop policy if exists "Staff select branch suppliers" on public.suppliers;
create policy "Staff select branch suppliers"
  on public.suppliers
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch purchase_orders" on public.purchase_orders;
create policy "Staff select branch purchase_orders"
  on public.purchase_orders
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch purchase_requisitions" on public.purchase_requisitions;
create policy "Staff select branch purchase_requisitions"
  on public.purchase_requisitions
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

drop policy if exists "Staff select branch goods_receiving" on public.goods_receiving;
create policy "Staff select branch goods_receiving"
  on public.goods_receiving
  for select
  to authenticated
  using (public.current_user_has_branch_access(branch_id));

revoke all on public.suppliers from public, anon, authenticated;
revoke all on public.purchase_orders from public, anon, authenticated;
revoke all on public.purchase_requisitions from public, anon, authenticated;
revoke all on public.goods_receiving from public, anon, authenticated;

grant select on public.suppliers to authenticated;
grant select on public.purchase_orders to authenticated;
grant select on public.purchase_requisitions to authenticated;
grant select on public.goods_receiving to authenticated;

grant all on public.suppliers to service_role;
grant all on public.purchase_orders to service_role;
grant all on public.purchase_requisitions to service_role;
grant all on public.goods_receiving to service_role;

-- Encourage PostgREST to pick up new relations promptly.
notify pgrst, 'reload schema';

commit;
