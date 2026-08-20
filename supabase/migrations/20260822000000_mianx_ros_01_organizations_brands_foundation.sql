-- =============================================================================
-- MIANX-ROS-01 — Organizations & Brands foundation (multi-tenant Phase A)
-- =============================================================================
-- Promotes the existing SINGLETON organization_settings (id=1, one hardcoded
-- organization_id) into a real, multi-row `organizations` table. Also adds a
-- `brands` table (Organization -> Brand -> Branch, matching the Mianx ROS
-- target architecture) and links branches to it.
--
-- This migration is ADDITIVE and ZERO-DATA-MIGRATION for existing rows:
--   - organization_settings.organization_id, branches.organization_id,
--     user_roles.organization_id, staff_invites.organization_id already all
--     point at the fixed UUID '00000000-0000-4000-8000-000000000001'.
--   - We create the `organizations` row using THAT SAME UUID as its primary
--     key, so every existing foreign key / query that already filters by
--     organization_id keeps working with zero row-level changes.
--   - Brand values are backfilled from the current hardcoded values in
--     apps/website/client/src/lib/brand.ts (Telepizza colors/logo/tagline),
--     so the live site's visual output does not change.
--
-- Safe on production tip 20260821000000 (ADR-016/017 OTP). Does not modify
-- existing rows outside the backfill inserts below. Does not drop the
-- existing hardcoded default on organization_id/brand_id yet — that default
-- is intentionally left in place until the API layer is updated to always
-- pass organization_id/brand_id explicitly on new-tenant writes (tracked as
-- a follow-up migration, MIANX-ROS-02).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) organizations — the real tenant table
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug varchar(80) not null unique,
  legal_name varchar(200) not null,
  display_name varchar(200) not null,
  status text not null default 'active' check (status in ('active', 'suspended', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.organizations is
  'Mianx ROS tenants. One row per onboarded business. Telepizza is seeded as the first tenant using its existing fixed organization_id so no other table needs a data migration.';

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

alter table public.organizations enable row level security;

drop policy if exists "Authenticated staff can read organizations" on public.organizations;
create policy "Authenticated staff can read organizations"
  on public.organizations
  for select
  to authenticated
  using (true);

revoke all on public.organizations from public, anon, authenticated;
grant select on public.organizations to authenticated;
grant all on public.organizations to service_role;

-- Seed Telepizza as the first tenant, reusing the UUID already referenced
-- everywhere else in the schema.
insert into public.organizations (id, slug, legal_name, display_name, status)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'telepizza-pk',
  'Telepizza Pakistan',
  'Telepizza',
  'active'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) organization_settings — repoint to organizations(id) as its parent
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_settings_organization_id_fkey'
      and conrelid = 'public.organization_settings'::regclass
  ) then
    alter table public.organization_settings
      add constraint organization_settings_organization_id_fkey
      foreign key (organization_id)
      references public.organizations (id)
      on update restrict on delete restrict;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3) brands — new layer between organizations and branches
-- ---------------------------------------------------------------------------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  slug varchar(80) not null,
  name varchar(200) not null,
  tagline varchar(200),
  logo_primary_url text,
  logo_wordmark_url text,
  favicon_url text,
  color_primary varchar(20),
  color_primary_dark varchar(20),
  color_accent varchar(20),
  color_background varchar(20),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, slug)
);

comment on table public.brands is
  'A tenant can eventually run more than one brand. Backs the dynamic replacement for the currently-hardcoded BRAND object in apps/website/client/src/lib/brand.ts.';

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

alter table public.brands enable row level security;

-- Brand data (name/logo/colors) is what the public customer-facing website
-- renders today via the hardcoded BRAND object, so it must stay publicly
-- readable — this table replaces that hardcoded object, not restricts it.
drop policy if exists "Anyone can read active brands" on public.brands;
create policy "Anyone can read active brands"
  on public.brands
  for select
  to anon, authenticated
  using (status = 'active');

revoke all on public.brands from public, anon, authenticated;
grant select on public.brands to anon, authenticated;
grant all on public.brands to service_role;

-- Seed Telepizza's brand using the current values from
-- apps/website/client/src/lib/brand.ts — visual output does not change.
insert into public.brands (
  id, organization_id, slug, name, tagline,
  logo_primary_url, logo_wordmark_url, favicon_url,
  color_primary, color_primary_dark, color_accent, color_background, status
)
values (
  '00000000-0000-4000-8000-000000000101'::uuid,
  '00000000-0000-4000-8000-000000000001'::uuid,
  'telepizza',
  'Telepizza',
  'Love At First Bite',
  '/images/telepizza-logo-primary.jpg',
  '/images/telepizza-logo.png',
  '/favicon.jpg',
  '#E31E24',
  '#B5121B',
  '#F5B800',
  '#FFF7F3',
  'active'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4) branches — link to brands (nullable -> backfill -> not null)
-- ---------------------------------------------------------------------------
alter table public.branches
  add column if not exists brand_id uuid;

update public.branches
set brand_id = '00000000-0000-4000-8000-000000000101'::uuid
where brand_id is null;

alter table public.branches
  alter column brand_id set default '00000000-0000-4000-8000-000000000101'::uuid,
  alter column brand_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'branches_brand_id_fkey'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_brand_id_fkey
      foreign key (brand_id)
      references public.brands (id)
      on update restrict on delete restrict;
  end if;
end
$$;

create index if not exists branches_brand_id_idx
  on public.branches (brand_id);

create index if not exists brands_organization_id_idx
  on public.brands (organization_id);

commit;
