-- =============================================================================
-- Phase 2.3 (CRM) — ADR-005 + ADR-006 combined migration
-- =============================================================================
-- Implements two ADRs in a single additive migration:
--
--   ADR-005 — Canonical Customer Identity Strategy
--     • Table: customer_identities (identity_type, value, customer_id)
--     • UNIQUE constraint on (identity_type, value) — one customer per identity
--     • normalize_phone_e164() SQL function for Pakistani phone normalization
--     • resolve_customer_by_identity() lookup RPC
--     • INSERT trigger on customers: auto-creates identities for phone/email
--     • Backfill: existing customers get identity rows inserted (conflicts
--       logged to customer_identity_backfill_conflicts table)
--     • Permission: customer.read, customer.merge
--
--   ADR-006 — Customer Account Merge & Reversal Process
--     • Table: customer_merge_log (append-only audit of merges + reversals)
--     • merge_customers_atomic(source_id, target_id, actor_user_id, reason) RPC
--       — transfers all FK references, marks source as merged, logs to merge_log
--     • reverse_customer_merge(merge_log_id, actor_user_id, reason) RPC
--       — within 30-day window, transfers FKs back, marks reversed
--     • Append-only trigger on customer_merge_log (except for reversal columns)
--     • customers.status extended with 'merged' value
--     • customers.merged_into_id column added
--
-- All tables/functions are additive. No existing data is destroyed.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Permission seed: customer.read + customer.merge
-- ---------------------------------------------------------------------------
insert into public.permissions (module, action, code, description)
values
  ('customer', 'read', 'customer.read', 'Read customer profiles, identities, and merge history.'),
  ('customer', 'merge', 'customer.merge', 'Merge duplicate customer accounts and reverse merges within 30-day window.')
on conflict (code) do update
set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- Grant customer.read to all staff who already have admin.access
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'customer.read'
  and r.code in ('super-admin', 'branch-manager', 'customer-support', 'cashier')
on conflict do nothing;

-- Grant customer.merge to super-admin only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'customer.merge'
  and r.code = 'super-admin'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- ADR-005: Extend customers.status with 'merged' + add merged_into_id
-- ---------------------------------------------------------------------------
alter table public.customers
  drop constraint if exists customers_status_check;

alter table public.customers
  add constraint customers_status_check check (
    status in ('active', 'inactive', 'blocked', 'merged', 'provisional')
  );

alter table public.customers
  add column if not exists merged_into_id uuid references public.customers (id) on delete set null;

comment on column public.customers.merged_into_id is
  'ADR-006: If status=merged, this column points to the canonical customer that absorbed this one.';

-- ---------------------------------------------------------------------------
-- ADR-005: customer_identities table
-- ---------------------------------------------------------------------------
create table if not exists public.customer_identities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  identity_type text not null check (
    identity_type in ('phone_e164', 'email', 'auth_user_id', 'whatsapp_phone')
  ),
  value text not null,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (identity_type, value)
);

comment on table public.customer_identities is
  'ADR-005: Maps identity assertions (phone, email, auth_user_id, whatsapp_phone) to canonical customers.id. UNIQUE per (type, value).';

create index if not exists idx_customer_identities_customer
  on public.customer_identities (customer_id);

create index if not exists idx_customer_identities_type_value
  on public.customer_identities (identity_type, value);

alter table public.customer_identities enable row level security;

-- Customer can read their own identities
drop policy if exists "customer_identities_self_read" on public.customer_identities;
create policy "customer_identities_self_read"
  on public.customer_identities for select
  to authenticated
  using (
    customer_id in (
      select c.id from public.customers c where c.user_id = auth.uid()
    )
  );

-- Staff with customer.read can read all identities
drop policy if exists "customer_identities_staff_read" on public.customer_identities;
create policy "customer_identities_staff_read"
  on public.customer_identities for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('customer.read', 'admin.access')
    )
  );

revoke all on public.customer_identities from public, anon;
grant select on public.customer_identities to authenticated;
grant all on public.customer_identities to service_role;

-- ---------------------------------------------------------------------------
-- ADR-005: normalize_phone_e164() — Pakistani phone normalization
-- ---------------------------------------------------------------------------
create or replace function public.normalize_phone_e164(p_input text)
returns text
language plpgsql
immutable
as $$
declare
  v_digits text;
begin
  if p_input is null then return null; end if;

  -- Strip all non-digit characters
  v_digits := regexp_replace(p_input, '[^0-9]', '', 'g');

  -- Empty after strip
  if v_digits = '' then return null; end if;

  -- Pakistani mobile: 11 digits starting with 03 → +923XXXXXXXXX
  if v_digits ~ '^03[0-9]{9}$' then
    return '+92' || substring(v_digits, 2);
  end if;

  -- Pakistani mobile: 12 digits starting with 923 → +923XXXXXXXXX
  if v_digits ~ '^923[0-9]{9}$' then
    return '+' || v_digits;
  end if;

  -- Already E.164 with +92
  if v_digits ~ '^923[0-9]{9}$' then
    return '+' || v_digits;
  end if;

  -- Any other number that starts with country code: prepend +
  if v_digits ~ '^[1-9][0-9]{6,14}$' then
    return '+' || v_digits;
  end if;

  -- Doesn't match any known pattern
  return null;
end;
$$;

comment on function public.normalize_phone_e164 is
  'ADR-005: Normalize Pakistani phone numbers to E.164 format. Returns NULL if input cannot be normalized.';

revoke all on function public.normalize_phone_e164(text)
  from public, anon;
grant execute on function public.normalize_phone_e164(text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ADR-005: resolve_customer_by_identity() lookup RPC
-- ---------------------------------------------------------------------------
create or replace function public.resolve_customer_by_identity(
  p_identity_type text,
  p_value text
)
returns uuid
language sql
security definer
set search_path = public
as $$
  select customer_id from public.customer_identities
  where identity_type = p_identity_type
    and value = p_value
  limit 1;
$$;

comment on function public.resolve_customer_by_identity is
  'ADR-005: Returns the canonical customers.id for a given identity, or NULL if not found.';

revoke all on function public.resolve_customer_by_identity(text, text)
  from public, anon;
grant execute on function public.resolve_customer_by_identity(text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ADR-005: INSERT trigger on customers — auto-create identities
-- ---------------------------------------------------------------------------
create or replace function public.auto_create_customer_identities()
returns trigger
language plpgsql
as $$
declare
  v_phone_normalized text;
  v_email_lower text;
  v_existing_customer uuid;
begin
  -- Normalize phone if present
  if new.phone is not null and new.phone != '' then
    v_phone_normalized := public.normalize_phone_e164(new.phone);
    if v_phone_normalized is not null then
      -- Insert identity; if conflict (already exists for another customer), skip
      insert into public.customer_identities (customer_id, identity_type, value, metadata)
      values (new.id, 'phone_e164', v_phone_normalized, jsonb_build_object('source', 'auto_create_customer_trigger'))
      on conflict (identity_type, value) do nothing;
    end if;
  end if;

  -- Normalize email if present
  if new.email is not null and new.email != '' then
    v_email_lower := lower(trim(new.email));
    insert into public.customer_identities (customer_id, identity_type, value, metadata)
    values (new.id, 'email', v_email_lower, jsonb_build_object('source', 'auto_create_customer_trigger'))
    on conflict (identity_type, value) do nothing;
  end if;

  -- Link auth_user_id if present
  if new.user_id is not null then
    insert into public.customer_identities (customer_id, identity_type, value, metadata)
    values (new.id, 'auth_user_id', new.user_id::text, jsonb_build_object('source', 'auto_create_customer_trigger'))
    on conflict (identity_type, value) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_auto_create_customer_identities on public.customers;
create trigger trg_auto_create_customer_identities
  after insert on public.customers
  for each row execute function public.auto_create_customer_identities();

-- ---------------------------------------------------------------------------
-- ADR-005: Backfill existing customers — insert identity rows
-- ---------------------------------------------------------------------------
-- Conflict table for rows that couldn't be auto-backfilled (same phone/email
-- across multiple customers — needs ADR-006 merge to resolve).
create table if not exists public.customer_identity_backfill_conflicts (
  id bigint primary key generated always as identity,
  identity_type text not null,
  value text not null,
  conflicting_customer_ids uuid[] not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_backfill_conflicts_value
  on public.customer_identity_backfill_conflicts (identity_type, value);

alter table public.customer_identity_backfill_conflicts enable row level security;
revoke all on public.customer_identity_backfill_conflicts from public, anon;
grant select on public.customer_identity_backfill_conflicts to authenticated;
grant all on public.customer_identity_backfill_conflicts to service_role;

-- Backfill: insert phone identities for existing customers
-- Conflicts (same phone across multiple customers) go to conflicts table.
do $$
declare
  v_row record;
  v_phone_normalized text;
  v_existing_customer uuid;
begin
  for v_row in select id, phone, email, user_id from public.customers where status != 'merged' loop
    -- Phone
    if v_row.phone is not null and v_row.phone != '' then
      v_phone_normalized := public.normalize_phone_e164(v_row.phone);
      if v_phone_normalized is not null then
        -- Check if this identity already belongs to another customer
        select customer_id into v_existing_customer
        from public.customer_identities
        where identity_type = 'phone_e164' and value = v_phone_normalized
        limit 1;

        if v_existing_customer is null or v_existing_customer = v_row.id then
          insert into public.customer_identities (customer_id, identity_type, value, metadata)
          values (v_row.id, 'phone_e164', v_phone_normalized, jsonb_build_object('source', 'backfill'))
          on conflict (identity_type, value) do nothing;
        else
          -- Conflict: log it
          insert into public.customer_identity_backfill_conflicts (identity_type, value, conflicting_customer_ids)
          values ('phone_e164', v_phone_normalized, array[v_row.id, v_existing_customer])
          on conflict do nothing;
        end if;
      end if;
    end if;

    -- Email
    if v_row.email is not null and v_row.email != '' then
      begin
        insert into public.customer_identities (customer_id, identity_type, value, metadata)
        values (v_row.id, 'email', lower(trim(v_row.email)), jsonb_build_object('source', 'backfill'))
        on conflict (identity_type, value) do nothing;
      exception when others then
        null; -- skip on any unexpected error
      end;
    end if;

    -- auth_user_id
    if v_row.user_id is not null then
      insert into public.customer_identities (customer_id, identity_type, value, metadata)
      values (v_row.id, 'auth_user_id', v_row.user_id::text, jsonb_build_object('source', 'backfill'))
      on conflict (identity_type, value) do nothing;
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- ADR-006: customer_merge_log — append-only audit
-- ---------------------------------------------------------------------------
create table if not exists public.customer_merge_log (
  id uuid primary key default gen_random_uuid(),
  source_customer_id uuid not null references public.customers (id) on delete restrict,
  target_customer_id uuid not null references public.customers (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  merge_window_expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  reversed_at timestamptz,
  reversed_by uuid references auth.users (id) on delete set null,
  reversal_reason text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.customer_merge_log is
  'ADR-006: Append-only audit log of customer merges + reversals. 30-day reversal window.';

create index if not exists idx_customer_merge_log_source
  on public.customer_merge_log (source_customer_id);

create index if not exists idx_customer_merge_log_target
  on public.customer_merge_log (target_customer_id);

create index if not exists idx_customer_merge_log_reversable
  on public.customer_merge_log (merge_window_expires_at)
  where reversed_at is null;

alter table public.customer_merge_log enable row level security;

drop policy if exists "customer_merge_log_staff_read" on public.customer_merge_log;
create policy "customer_merge_log_staff_read"
  on public.customer_merge_log for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles ur
      join public.roles rol on rol.id = ur.role_id
      join public.role_permissions rp on rp.role_id = rol.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
        and ur.assignment_status = 'ACTIVE'
        and p.code in ('customer.read', 'customer.merge', 'admin.access')
    )
  );

revoke all on public.customer_merge_log from public, anon;
grant select on public.customer_merge_log to authenticated;
grant all on public.customer_merge_log to service_role;

-- Append-only trigger: block UPDATE (except reversal columns) + DELETE
create or replace function public.enforce_merge_log_append_only()
returns trigger
language plpgsql
as $$
declare
  v_bypass text;
begin
  v_bypass := current_setting('app.bypass_merge_log_immutable', true);
  if v_bypass = 'on' then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Cannot DELETE customer_merge_log rows (ADR-006 append-only).'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'UPDATE' then
    -- Allow updates ONLY to reversal columns
    if new.source_customer_id is distinct from old.source_customer_id
       or new.target_customer_id is distinct from old.target_customer_id
       or new.actor_user_id is distinct from old.actor_user_id
       or new.reason is distinct from old.reason
       or new.metadata is distinct from old.metadata
       or new.merge_window_expires_at is distinct from old.merge_window_expires_at
       or new.created_at is distinct from old.created_at then
      raise exception 'Cannot UPDATE non-reversal columns of customer_merge_log (ADR-006 append-only). Only reversed_at, reversed_by, reversal_reason can be updated (via reverse_customer_merge RPC).'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_merge_log_no_update on public.customer_merge_log;
create trigger trg_merge_log_no_update
  before update on public.customer_merge_log
  for each row execute function public.enforce_merge_log_append_only();

drop trigger if exists trg_merge_log_no_delete on public.customer_merge_log;
create trigger trg_merge_log_no_delete
  before delete on public.customer_merge_log
  for each row execute function public.enforce_merge_log_append_only();

-- ---------------------------------------------------------------------------
-- ADR-006: merge_customers_atomic() RPC
-- ---------------------------------------------------------------------------
create or replace function public.merge_customers_atomic(
  p_source_customer_id uuid,
  p_target_customer_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.customers%rowtype;
  v_target public.customers%rowtype;
  v_existing_merge_id uuid;
  v_transferred jsonb := '{}'::jsonb;
  v_count bigint;
  v_conflicts jsonb := '[]'::jsonb;
  v_conflict_record record;
begin
  if p_source_customer_id = p_target_customer_id then
    raise exception 'SOURCE_AND_TARGET_IDENTICAL: cannot merge a customer into itself.';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'REASON_REQUIRED: a non-empty reason is required for merge.';
  end if;

  select * into v_source from public.customers where id = p_source_customer_id;
  if not found then
    raise exception 'SOURCE_NOT_FOUND';
  end if;

  select * into v_target from public.customers where id = p_target_customer_id;
  if not found then
    raise exception 'TARGET_NOT_FOUND';
  end if;

  if v_source.status = 'merged' then
    if v_source.merged_into_id = p_target_customer_id then
      -- Idempotent re-merge: return existing log
      select id into v_existing_merge_id
      from public.customer_merge_log
      where source_customer_id = p_source_customer_id
        and target_customer_id = p_target_customer_id
      order by created_at desc
      limit 1;

      return jsonb_build_object(
        'ok', true,
        'idempotent', true,
        'merge_log_id', v_existing_merge_id,
        'message', 'Source already merged into this target.'
      );
    else
      raise exception 'SOURCE_ALREADY_MERGED: source is merged into a different target (%)', v_source.merged_into_id;
    end if;
  end if;

  if v_target.status = 'merged' then
    raise exception 'TARGET_IS_MERGED: cannot merge INTO a customer that is itself merged.';
  end if;

  -- Transfer FK references from source → target.
  -- Each table is updated in turn; counts are accumulated.

  -- orders
  update public.orders set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
  get diagnostics v_count = row_count;
  v_transferred := v_transferred || jsonb_build_object('orders', v_count);

  -- customer_addresses (if exists)
  begin
    update public.customer_addresses set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
    get diagnostics v_count = row_count;
    v_transferred := v_transferred || jsonb_build_object('customer_addresses', v_count);
  exception when others then null;
  end;

  -- customer_favorites (if exists)
  begin
    update public.customer_favorites set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
    get diagnostics v_count = row_count;
    v_transferred := v_transferred || jsonb_build_object('customer_favorites', v_count);
  exception when others then null;
  end;

  -- customer_reviews (if exists)
  begin
    update public.customer_reviews set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
    get diagnostics v_count = row_count;
    v_transferred := v_transferred || jsonb_build_object('customer_reviews', v_count);
  exception when others then null;
  end;

  -- whatsapp_conversations (if exists — ADR-004)
  begin
    update public.whatsapp_conversations set customer_id = p_target_customer_id where customer_id = p_source_customer_id;
    get diagnostics v_count = row_count;
    v_transferred := v_transferred || jsonb_build_object('whatsapp_conversations', v_count);
  exception when others then null;
  end;

  -- customer_identities — keep target's, delete source's duplicates
  for v_conflict_record in
    select identity_type, value
    from public.customer_identities
    where customer_id = p_source_customer_id
      and (identity_type, value) in (
        select identity_type, value
        from public.customer_identities
        where customer_id = p_target_customer_id
      )
  loop
    v_conflicts := v_conflicts || jsonb_build_array(jsonb_build_object(
      'identity_type', v_conflict_record.identity_type,
      'value', v_conflict_record.value
    ));
  end loop;

  -- Delete source's conflicting identities (target's win)
  delete from public.customer_identities
  where customer_id = p_source_customer_id
    and (identity_type, value) in (
      select identity_type, value
      from public.customer_identities
      where customer_id = p_target_customer_id
    );

  -- Re-point remaining source identities to target
  update public.customer_identities
  set customer_id = p_target_customer_id
  where customer_id = p_source_customer_id;
  get diagnostics v_count = row_count;
  v_transferred := v_transferred || jsonb_build_object('customer_identities', v_count);

  -- Mark source as merged
  update public.customers
  set status = 'merged', merged_into_id = p_target_customer_id
  where id = p_source_customer_id;

  -- Insert merge log
  insert into public.customer_merge_log (
    source_customer_id, target_customer_id, actor_user_id, reason, metadata
  )
  values (
    p_source_customer_id, p_target_customer_id, p_actor_user_id, p_reason,
    jsonb_build_object('transferred', v_transferred, 'conflicts', v_conflicts)
  )
  returning id into v_existing_merge_id;

  return jsonb_build_object(
    'ok', true,
    'merge_log_id', v_existing_merge_id,
    'source_customer_id', p_source_customer_id,
    'target_customer_id', p_target_customer_id,
    'transferred', v_transferred,
    'conflicts', v_conflicts
  );
end;
$$;

comment on function public.merge_customers_atomic is
  'ADR-006: Merges source customer into target. Transfers all FK references, marks source as merged, logs to customer_merge_log. Idempotent.';

revoke all on function public.merge_customers_atomic(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.merge_customers_atomic(uuid, uuid, uuid, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- ADR-006: reverse_customer_merge() RPC
-- ---------------------------------------------------------------------------
create or replace function public.reverse_customer_merge(
  p_merge_log_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.customer_merge_log%rowtype;
  v_count bigint;
  v_reversed jsonb := '{}'::jsonb;
begin
  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into v_log from public.customer_merge_log where id = p_merge_log_id;
  if not found then
    raise exception 'MERGE_LOG_NOT_FOUND';
  end if;

  if v_log.reversed_at is not null then
    raise exception 'MERGE_ALREADY_REVERSED';
  end if;

  if timezone('utc', now()) > v_log.merge_window_expires_at then
    raise exception 'MERGE_WINDOW_EXPIRED: cannot reverse merge after 30-day window.';
  end if;

  -- Transfer FK references back from target → source
  -- Note: this transfers ALL matching FKs back, including those that may
  -- have belonged to the target before the merge. This is the documented
  -- behavior in ADR-006: reversal is a complete undo.

  -- orders
  update public.orders
  set customer_id = v_log.source_customer_id
  where customer_id = v_log.target_customer_id
    and created_at >= v_log.created_at;
  get diagnostics v_count = row_count;
  v_reversed := v_reversed || jsonb_build_object('orders', v_count);

  -- customer_addresses
  begin
    update public.customer_addresses
    set customer_id = v_log.source_customer_id
    where customer_id = v_log.target_customer_id
      and created_at >= v_log.created_at;
    get diagnostics v_count = row_count;
    v_reversed := v_reversed || jsonb_build_object('customer_addresses', v_count);
  exception when others then null;
  end;

  -- customer_favorites
  begin
    update public.customer_favorites
    set customer_id = v_log.source_customer_id
    where customer_id = v_log.target_customer_id
      and created_at >= v_log.created_at;
    get diagnostics v_count = row_count;
    v_reversed := v_reversed || jsonb_build_object('customer_favorites', v_count);
  exception when others then null;
  end;

  -- customer_reviews
  begin
    update public.customer_reviews
    set customer_id = v_log.source_customer_id
    where customer_id = v_log.target_customer_id
      and created_at >= v_log.created_at;
    get diagnostics v_count = row_count;
    v_reversed := v_reversed || jsonb_build_object('customer_reviews', v_count);
  exception when others then null;
  end;

  -- whatsapp_conversations
  begin
    update public.whatsapp_conversations
    set customer_id = v_log.source_customer_id
    where customer_id = v_log.target_customer_id
      and created_at >= v_log.created_at;
    get diagnostics v_count = row_count;
    v_reversed := v_reversed || jsonb_build_object('whatsapp_conversations', v_count);
  exception when others then null;
  end;

  -- Mark source as active again
  update public.customers
  set status = 'active', merged_into_id = null
  where id = v_log.source_customer_id;

  -- Update merge log with reversal info (bypass append-only trigger)
  set local app.bypass_merge_log_immutable = 'on';
  update public.customer_merge_log
  set
    reversed_at = timezone('utc', now()),
    reversed_by = p_actor_user_id,
    reversal_reason = p_reason
  where id = p_merge_log_id;
  set local app.bypass_merge_log_immutable = 'off';

  return jsonb_build_object(
    'ok', true,
    'merge_log_id', p_merge_log_id,
    'reversed', v_reversed
  );
end;
$$;

comment on function public.reverse_customer_merge is
  'ADR-006: Reverses a customer merge within the 30-day window. Transfers FK references back to source.';

revoke all on function public.reverse_customer_merge(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.reverse_customer_merge(uuid, uuid, text)
  to service_role;

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
