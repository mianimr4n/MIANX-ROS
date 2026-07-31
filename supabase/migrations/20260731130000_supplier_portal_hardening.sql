-- RC3 Supplier Portal hardening: portal-user lifecycle, granular permissions,
-- response idempotency, delivery-date propose/confirm, document review metadata.
-- Additive. No Production apply in this slice. No fake seed data.

begin;

-- ---------------------------------------------------------------------------
-- 0) Granular supplier permissions (all granted only to supplier role)
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('supplier', 'portal_access', 'supplier.portal.access', 'Access the supplier portal shell.'),
  ('supplier', 'po_read', 'supplier.purchase_orders.read', 'Read assigned purchase orders.'),
  ('supplier', 'po_respond', 'supplier.purchase_orders.respond', 'Respond to assigned purchase orders.'),
  ('supplier', 'documents_read', 'supplier.documents.read', 'Read own supplier documents.'),
  ('supplier', 'documents_create', 'supplier.documents.create', 'Create document references for own supplier.'),
  ('supplier', 'profile_read', 'supplier.profile.read', 'Read own supplier profile.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Keep legacy supplier.portal as alias permission for existing callers
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'supplier'
  and p.code in (
    'supplier.portal',
    'supplier.portal.access',
    'supplier.purchase_orders.read',
    'supplier.purchase_orders.respond',
    'supplier.documents.read',
    'supplier.documents.create',
    'supplier.profile.read'
  )
on conflict do nothing;

-- Explicitly never grant staff-only procurement/finance permissions to supplier role
-- (no insert — default deny)

-- ---------------------------------------------------------------------------
-- 1) Portal user lifecycle columns / statuses
-- ---------------------------------------------------------------------------
alter table public.supplier_portal_users
  drop constraint if exists supplier_portal_users_status_check;

alter table public.supplier_portal_users
  add column if not exists invited_by uuid references public.users (id) on delete set null,
  add column if not exists activated_by uuid references public.users (id) on delete set null,
  add column if not exists activated_at timestamptz,
  add column if not exists deactivated_at timestamptz,
  add column if not exists last_login_at timestamptz;

-- Migrate existing 'inactive' → 'deactivated' before tightening check
update public.supplier_portal_users
set status = 'deactivated',
    deactivated_at = coalesce(deactivated_at, timezone('utc', now()))
where status = 'inactive';

alter table public.supplier_portal_users
  add constraint supplier_portal_users_status_check check (
    status in ('invited', 'active', 'suspended', 'deactivated')
  );

comment on table public.supplier_portal_users is
  'Maps an authenticated principal to exactly one supplier. Statuses: invited|active|suspended|deactivated.';

-- RLS helper: only active portal links
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

-- ---------------------------------------------------------------------------
-- 2) Response types + idempotency
-- ---------------------------------------------------------------------------
alter table public.purchase_order_responses
  drop constraint if exists purchase_order_responses_response_type_check;

alter table public.purchase_order_responses
  add constraint purchase_order_responses_response_type_check check (
    response_type in (
      'acknowledge',
      'accept',
      'reject',
      'request_amendment',
      'propose_delivery_date',
      'confirm_delivery_date'
    )
  );

alter table public.purchase_order_responses
  add column if not exists idempotency_key text;

create unique index if not exists uq_po_responses_idempotency
  on public.purchase_order_responses (idempotency_key)
  where idempotency_key is not null;

alter table public.purchase_orders
  drop constraint if exists purchase_orders_supplier_response_status_check;

alter table public.purchase_orders
  add constraint purchase_orders_supplier_response_status_check check (
    supplier_response_status is null
    or supplier_response_status in (
      'acknowledged',
      'accepted',
      'amendment_requested',
      'rejected',
      'delivery_date_proposed',
      'delivery_date_confirmed'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) Document review metadata (binary upload remains Coming Soon)
-- ---------------------------------------------------------------------------
alter table public.supplier_documents
  add column if not exists mime_type varchar(120),
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  add column if not exists review_state text not null default 'pending_review'
    check (review_state in ('pending_review', 'accepted', 'rejected')),
  add column if not exists status text not null default 'active'
    check (status in ('active', 'superseded', 'deleted'));

alter table public.supplier_documents
  drop constraint if exists supplier_documents_document_type_check;

alter table public.supplier_documents
  add constraint supplier_documents_document_type_check check (
    document_type in (
      'invoice',
      'delivery_note',
      'tax_document',
      'contract',
      'quality_certificate',
      'quotation',
      'purchase_order_acknowledgement',
      'product_specification',
      'dispatch_note',
      'other'
    )
  );

comment on table public.supplier_documents is
  'Supplier document metadata/references. Binary upload infrastructure Coming Soon — URL references only.';

-- ---------------------------------------------------------------------------
-- 4) Staff amendment decision audit (does not mutate historical supplier responses)
-- ---------------------------------------------------------------------------
create table if not exists public.supplier_response_staff_decisions (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  response_id uuid not null references public.purchase_order_responses (id) on delete restrict,
  decision text not null check (decision in ('accept_amendment', 'reject_amendment', 'note')),
  internal_note text,
  decided_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.supplier_response_staff_decisions is
  'Staff decisions on supplier amendment/delivery proposals. Append-only; does not rewrite supplier responses.';

create index if not exists idx_supplier_response_staff_decisions_po
  on public.supplier_response_staff_decisions (purchase_order_id, created_at desc);

alter table public.supplier_response_staff_decisions enable row level security;

drop policy if exists "Staff select response decisions" on public.supplier_response_staff_decisions;
create policy "Staff select response decisions"
  on public.supplier_response_staff_decisions for select to authenticated
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = purchase_order_id
        and public.current_user_has_branch_access(po.branch_id)
    )
  );

revoke all on public.supplier_response_staff_decisions from public, anon, authenticated;
grant select on public.supplier_response_staff_decisions to authenticated;
grant all on public.supplier_response_staff_decisions to service_role;

commit;
