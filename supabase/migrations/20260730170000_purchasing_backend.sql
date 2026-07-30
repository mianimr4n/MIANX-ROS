-- =============================================================================
-- Purchasing backend — supplier master + purchase orders
-- Additive only. Service-role writes via API; authenticated staff may SELECT
-- branch-scoped rows via current_user_has_branch_access.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) Permission: purchasing.manage
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('purchasing', 'manage', 'purchasing.manage', 'Manage suppliers and purchase orders.')
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
-- 1) suppliers
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

comment on table public.suppliers is
  'Branch-scoped supplier master for procurement.';

create index if not exists idx_suppliers_branch_id on public.suppliers (branch_id);
create index if not exists idx_suppliers_status on public.suppliers (status);
create index if not exists idx_suppliers_name on public.suppliers (name);

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2) purchase_orders
-- ---------------------------------------------------------------------------
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

comment on table public.purchase_orders is
  'Branch-scoped purchase orders linked to suppliers. Line items / GRN Coming Soon.';

create index if not exists idx_purchase_orders_branch_id on public.purchase_orders (branch_id);
create index if not exists idx_purchase_orders_supplier_id on public.purchase_orders (supplier_id);
create index if not exists idx_purchase_orders_status on public.purchase_orders (status);
create index if not exists idx_purchase_orders_created_at on public.purchase_orders (created_at desc);

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) RLS + grants
-- ---------------------------------------------------------------------------
alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;

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

revoke all on public.suppliers from public, anon, authenticated;
revoke all on public.purchase_orders from public, anon, authenticated;

grant select on public.suppliers to authenticated;
grant select on public.purchase_orders to authenticated;

grant all on public.suppliers to service_role;
grant all on public.purchase_orders to service_role;

commit;
