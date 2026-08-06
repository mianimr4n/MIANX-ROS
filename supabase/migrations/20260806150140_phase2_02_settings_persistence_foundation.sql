-- PHASE2-02: settings persistence foundation.
-- Additive only: preserves PHASE2-01 tables and legacy settings contracts.

begin;

-- Give the existing single organization a UUID identity suitable for the
-- PHASE2-01 configuration scope contract, without replacing its legacy id=1.
alter table public.organization_settings
  add column if not exists organization_id uuid;

update public.organization_settings
set organization_id = '00000000-0000-4000-8000-000000000001'::uuid
where organization_id is null;

alter table public.organization_settings
  alter column organization_id set default '00000000-0000-4000-8000-000000000001'::uuid,
  alter column organization_id set not null;

create unique index if not exists organization_settings_organization_id_idx
  on public.organization_settings (organization_id);

alter table public.branches
  add column if not exists organization_id uuid;

update public.branches
set organization_id = '00000000-0000-4000-8000-000000000001'::uuid
where organization_id is null;

alter table public.branches
  alter column organization_id set default '00000000-0000-4000-8000-000000000001'::uuid,
  alter column organization_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'branches_organization_id_fkey'
      and conrelid = 'public.branches'::regclass
  ) then
    alter table public.branches
      add constraint branches_organization_id_fkey
      foreign key (organization_id)
      references public.organization_settings (organization_id)
      on update restrict on delete restrict;
  end if;
end
$$;

create index if not exists branches_organization_id_idx
  on public.branches (organization_id);

-- Enrich immutable audit rows with the bounded PHASE2-02 request context.
alter table public.configuration_change_log
  add column if not exists configuration_key varchar(100),
  add column if not exists previous_value_metadata jsonb,
  add column if not exists new_value_metadata jsonb,
  add column if not exists request_id text,
  add column if not exists correlation_id text,
  add column if not exists idempotency_key varchar(200);

alter table public.configuration_change_log
  drop constraint if exists configuration_change_log_change_type_check;

alter table public.configuration_change_log
  add constraint configuration_change_log_change_type_check
  check (change_type in ('create', 'update', 'activate', 'rollback', 'delete'));

create unique index if not exists configuration_change_log_idempotency_idx
  on public.configuration_change_log
    (scope_type, scope_id, configuration_key, idempotency_key)
  where idempotency_key is not null;

-- All PHASE2-01 configuration tables are backend-only. RLS is defense in
-- depth; the API authenticates and authorizes before using service_role.
alter table public.configuration_schemas enable row level security;
alter table public.configuration_versions enable row level security;
alter table public.configuration_change_log enable row level security;

revoke all on public.configuration_schemas from public, anon, authenticated;
revoke all on public.configuration_versions from public, anon, authenticated;
revoke all on public.configuration_change_log from public, anon, authenticated;
grant all on public.configuration_schemas to service_role;
grant all on public.configuration_versions to service_role;
grant all on public.configuration_change_log to service_role;

-- Trigger functions are not public APIs.
alter function public.prevent_configuration_change_log_mutation() security invoker;
alter function public.prevent_configuration_versions_delete() security invoker;
revoke all on function public.prevent_configuration_change_log_mutation() from public, anon, authenticated;
revoke all on function public.prevent_configuration_versions_delete() from public, anon, authenticated;

-- One atomic write primitive: lock the active value, preserve its version,
-- insert the replacement, and append the immutable change record. It does not
-- expose activation, approval, scheduling, or rollback lifecycle operations.
create or replace function public.persist_configuration_value(
  p_schema_id uuid,
  p_scope_type text,
  p_scope_id uuid,
  p_value jsonb,
  p_actor uuid,
  p_reason text default null,
  p_request_id text default null,
  p_correlation_id text default null,
  p_idempotency_key text default null
)
returns table (
  version_id uuid,
  change_id uuid,
  outcome text,
  persisted_value jsonb,
  persisted_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_schema public.configuration_schemas%rowtype;
  v_current public.configuration_versions%rowtype;
  v_version public.configuration_versions%rowtype;
  v_change public.configuration_change_log%rowtype;
  v_existing public.configuration_change_log%rowtype;
  v_change_type text;
  v_secret boolean;
begin
  if p_scope_type not in ('organization', 'branch') then
    raise exception using errcode = '22023', message = 'invalid configuration scope';
  end if;

  select * into v_schema
  from public.configuration_schemas
  where id = p_schema_id
  for share;

  if not found or v_schema.scope_type <> p_scope_type then
    raise exception using errcode = '22023', message = 'configuration schema scope mismatch';
  end if;

  if p_scope_type = 'organization' then
    if not exists (
      select 1 from public.organization_settings where organization_id = p_scope_id
    ) then
      raise exception using errcode = '23503', message = 'organization not found';
    end if;
  elsif not exists (
    select 1 from public.branches where id = p_scope_id
  ) then
    raise exception using errcode = '23503', message = 'branch not found';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.configuration_change_log
    where scope_type = p_scope_type
      and scope_id = p_scope_id
      and configuration_key = v_schema.key
      and idempotency_key = p_idempotency_key;
    if found then
      select * into v_version
      from public.configuration_versions
      where id = v_existing.to_version_id;
      return query select v_version.id, v_existing.id, 'replayed'::text,
        v_version.value, v_existing.changed_at;
      return;
    end if;
  end if;

  select * into v_current
  from public.configuration_versions
  where schema_id = p_schema_id
    and scope_type = p_scope_type
    and scope_id = p_scope_id
    and status = 'active'
  for update;

  if found and v_current.value = p_value then
    return query select v_current.id, null::uuid, 'unchanged'::text,
      v_current.value, coalesce(v_current.activated_at, v_current.created_at);
    return;
  end if;

  v_change_type := case when found then 'update' else 'create' end;
  v_secret := v_schema.data_type = 'secret_ref';

  if v_change_type = 'update' then
    update public.configuration_versions
    set status = 'superseded'
    where id = v_current.id;
  end if;

  insert into public.configuration_versions (
    schema_id, scope_type, scope_id, value, status, created_by, approved_by, activated_at
  ) values (
    p_schema_id, p_scope_type, p_scope_id, p_value, 'active', p_actor, p_actor, now()
  ) returning * into v_version;

  insert into public.configuration_change_log (
    schema_id, scope_type, scope_id, configuration_key,
    from_version_id, to_version_id, change_type, changed_by, reason,
    previous_value_metadata, new_value_metadata,
    request_id, correlation_id, idempotency_key
  ) values (
    p_schema_id, p_scope_type, p_scope_id, v_schema.key,
    case when v_change_type = 'update' then v_current.id else null end,
    v_version.id, v_change_type, p_actor, nullif(trim(p_reason), ''),
    case when v_change_type = 'update'
      then jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_secret)
      else null end,
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_secret),
    nullif(trim(p_request_id), ''), nullif(trim(p_correlation_id), ''),
    nullif(trim(p_idempotency_key), '')
  ) returning * into v_change;

  return query select v_version.id, v_change.id, v_change_type,
    v_version.value, v_change.changed_at;
end;
$$;

revoke all on function public.persist_configuration_value(
  uuid, text, uuid, jsonb, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.persist_configuration_value(
  uuid, text, uuid, jsonb, uuid, text, text, text, text
) to service_role;

comment on function public.persist_configuration_value(
  uuid, text, uuid, jsonb, uuid, text, text, text, text
) is 'PHASE2-02 atomic create/update persistence only; lifecycle activation and rollback APIs remain unavailable.';

commit;
