-- PHASE2-03: immutable configuration versioning, explicit activation and rollback.
-- Additive lifecycle state; no legacy settings backfill and no Production mutation.

begin;

create table if not exists public.configuration_active_versions (
  schema_id uuid not null references public.configuration_schemas(id) on delete restrict,
  scope_type text not null check (scope_type in ('organization', 'branch')),
  scope_id uuid not null,
  version_id uuid not null references public.configuration_versions(id) on delete restrict,
  revision bigint not null default 1 check (revision > 0),
  activated_by uuid,
  activated_at timestamptz not null default now(),
  primary key (schema_id, scope_type, scope_id),
  unique (version_id)
);

insert into public.configuration_active_versions (
  schema_id, scope_type, scope_id, version_id, revision, activated_by, activated_at
)
select schema_id, scope_type, scope_id, id, 1, approved_by,
  coalesce(activated_at, created_at, now())
from public.configuration_versions
where status = 'active' and scope_id is not null
on conflict (schema_id, scope_type, scope_id) do nothing;

drop index if exists public.configuration_versions_active_unique;

create index if not exists configuration_versions_scope_created_idx
  on public.configuration_versions (schema_id, scope_type, scope_id, created_at desc, id);
create index if not exists configuration_change_log_scope_changed_idx
  on public.configuration_change_log (schema_id, scope_type, scope_id, changed_at desc, id);

alter table public.configuration_active_versions enable row level security;
revoke all on public.configuration_active_versions from public, anon, authenticated;
grant all on public.configuration_active_versions to service_role;

create or replace function public.prevent_configuration_versions_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'configuration_versions rows are immutable';
end;
$$;

drop trigger if exists trg_prevent_configuration_versions_delete on public.configuration_versions;
drop trigger if exists trg_prevent_configuration_versions_mutation on public.configuration_versions;
create trigger trg_prevent_configuration_versions_mutation
  before update or delete on public.configuration_versions
  for each row execute function public.prevent_configuration_versions_mutation();

revoke all on function public.prevent_configuration_versions_mutation() from public, anon, authenticated;
alter function public.prevent_configuration_change_log_mutation() set search_path = public, pg_temp;
alter function public.prevent_configuration_versions_delete() set search_path = public, pg_temp;

create or replace function public.create_configuration_version(
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
returns table (version_id uuid, outcome text, created_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_schema public.configuration_schemas%rowtype;
  v_version public.configuration_versions%rowtype;
  v_existing public.configuration_change_log%rowtype;
  v_secret boolean;
begin
  select * into v_schema from public.configuration_schemas where id = p_schema_id for share;
  if not found or v_schema.scope_type <> p_scope_type then
    raise exception using errcode = '22023', message = 'configuration schema scope mismatch';
  end if;
  if p_scope_type = 'organization' then
    if not exists (select 1 from public.organization_settings where organization_id = p_scope_id) then
      raise exception using errcode = '23503', message = 'organization not found';
    end if;
  elsif p_scope_type = 'branch' then
    if not exists (select 1 from public.branches where id = p_scope_id) then
      raise exception using errcode = '23503', message = 'branch not found';
    end if;
  else
    raise exception using errcode = '22023', message = 'invalid configuration scope';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing from public.configuration_change_log
    where scope_type = p_scope_type and scope_id = p_scope_id
      and configuration_key = v_schema.key and idempotency_key = p_idempotency_key;
    if found then
      return query select v_existing.to_version_id, 'replayed'::text, v_existing.changed_at;
      return;
    end if;
  end if;

  insert into public.configuration_versions (
    schema_id, scope_type, scope_id, value, status, created_by
  ) values (p_schema_id, p_scope_type, p_scope_id, p_value, 'draft', p_actor)
  returning * into v_version;

  v_secret := v_schema.data_type = 'secret_ref';
  insert into public.configuration_change_log (
    schema_id, scope_type, scope_id, configuration_key, to_version_id,
    change_type, changed_by, reason, new_value_metadata,
    request_id, correlation_id, idempotency_key
  ) values (
    p_schema_id, p_scope_type, p_scope_id, v_schema.key, v_version.id,
    'create', p_actor, nullif(trim(p_reason), ''),
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_secret),
    nullif(trim(p_request_id), ''), nullif(trim(p_correlation_id), ''),
    nullif(trim(p_idempotency_key), '')
  );

  return query select v_version.id, 'created'::text, v_version.created_at;
end;
$$;

create or replace function public.activate_configuration_version(
  p_version_id uuid,
  p_actor uuid,
  p_expected_revision bigint default null,
  p_reason text default null,
  p_request_id text default null,
  p_correlation_id text default null,
  p_idempotency_key text default null
)
returns table (version_id uuid, previous_version_id uuid, outcome text, revision bigint, activated_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_target public.configuration_versions%rowtype;
  v_schema public.configuration_schemas%rowtype;
  v_active public.configuration_active_versions%rowtype;
  v_existing public.configuration_change_log%rowtype;
  v_revision bigint;
  v_activated_at timestamptz := now();
begin
  select * into v_target from public.configuration_versions where id = p_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'configuration version not found'; end if;
  select * into v_schema from public.configuration_schemas where id = v_target.schema_id;

  perform pg_advisory_xact_lock(hashtextextended(
    v_target.schema_id::text || ':' || v_target.scope_type || ':' || v_target.scope_id::text, 0));

  if p_idempotency_key is not null then
    select * into v_existing from public.configuration_change_log
    where scope_type = v_target.scope_type and scope_id = v_target.scope_id
      and configuration_key = v_schema.key and idempotency_key = p_idempotency_key;
    if found then
      select * into v_active from public.configuration_active_versions
      where schema_id = v_target.schema_id and scope_type = v_target.scope_type and scope_id = v_target.scope_id;
      return query select v_existing.to_version_id, v_existing.from_version_id,
        'replayed'::text, v_active.revision, v_existing.changed_at;
      return;
    end if;
  end if;

  select * into v_active from public.configuration_active_versions
  where schema_id = v_target.schema_id and scope_type = v_target.scope_type and scope_id = v_target.scope_id;

  if p_expected_revision is not null and p_expected_revision <> coalesce(v_active.revision, 0) then
    raise exception using errcode = '40001', message = 'stale configuration activation revision';
  end if;
  if v_active.version_id = v_target.id then
    return query select v_target.id, v_target.id, 'unchanged'::text,
      v_active.revision, v_active.activated_at;
    return;
  end if;

  v_revision := coalesce(v_active.revision, 0) + 1;
  insert into public.configuration_active_versions (
    schema_id, scope_type, scope_id, version_id, revision, activated_by, activated_at
  ) values (
    v_target.schema_id, v_target.scope_type, v_target.scope_id, v_target.id,
    v_revision, p_actor, v_activated_at
  ) on conflict (schema_id, scope_type, scope_id) do update set
    version_id = excluded.version_id, revision = excluded.revision,
    activated_by = excluded.activated_by, activated_at = excluded.activated_at;

  insert into public.configuration_change_log (
    schema_id, scope_type, scope_id, configuration_key, from_version_id, to_version_id,
    change_type, changed_by, reason, previous_value_metadata, new_value_metadata,
    request_id, correlation_id, idempotency_key
  ) values (
    v_target.schema_id, v_target.scope_type, v_target.scope_id, v_schema.key,
    v_active.version_id, v_target.id, 'activate', p_actor, nullif(trim(p_reason), ''),
    case when v_active.version_id is null then null else jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_schema.data_type = 'secret_ref') end,
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_schema.data_type = 'secret_ref'),
    nullif(trim(p_request_id), ''), nullif(trim(p_correlation_id), ''), nullif(trim(p_idempotency_key), '')
  );

  return query select v_target.id, v_active.version_id, 'activated'::text, v_revision, v_activated_at;
end;
$$;

create or replace function public.rollback_configuration_version(
  p_target_version_id uuid,
  p_actor uuid,
  p_expected_revision bigint default null,
  p_reason text default null,
  p_request_id text default null,
  p_correlation_id text default null,
  p_idempotency_key text default null
)
returns table (version_id uuid, source_version_id uuid, previous_version_id uuid, outcome text, revision bigint, activated_at timestamptz)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_target public.configuration_versions%rowtype;
  v_schema public.configuration_schemas%rowtype;
  v_active public.configuration_active_versions%rowtype;
  v_existing public.configuration_change_log%rowtype;
  v_copy public.configuration_versions%rowtype;
  v_revision bigint;
  v_activated_at timestamptz := now();
begin
  select * into v_target from public.configuration_versions where id = p_target_version_id;
  if not found then raise exception using errcode = 'P0002', message = 'configuration version not found'; end if;
  select * into v_schema from public.configuration_schemas where id = v_target.schema_id;
  perform pg_advisory_xact_lock(hashtextextended(
    v_target.schema_id::text || ':' || v_target.scope_type || ':' || v_target.scope_id::text, 0));

  if p_idempotency_key is not null then
    select * into v_existing from public.configuration_change_log
    where scope_type = v_target.scope_type and scope_id = v_target.scope_id
      and configuration_key = v_schema.key and idempotency_key = p_idempotency_key;
    if found then
      select * into v_active from public.configuration_active_versions
      where schema_id = v_target.schema_id and scope_type = v_target.scope_type and scope_id = v_target.scope_id;
      return query select v_existing.to_version_id, p_target_version_id, v_existing.from_version_id,
        'replayed'::text, v_active.revision, v_existing.changed_at;
      return;
    end if;
  end if;

  select * into v_active from public.configuration_active_versions
  where schema_id = v_target.schema_id and scope_type = v_target.scope_type and scope_id = v_target.scope_id;
  if not found then raise exception using errcode = '55000', message = 'configuration has no active version'; end if;
  if v_active.version_id = v_target.id then
    raise exception using errcode = '22023', message = 'rollback target is already active';
  end if;
  if p_expected_revision is not null and p_expected_revision <> v_active.revision then
    raise exception using errcode = '40001', message = 'stale configuration activation revision';
  end if;

  insert into public.configuration_versions (
    schema_id, scope_type, scope_id, value, status, created_by, approved_by, activated_at
  ) values (
    v_target.schema_id, v_target.scope_type, v_target.scope_id, v_target.value,
    'rolled_back', p_actor, p_actor, v_activated_at
  ) returning * into v_copy;

  v_revision := v_active.revision + 1;
  update public.configuration_active_versions set
    version_id = v_copy.id, revision = v_revision,
    activated_by = p_actor, activated_at = v_activated_at
  where schema_id = v_target.schema_id and scope_type = v_target.scope_type and scope_id = v_target.scope_id;

  insert into public.configuration_change_log (
    schema_id, scope_type, scope_id, configuration_key, from_version_id, to_version_id,
    change_type, changed_by, reason, previous_value_metadata, new_value_metadata,
    request_id, correlation_id, idempotency_key
  ) values (
    v_target.schema_id, v_target.scope_type, v_target.scope_id, v_schema.key,
    v_active.version_id, v_copy.id, 'rollback', p_actor, nullif(trim(p_reason), ''),
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_schema.data_type = 'secret_ref'),
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_schema.data_type = 'secret_ref', 'sourceVersionId', v_target.id),
    nullif(trim(p_request_id), ''), nullif(trim(p_correlation_id), ''), nullif(trim(p_idempotency_key), '')
  );

  return query select v_copy.id, v_target.id, v_active.version_id,
    'rolled_back'::text, v_revision, v_activated_at;
end;
$$;

-- Preserve the PHASE2-02 PUT contract for super-admin callers without
-- mutating historical rows. The active pointer is the sole mutable state.
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
  version_id uuid, change_id uuid, outcome text,
  persisted_value jsonb, persisted_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_schema public.configuration_schemas%rowtype;
  v_current public.configuration_versions%rowtype;
  v_version public.configuration_versions%rowtype;
  v_active public.configuration_active_versions%rowtype;
  v_change public.configuration_change_log%rowtype;
  v_existing public.configuration_change_log%rowtype;
  v_change_type text;
  v_secret boolean;
begin
  select * into v_schema from public.configuration_schemas where id = p_schema_id for share;
  if not found or v_schema.scope_type <> p_scope_type then
    raise exception using errcode = '22023', message = 'configuration schema scope mismatch';
  end if;
  if p_scope_type = 'organization' then
    if not exists (select 1 from public.organization_settings where organization_id = p_scope_id) then
      raise exception using errcode = '23503', message = 'organization not found';
    end if;
  elsif p_scope_type = 'branch' then
    if not exists (select 1 from public.branches where id = p_scope_id) then
      raise exception using errcode = '23503', message = 'branch not found';
    end if;
  else
    raise exception using errcode = '22023', message = 'invalid configuration scope';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    p_schema_id::text || ':' || p_scope_type || ':' || p_scope_id::text, 0));

  if p_idempotency_key is not null then
    select * into v_existing from public.configuration_change_log
    where scope_type = p_scope_type and scope_id = p_scope_id
      and configuration_key = v_schema.key and idempotency_key = p_idempotency_key;
    if found then
      select * into v_version from public.configuration_versions where id = v_existing.to_version_id;
      return query select v_version.id, v_existing.id, 'replayed'::text,
        v_version.value, v_existing.changed_at;
      return;
    end if;
  end if;

  select * into v_active from public.configuration_active_versions
  where schema_id = p_schema_id and scope_type = p_scope_type and scope_id = p_scope_id;
  if found then select * into v_current from public.configuration_versions where id = v_active.version_id; end if;
  if v_current.id is not null and v_current.value = p_value then
    return query select v_current.id, null::uuid, 'unchanged'::text,
      v_current.value, v_active.activated_at;
    return;
  end if;

  v_change_type := case when v_current.id is null then 'create' else 'update' end;
  v_secret := v_schema.data_type = 'secret_ref';
  insert into public.configuration_versions (
    schema_id, scope_type, scope_id, value, status, created_by, approved_by, activated_at
  ) values (
    p_schema_id, p_scope_type, p_scope_id, p_value, 'active', p_actor, p_actor, now()
  ) returning * into v_version;

  insert into public.configuration_active_versions (
    schema_id, scope_type, scope_id, version_id, revision, activated_by, activated_at
  ) values (
    p_schema_id, p_scope_type, p_scope_id, v_version.id, 1, p_actor, v_version.activated_at
  ) on conflict (schema_id, scope_type, scope_id) do update set
    version_id = excluded.version_id,
    revision = public.configuration_active_versions.revision + 1,
    activated_by = excluded.activated_by,
    activated_at = excluded.activated_at;

  insert into public.configuration_change_log (
    schema_id, scope_type, scope_id, configuration_key, from_version_id, to_version_id,
    change_type, changed_by, reason, previous_value_metadata, new_value_metadata,
    request_id, correlation_id, idempotency_key
  ) values (
    p_schema_id, p_scope_type, p_scope_id, v_schema.key, v_current.id, v_version.id,
    v_change_type, p_actor, nullif(trim(p_reason), ''),
    case when v_current.id is null then null else jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_secret) end,
    jsonb_build_object('dataType', v_schema.data_type, 'redacted', v_secret),
    nullif(trim(p_request_id), ''), nullif(trim(p_correlation_id), ''), nullif(trim(p_idempotency_key), '')
  ) returning * into v_change;

  return query select v_version.id, v_change.id, v_change_type,
    v_version.value, v_change.changed_at;
end;
$$;

revoke all on function public.create_configuration_version(uuid,text,uuid,jsonb,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.activate_configuration_version(uuid,uuid,bigint,text,text,text,text) from public, anon, authenticated;
revoke all on function public.rollback_configuration_version(uuid,uuid,bigint,text,text,text,text) from public, anon, authenticated;
grant execute on function public.create_configuration_version(uuid,text,uuid,jsonb,uuid,text,text,text,text) to service_role;
grant execute on function public.activate_configuration_version(uuid,uuid,bigint,text,text,text,text) to service_role;
grant execute on function public.rollback_configuration_version(uuid,uuid,bigint,text,text,text,text) to service_role;
revoke all on function public.persist_configuration_value(uuid,text,uuid,jsonb,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.persist_configuration_value(uuid,text,uuid,jsonb,uuid,text,text,text,text) to service_role;

commit;
