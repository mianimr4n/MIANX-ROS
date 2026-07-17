-- =============================================================================
-- REMEDIATION DESIGN ONLY — DO NOT APPLY without owner approval
-- ID: P1-PROFILES-001
-- Title: Retire unmanaged public.profiles + dead handle_new_user
-- Severity: P1 — blocks freeze until owner disposition
-- Classification: UNMANAGED PRODUCTION DRIFT
-- Proposed migration name:
--   20260718120100_p1_retire_unmanaged_profiles.sql
-- =============================================================================
-- Context:
--   - public.profiles is NOT in the migration chain
--   - Canonical identity is public.users (Sprint 3 explicit non-goal: no parallel profiles)
--   - Production row count observed: 0
--   - Unique column vs users: address (unused; 0 rows)
--   - RLS policies: "Users can view/update own profile" on profiles
--   - Dead function public.handle_new_user() inserts into profiles; NOT attached to auth.users
--   - Live auth trigger: on_auth_user_created → handle_auth_user_created → public.users
--
-- Preconditions:
--   1) P0 grant hardening applied OR profiles grants revoked in same change window
--   2) Verify: select count(*) from public.profiles;  -- expect 0
--   3) Verify no app code references .from('profiles') / public.profiles
--   4) Verify: no trigger on auth.users calling handle_new_user
--   5) Owner approval to drop unmanaged object
--
-- Data preservation:
--   If count(*) > 0: COPY OUT before drop (CSV of id/email/full_name/phone/address/created_at)
--   Map: profiles.id = auth.users.id; public.users.auth_user_id is the join key for any merge
--   address has no column on users — preserve in export; do not invent users.address in V1
-- =============================================================================

begin;

-- 1) Guard: refuse if unexpected data present (operator may remove after export)
do $$
declare
  n bigint;
begin
  select count(*) into n from public.profiles;
  if n > 0 then
    raise exception 'P1-PROFILES-001 blocked: public.profiles has % rows — export and owner-approve merge before drop', n;
  end if;
end $$;

-- 2) Remove policies
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- 3) Revoke all client grants
revoke all on table public.profiles from anon, authenticated, service_role, public;

-- 4) Drop dead bootstrap function (confirm no dependents first)
drop function if exists public.handle_new_user();

-- 5) Drop unmanaged table
drop table if exists public.profiles;

commit;

-- =============================================================================
-- Verification
-- =============================================================================
-- select to_regclass('public.profiles');                         -- null
-- select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and proname='handle_new_user';       -- 0 rows
-- select tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
--  join pg_namespace n on n.oid=c.relnamespace
--  where n.nspname='auth' and c.relname='users' and not t.tgisinternal;
-- Expect: on_auth_user_created only (handle_auth_user_created)
--
-- Rollback:
--   Do NOT recreate from memory in production without a reviewed migration.
--   If rollback required urgently, restore from schema snapshot section for profiles
--   in docs/database/production-schema-snapshot.sql as a NEW forward migration,
--   then re-assess — prefer staying on public.users only.
-- =============================================================================
