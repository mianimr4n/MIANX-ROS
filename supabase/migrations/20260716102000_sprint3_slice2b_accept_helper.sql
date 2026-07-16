-- Sprint 3 Slice 2B — staff invite accept helper + controlled privilege provision.
-- Forward-only. Idempotent. Do not apply to production until merge gate.

begin;

-- Allow controlled user_type/status updates only when session flag is set by SECURITY DEFINER helper.
create or replace function public.prevent_users_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'auth_user_id cannot be changed';
    end if;

    if new.user_type is distinct from old.user_type
       and coalesce(current_setting('telepizza.allow_staff_provision', true), '') is distinct from 'on' then
      raise exception 'user_type cannot be changed by clients';
    end if;

    if new.password_hash is distinct from old.password_hash then
      raise exception 'password_hash cannot be changed for Supabase Auth users';
    end if;

    if new.status is distinct from old.status
       and coalesce(auth.role(), '') = 'authenticated'
       and coalesce(current_setting('telepizza.allow_staff_provision', true), '') is distinct from 'on' then
      raise exception 'status cannot be changed by authenticated clients';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.finalize_staff_invite_acceptance(
  p_invite_id uuid,
  p_auth_user_id uuid,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.staff_invites%rowtype;
  role_code text;
  target_user_type text;
  app_user_id uuid;
begin
  select * into invite_row
  from public.staff_invites
  where id = p_invite_id
  for update;

  if not found then
    raise exception 'invite not found';
  end if;

  if invite_row.status is distinct from 'pending' then
    raise exception 'invite not acceptable';
  end if;

  if invite_row.token_expires_at is null or invite_row.token_expires_at <= timezone('utc', now()) then
    update public.staff_invites
    set status = 'expired', token_hash = null, updated_at = timezone('utc', now())
    where id = invite_row.id;
    raise exception 'invite expired';
  end if;

  select code into role_code from public.roles where id = invite_row.role_id;
  if role_code is null or role_code = 'customer' then
    raise exception 'invite role invalid';
  end if;

  target_user_type := case role_code
    when 'super-admin' then 'admin'
    when 'rider' then 'rider'
    when 'customer-support' then 'support'
    else 'staff'
  end;

  perform set_config('telepizza.allow_staff_provision', 'on', true);

  select id into app_user_id
  from public.users
  where auth_user_id = p_auth_user_id
  for update;

  if app_user_id is null then
    insert into public.users (
      auth_user_id,
      full_name,
      email,
      phone,
      password_hash,
      user_type,
      status
    )
    values (
      p_auth_user_id,
      coalesce(nullif(trim(p_full_name), ''), invite_row.full_name, 'Staff'),
      invite_row.email,
      invite_row.phone,
      null,
      target_user_type,
      'active'
    )
    returning id into app_user_id;
  else
    update public.users
    set
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name, invite_row.full_name),
      email = coalesce(email, invite_row.email),
      user_type = target_user_type,
      status = 'active',
      updated_at = timezone('utc', now())
    where id = app_user_id;
  end if;

  -- Remove accidental customer role from Slice 1 bootstrap.
  delete from public.user_roles ur
  using public.roles r
  where ur.user_id = app_user_id
    and ur.role_id = r.id
    and r.code = 'customer';

  insert into public.user_roles (user_id, role_id, branch_id)
  select app_user_id, invite_row.role_id, invite_row.branch_id
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = app_user_id
      and ur.role_id = invite_row.role_id
      and ur.branch_id is not distinct from invite_row.branch_id
  );

  update public.staff_invites
  set
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    accepted_user_id = app_user_id,
    token_hash = null,
    updated_at = timezone('utc', now())
  where id = invite_row.id;

  insert into public.staff_invite_events (invite_id, actor_user_id, event_type, payload)
  values (
    invite_row.id,
    app_user_id,
    'accept_succeeded',
    jsonb_build_object('auth_user_id', p_auth_user_id, 'role_code', role_code)
  );

  return app_user_id;
end;
$$;

revoke all on function public.finalize_staff_invite_acceptance(uuid, uuid, text) from public;
grant execute on function public.finalize_staff_invite_acceptance(uuid, uuid, text) to service_role;

-- -----------------------------------------------------------------------------
-- Verification:
--   select proname from pg_proc where proname = 'finalize_staff_invite_acceptance';
--
-- Rollback guidance:
--   drop function if exists public.finalize_staff_invite_acceptance(uuid, uuid, text);
--   -- restore previous prevent_users_privilege_escalation from Slice 1 migration if needed
-- -----------------------------------------------------------------------------

commit;
