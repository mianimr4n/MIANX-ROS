-- D4 — platform.health.read for technical system-health dashboard access.
-- Forward-only. Idempotent. Do not apply to production until merge gate.
-- Ordinary ops roles must NOT receive this permission.

begin;

insert into public.permissions (module, action, code, description)
values
  (
    'platform',
    'health_read',
    'platform.health.read',
    'Read global technical system health (database probe, notification outbox, provider diagnostics).'
  )
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Super Admin only at seed time. Explicit grant required for any other principal.
insert into public.role_permissions (role_id, permission_id)
select roles.id, permissions.id
from public.roles
join public.permissions on permissions.code = 'platform.health.read'
where roles.code = 'super-admin'
on conflict do nothing;

commit;
