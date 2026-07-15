-- Sprint 3 Slice 2A — authorization foundation (RBAC alignment only).
-- Forward-only. Idempotent. Do not apply to production from this workstream.
--
-- Goals:
--   * Keep staff role-permission seed intact.
--   * Ensure `customer` has zero permissions until explicitly approved later.
--   * Never assign privileged roles from auth metadata.
--   * Add a supporting lookup index for principal resolution.
--
-- Out of scope: OTP, invitations, addresses, order RLS, Admin/POS UI.

begin;

-- Customer role must exist (Slice 1 also seeds this; safe to re-assert).
insert into public.roles (name, code, description, is_system_role)
values (
  'Customer',
  'customer',
  'Authenticated storefront customer. Slice 2A approved permissions: none.',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role;

-- Approved customer permission set for Slice 2A is empty.
-- Remove any accidental grants so customers cannot inherit staff capabilities.
delete from public.role_permissions
where role_id in (select id from public.roles where code = 'customer');

-- Supporting index for auth principal resolution (user_id already indexed; add auth_user_id).
create index if not exists idx_users_auth_user_id
  on public.users (auth_user_id)
  where auth_user_id is not null;

-- -----------------------------------------------------------------------------
-- Verification (manual):
--   select count(*) from public.role_permissions rp
--   join public.roles r on r.id = rp.role_id
--   where r.code = 'customer'; -- expect 0
--
--   select code from public.roles where code in
--     ('super-admin','branch-manager','kitchen','cashier','rider','customer-support','customer');
--
-- Rollback guidance:
--   drop index if exists public.idx_users_auth_user_id;
--   -- Do not re-grant customer permissions; empty set is intentional for 2A.
-- -----------------------------------------------------------------------------

commit;
