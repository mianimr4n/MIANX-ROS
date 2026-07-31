-- RC3 Supplier Portal foundation: supplier auth identity, PO isolation,
-- responses, documents, delivery refs, and auditable portal events.
-- Additive. Service-role mutations via API. No Production apply in this slice.

begin;

-- ---------------------------------------------------------------------------
-- 0) user_type + role + permission
-- ---------------------------------------------------------------------------
alter table public.users drop constraint if exists users_user_type_check;
alter table public.users
  add constraint users_user_type_check check (
    user_type in ('customer', 'staff', 'rider', 'admin', 'support', 'franchise', 'supplier')
  );

insert into public.roles (name, code, description, is_system_role)
values (
  'Supplier',
  'supplier',
  'Supplier portal access — own purchase orders and documents only.',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role;

insert into public.permissions (module, action, code, description)
values (
  'supplier',
  'portal',
  'supplier.portal',
  'Access supplier portal for assigned suppliers.'
)
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'supplier'
  and p.code = 'supplier.portal'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 1) Extend supplier profile (E1) — additive columns only
-- ---------------------------------------------------------------------------
alter table public.suppliers
  add column if not exists tax_id varchar(80),
  add column if not exists business_registration varchar(120),
  add column if not exists payment_terms varchar(120),
  add column if not exists supplied_categories text[] not null default '{}',
  add column if not exists approval_status text not null default 'approved'
    check (approval_status in ('pending', 'approved', 'suspended')),
  add column if not exists notes text;

comment on column public.suppliers.approval_status is
  'Internal approval of supplier for portal/procurement. Distinct from PO approval.';

-- ---------------------------------------------------------------------------
-- 2) supplier_portal_users — true supplier auth linkage
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_portal_users (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id),
  unique (supplier_id, user_id)
);

comment on table public.supplier_portal_users is
  'Maps an authenticated supplier user to exactly one supplier for PO isolation.';

create index if not exists idx_supplier_portal_users_supplier
  on public.supplier_portal_users (supplier_id)
  where status = 'active';

drop trigger if exists set_supplier_portal_users_updated_at on public.supplier_portal_users;
create trigger set_supplier_portal_users_updated_at
before update on public.supplier_portal_users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Helper: supplier IDs for current auth user (RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_supplier_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select spu.supplier_id
  from public.supplier_portal_users spu
  join public.users u on u.id = spu.user_id
  where u.auth_user_id = auth.uid()
    and u.status = 'active'
    and spu.status = 'active';
$$;

revoke all on function public.current_user_supplier_ids() from public, anon;
grant execute on function public.current_user_supplier_ids() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) purchase_order_lines (E2 items)
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  line_number integer not null check (line_number > 0),
  description varchar(300) not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  sku_ref varchar(80),
  created_at timestamptz not null default timezone('utc', now()),
  unique (purchase_order_id, line_number)
);

comment on table public.purchase_order_lines is
  'Line items for purchase orders. Visible to assigned supplier via portal isolation.';

create index if not exists idx_purchase_order_lines_po
  on public.purchase_order_lines (purchase_order_id);

-- ---------------------------------------------------------------------------
-- 5) purchase_order_responses (E3)
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_order_responses (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  response_type text not null check (
    response_type in ('acknowledge', 'accept', 'request_amendment', 'reject')
  ),
  reason text,
  confirmed_delivery_date date,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.purchase_order_responses is
  'Supplier responses to POs. Does not grant internal PO approval authority.';

create index if not exists idx_po_responses_po
  on public.purchase_order_responses (purchase_order_id, created_at desc);
create index if not exists idx_po_responses_supplier
  on public.purchase_order_responses (supplier_id, created_at desc);

-- Latest response snapshot on PO (derived convenience; audit remains in responses)
alter table public.purchase_orders
  add column if not exists supplier_response_status text
    check (
      supplier_response_status is null
      or supplier_response_status in (
        'acknowledged', 'accepted', 'amendment_requested', 'rejected'
      )
    ),
  add column if not exists supplier_confirmed_delivery_date date,
  add column if not exists notes text;

-- ---------------------------------------------------------------------------
-- 6) purchase_order_delivery_refs (E4) — supplier-declared; staff GRN remains SoT
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_order_delivery_refs (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  dispatch_note varchar(160),
  invoice_reference varchar(160),
  expected_delivery date,
  receiving_status text not null default 'awaiting_receipt'
    check (receiving_status in (
      'awaiting_receipt',
      'dispatched',
      'partial',
      'delivered_pending_grn',
      'discrepancy_noted'
    )),
  discrepancy_notes text,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.purchase_order_delivery_refs is
  'Supplier delivery references. Internal GRN acceptance remains staff-owned.';

create index if not exists idx_po_delivery_refs_po
  on public.purchase_order_delivery_refs (purchase_order_id, created_at desc);

drop trigger if exists set_po_delivery_refs_updated_at on public.purchase_order_delivery_refs;
create trigger set_po_delivery_refs_updated_at
before update on public.purchase_order_delivery_refs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7) supplier_documents (E5)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_documents (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  document_type text not null check (
    document_type in (
      'invoice',
      'delivery_note',
      'tax_document',
      'contract',
      'quality_certificate',
      'other'
    )
  ),
  title varchar(200) not null,
  file_url text not null,
  uploaded_by uuid not null references public.users (id) on delete restrict,
  uploaded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.supplier_documents is
  'Supplier document metadata/references. Binary storage via configured URL only.';

create index if not exists idx_supplier_documents_supplier
  on public.supplier_documents (supplier_id, uploaded_at desc);
create index if not exists idx_supplier_documents_po
  on public.supplier_documents (purchase_order_id)
  where purchase_order_id is not null;

-- ---------------------------------------------------------------------------
-- 8) Audit events (H)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_portal_events (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  actor_user_id uuid references public.users (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.supplier_portal_events is
  'Audit ledger for supplier portal provisioning, responses, documents, and delivery refs.';

create index if not exists idx_supplier_portal_events_supplier
  on public.supplier_portal_events (supplier_id, created_at desc);
create index if not exists idx_supplier_portal_events_po
  on public.supplier_portal_events (purchase_order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 9) RLS
-- ---------------------------------------------------------------------------
alter table public.supplier_portal_users enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.purchase_order_responses enable row level security;
alter table public.purchase_order_delivery_refs enable row level security;
alter table public.supplier_documents enable row level security;
alter table public.supplier_portal_events enable row level security;

-- Staff: branch-scoped SELECT (existing pattern). Suppliers: own supplier only.
drop policy if exists "Staff select supplier portal users" on public.supplier_portal_users;
create policy "Staff select supplier portal users"
  on public.supplier_portal_users for select to authenticated
  using (
    exists (
      select 1 from public.suppliers s
      where s.id = supplier_id
        and public.current_user_has_branch_access(s.branch_id)
    )
    or supplier_id in (select public.current_user_supplier_ids())
  );

drop policy if exists "Staff or supplier select PO lines" on public.purchase_order_lines;
create policy "Staff or supplier select PO lines"
  on public.purchase_order_lines for select to authenticated
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and (
          public.current_user_has_branch_access(po.branch_id)
          or po.supplier_id in (select public.current_user_supplier_ids())
        )
    )
  );

drop policy if exists "Staff or supplier select PO responses" on public.purchase_order_responses;
create policy "Staff or supplier select PO responses"
  on public.purchase_order_responses for select to authenticated
  using (
    supplier_id in (select public.current_user_supplier_ids())
    or exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and public.current_user_has_branch_access(po.branch_id)
    )
  );

drop policy if exists "Staff or supplier select delivery refs" on public.purchase_order_delivery_refs;
create policy "Staff or supplier select delivery refs"
  on public.purchase_order_delivery_refs for select to authenticated
  using (
    supplier_id in (select public.current_user_supplier_ids())
    or exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and public.current_user_has_branch_access(po.branch_id)
    )
  );

drop policy if exists "Staff or supplier select documents" on public.supplier_documents;
create policy "Staff or supplier select documents"
  on public.supplier_documents for select to authenticated
  using (
    supplier_id in (select public.current_user_supplier_ids())
    or public.current_user_has_branch_access(branch_id)
  );

drop policy if exists "Staff or supplier select portal events" on public.supplier_portal_events;
create policy "Staff or supplier select portal events"
  on public.supplier_portal_events for select to authenticated
  using (
    (supplier_id is not null and supplier_id in (select public.current_user_supplier_ids()))
    or exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and public.current_user_has_branch_access(po.branch_id)
    )
    or exists (
      select 1 from public.suppliers s
      where s.id = supplier_id
        and public.current_user_has_branch_access(s.branch_id)
    )
  );

-- Extend purchase_orders / suppliers SELECT so suppliers can read own rows
drop policy if exists "Supplier select own purchase_orders" on public.purchase_orders;
create policy "Supplier select own purchase_orders"
  on public.purchase_orders for select to authenticated
  using (supplier_id in (select public.current_user_supplier_ids()));

drop policy if exists "Supplier select own supplier profile" on public.suppliers;
create policy "Supplier select own supplier profile"
  on public.suppliers for select to authenticated
  using (id in (select public.current_user_supplier_ids()));

revoke all on public.supplier_portal_users from public, anon, authenticated;
revoke all on public.purchase_order_lines from public, anon, authenticated;
revoke all on public.purchase_order_responses from public, anon, authenticated;
revoke all on public.purchase_order_delivery_refs from public, anon, authenticated;
revoke all on public.supplier_documents from public, anon, authenticated;
revoke all on public.supplier_portal_events from public, anon, authenticated;

grant select on public.supplier_portal_users to authenticated;
grant select on public.purchase_order_lines to authenticated;
grant select on public.purchase_order_responses to authenticated;
grant select on public.purchase_order_delivery_refs to authenticated;
grant select on public.supplier_documents to authenticated;
grant select on public.supplier_portal_events to authenticated;

grant all on public.supplier_portal_users to service_role;
grant all on public.purchase_order_lines to service_role;
grant all on public.purchase_order_responses to service_role;
grant all on public.purchase_order_delivery_refs to service_role;
grant all on public.supplier_documents to service_role;
grant all on public.supplier_portal_events to service_role;

commit;
