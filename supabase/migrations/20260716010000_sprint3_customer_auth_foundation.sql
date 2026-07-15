-- Sprint 3 Slice 1 — customer auth foundation (forward-only, idempotent).
-- Profile model: public.users (no parallel profiles table).
-- Email signup must NOT insert public.customers (phone NOT NULL until a later slice).
-- Role assignment: customer only; never trust auth metadata for roles/user_type.

begin;

-- ---------------------------------------------------------------------------
-- 1) Customer role seed
-- ---------------------------------------------------------------------------
insert into public.roles (name, code, description, is_system_role)
values (
  'Customer',
  'customer',
  'Authenticated website customer. No staff or admin privileges.',
  true
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  is_system_role = excluded.is_system_role,
  updated_at = timezone('utc', now());

-- Global (branch-less) role uniqueness: Postgres UNIQUE allows multiple NULLs.
create unique index if not exists user_roles_user_role_global_uidx
  on public.user_roles (user_id, role_id)
  where branch_id is null;

-- ---------------------------------------------------------------------------
-- 2) Privilege-escalation guards on public.users
-- ---------------------------------------------------------------------------
create or replace function public.prevent_users_privilege_escalation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    if new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'auth_user_id cannot be changed';
    end if;
    if new.user_type is distinct from old.user_type then
      raise exception 'user_type cannot be changed by clients';
    end if;
    if new.password_hash is distinct from old.password_hash then
      raise exception 'password_hash cannot be changed for Supabase Auth users';
    end if;
    if new.status is distinct from old.status
       and coalesce(auth.role(), '') = 'authenticated' then
      raise exception 'status cannot be changed by authenticated clients';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_users_privilege_escalation on public.users;
create trigger trg_prevent_users_privilege_escalation
before update on public.users
for each row
execute function public.prevent_users_privilege_escalation();

-- Block authenticated direct writes to user_roles (service_role / triggers still work as owners).
create or replace function public.prevent_user_roles_client_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'Authenticated clients cannot mutate user_roles';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_user_roles_client_mutation on public.user_roles;
create trigger trg_prevent_user_roles_client_mutation
before insert or update or delete on public.user_roles
for each row
execute function public.prevent_user_roles_client_mutation();

-- ---------------------------------------------------------------------------
-- 3) Auth bootstrap: ensure public.users + customer role (idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.ensure_customer_profile_for_auth_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name_meta text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
  profile_id uuid;
  customer_role_id uuid;
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required';
  end if;

  resolved_name := nullif(trim(coalesce(p_full_name_meta, '')), '');

  if resolved_name is null then
    resolved_name := nullif(trim(split_part(coalesce(p_email, ''), '@', 1)), '');
  end if;

  if resolved_name is null then
    resolved_name := 'Customer';
  end if;

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
    resolved_name,
    nullif(trim(coalesce(p_email, '')), ''),
    null,
    null,
    'customer',
    'active'
  )
  on conflict (auth_user_id) do update
  set
    email = coalesce(excluded.email, public.users.email),
    full_name = case
      when nullif(trim(public.users.full_name), '') is null then excluded.full_name
      else public.users.full_name
    end,
    -- Never change user_type / password_hash / status on re-entry.
    updated_at = timezone('utc', now())
  where public.users.auth_user_id = excluded.auth_user_id;

  select id
  into profile_id
  from public.users
  where auth_user_id = p_auth_user_id;

  select id
  into customer_role_id
  from public.roles
  where code = 'customer';

  if profile_id is null then
    raise exception 'failed to ensure customer profile for auth user %', p_auth_user_id;
  end if;

  if customer_role_id is null then
    raise exception 'customer role is missing';
  end if;

  insert into public.user_roles (user_id, role_id, branch_id)
  select profile_id, customer_role_id, null
  where not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = profile_id
      and ur.role_id = customer_role_id
      and ur.branch_id is null
  );

  return profile_id;
end;
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_full_name text;
begin
  -- Safe full_name sources only. NEVER read role / user_type from metadata.
  meta_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), '')
  );

  perform public.ensure_customer_profile_for_auth_user(
    new.id,
    new.email,
    meta_full_name
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_auth_user_created();

revoke all on function public.ensure_customer_profile_for_auth_user(uuid, text, text) from public;
revoke all on function public.handle_auth_user_created() from public;
grant execute on function public.ensure_customer_profile_for_auth_user(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- 4) RLS — own profile / own roles only
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.roles enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth_user_id = auth.uid());

drop policy if exists "Users can update own allowed profile fields" on public.users;
create policy "Users can update own allowed profile fields"
on public.users
for update
to authenticated
using (auth_user_id = auth.uid())
with check (
  auth_user_id = auth.uid()
  and user_type = 'customer'
  and password_hash is null
);

-- No INSERT/DELETE for authenticated on users (bootstrap is security definer trigger).
drop policy if exists "Users cannot insert profiles" on public.users;
-- intentional: no insert policy for authenticated

drop policy if exists "Users can read own role assignments" on public.user_roles;
create policy "Users can read own role assignments"
on public.user_roles
for select
to authenticated
using (
  user_id in (
    select u.id from public.users u where u.auth_user_id = auth.uid()
  )
);

-- No write policies for authenticated on user_roles (trigger also blocks).

drop policy if exists "Authenticated can read role catalog codes" on public.roles;
create policy "Authenticated can read role catalog codes"
on public.roles
for select
to authenticated
using (true);

-- ---------------------------------------------------------------------------
-- 5) Grants (table privileges already broadly granted; keep explicit reads)
-- ---------------------------------------------------------------------------
grant select, update on public.users to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.roles to authenticated;

-- ---------------------------------------------------------------------------
-- 6) Idempotent backfill for auth.users that predate this migration
-- ---------------------------------------------------------------------------
-- A) auth.users without public.users → ensure customer profile + customer role.
--    Uses the same full_name fallback order as the signup trigger.
-- B) public.users with auth_user_id and ZERO user_roles → assign customer once.
-- C) Profiles that already have >=1 role row are left untouched (no customer
--    auto-add, no privileged role invention, existing staff roles preserved).
-- Re-running these statements is safe: ensure_* upserts by auth_user_id;
-- role inserts use NOT EXISTS / partial unique index.

-- A: Missing profiles for existing auth users
do $$
declare
  auth_row record;
  meta_full_name text;
begin
  for auth_row in
    select
      au.id,
      au.email,
      au.raw_user_meta_data
    from auth.users au
    left join public.users pu on pu.auth_user_id = au.id
    where pu.id is null
  loop
    meta_full_name := coalesce(
      nullif(trim(auth_row.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(auth_row.raw_user_meta_data ->> 'name'), '')
    );

    perform public.ensure_customer_profile_for_auth_user(
      auth_row.id,
      auth_row.email,
      meta_full_name
    );
  end loop;
end;
$$;

-- B: Linked profiles with no roles at all get customer exactly once.
--    Profiles that already have any role (including staff) are intentionally skipped.
insert into public.user_roles (user_id, role_id, branch_id)
select
  u.id,
  r.id,
  null
from public.users u
cross join public.roles r
where u.auth_user_id is not null
  and r.code = 'customer'
  and not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = u.id
  )
  and not exists (
    select 1
    from public.user_roles ur2
    where ur2.user_id = u.id
      and ur2.role_id = r.id
      and ur2.branch_id is null
  );

commit;

-- ---------------------------------------------------------------------------
-- Verification (manual; expected after apply):
--   select code from public.roles where code = 'customer'; -- 1 row
--   -- every auth.users row should have exactly one public.users via auth_user_id:
--   select count(*) as orphan_auth_users
--   from auth.users au
--   left join public.users pu on pu.auth_user_id = au.id
--   where pu.id is null; -- expect 0
--   -- profiles with zero roles should be 0 among linked auth users:
--   select count(*) as linked_users_without_roles
--   from public.users u
--   where u.auth_user_id is not null
--     and not exists (select 1 from public.user_roles ur where ur.user_id = u.id); -- expect 0
--   -- staff (or any non-empty) role sets must still exist if they did before backfill
--   -- signup auth user → exactly one public.users row, one customer user_roles, zero customers
--   -- repeated ensure / backfill statements must not duplicate user_roles globals
-- Rollback guidance (manual; do not auto-run):
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_auth_user_created();
--   drop function if exists public.ensure_customer_profile_for_auth_user(uuid, text, text);
--   delete from public.user_roles where role_id in (select id from public.roles where code = 'customer');
--   delete from public.roles where code = 'customer';
-- ---------------------------------------------------------------------------
