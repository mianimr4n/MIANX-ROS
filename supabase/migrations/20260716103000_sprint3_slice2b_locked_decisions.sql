-- Sprint 3 Slice 2B — align DB rules to locked owner decisions D3/D4/CRITICAL.
-- Forward-only. Idempotent. Does not rewrite prior Slice 2B migrations.

begin;

-- ---------------------------------------------------------------------------
-- auth.users email existence check (service_role only)
-- ---------------------------------------------------------------------------
create or replace function public.auth_user_email_exists(p_email text)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  select exists (
    select 1
    from auth.users au
    where lower(au.email) = lower(trim(p_email))
  );
$$;

revoke all on function public.auth_user_email_exists(text) from public;
grant execute on function public.auth_user_email_exists(text) to service_role;

-- ---------------------------------------------------------------------------
-- Invite rules: no customer, no super-admin; branch_id always required + operating
-- ---------------------------------------------------------------------------
create or replace function public.enforce_staff_invite_rules()
returns trigger
language plpgsql
as $$
declare
  role_code text;
  branch_status text;
begin
  new.email := lower(trim(new.email));

  select code into role_code
  from public.roles
  where id = new.role_id;

  if role_code is null then
    raise exception 'staff invite role_id is invalid';
  end if;

  if role_code in ('customer', 'super-admin') then
    raise exception 'role % cannot be assigned via staff invite', role_code;
  end if;

  if role_code not in (
    'branch-manager',
    'cashier',
    'kitchen',
    'rider',
    'customer-support'
  ) then
    raise exception 'role % is not inviteable', role_code;
  end if;

  if new.branch_id is null then
    raise exception 'branch_id is required for every staff invite';
  end if;

  select status into branch_status
  from public.branches
  where id = new.branch_id;

  if branch_status is null then
    raise exception 'branch_id does not exist';
  end if;

  if branch_status is distinct from 'operating' then
    raise exception 'branch must be operating';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accept helper: no super-admin; require branch; only upgrade fresh customer bootstrap
-- ---------------------------------------------------------------------------
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
  existing_user_type text;
  non_customer_roles integer;
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

  if invite_row.branch_id is null then
    raise exception 'invite branch missing';
  end if;

  select code into role_code from public.roles where id = invite_row.role_id;
  if role_code is null
     or role_code in ('customer', 'super-admin')
     or role_code not in (
       'branch-manager', 'cashier', 'kitchen', 'rider', 'customer-support'
     ) then
    raise exception 'invite role invalid';
  end if;

  target_user_type := case role_code
    when 'rider' then 'rider'
    when 'customer-support' then 'support'
    else 'staff'
  end;

  perform set_config('telepizza.allow_staff_provision', 'on', true);

  select id, user_type into app_user_id, existing_user_type
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
    -- Only the Slice 1 customer bootstrap for THIS newly created auth user may be upgraded.
    if existing_user_type is distinct from 'customer' then
      raise exception 'invite account conflict';
    end if;

    select count(*)::integer into non_customer_roles
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = app_user_id
      and r.code is distinct from 'customer';

    if coalesce(non_customer_roles, 0) > 0 then
      raise exception 'invite account conflict';
    end if;

    -- Email on profile must match invite (normalized).
    if exists (
      select 1
      from public.users u
      where u.id = app_user_id
        and lower(coalesce(u.email, '')) is distinct from lower(invite_row.email)
        and u.email is not null
    ) then
      raise exception 'invite account conflict';
    end if;

    update public.users
    set
      full_name = coalesce(nullif(trim(p_full_name), ''), full_name, invite_row.full_name),
      email = invite_row.email,
      user_type = target_user_type,
      status = 'active',
      updated_at = timezone('utc', now())
    where id = app_user_id;
  end if;

  -- Remove bootstrap customer role only for this newly provisioned invite user.
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

commit;
