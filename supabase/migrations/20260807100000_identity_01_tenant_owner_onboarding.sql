-- IDENTITY-01 — tenant owner and staff onboarding foundation.
-- Additive, forward-only and safe on the PHASE2-03 production tip.

begin;

insert into public.roles (name, code, description, is_system_role)
values
  ('Platform Super Admin', 'platform_super_admin', 'Platform-only administration; never a restaurant operating role.', true),
  ('Organization Owner', 'organization_owner', 'Owner administration within exactly one organization.', true),
  ('Finance', 'finance', 'Organization finance operations.', true),
  ('Human Resources', 'hr', 'Organization workforce administration.', true),
  ('Auditor', 'auditor', 'Read-only organization audit access.', true),
  ('Branch Manager', 'branch_manager', 'Management of explicitly assigned branches.', true),
  ('Kitchen Manager', 'kitchen_manager', 'Kitchen operations for explicitly assigned branches.', true),
  ('Support', 'support', 'Support operations for explicitly assigned branches.', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  is_system_role = true,
  updated_at = timezone('utc', now());

-- Canonical least-privilege grants. Platform authority remains explicitly
-- recognized by the API and receives the complete existing permission catalog.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.code = 'platform_super_admin'
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r join public.permissions p on p.code = any(case r.code
  when 'organization_owner' then array['admin.access','staff.read','staff.create','staff.assign_role','staff.manage','hr.manage','branch.read']
  when 'finance' then array['admin.access','payment.read','reports.read']
  when 'hr' then array['admin.access','staff.read','staff.create','staff.assign_role','staff.manage','hr.manage']
  when 'auditor' then array['admin.access','reports.read','payment.read','staff.read']
  else array[]::text[] end)
where r.code in ('organization_owner','finance','hr','auditor')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select target.id, rp.permission_id
from public.roles target
join public.roles legacy on legacy.code = case target.code
  when 'branch_manager' then 'branch-manager'
  when 'kitchen_manager' then 'kitchen'
  when 'support' then 'customer-support'
  else target.code end
join public.role_permissions rp on rp.role_id = legacy.id
where target.code in ('branch_manager','kitchen_manager','cashier','rider','support')
on conflict (role_id, permission_id) do nothing;

-- Compatibility: legacy super-admin remains untouched and is recognized by the API
-- as platform authority. Legacy branch-manager/kitchen/customer-support/host/waiter
-- rows remain valid but are not issued by new invitations.

alter table public.user_roles
  add column if not exists organization_id uuid;

alter table public.staff_invites
  add column if not exists organization_id uuid,
  add column if not exists correlation_id uuid,
  add column if not exists is_owner_bootstrap boolean not null default false,
  add column if not exists delivery_status text not null default 'not_requested',
  add column if not exists delivery_error_code text,
  add column if not exists delivered_at timestamptz;

update public.user_roles ur
set organization_id = b.organization_id
from public.branches b
where ur.branch_id = b.id and ur.organization_id is null;

update public.staff_invites si
set organization_id = b.organization_id
from public.branches b
where si.branch_id = b.id and si.organization_id is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'user_roles_organization_id_fkey') then
    alter table public.user_roles add constraint user_roles_organization_id_fkey
      foreign key (organization_id) references public.organization_settings(organization_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'staff_invites_organization_id_fkey') then
    alter table public.staff_invites add constraint staff_invites_organization_id_fkey
      foreign key (organization_id) references public.organization_settings(organization_id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'staff_invites_delivery_status_check') then
    alter table public.staff_invites add constraint staff_invites_delivery_status_check
      check (delivery_status in ('not_requested', 'queued', 'sent', 'failed'));
  end if;
end $$;

create table if not exists public.staff_invite_branches (
  invite_id uuid not null references public.staff_invites(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (invite_id, branch_id)
);

create table if not exists public.user_role_branches (
  user_role_id uuid not null references public.user_roles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_role_id, branch_id)
);

insert into public.staff_invite_branches (invite_id, branch_id)
select id, branch_id from public.staff_invites where branch_id is not null
on conflict do nothing;

insert into public.user_role_branches (user_role_id, branch_id)
select id, branch_id from public.user_roles where branch_id is not null
on conflict do nothing;

create table if not exists public.staff_invite_attempts (
  id uuid primary key default gen_random_uuid(),
  token_fingerprint text not null,
  ip_fingerprint text not null,
  attempted_at timestamptz not null default timezone('utc', now()),
  allowed boolean not null,
  outcome text not null default 'attempted'
);

create index if not exists identity_user_roles_org_state_idx
  on public.user_roles (organization_id, assignment_status);
create index if not exists identity_staff_invites_org_state_idx
  on public.staff_invites (organization_id, status, created_at desc);
create index if not exists identity_staff_invites_email_state_idx
  on public.staff_invites (organization_id, lower(email), status);
create index if not exists identity_staff_invites_expiry_idx
  on public.staff_invites (token_expires_at) where status = 'pending';
create unique index if not exists identity_staff_invites_token_hash_idx
  on public.staff_invites (token_hash) where token_hash is not null;
create unique index if not exists identity_staff_invites_correlation_idx
  on public.staff_invites (organization_id, correlation_id) where correlation_id is not null;
create unique index if not exists identity_one_pending_owner_bootstrap_idx
  on public.staff_invites (organization_id)
  where is_owner_bootstrap and status = 'pending';
create index if not exists identity_invite_branches_branch_idx
  on public.staff_invite_branches (branch_id, invite_id);
create index if not exists identity_user_role_branches_branch_idx
  on public.user_role_branches (branch_id, user_role_id);
create index if not exists identity_invite_attempt_window_idx
  on public.staff_invite_attempts (token_fingerprint, ip_fingerprint, attempted_at desc);
create unique index if not exists identity_one_role_per_user_org_idx
  on public.user_roles (user_id, role_id, organization_id)
  where organization_id is not null;

create or replace function public.identity_role_scope_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_code text;
  v_branch_org uuid;
begin
  select code into v_code from public.roles where id = new.role_id;
  if v_code is null then raise exception 'identity role does not exist'; end if;

  if v_code in ('platform_super_admin', 'super-admin') then
    if new.organization_id is not null or new.branch_id is not null then
      raise exception 'platform role cannot have tenant or branch scope';
    end if;
  elsif v_code in ('organization_owner', 'finance', 'hr', 'auditor') then
    if new.organization_id is null or new.branch_id is not null then
      raise exception 'organization role requires exactly one organization and no legacy branch scope';
    end if;
  elsif v_code in ('branch_manager', 'kitchen_manager', 'cashier', 'rider', 'support',
                    'branch-manager', 'kitchen', 'customer-support', 'host', 'waiter') then
    if new.organization_id is null then raise exception 'branch role requires organization scope'; end if;
    if new.branch_id is not null then
      select organization_id into v_branch_org from public.branches where id = new.branch_id;
      if v_branch_org is distinct from new.organization_id then raise exception 'branch is outside organization scope'; end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_identity_role_scope_guard on public.user_roles;
create trigger trg_identity_role_scope_guard
before insert or update of role_id, organization_id, branch_id on public.user_roles
for each row execute function public.identity_role_scope_guard();

create or replace function public.identity_invite_scope_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_code text; v_branch_org uuid;
begin
  new.email := lower(trim(new.email));
  select code into v_code from public.roles where id = new.role_id;
  if new.organization_id is null and new.branch_id is not null then
    select organization_id into new.organization_id from public.branches where id = new.branch_id;
  end if;
  if new.organization_id is null then raise exception 'invite organization is required'; end if;
  if v_code not in ('organization_owner','finance','hr','auditor','branch_manager','kitchen_manager','cashier','rider','support',
                    'branch-manager','kitchen','customer-support','host','waiter') then
    raise exception 'role % is not inviteable by IDENTITY-01', coalesce(v_code, '<missing>');
  end if;
  if v_code = 'organization_owner' and new.branch_id is not null then
    raise exception 'organization owner cannot be branch scoped';
  end if;
  if new.is_owner_bootstrap and v_code <> 'organization_owner' then
    raise exception 'owner bootstrap must target organization_owner';
  end if;
  if new.branch_id is not null then
    select organization_id into v_branch_org from public.branches where id = new.branch_id;
    if v_branch_org is distinct from new.organization_id then raise exception 'invite branch is outside organization'; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_staff_invite_rules on public.staff_invites;
drop trigger if exists trg_enforce_staff_invite_rules on public.staff_invites;
create trigger trg_identity_invite_scope_guard
before insert or update of email, role_id, organization_id, branch_id on public.staff_invites
for each row execute function public.identity_invite_scope_guard();

create or replace function public.identity_validate_invite_branches()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_org uuid; v_branch_org uuid;
begin
  select organization_id into v_org from public.staff_invites where id = new.invite_id;
  select organization_id into v_branch_org from public.branches where id = new.branch_id;
  if v_org is null or v_branch_org is distinct from v_org then raise exception 'invite branch is outside organization'; end if;
  return new;
end;
$$;

drop trigger if exists trg_identity_validate_invite_branches on public.staff_invite_branches;
create trigger trg_identity_validate_invite_branches
before insert or update on public.staff_invite_branches
for each row execute function public.identity_validate_invite_branches();

create or replace function public.identity_validate_user_role_branches()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_org uuid; v_code text; v_branch_org uuid;
begin
  select ur.organization_id, r.code into v_org, v_code
  from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.id = new.user_role_id;
  select organization_id into v_branch_org from public.branches where id = new.branch_id;
  if v_code not in ('branch_manager','kitchen_manager','cashier','rider','support','branch-manager','kitchen','customer-support','host','waiter')
     or v_org is null or v_branch_org is distinct from v_org then
    raise exception 'invalid branch assignment for role scope';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_identity_validate_user_role_branches on public.user_role_branches;
create trigger trg_identity_validate_user_role_branches
before insert or update on public.user_role_branches
for each row execute function public.identity_validate_user_role_branches();

create or replace function public.prevent_final_organization_owner_removal()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_old_code text; v_still_owner boolean;
begin
  select code into v_old_code from public.roles where id = old.role_id;
  if v_old_code <> 'organization_owner' or old.assignment_status <> 'ACTIVE' then return coalesce(new, old); end if;
  if tg_op = 'UPDATE' and new.role_id = old.role_id and new.organization_id is not distinct from old.organization_id
     and new.assignment_status = 'ACTIVE' then return new; end if;
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where r.code = 'organization_owner' and ur.organization_id = old.organization_id
      and ur.assignment_status = 'ACTIVE' and ur.id <> old.id
  ) into v_still_owner;
  if not v_still_owner then raise exception 'cannot remove or demote final active organization owner'; end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_final_organization_owner_removal on public.user_roles;
create trigger trg_prevent_final_organization_owner_removal
before delete or update of role_id, organization_id, assignment_status on public.user_roles
for each row execute function public.prevent_final_organization_owner_removal();

alter table public.staff_invite_events
  drop constraint if exists staff_invite_events_event_type_check;
alter table public.staff_invite_events
  add constraint staff_invite_events_event_type_check check (event_type in (
    'created', 'owner_bootstrap_created', 'sent', 'resent', 'delivery_failed',
    'revoked', 'accept_succeeded', 'accept_failed', 'expired_marked',
    'assignment_scope_updated'
  ));

create or replace function public.prevent_identity_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'staff invite audit history is immutable'; end; $$;
drop trigger if exists trg_prevent_identity_audit_mutation on public.staff_invite_events;
create trigger trg_prevent_identity_audit_mutation
before update or delete on public.staff_invite_events
for each row execute function public.prevent_identity_audit_mutation();

create or replace function public.check_staff_invite_attempt(
  p_token_fingerprint text,
  p_ip_fingerprint text,
  p_limit integer default 10,
  p_window_minutes integer default 15
) returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = public
as $$
declare v_count integer; v_oldest timestamptz; v_allowed boolean;
begin
  if length(p_token_fingerprint) <> 64 or length(p_ip_fingerprint) <> 64 then raise exception 'invalid attempt fingerprint'; end if;
  perform pg_advisory_xact_lock(hashtext(p_token_fingerprint || p_ip_fingerprint));
  select count(*)::integer, min(attempted_at) into v_count, v_oldest
  from public.staff_invite_attempts
  where token_fingerprint = p_token_fingerprint and ip_fingerprint = p_ip_fingerprint
    and attempted_at >= timezone('utc', now()) - make_interval(mins => p_window_minutes);
  v_allowed := v_count < p_limit;
  insert into public.staff_invite_attempts(token_fingerprint, ip_fingerprint, allowed, outcome)
  values (p_token_fingerprint, p_ip_fingerprint, v_allowed, case when v_allowed then 'attempted' else 'rate_limited' end);
  return query select v_allowed,
    case when v_allowed then 0 else greatest(1, ceil(extract(epoch from ((v_oldest + make_interval(mins => p_window_minutes)) - timezone('utc', now()))))::integer) end;
end;
$$;

revoke all on function public.check_staff_invite_attempt(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.check_staff_invite_attempt(text,text,integer,integer) to service_role;

create or replace function public.update_identity_user_role_scope(
  p_user_role_id uuid,
  p_role_id uuid,
  p_branch_ids uuid[]
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_link public.user_roles%rowtype; v_code text; v_branch uuid;
begin
  select * into v_link from public.user_roles where id = p_user_role_id for update;
  if not found then raise exception 'staff role assignment not found'; end if;
  select code into v_code from public.roles where id = p_role_id;
  if v_code is null then raise exception 'role not found'; end if;
  update public.user_roles set role_id = p_role_id, updated_at = timezone('utc',now()) where id = p_user_role_id;
  delete from public.user_role_branches where user_role_id = p_user_role_id;
  foreach v_branch in array coalesce(p_branch_ids, array[]::uuid[]) loop
    insert into public.user_role_branches(user_role_id,branch_id) values(p_user_role_id,v_branch);
  end loop;
  if v_code in ('branch_manager','kitchen_manager','cashier','rider','support')
     and cardinality(coalesce(p_branch_ids,array[]::uuid[])) = 0 then
    raise exception 'branch role requires assignments';
  end if;
  return p_user_role_id;
end;
$$;

revoke all on function public.update_identity_user_role_scope(uuid,uuid,uuid[]) from public, anon, authenticated;
grant execute on function public.update_identity_user_role_scope(uuid,uuid,uuid[]) to service_role;

create or replace function public.finalize_staff_invite_acceptance(
  p_invite_id uuid,
  p_auth_user_id uuid,
  p_full_name text default null
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_invite public.staff_invites%rowtype; v_role_code text; v_user_id uuid; v_user_type text;
  v_existing_type text; v_role_link_id uuid; v_branch_count integer;
begin
  select * into v_invite from public.staff_invites where id = p_invite_id for update;
  if not found or v_invite.status <> 'pending' then raise exception 'invite not acceptable'; end if;
  if v_invite.token_expires_at is null or v_invite.token_expires_at <= timezone('utc', now()) then
    update public.staff_invites set status='expired', token_hash=null, updated_at=timezone('utc',now()) where id=v_invite.id;
    raise exception 'invite expired';
  end if;
  select code into v_role_code from public.roles where id=v_invite.role_id;
  if v_role_code not in ('organization_owner','finance','hr','auditor','branch_manager','kitchen_manager','cashier','rider','support',
                         'branch-manager','kitchen','customer-support','host','waiter') then
    raise exception 'invite role invalid';
  end if;
  if v_role_code in ('branch_manager','kitchen_manager','cashier','rider','support','branch-manager','kitchen','customer-support','host','waiter') then
    select count(*) into v_branch_count from public.staff_invite_branches where invite_id=v_invite.id;
    if v_branch_count < 1 and v_invite.branch_id is null then raise exception 'branch role requires assignments'; end if;
  end if;
  v_user_type := case when v_role_code='rider' then 'rider' when v_role_code in ('support','customer-support') then 'support' else 'staff' end;
  perform set_config('telepizza.allow_staff_provision','on',true);
  select id,user_type into v_user_id,v_existing_type from public.users where auth_user_id=p_auth_user_id for update;
  if v_user_id is null then
    insert into public.users(auth_user_id,full_name,email,phone,user_type,status)
    values(p_auth_user_id,coalesce(nullif(trim(p_full_name),''),v_invite.full_name,'Staff'),v_invite.email,v_invite.phone,v_user_type,'active')
    returning id into v_user_id;
  elsif v_existing_type <> 'customer' then raise exception 'invite account conflict';
  else
    if exists(select 1 from public.users where id=v_user_id and email is not null and lower(email)<>lower(v_invite.email)) then raise exception 'invite account conflict'; end if;
    update public.users set full_name=coalesce(nullif(trim(p_full_name),''),full_name),email=v_invite.email,user_type=v_user_type,status='active',updated_at=timezone('utc',now()) where id=v_user_id;
  end if;
  delete from public.user_roles ur using public.roles r where ur.user_id=v_user_id and ur.role_id=r.id and r.code='customer';
  insert into public.user_roles(user_id,role_id,branch_id,organization_id,assignment_status,invitation_id,assigned_by)
  values(v_user_id,v_invite.role_id,v_invite.branch_id,v_invite.organization_id,'ACTIVE',v_invite.id,v_invite.invited_by)
  on conflict (user_id,role_id,organization_id) where organization_id is not null
  do update set assignment_status='ACTIVE',invitation_id=excluded.invitation_id,updated_at=timezone('utc',now())
  returning id into v_role_link_id;
  insert into public.user_role_branches(user_role_id,branch_id)
  select v_role_link_id,branch_id from public.staff_invite_branches where invite_id=v_invite.id on conflict do nothing;
  if v_invite.branch_id is not null then
    insert into public.user_role_branches(user_role_id,branch_id)
    values(v_role_link_id,v_invite.branch_id) on conflict do nothing;
  end if;
  update public.staff_invites set status='accepted',accepted_at=timezone('utc',now()),accepted_user_id=v_user_id,
    token_hash=null,updated_at=timezone('utc',now()) where id=v_invite.id;
  insert into public.staff_invite_events(invite_id,actor_user_id,event_type,payload)
  values(v_invite.id,v_user_id,'accept_succeeded',jsonb_build_object('role_code',v_role_code,'organization_id',v_invite.organization_id,'correlation_id',v_invite.correlation_id));
  return v_user_id;
end;
$$;

revoke all on function public.finalize_staff_invite_acceptance(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.finalize_staff_invite_acceptance(uuid,uuid,text) to service_role;

alter table public.staff_invite_branches enable row level security;
alter table public.user_role_branches enable row level security;
alter table public.staff_invite_attempts enable row level security;
revoke all on table public.staff_invite_branches, public.user_role_branches, public.staff_invite_attempts from anon, authenticated;
revoke all on table public.staff_invite_branches, public.user_role_branches, public.staff_invite_attempts from service_role;
grant select, insert, update, delete on table public.staff_invite_branches, public.user_role_branches to service_role;
grant select, insert, update on table public.staff_invite_attempts to service_role;
revoke update, delete on table public.staff_invite_events from service_role;

comment on table public.staff_invite_attempts is 'IDENTITY-01 durable rate-limit evidence. Stores one-way token/IP fingerprints only.';
comment on column public.staff_invites.delivery_error_code is 'Non-secret stable delivery error category; never provider response bodies or tokens.';

commit;
