-- =============================================================================
-- Phase 2.4 — Delivery State Machine (ADR-007)
-- =============================================================================
-- Implements ADR-007 "Delivery State Machine & Transition Rules":
--   1. Add `delivery_state_transitions` audit table (append-only).
--   2. Add trigger to enforce valid transitions on `deliveries.status`.
--   3. Reject invalid transitions with a clear error message.
--
-- Valid transitions (ADR-007):
--   pending   -> assigned | cancelled
--   assigned  -> picked-up | cancelled | failed
--   picked-up -> delivered | failed
--   delivered -> (terminal)
--   failed    -> (terminal, but can be re-assigned via pending if branch re-opens)
--   cancelled -> (terminal)
--
-- This migration is additive only — does not modify existing rows.
-- Backward compatible: existing applications continue to work; transitions
-- are now simply validated at the DB layer (defense in depth alongside app).
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. delivery_state_transitions — append-only audit log
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_state_transitions (
  id bigint primary key generated always as identity,
  delivery_id uuid not null references public.deliveries (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.delivery_state_transitions is
  'Append-only audit log of delivery state transitions (ADR-007). Each row represents one valid transition. Invalid transitions are rejected by trigger before they reach this table.';

create index if not exists idx_delivery_state_transitions_delivery
  on public.delivery_state_transitions (delivery_id, created_at desc);

create index if not exists idx_delivery_state_transitions_to_status
  on public.delivery_state_transitions (to_status, created_at desc);

-- Prevent any UPDATE or DELETE on this audit table.
-- Only INSERT is allowed (append-only contract).
create or replace function public.enforce_delivery_transition_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'delivery_state_transitions is append-only (ADR-007). INSERT only; UPDATE/DELETE rejected.';
end;
$$;

drop trigger if exists trg_delivery_transition_no_update on public.delivery_state_transitions;
create trigger trg_delivery_transition_no_update
  before update on public.delivery_state_transitions
  for each row execute function public.enforce_delivery_transition_append_only();

drop trigger if exists trg_delivery_transition_no_delete on public.delivery_state_transitions;
create trigger trg_delivery_transition_no_delete
  before delete on public.delivery_state_transitions
  for each row execute function public.enforce_delivery_transition_append_only();

-- ---------------------------------------------------------------------------
-- 2. Delivery state machine validation function
-- ---------------------------------------------------------------------------
-- Returns the set of valid "to" states for a given "from" state.
-- Mirrors ADR-007 transition rules.
create or replace function public.delivery_valid_next_states(current_state text)
returns text[]
language sql
immutable
as $$
  select case
    when current_state = 'pending'   then array['assigned', 'cancelled']
    when current_state = 'assigned'  then array['picked-up', 'cancelled', 'failed']
    when current_state = 'picked-up' then array['delivered', 'failed']
    when current_state = 'delivered' then array[]::text[]  -- terminal
    when current_state = 'failed'    then array[]::text[]  -- terminal
    when current_state = 'cancelled' then array[]::text[]  -- terminal
    else array[]::text[]
  end;
$$;

comment on function public.delivery_valid_next_states is
  'Returns the set of valid next states for a delivery, per ADR-007 transition rules.';

-- ---------------------------------------------------------------------------
-- 3. BEFORE UPDATE trigger: enforce valid transitions on deliveries.status
-- ---------------------------------------------------------------------------
create or replace function public.validate_delivery_state_transition()
returns trigger
language plpgsql
as $$
declare
  allowed text[];
  v_actor uuid;
  v_reason text;
  v_metadata jsonb;
begin
  -- Only enforce when status is being changed
  if new.status is distinct from old.status then
    allowed := public.delivery_valid_next_states(old.status);
    if not (new.status = any(allowed)) then
      raise exception 'Invalid delivery state transition: % -> %. Allowed next states: [%]',
        old.status, new.status, array_to_string(allowed, ', ')
        using errcode = 'check_violation';
    end if;

    -- Capture actor from session variables (set by backend app on each request)
    v_actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_reason := nullif(current_setting('app.delivery_transition_reason', true), '');
    v_metadata := nullif(current_setting('app.delivery_transition_metadata', true), '')::jsonb;

    -- Insert audit row (will be rolled back if outer transaction fails)
    insert into public.delivery_state_transitions (
      delivery_id, from_status, to_status, actor_user_id, actor_role, reason, metadata
    )
    values (
      new.id, old.status, new.status,
      v_actor,
      nullif(current_setting('app.current_user_role', true), ''),
      coalesce(v_reason, 'transition'),
      coalesce(v_metadata, '{}'::jsonb)
    );
  end if;

  -- Set lifecycle timestamps automatically based on transition
  if new.status = 'assigned' and new.status is distinct from old.status and new.assigned_at is null then
    new.assigned_at = timezone('utc', now());
  end if;
  if new.status = 'picked-up' and new.status is distinct from old.status and new.picked_up_at is null then
    new.picked_up_at = timezone('utc', now());
  end if;
  if new.status = 'delivered' and new.status is distinct from old.status and new.delivered_at is null then
    new.delivered_at = timezone('utc', now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_delivery_state_transition on public.deliveries;
create trigger trg_validate_delivery_state_transition
  before update of status on public.deliveries
  for each row execute function public.validate_delivery_state_transition();

-- ---------------------------------------------------------------------------
-- 4. Public read access for the audit table (RLS policies follow branch scoping)
-- ---------------------------------------------------------------------------
alter table public.delivery_state_transitions enable row level security;

-- Branch-scoped read: user can read transitions for their branch
create policy "delivery_transitions_branch_read"
  on public.delivery_state_transitions for select
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_state_transitions.delivery_id
      and d.branch_id in (
        select ur.branch_id from public.user_roles ur
        where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
      )
    )
  );

-- Service role bypasses RLS (for backend API)
grant select on public.delivery_state_transitions to authenticated, anon, service_role;
grant insert on public.delivery_state_transitions to service_role;

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
