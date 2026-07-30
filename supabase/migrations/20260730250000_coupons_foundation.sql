-- REQ-ADM-180: Marketing coupons foundation.
-- Note: 20260730220000 is reserved for atomic inventory/GRN — this uses 20260730250000.

begin;

insert into public.permissions (module, action, code, description)
values
  ('marketing', 'manage', 'marketing.manage', 'Manage marketing coupons and promotional codes.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'marketing.manage'
  and r.code in ('super-admin', 'branch-manager')
on conflict do nothing;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id) on delete cascade,
  code varchar(40) not null,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  min_order numeric(12, 2) not null default 0 check (min_order >= 0),
  expiry_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'expired')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (code)
);

comment on table public.coupons is
  'REQ-ADM-180 coupon master. Validation on quote/checkout remains Coming Soon — CRUD is LIVE.';

create index if not exists idx_coupons_branch on public.coupons (branch_id);
create index if not exists idx_coupons_status on public.coupons (status);
create index if not exists idx_coupons_expiry on public.coupons (expiry_date);

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;

drop policy if exists "Staff select coupons" on public.coupons;
create policy "Staff select coupons"
  on public.coupons
  for select
  to authenticated
  using (
    branch_id is null
    or public.current_user_has_branch_access(branch_id)
  );

revoke all on public.coupons from public, anon, authenticated;
grant select on public.coupons to authenticated;
grant all on public.coupons to service_role;

commit;
