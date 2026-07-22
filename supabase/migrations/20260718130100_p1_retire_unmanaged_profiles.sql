-- =============================================================================
-- P1: Retire unmanaged public.profiles + dead handle_new_user
-- ID: P1-PROFILES-001 / DB-R1
-- Source design: docs/database/remediation/P1_retire_unmanaged_profiles.sql
-- Classification: UNMANAGED PRODUCTION DRIFT
-- Does NOT: drop public.users, touch live auth trigger, apply modifiers (DB-R2)
-- Timestamp after applied P0 (20260718130000) — do not use 20260718120100
-- =============================================================================
-- Context:
--   - public.profiles is NOT in the migration chain
--   - Canonical identity is public.users
--   - Dead function public.handle_new_user() inserts into profiles; NOT on auth.users
--   - Live auth trigger: on_auth_user_created → handle_auth_user_created → public.users
-- =============================================================================

begin;

-- 1) Guard: refuse if unexpected data present (skip when profiles never existed — fresh local)
do $$
declare
  n bigint;
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;
  select count(*) into n from public.profiles;
  if n > 0 then
    raise exception 'P1-PROFILES-001 blocked: public.profiles has % rows — export and owner-approve merge before drop', n;
  end if;
end $$;

-- 2) Remove policies (no-op when table absent)
do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "Users can view own profile" on public.profiles';
    execute 'drop policy if exists "Users can update own profile" on public.profiles';
    execute 'revoke all on table public.profiles from anon, authenticated, service_role, public';
  end if;
end $$;

-- 3) Drop dead bootstrap function
drop function if exists public.handle_new_user();

-- 4) Drop unmanaged table
drop table if exists public.profiles;

commit;
