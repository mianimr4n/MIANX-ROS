-- Seed reports.read for BI workspace (order.manage remains accepted by API for existing roles).

insert into public.permissions (module, action, code, description)
values
  ('reports', 'read', 'reports.read', 'Read sales analytics and export operational reports.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.code = 'reports.read'
where roles.code in ('super-admin', 'branch-manager')
on conflict do nothing;
