-- =============================================================================
-- REMEDIATION DESIGN ONLY — DO NOT APPLY without owner approval
-- ID: P0-GRANT-001 / P0-DEFINER-001
-- Title: Harden client grants + SECURITY DEFINER EXECUTE surface
-- Severity: P0 — blocks database freeze
-- Target: supabase migration (proposed name)
--   20260718120000_p0_harden_grants_and_definer_execute.sql
-- =============================================================================
-- Preconditions (verify before apply):
--   1) migration list --linked aligned
--   2) db push --dry-run up to date before this file exists
--   3) API uses service_role for order/payment/invite writes (current architecture)
--   4) No dependency on anon TRUNCATE/DML (there must be none)
--
-- Does NOT:
--   - drop tables
--   - mutate row data
--   - touch auth.users
--   - alter migration history
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- A) Strip dangerous privileges from client roles on ALL public base tables
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('revoke truncate, references, trigger on table public.%I from anon, authenticated', r.table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- B) Catalog: anon/authenticated SELECT only
-- ---------------------------------------------------------------------------
revoke insert, update, delete, truncate, references, trigger
  on table public.branches, public.menu_categories, public.menu_items, public.menu_item_variants
  from anon, authenticated;

grant select on table public.branches, public.menu_categories, public.menu_items, public.menu_item_variants
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- C) Identity / RBAC: no anon; authenticated limited
-- ---------------------------------------------------------------------------
revoke all on table public.users from anon;
revoke insert, delete, truncate, references, trigger on table public.users from authenticated;
grant select, update on table public.users to authenticated;

revoke all on table public.user_roles from anon;
revoke insert, update, delete, truncate, references, trigger on table public.user_roles from authenticated;
grant select on table public.user_roles to authenticated;

revoke all on table public.roles from anon;
revoke insert, update, delete, truncate, references, trigger on table public.roles from authenticated;
grant select on table public.roles to authenticated;

revoke all on table
  public.permissions,
  public.role_permissions,
  public.customers,
  public.staff,
  public.riders
from anon, authenticated;

-- ---------------------------------------------------------------------------
-- D) Operational tables — reinforce Slice 2D (no client writes; no TRUNCATE)
-- ---------------------------------------------------------------------------
revoke all on table public.orders, public.order_items, public.order_status_logs, public.deliveries, public.payments
  from anon;

revoke insert, update, delete, truncate, references, trigger
  on table public.orders, public.order_items, public.order_status_logs, public.deliveries
  from authenticated;
grant select on table public.orders, public.order_items, public.order_status_logs, public.deliveries
  to authenticated;

revoke all on table public.payments from authenticated;
grant select, insert, update, delete on table public.payments to service_role;

grant select, insert, update, delete on table
  public.orders, public.order_items, public.order_status_logs, public.deliveries
  to service_role;

-- ---------------------------------------------------------------------------
-- E) Staff invites remain service_role-only
-- ---------------------------------------------------------------------------
revoke all on table public.staff_invites, public.staff_invite_events from anon, authenticated;
grant select, insert, update, delete on table public.staff_invites to service_role;
grant select, insert on table public.staff_invite_events to service_role;

-- ---------------------------------------------------------------------------
-- F) DEFINER / privileged function EXECUTE lockdown
-- ---------------------------------------------------------------------------
revoke all on function public.ensure_customer_profile_for_auth_user(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ensure_customer_profile_for_auth_user(uuid, text, text) to service_role;

revoke all on function public.handle_auth_user_created() from public, anon, authenticated;
-- trigger owner executes as definer; no client EXECUTE required

revoke all on function public.finalize_staff_invite_acceptance(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.finalize_staff_invite_acceptance(uuid, uuid, text) to service_role;

revoke all on function public.auth_user_email_exists(text) from public, anon, authenticated;
grant execute on function public.auth_user_email_exists(text) to service_role;

revoke all on function public.current_app_user_id() from public, anon;
revoke all on function public.current_user_is_active() from public, anon;
revoke all on function public.current_user_is_super_admin() from public, anon;
revoke all on function public.current_user_branch_ids() from public, anon;
revoke all on function public.current_user_has_branch_access(uuid) from public, anon;
revoke all on function public.current_customer_owns_order(uuid) from public, anon;

grant execute on function public.current_app_user_id() to authenticated, service_role;
grant execute on function public.current_user_is_active() to authenticated, service_role;
grant execute on function public.current_user_is_super_admin() to authenticated, service_role;
grant execute on function public.current_user_branch_ids() to authenticated, service_role;
grant execute on function public.current_user_has_branch_access(uuid) to authenticated, service_role;
grant execute on function public.current_customer_owns_order(uuid) to authenticated, service_role;

-- Dead legacy function (profiles writer) — revoke everyone; drop in P1 migration
revoke all on function public.handle_new_user() from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- G) Default privileges — stop future tables inheriting over-broad grants
-- ---------------------------------------------------------------------------
alter default privileges in schema public
  revoke insert, update, delete on tables from anon;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon, authenticated;

commit;

-- =============================================================================
-- Verification SQL (read-only)
-- =============================================================================
-- select grantee, table_name, string_agg(privilege_type, ',' order by privilege_type)
-- from information_schema.role_table_grants
-- where table_schema='public' and grantee in ('anon','authenticated')
-- group by 1,2 order by 2,1;
--
-- Expect: no TRUNCATE; no anon DML on non-catalog; catalog SELECT only;
-- orders family authenticated SELECT only; payments/invites absent for clients.
--
-- select routine_name, grantee from information_schema.routine_privileges
-- where specific_schema='public' and grantee='anon';
-- Expect: 0 rows for DEFINER helpers listed above.
--
-- Rollback notes:
--   Re-grant only via a new forward migration after owner review.
--   Do not restore TRUNCATE to anon/authenticated.
-- =============================================================================
