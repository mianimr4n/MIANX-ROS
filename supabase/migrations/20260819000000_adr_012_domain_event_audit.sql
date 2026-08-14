-- =============================================================================
-- Phase 2.5 — ADR-012 Domain Event & Shared Audit Architecture
-- =============================================================================
-- Implements a centralized, append-only domain_events table that captures
-- a generic event record for every significant state change across domains.
--
-- Domain-specific audit tables (delivery_state_transitions,
-- whatsapp_conversation_events, customer_merge_log, order_status_logs,
-- finance_postings) remain the source of truth for domain-specific data.
-- domain_events is a queryable projection with consistent actor records
-- and cross-domain filtering.
--
-- Components:
--   1. domain_events table (append-only)
--   2. emit_domain_event() helper RPC (validates + inserts)
--   3. AFTER INSERT triggers on existing audit tables to mirror events
--   4. Permission seed: audit.read (granted to super-admin, branch-manager,
--      customer-support)
--   5. RLS: branch-scoped read, service_role write
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Permission seed: audit.read
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('audit', 'read', 'audit.read', 'Read domain events and audit log across all domains (branch-scoped).')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'audit.read'
  and r.code in ('super-admin', 'branch-manager', 'customer-support')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- domain_events table
-- ---------------------------------------------------------------------------
create table if not exists public.domain_events (
  id bigint primary key generated always as identity,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'),
  domain text not null check (
    domain in ('orders', 'deliveries', 'whatsapp', 'finance', 'customers', 'kitchen', 'inventory', 'hr', 'marketing', 'loyalty', 'reservations', 'system')
  ),
  entity_id uuid,
  branch_id uuid references public.branches (id) on delete set null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role text,
  metadata jsonb not null default '{}'::jsonb,
  correlation_id uuid,
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.domain_events is
  'ADR-012: Centralized append-only domain event log. Cross-domain queryable audit projection.';

create index if not exists idx_domain_events_domain_entity
  on public.domain_events (domain, entity_id, occurred_at desc);

create index if not exists idx_domain_events_event_type
  on public.domain_events (event_type, occurred_at desc);

create index if not exists idx_domain_events_branch
  on public.domain_events (branch_id, occurred_at desc)
  where branch_id is not null;

create index if not exists idx_domain_events_actor
  on public.domain_events (actor_user_id, occurred_at desc)
  where actor_user_id is not null;

create index if not exists idx_domain_events_correlation
  on public.domain_events (correlation_id)
  where correlation_id is not null;

create index if not exists idx_domain_events_occurred
  on public.domain_events (occurred_at desc);

-- GIN index for JSONB metadata queries (e.g. WHERE metadata->>'customer_id' = ?)
create index if not exists idx_domain_events_metadata_gin
  on public.domain_events using gin (metadata jsonb_path_ops);

alter table public.domain_events enable row level security;

-- Branch staff can read events for their branch (and events with no branch)
drop policy if exists "domain_events_branch_read" on public.domain_events;
create policy "domain_events_branch_read"
  on public.domain_events for select
  to authenticated
  using (
    branch_id is null
    or branch_id in (
      select ur.branch_id from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
    )
    or exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and rol.code = 'super-admin'
    )
  );

revoke all on public.domain_events from public, anon;
grant select on public.domain_events to authenticated;
grant all on public.domain_events to service_role;

-- ---------------------------------------------------------------------------
-- Append-only trigger: block UPDATE + DELETE
-- ---------------------------------------------------------------------------
create or replace function public.enforce_domain_events_append_only()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Cannot UPDATE domain_events (ADR-012 append-only). Insert a new event instead.'
      using errcode = 'check_violation';
  elsif tg_op = 'DELETE' then
    raise exception 'Cannot DELETE domain_events (ADR-012 append-only). Events are immutable.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

drop trigger if exists trg_domain_events_no_update on public.domain_events;
create trigger trg_domain_events_no_update
  before update on public.domain_events
  for each row execute function public.enforce_domain_events_append_only();

drop trigger if exists trg_domain_events_no_delete on public.domain_events;
create trigger trg_domain_events_no_delete
  before delete on public.domain_events
  for each row execute function public.enforce_domain_events_append_only();

-- ---------------------------------------------------------------------------
-- emit_domain_event() helper RPC
-- ---------------------------------------------------------------------------
create or replace function public.emit_domain_event(
  p_event_type text,
  p_domain text,
  p_entity_id uuid default null,
  p_branch_id uuid default null,
  p_actor_user_id uuid default null,
  p_actor_role text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_correlation_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.domain_events (
    event_type, domain, entity_id, branch_id,
    actor_user_id, actor_role, metadata, correlation_id
  )
  values (
    p_event_type, p_domain, p_entity_id, p_branch_id,
    p_actor_user_id, p_actor_role, p_metadata, p_correlation_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.emit_domain_event is
  'ADR-012: Canonical way to insert a domain event. Validates event_type format. Returns the inserted row id.';

revoke all on function public.emit_domain_event(text, text, uuid, uuid, uuid, text, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.emit_domain_event(text, text, uuid, uuid, uuid, text, jsonb, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- AFTER INSERT triggers on existing audit tables → mirror to domain_events
-- ---------------------------------------------------------------------------

-- delivery_state_transitions → domain_events (delivery.transitioned)
create or replace function public.mirror_delivery_transition_to_domain_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_id uuid;
  v_event_id bigint;
begin
  select branch_id into v_branch_id from public.deliveries where id = new.delivery_id;

  v_event_id := public.emit_domain_event(
    p_event_type := 'delivery.transitioned',
    p_domain := 'deliveries',
    p_entity_id := new.delivery_id,
    p_branch_id := v_branch_id,
    p_actor_user_id := new.actor_user_id,
    p_actor_role := new.actor_role,
    p_metadata := jsonb_build_object(
      'from_status', new.from_status,
      'to_status', new.to_status,
      'reason', new.reason,
      'transition_id', new.id
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_mirror_delivery_transition on public.delivery_state_transitions;
create trigger trg_mirror_delivery_transition
  after insert on public.delivery_state_transitions
  for each row execute function public.mirror_delivery_transition_to_domain_events();

-- customer_merge_log → domain_events (customer.merged)
create or replace function public.mirror_customer_merge_to_domain_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id bigint;
begin
  v_event_id := public.emit_domain_event(
    p_event_type := 'customer.merged',
    p_domain := 'customers',
    p_entity_id := new.target_customer_id,
    p_branch_id := null,
    p_actor_user_id := new.actor_user_id,
    p_actor_role := null,
    p_metadata := jsonb_build_object(
      'source_customer_id', new.source_customer_id,
      'target_customer_id', new.target_customer_id,
      'reason', new.reason,
      'merge_log_id', new.id,
      'transferred', new.metadata->'transferred',
      'conflicts', new.metadata->'conflicts'
    )
  );

  -- If reversed, also emit customer.merge_reversed
  if new.reversed_at is not null then
    perform public.emit_domain_event(
      p_event_type := 'customer.merge_reversed',
      p_domain := 'customers',
      p_entity_id := new.source_customer_id,
      p_branch_id := null,
      p_actor_user_id := new.reversed_by,
      p_actor_role := null,
      p_metadata := jsonb_build_object(
        'merge_log_id', new.id,
        'reversal_reason', new.reversal_reason
      )
    );
  end if;

  return new;
end;
$$;

-- This trigger fires on INSERT and on UPDATE (when reversed_at gets set)
drop trigger if exists trg_mirror_customer_merge on public.customer_merge_log;
create trigger trg_mirror_customer_merge
  after insert or update of reversed_at on public.customer_merge_log
  for each row execute function public.mirror_customer_merge_to_domain_events();

-- whatsapp_conversation_events → domain_events (whatsapp.<event_type>)
-- Only fire if the table exists (ADR-004 may not be applied in all envs)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='whatsapp_conversation_events'
  ) then
    create or replace function public.mirror_whatsapp_event_to_domain_events()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    declare
      v_branch_id uuid;
      v_event_id bigint;
    begin
      select branch_id into v_branch_id from public.whatsapp_conversations where id = new.conversation_id;

      v_event_id := public.emit_domain_event(
        p_event_type := 'whatsapp.' || new.event_type,
        p_domain := 'whatsapp',
        p_entity_id := new.conversation_id,
        p_branch_id := v_branch_id,
        p_actor_user_id := new.actor_user_id,
        p_actor_role := new.actor_role,
        p_metadata := jsonb_build_object(
          'event_id', new.id,
          'previous_value', new.previous_value,
          'new_value', new.new_value,
          'reason', new.reason
        )
      );

      return new;
    end;
    $$;

    drop trigger if exists trg_mirror_whatsapp_event on public.whatsapp_conversation_events;
    create trigger trg_mirror_whatsapp_event
      after insert on public.whatsapp_conversation_events
      for each row execute function public.mirror_whatsapp_event_to_domain_events();
  end if;
end $$;

-- order_status_logs → domain_events (order.transitioned)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='order_status_logs'
  ) then
    create or replace function public.mirror_order_transition_to_domain_events()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $$
    declare
      v_branch_id uuid;
      v_event_id bigint;
    begin
      select branch_id into v_branch_id from public.orders where id = new.order_id;

      v_event_id := public.emit_domain_event(
        p_event_type := 'order.transitioned',
        p_domain := 'orders',
        p_entity_id := new.order_id,
        p_branch_id := v_branch_id,
        p_actor_user_id := new.actor_user_id,
        p_actor_role := new.actor_type,
        p_metadata := jsonb_build_object(
          'from_status', new.from_status,
          'to_status', new.to_status,
          'log_id', new.id
        )
      );

      return new;
    end;
    $$;

    drop trigger if exists trg_mirror_order_transition on public.order_status_logs;
    create trigger trg_mirror_order_transition
      after insert on public.order_status_logs
      for each row execute function public.mirror_order_transition_to_domain_events();
  end if;
end $$;

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
