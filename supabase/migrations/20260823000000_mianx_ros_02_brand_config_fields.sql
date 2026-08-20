-- =============================================================================
-- MIANX-ROS-02 — Brand config fields (Phase C: dynamic brand layer)
-- =============================================================================
-- Extends public.brands (created in MIANX-ROS-01) with the remaining fields
-- apps/website/client/src/lib/brand.ts currently hardcodes: legal_name,
-- phone, hours, city, region. Backfills Telepizza's current values so the
-- live site's output is unchanged once brand.ts switches to fetching this
-- table via GET /api/v1/brand.
--
-- Additive only. Safe to re-run.
-- =============================================================================

begin;

alter table public.brands
  add column if not exists legal_name varchar(200),
  add column if not exists phone varchar(30),
  add column if not exists hours varchar(100),
  add column if not exists city varchar(100),
  add column if not exists region varchar(100);

update public.brands
set
  legal_name = 'Telepizza Pakistan',
  phone = '0304-1110495',
  hours = '10:00 AM – 2:30 AM',
  city = 'Multan',
  region = 'Pakistan'
where id = '00000000-0000-4000-8000-000000000101'::uuid
  and legal_name is null;

commit;
