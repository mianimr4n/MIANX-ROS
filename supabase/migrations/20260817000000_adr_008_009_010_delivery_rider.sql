-- =============================================================================
-- Phase 2.4 (Delivery & Rider Completion) — ADR-008/009/010 combined migration
-- =============================================================================
-- Implements three ADRs in a single additive migration:
--
--   ADR-008 — Rider Location Retention & Privacy Policy
--     • Table: rider_locations (ephemeral GPS pings tied to active delivery)
--     • RLS: rider self + branch staff + super-admin
--     • TTL function: purge_purged_rider_locations() deletes rows 24h after
--       delivery terminal state
--
--   ADR-009 — Proof of Delivery (POD) Data Format & Storage
--     • Table: delivery_pod (one per delivery; UNIQUE)
--     • RLS: branch staff + the order's customer
--     • Trigger: blocks UPDATE/DELETE once parent delivery is `delivered`
--     • Trigger: blocks `deliveries.status` -> 'delivered' transition unless
--       a delivery_pod row exists for that delivery (extends ADR-007)
--
--   ADR-010 — Cash on Delivery (COD) Financial Ownership
--     • Table: cod_collections (one per delivery; UNIQUE)
--     • RLS: branch staff + the rider themselves
--     • Trigger: on reconciliation_status -> 'reconciled', fires
--       create_journal_entry_atomic to post double-entry (Dr Cash, Cr AR)
--       and links via finance_postings (idempotent via unique constraint)
--
-- All tables are additive. No existing table is altered except adding a
-- helper function extension to ADR-007's transition validator.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Permission seed: delivery.access (used by Phase 2.4 admin routes)
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('delivery', 'access', 'delivery.access', 'Access rider location, proof of delivery, and COD reconciliation endpoints.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Grant delivery.access to branch-manager, customer-support, cashier, rider, super-admin
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'delivery.access'
  and r.code in ('super-admin', 'branch-manager', 'customer-support', 'cashier', 'rider', 'kitchen')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- ADR-008: rider_locations
-- ---------------------------------------------------------------------------
create table if not exists public.rider_locations (
  id bigint primary key generated always as identity,
  rider_id uuid not null references public.riders (id) on delete cascade,
  delivery_id uuid references public.deliveries (id) on delete cascade,
  latitude numeric(10, 8) not null check (latitude between -90 and 90),
  longitude numeric(11, 8) not null check (longitude between -180 and 180),
  heading numeric(5, 2) check (heading between 0 and 360),
  speed numeric(6, 2) check (speed >= 0),
  accuracy_m numeric(7, 2) check (accuracy_m >= 0),
  recorded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.rider_locations is
  'Ephemeral rider GPS pings (ADR-008). Retained only while delivery is in flight; purged 24h after terminal state via TTL job.';

create index if not exists idx_rider_locations_rider_recorded
  on public.rider_locations (rider_id, recorded_at desc);

create index if not exists idx_rider_locations_delivery
  on public.rider_locations (delivery_id, recorded_at desc)
  where delivery_id is not null;

create index if not exists idx_rider_locations_created
  on public.rider_locations (created_at);

alter table public.rider_locations enable row level security;

-- Rider can read their own pings
drop policy if exists "rider_locations_self_read" on public.rider_locations;
create policy "rider_locations_self_read"
  on public.rider_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.riders r
      where r.id = rider_locations.rider_id
        and r.user_id = auth.uid()
    )
  );

-- Rider can INSERT their own pings (rider app sends location)
drop policy if exists "rider_locations_self_insert" on public.rider_locations;
create policy "rider_locations_self_insert"
  on public.rider_locations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.riders r
      where r.id = rider_locations.rider_id
        and r.user_id = auth.uid()
    )
  );

-- Branch staff can read pings for riders in their branch
drop policy if exists "rider_locations_branch_staff_read" on public.rider_locations;
create policy "rider_locations_branch_staff_read"
  on public.rider_locations for select
  to authenticated
  using (
    exists (
      select 1 from public.riders r
      where r.id = rider_locations.rider_id
        and r.branch_id in (
          select ur.branch_id from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.assignment_status = 'ACTIVE'
        )
    )
    or exists (
      -- super-admin bypass
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and rol.code = 'super-admin'
    )
  );

-- Service role bypasses RLS for TTL job + backend API
revoke all on public.rider_locations from public, anon;
grant select, insert on public.rider_locations to authenticated;
grant all on public.rider_locations to service_role;

-- ---------------------------------------------------------------------------
-- ADR-008: TTL purge function
-- ---------------------------------------------------------------------------
-- Deletes rider_locations rows whose associated delivery reached terminal
-- state more than 24 hours ago. Safe to run multiple times per day.
-- Returns JSONB summary of deleted counts.
create or replace function public.purge_expired_rider_locations(
  p_retention_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted bigint := 0;
  v_batch_deleted bigint;
  v_cutoff timestamptz;
begin
  if p_retention_hours < 1 then
    raise exception 'RETENTION_HOURS_TOO_SMALL: minimum 1 hour';
  end if;

  v_cutoff := timezone('utc', now()) - (p_retention_hours || ' hours')::interval;

  -- Delete pings linked to deliveries that reached terminal state before cutoff.
  -- Pings for in-flight deliveries (or unlinked pings within retention) are preserved.
  delete from public.rider_locations rl
  where rl.delivery_id in (
    select d.id from public.deliveries d
    where d.status in ('delivered', 'failed', 'cancelled')
      and coalesce(d.delivered_at, d.updated_at) < v_cutoff
  );

  get diagnostics v_batch_deleted = row_count;
  v_deleted := v_deleted + coalesce(v_batch_deleted, 0);

  -- Also delete orphan pings (no delivery_id) older than retention
  delete from public.rider_locations
  where delivery_id is null
    and created_at < v_cutoff;

  get diagnostics v_batch_deleted = row_count;
  v_deleted := v_deleted + coalesce(v_batch_deleted, 0);

  return jsonb_build_object(
    'deleted', v_deleted,
    'cutoff', v_cutoff,
    'retention_hours', p_retention_hours,
    'ran_at', timezone('utc', now())
  );
end;
$$;

comment on function public.purge_expired_rider_locations is
  'ADR-008 TTL purge. Deletes rider_locations rows for deliveries that reached terminal state > retention_hours ago. Idempotent.';

revoke all on function public.purge_expired_rider_locations(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_rider_locations(integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- ADR-009: delivery_pod (Proof of Delivery)
-- ---------------------------------------------------------------------------
create table if not exists public.delivery_pod (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries (id) on delete cascade,
  captured_by_rider_id uuid not null references public.riders (id) on delete restrict,
  photo_storage_path text not null,
  photo_url text not null,
  signature_svg_path text,
  signature_url text,
  recipient_name varchar(150) not null,
  recipient_relationship text not null default 'self'
    check (recipient_relationship in ('self', 'family', 'neighbor', 'guard', 'other')),
  notes text check (length(notes) <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.delivery_pod is
  'Proof of Delivery record (ADR-009). One per delivery. Photos stored in Supabase Storage bucket delivery-pod; DB stores URLs only.';

create index if not exists idx_delivery_pod_rider
  on public.delivery_pod (captured_by_rider_id, captured_at desc);

create index if not exists idx_delivery_pod_captured
  on public.delivery_pod (captured_at desc);

alter table public.delivery_pod enable row level security;

-- The rider who captured the POD can read their own captures
drop policy if exists "delivery_pod_rider_self_read" on public.delivery_pod;
create policy "delivery_pod_rider_self_read"
  on public.delivery_pod for select
  to authenticated
  using (
    exists (
      select 1 from public.riders r
      where r.id = delivery_pod.captured_by_rider_id
        and r.user_id = auth.uid()
    )
  );

-- The rider who captured can INSERT
drop policy if exists "delivery_pod_rider_insert" on public.delivery_pod;
create policy "delivery_pod_rider_insert"
  on public.delivery_pod for insert
  to authenticated
  with check (
    exists (
      select 1 from public.riders r
      where r.id = delivery_pod.captured_by_rider_id
        and r.user_id = auth.uid()
    )
  );

-- Branch staff can read PODs for their branch
drop policy if exists "delivery_pod_branch_staff_read" on public.delivery_pod;
create policy "delivery_pod_branch_staff_read"
  on public.delivery_pod for select
  to authenticated
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_pod.delivery_id
        and d.branch_id in (
          select ur.branch_id from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.assignment_status = 'ACTIVE'
        )
    )
    or exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and rol.code = 'super-admin'
    )
  );

-- The order's customer can read their own POD
drop policy if exists "delivery_pod_customer_read" on public.delivery_pod;
create policy "delivery_pod_customer_read"
  on public.delivery_pod for select
  to authenticated
  using (
    exists (
      select 1 from public.deliveries d
      join public.orders o on o.id = d.order_id
      where d.id = delivery_pod.delivery_id
        and o.customer_id = auth.uid()
    )
  );

-- Branch staff can UPDATE (e.g. add notes) only while delivery is NOT yet delivered
drop policy if exists "delivery_pod_branch_staff_update" on public.delivery_pod;
create policy "delivery_pod_branch_staff_update"
  on public.delivery_pod for update
  to authenticated
  using (
    exists (
      select 1 from public.deliveries d
      where d.id = delivery_pod.delivery_id
        and d.status in ('assigned', 'picked-up')
        and d.branch_id in (
          select ur.branch_id from public.user_roles ur
          where ur.user_id = auth.uid()
            and ur.assignment_status = 'ACTIVE'
        )
    )
  );

revoke all on public.delivery_pod from public, anon;
grant select, insert, update on public.delivery_pod to authenticated;
grant all on public.delivery_pod to service_role;

-- ---------------------------------------------------------------------------
-- ADR-009: POD immutability trigger — block UPDATE/DELETE after delivered
-- ---------------------------------------------------------------------------
create or replace function public.enforce_delivery_pod_immutability()
returns trigger
language plpgsql
as $$
declare
  v_delivery_status text;
  v_bypass text;
begin
  v_bypass := current_setting('app.bypass_pod_immutability', true);
  if v_bypass = 'on' then
    return coalesce(new, old);
  end if;

  select d.status into v_delivery_status
  from public.deliveries d
  where d.id = coalesce(new.delivery_id, old.delivery_id);

  if v_delivery_status = 'delivered' then
    if tg_op = 'UPDATE' then
      raise exception 'Cannot UPDATE delivery_pod after parent delivery is delivered (ADR-009 immutability). Reverse delivery to failed to modify POD.'
        using errcode = 'check_violation';
    elsif tg_op = 'DELETE' then
      raise exception 'Cannot DELETE delivery_pod after parent delivery is delivered (ADR-009 immutability). Reverse delivery to failed to modify POD.'
        using errcode = 'check_violation';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_delivery_pod_no_update on public.delivery_pod;
create trigger trg_delivery_pod_no_update
  before update on public.delivery_pod
  for each row execute function public.enforce_delivery_pod_immutability();

drop trigger if exists trg_delivery_pod_no_delete on public.delivery_pod;
create trigger trg_delivery_pod_no_delete
  before delete on public.delivery_pod
  for each row execute function public.enforce_delivery_pod_immutability();

-- ---------------------------------------------------------------------------
-- ADR-009: Extend ADR-007 transition validator — require POD for `delivered`
-- ---------------------------------------------------------------------------
-- We re-create validate_delivery_state_transition with an extra check:
-- if NEW.status = 'delivered' AND OLD.status != 'delivered', require a
-- delivery_pod row to exist for this delivery. Bypassed by
-- app.bypass_pod_required = 'on' for trusted test fixtures.
create or replace function public.validate_delivery_state_transition()
returns trigger
language plpgsql
as $$
declare
  allowed text[];
  v_actor uuid;
  v_reason text;
  v_metadata jsonb;
  v_pod_count integer;
  v_bypass_pod text;
begin
  -- Only enforce when status is being changed
  if new.status is distinct from old.status then
    allowed := public.delivery_valid_next_states(old.status);
    if not (new.status = any(allowed)) then
      raise exception 'Invalid delivery state transition: % -> %. Allowed next states: [%]',
        old.status, new.status, array_to_string(allowed, ', ')
        using errcode = 'check_violation';
    end if;

    -- ADR-009: require POD before reaching `delivered`
    if new.status = 'delivered' then
      v_bypass_pod := current_setting('app.bypass_pod_required', true);
      if v_bypass_pod is distinct from 'on' then
        select count(*) into v_pod_count
        from public.delivery_pod
        where delivery_id = new.id;
        if v_pod_count = 0 then
          raise exception 'Cannot transition to delivered: no Proof of Delivery (POD) captured (ADR-009). Capture POD first.'
            using errcode = 'check_violation';
        end if;
      end if;
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

comment on function public.validate_delivery_state_transition is
  'ADR-007 + ADR-009 guard. Enforces valid delivery state transitions AND requires POD before reaching delivered status.';

-- ---------------------------------------------------------------------------
-- ADR-010: cod_collections
-- ---------------------------------------------------------------------------
create table if not exists public.cod_collections (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null unique references public.deliveries (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete restrict,
  amount numeric(14, 2) not null check (amount >= 0),
  currency varchar(3) not null default 'PKR',
  collected_by_rider_id uuid not null references public.riders (id) on delete restrict,
  customer_received_by varchar(150),
  notes text check (length(notes) <= 1000),
  reconciliation_status text not null default 'pending'
    check (reconciliation_status in ('pending', 'reconciled', 'shortage', 'overage')),
  reconciled_amount numeric(14, 2) check (reconciled_amount >= 0),
  reconciled_at timestamptz,
  reconciled_by uuid references auth.users (id) on delete set null,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  collected_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.cod_collections is
  'Cash on Delivery collection record (ADR-010). One per delivery. Reconciliation triggers GL posting via finance_postings.';

create index if not exists idx_cod_collections_branch_status
  on public.cod_collections (branch_id, reconciliation_status, collected_at desc);

create index if not exists idx_cod_collections_rider
  on public.cod_collections (collected_by_rider_id, collected_at desc);

create index if not exists idx_cod_collections_reconciled
  on public.cod_collections (reconciled_at desc)
  where reconciled_at is not null;

alter table public.cod_collections enable row level security;

-- Rider can read their own collections
drop policy if exists "cod_collections_rider_self_read" on public.cod_collections;
create policy "cod_collections_rider_self_read"
  on public.cod_collections for select
  to authenticated
  using (
    exists (
      select 1 from public.riders r
      where r.id = cod_collections.collected_by_rider_id
        and r.user_id = auth.uid()
    )
  );

-- Rider can INSERT (created at delivery time)
drop policy if exists "cod_collections_rider_insert" on public.cod_collections;
create policy "cod_collections_rider_insert"
  on public.cod_collections for insert
  to authenticated
  with check (
    exists (
      select 1 from public.riders r
      where r.id = cod_collections.collected_by_rider_id
        and r.user_id = auth.uid()
    )
  );

-- Branch staff can read all COD for their branch
drop policy if exists "cod_collections_branch_staff_read" on public.cod_collections;
create policy "cod_collections_branch_staff_read"
  on public.cod_collections for select
  to authenticated
  using (
    branch_id in (
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

-- Branch manager + super-admin can UPDATE reconciliation fields
drop policy if exists "cod_collections_branch_manager_update" on public.cod_collections;
create policy "cod_collections_branch_manager_update"
  on public.cod_collections for update
  to authenticated
  using (
    branch_id in (
      select ur.branch_id from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and rol.code in ('super-admin', 'branch-manager')
    )
  );

revoke all on public.cod_collections from public, anon;
grant select, insert, update on public.cod_collections to authenticated;
grant all on public.cod_collections to service_role;

-- ---------------------------------------------------------------------------
-- ADR-010: COD reconciliation trigger — fires GL posting on `reconciled`
-- ---------------------------------------------------------------------------
-- Looks up branch's Cash (asset) and Accounts Receivable (asset, contra)
-- accounts by account_code. Falls back gracefully if accounts are not yet
-- configured (defensive — does not block reconciliation).
create or replace function public.post_cod_collection_journal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cash_account uuid;
  v_ar_account uuid;
  v_lines jsonb;
  v_result jsonb;
  v_journal uuid;
  v_bypass text;
  v_existing_journal uuid;
begin
  -- Only fire when transitioning TO 'reconciled'
  if new.reconciliation_status is distinct from 'reconciled' then
    return new;
  end if;
  if old.reconciliation_status = 'reconciled' then
    return new;
  end if;

  -- Idempotency: if journal already posted, skip
  if new.journal_entry_id is not null then
    return new;
  end if;

  -- Bypass for tests/fixtures
  v_bypass := current_setting('app.bypass_cod_posting', true);
  if v_bypass = 'on' then
    return new;
  end if;

  -- Look up Cash and AR accounts for this branch
  select id into v_cash_account
  from public.chart_of_accounts
  where branch_id = new.branch_id
    and account_code = 'CASH'
    and is_active = true
  limit 1;

  select id into v_ar_account
  from public.chart_of_accounts
  where branch_id = new.branch_id
    and account_code = 'ACCOUNTS_RECEIVABLE'
    and is_active = true
  limit 1;

  -- If either account is missing, do not block reconciliation — just skip posting.
  -- The branch must configure their CoA before COD reconciliation produces GL entries.
  if v_cash_account is null or v_ar_account is null then
    return new;
  end if;

  v_lines := jsonb_build_array(
    jsonb_build_object('accountId', v_cash_account, 'debit', new.amount, 'credit', 0),
    jsonb_build_object('accountId', v_ar_account, 'debit', 0, 'credit', new.amount)
  );

  v_result := public.create_journal_entry_atomic(
    new.branch_id,
    (timezone('Asia/Karachi', now()))::date,
    'COD collection — delivery ' || new.delivery_id::text,
    'cod_collection',
    new.id,
    'posted',
    new.reconciled_by,
    v_lines
  );

  v_journal := (v_result->>'id')::uuid;

  -- Link via finance_postings (idempotent by unique constraint)
  insert into public.finance_postings (branch_id, source_module, source_id, journal_entry_id, idempotency_key, posted_by, status)
  values (new.branch_id, 'cod_collection', new.id, v_journal, 'cod_collection_' || new.id::text, new.reconciled_by, 'posted')
  on conflict (source_module, source_id) do nothing;

  -- Update the COD row with the journal entry id (using bypass to avoid recursion)
  update public.cod_collections
  set journal_entry_id = v_journal
  where id = new.id;

  return new;
end;
$$;

comment on function public.post_cod_collection_journal is
  'ADR-010 trigger. Posts double-entry journal when cod_collections.reconciliation_status transitions to reconciled. Idempotent.';

revoke all on function public.post_cod_collection_journal()
  from public, anon, authenticated;
grant execute on function public.post_cod_collection_journal()
  to service_role;

drop trigger if exists trg_cod_collection_post_journal on public.cod_collections;
create trigger trg_cod_collection_post_journal
  after update of reconciliation_status on public.cod_collections
  for each row execute function public.post_cod_collection_journal();

-- Add updated_at trigger for cod_collections
create or replace function public.set_cod_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_cod_updated_at on public.cod_collections;
create trigger set_cod_updated_at
  before update on public.cod_collections
  for each row execute function public.set_cod_updated_at();

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
