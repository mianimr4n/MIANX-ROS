-- Sprint 3 Slice 2B — staff permission codes for invite management.
-- Forward-only. Idempotent. Do not apply to production until merge gate.

begin;

insert into public.permissions (module, action, code, description)
values
  ('staff', 'create', 'staff.create', 'Create, send, resend, and revoke staff invitations.'),
  ('staff', 'assign_role', 'staff.assign_role', 'Assign roles on staff invitations and staffing.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Slice 2B v1: only super-admin receives invite management permissions.
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.code in ('staff.create', 'staff.assign_role')
where roles.code = 'super-admin'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Verification:
--   select code from public.permissions where code in ('staff.create','staff.assign_role');
--   select r.code, p.code
--   from public.role_permissions rp
--   join public.roles r on r.id = rp.role_id
--   join public.permissions p on p.id = rp.permission_id
--   where p.code in ('staff.create','staff.assign_role');
--   -- expect only super-admin
--
-- Rollback guidance:
--   delete from public.role_permissions
--   where permission_id in (select id from public.permissions where code in ('staff.create','staff.assign_role'));
--   delete from public.permissions where code in ('staff.create','staff.assign_role');
-- -----------------------------------------------------------------------------

commit;
