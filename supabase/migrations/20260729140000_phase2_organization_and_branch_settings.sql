-- =============================================================================
-- Phase 2: Organization profile + branch profile fields
-- Additive only. Does not drop or rewrite existing branch rows.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1) Singleton organization_settings (company profile for Admin Settings)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_settings (
  id smallint primary key default 1 check (id = 1),
  company_name varchar(200) not null,
  phone varchar(30),
  email varchar(150),
  address text,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.organization_settings is
  'Singleton organization / company profile for Admin Settings (Phase 2).';

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;
create trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

alter table public.organization_settings enable row level security;

drop policy if exists "Authenticated staff can read organization settings"
  on public.organization_settings;
create policy "Authenticated staff can read organization settings"
  on public.organization_settings
  for select
  to authenticated
  using (true);

revoke all on public.organization_settings from public, anon, authenticated;
grant select on public.organization_settings to authenticated;
grant all on public.organization_settings to service_role;

-- Seed singleton from known public brand contact (branch catalog phone). Email/address left null until Owner sets them.
insert into public.organization_settings (id, company_name, phone, email, address)
values (1, 'Telepizza', '0304-1110495', null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Branch delivery radius (km) — nullable; Owner sets from Settings
-- ---------------------------------------------------------------------------
alter table public.branches
  add column if not exists delivery_radius_km numeric(8, 2);

alter table public.branches drop constraint if exists chk_branches_delivery_radius_km;
alter table public.branches
  add constraint chk_branches_delivery_radius_km
  check (delivery_radius_km is null or delivery_radius_km >= 0);

comment on column public.branches.delivery_radius_km is
  'Optional delivery service radius in kilometres. Null means not configured.';

commit;
