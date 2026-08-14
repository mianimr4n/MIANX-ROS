-- =============================================================================
-- ADR-004 — WhatsApp Conversation Ownership & Routing
-- =============================================================================
-- Implements ADR-004 "WhatsApp Conversation Ownership & Routing":
--   1. Extend `customers.status` with 'provisional' value for unknown-phone
--      inbound messages.
--   2. Add `whatsapp_conversations` table (branch-owned, customer-linked,
--      state machine: open -> in_progress -> resolved/escalated -> closed).
--   3. Add `whatsapp_messages` table (inbound + outbound; UNIQUE on
--      provider_message_id for idempotent webhook upsert; immutability
--      trigger for sent messages).
--   4. Add `whatsapp_conversation_events` append-only audit (mirror ADR-007
--      pattern).
--   5. Add `whatsapp_message_templates` (synced from Meta approved-template
--      catalogue).
--   6. Add `whatsapp_inbound_events` raw webhook payload queue (async
--      processing; append-only except for `processed_at` / `processing_error`
--      updates by the worker).
--   7. RLS policies using the canonical branch-scoping pattern
--      (`exists (select 1 from user_roles ur where ur.user_id = auth.uid()
--       and ur.assignment_status = 'ACTIVE')`).
--
-- This migration is additive only — does not modify existing rows.
-- Backward compatible: existing applications continue to work; all new
-- tables are empty until WhatsApp integration is wired up.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0. Extend customers.status with 'provisional' (ADR-004 §3)
-- ---------------------------------------------------------------------------
alter table public.customers
  drop constraint if exists customers_status_check;

alter table public.customers
  add constraint customers_status_check
  check (status in ('active', 'inactive', 'blocked', 'provisional'));

comment on constraint customers_status_check on public.customers is
  'Customer status. ''provisional'' (ADR-004) is set when an inbound WhatsApp message arrives from an unknown phone number; the row is later merged into a canonical customer via ADR-006 (Phase 2.3 CRM).';

-- ---------------------------------------------------------------------------
-- 1. whatsapp_conversations (ADR-004 §1, §4)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  provider_config_id uuid not null references public.whatsapp_provider_configs (id) on delete restrict,
  provider_conversation_id text,                 -- provider's thread/contact identifier (nullable)
  contact_phone text not null,                   -- E.164 of the customer
  status text not null default 'open' check (
    status in ('open', 'in_progress', 'escalated', 'resolved', 'closed')
  ),
  assigned_agent_id uuid references auth.users (id) on delete set null,
  linked_order_id uuid references public.orders (id) on delete set null,
  unread_count integer not null default 0 check (unread_count >= 0),
  last_message_at timestamptz,
  last_message_preview text,                     -- first 80 chars of last message for UI list
  closed_at timestamptz,
  pii_anonymized_at timestamptz,                 -- set when 24-month retention job anonymizes
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.whatsapp_conversations is
  'WhatsApp conversation threads (ADR-004). Each conversation belongs to exactly one branch; RLS enforces branch-scoped read for agents, cross-branch read for super-admin. State machine: open -> in_progress -> resolved/escalated -> closed.';

create index if not exists whatsapp_conversations_branch_status_idx
  on public.whatsapp_conversations (branch_id, status, last_message_at desc);

create index if not exists whatsapp_conversations_customer_idx
  on public.whatsapp_conversations (customer_id, created_at desc);

create index if not exists whatsapp_conversations_contact_phone_idx
  on public.whatsapp_conversations (contact_phone);

create index if not exists whatsapp_conversations_assigned_agent_idx
  on public.whatsapp_conversations (assigned_agent_id, status)
  where assigned_agent_id is not null and status in ('open', 'in_progress', 'escalated');

-- ---------------------------------------------------------------------------
-- 2. whatsapp_messages (ADR-004 §5)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  provider_message_id text unique,               -- Meta wamid; UNIQUE for idempotent webhook upsert
  from_phone text,
  to_phone text,
  content text,
  content_type text not null default 'text' check (
    content_type in ('text', 'template', 'image_ref', 'doc_ref', 'audio_ref', 'video_ref', 'system')
  ),
  media_url text,                                -- external URL only; no binary storage
  template_key text,                             -- references whatsapp_message_templates.template_key
  template_language text,
  template_parameters jsonb not null default '[]'::jsonb,
  delivery_status text not null default 'pending' check (
    delivery_status in ('pending', 'sent', 'delivered', 'read', 'failed', 'permanently_failed')
  ),
  provider_timestamp timestamptz,                -- timestamp from provider (use for ordering)
  failure_reason text,
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.whatsapp_messages is
  'WhatsApp messages (ADR-004 §5). Inbound messages are append-only. Outbound messages can UPDATE delivery_status/provider_timestamp/failure_reason/retry_count via webhook callbacks, but body/content_type/template_key become immutable once delivery_status reaches ''sent''. PII anonymization sets body/from_phone/media_url to ''[REDACTED]'' (super-admin only, logged in conversation_events).';

create index if not exists whatsapp_messages_conversation_idx
  on public.whatsapp_messages (conversation_id, provider_timestamp desc, created_at desc);

create index if not exists whatsapp_messages_delivery_status_idx
  on public.whatsapp_messages (delivery_status, created_at)
  where delivery_status in ('pending', 'failed');

create index if not exists whatsapp_messages_provider_msg_id_idx
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;

-- ---------------------------------------------------------------------------
-- 3. whatsapp_conversation_events — append-only audit (ADR-004 §4, §5)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_conversation_events (
  id bigint primary key generated always as identity,
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created', 'status_change', 'agent_assigned', 'agent_unassigned',
      'escalated', 'de_escalated', 'linked_order', 'unlinked_order',
      'closed', 'reopened', 'pii_anonymized', 'branch_reassigned',
      'message_sent', 'message_received', 'message_failed'
    )
  ),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_role text,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.whatsapp_conversation_events is
  'Append-only audit log of WhatsApp conversation events (ADR-004). Mirror ADR-007 pattern. UPDATE and DELETE are blocked by trigger.';

create index if not exists whatsapp_conversation_events_conv_idx
  on public.whatsapp_conversation_events (conversation_id, created_at desc);

create index if not exists whatsapp_conversation_events_type_idx
  on public.whatsapp_conversation_events (event_type, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. whatsapp_message_templates (ADR-004 §1)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,                    -- internal key, e.g. 'order_confirmation'
  provider_template_id text not null,            -- Meta approved template name
  language text not null default 'en',           -- ISO 639-1 (ur, en)
  category text not null check (category in ('marketing', 'utility', 'authentication')),
  body_text text not null,                       -- template body with {{1}}, {{2}} placeholders
  variables jsonb not null default '[]'::jsonb,  -- [{ "position": 1, "name": "order_id", "type": "string" }, ...]
  is_active boolean not null default true,
  provider_status text not null default 'pending' check (
    provider_status in ('pending', 'approved', 'rejected', 'paused')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (template_key, language, provider_template_id)
);

comment on table public.whatsapp_message_templates is
  'WhatsApp message templates (ADR-004). Synced from Meta approved-template catalogue. template_key is our internal identifier; provider_template_id is Meta''s name. Multiple languages per template_key supported.';

create index if not exists whatsapp_message_templates_active_idx
  on public.whatsapp_message_templates (template_key, language)
  where is_active = true and provider_status = 'approved';

-- ---------------------------------------------------------------------------
-- 5. whatsapp_inbound_events — raw webhook payload queue (ADR-004 §7)
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_inbound_events (
  id bigint primary key generated always as identity,
  raw_payload jsonb not null,                    -- exact payload from Meta
  signature_verified boolean not null default false,
  signature_header text,                         -- X-Hub-Signature-256 header value (for debug)
  processed_at timestamptz,                      -- null = pending; set when worker processes
  processing_error text,                         -- error message if processing failed
  retry_count integer not null default 0 check (retry_count >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.whatsapp_inbound_events is
  'Raw inbound webhook payloads from Meta (ADR-004 §7). Append-only INSERT; worker updates processed_at/processing_error/retry_count. Use this table for replay/debugging and to decouple webhook receipt (must return 200 OK fast) from message processing (may take seconds).';

create index if not exists whatsapp_inbound_events_pending_idx
  on public.whatsapp_inbound_events (created_at)
  where processed_at is null;

-- ---------------------------------------------------------------------------
-- 6. Conversation state machine validation (ADR-004 §4)
-- ---------------------------------------------------------------------------
create or replace function public.conversation_valid_next_states(current_state text)
returns text[]
language sql
immutable
as $$
  select case
    when current_state = 'open'        then array['in_progress', 'escalated', 'closed']
    when current_state = 'in_progress' then array['resolved', 'escalated', 'closed']
    when current_state = 'escalated'   then array['in_progress', 'resolved', 'closed']
    when current_state = 'resolved'    then array['closed', 'in_progress']  -- reopened
    when current_state = 'closed'      then array['in_progress']            -- reopened
    else array[]::text[]
  end;
$$;

comment on function public.conversation_valid_next_states is
  'Valid next states for a WhatsApp conversation, per ADR-004 §4.';

create or replace function public.validate_conversation_state_transition()
returns trigger
language plpgsql
as $$
declare
  allowed text[];
  v_actor uuid;
  v_role text;
  v_reason text;
begin
  -- Only enforce when status is being changed
  if new.status is distinct from old.status then
    allowed := public.conversation_valid_next_states(old.status);
    if not (new.status = any(allowed)) then
      raise exception 'Invalid conversation state transition: % -> %. Allowed next states: [%]',
        old.status, new.status, array_to_string(allowed, ', ')
        using errcode = 'check_violation';
    end if;

    -- Capture actor from session variables
    v_actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_role := nullif(current_setting('app.current_user_role', true), '');
    v_reason := nullif(current_setting('app.conversation_transition_reason', true), '');

    -- Insert audit row
    insert into public.whatsapp_conversation_events (
      conversation_id, event_type, actor_user_id, actor_role,
      previous_value, new_value, reason
    )
    values (
      new.id, 'status_change', v_actor, v_role,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      coalesce(v_reason, 'transition')
    );

    -- Set closed_at when entering closed state
    if new.status = 'closed' and new.closed_at is null then
      new.closed_at = timezone('utc', now());
    end if;
    -- Clear closed_at when reopening
    if new.status <> 'closed' and new.closed_at is not null then
      new.closed_at = null;
    end if;
  end if;

  -- Track assignment changes
  if new.assigned_agent_id is distinct from old.assigned_agent_id then
    v_actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_role := nullif(current_setting('app.current_user_role', true), '');

    insert into public.whatsapp_conversation_events (
      conversation_id, event_type, actor_user_id, actor_role,
      previous_value, new_value
    )
    values (
      new.id,
      case when new.assigned_agent_id is null then 'agent_unassigned' else 'agent_assigned' end,
      v_actor, v_role,
      case when old.assigned_agent_id is not null
           then jsonb_build_object('agent_id', old.assigned_agent_id)
           else null end,
      case when new.assigned_agent_id is not null
           then jsonb_build_object('agent_id', new.assigned_agent_id)
           else null end
    );
  end if;

  -- Track linked_order changes
  if new.linked_order_id is distinct from old.linked_order_id then
    v_actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_role := nullif(current_setting('app.current_user_role', true), '');

    insert into public.whatsapp_conversation_events (
      conversation_id, event_type, actor_user_id, actor_role,
      previous_value, new_value
    )
    values (
      new.id,
      case when new.linked_order_id is null then 'unlinked_order' else 'linked_order' end,
      v_actor, v_role,
      case when old.linked_order_id is not null
           then jsonb_build_object('order_id', old.linked_order_id)
           else null end,
      case when new.linked_order_id is not null
           then jsonb_build_object('order_id', new.linked_order_id)
           else null end
    );
  end if;

  -- Track branch reassignment
  if new.branch_id is distinct from old.branch_id then
    v_actor := nullif(current_setting('app.current_user_id', true), '')::uuid;
    v_role := nullif(current_setting('app.current_user_role', true), '');

    insert into public.whatsapp_conversation_events (
      conversation_id, event_type, actor_user_id, actor_role,
      previous_value, new_value
    )
    values (
      new.id, 'branch_reassigned', v_actor, v_role,
      jsonb_build_object('branch_id', old.branch_id),
      jsonb_build_object('branch_id', new.branch_id)
    );
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_validate_conversation_state_transition on public.whatsapp_conversations;
create trigger trg_validate_conversation_state_transition
  before update on public.whatsapp_conversations
  for each row execute function public.validate_conversation_state_transition();

-- ---------------------------------------------------------------------------
-- 7. Append-only enforcement on whatsapp_conversation_events
-- ---------------------------------------------------------------------------
create or replace function public.enforce_conversation_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'whatsapp_conversation_events is append-only (ADR-004). INSERT only; UPDATE/DELETE rejected.';
end;
$$;

drop trigger if exists trg_conversation_events_no_update on public.whatsapp_conversation_events;
create trigger trg_conversation_events_no_update
  before update on public.whatsapp_conversation_events
  for each row execute function public.enforce_conversation_events_append_only();

drop trigger if exists trg_conversation_events_no_delete on public.whatsapp_conversation_events;
create trigger trg_conversation_events_no_delete
  before delete on public.whatsapp_conversation_events
  for each row execute function public.enforce_conversation_events_append_only();

-- ---------------------------------------------------------------------------
-- 8. Message immutability trigger (ADR-004 §5)
-- ---------------------------------------------------------------------------
-- Inbound messages: append-only (no UPDATE).
-- Outbound messages: body/content_type/template_key/from_phone/to_phone/media_url
--   become immutable once delivery_status reaches 'sent'. Only
--   delivery_status, provider_timestamp, failure_reason, retry_count,
--   updated_at may update.
-- PII anonymization: super-admin can set body/from_phone/media_url to
--   '[REDACTED]' via the bypass hook (app.bypass_message_immutability = 'on').
create or replace function public.enforce_whatsapp_message_immutability()
returns trigger
language plpgsql
as $$
declare
  v_bypass text;
  v_pii_anonymize boolean;
begin
  v_bypass := current_setting('app.bypass_message_immutability', true);
  v_pii_anonymize := (current_setting('app.pii_anonymize', true) = 'on');

  -- Bypass for trusted maintenance (e.g. 24-month anonymization job)
  if v_bypass = 'on' then
    return new;
  end if;

  -- Inbound messages are append-only (no UPDATE)
  if old.direction = 'inbound' then
    raise exception 'Inbound whatsapp_messages are append-only (ADR-004). UPDATE rejected.'
      using errcode = 'check_violation';
  end if;

  -- Outbound messages: once delivery_status reaches 'sent', body/content_type/
  -- template_key/from_phone/to_phone/media_url are immutable.
  if old.delivery_status in ('sent', 'delivered', 'read', 'failed', 'permanently_failed') then
    if new.body is distinct from old.body
       or new.content_type is distinct from old.content_type
       or new.template_key is distinct from old.template_key
       or new.template_language is distinct from old.template_language
       or new.template_parameters is distinct from old.template_parameters
       or new.from_phone is distinct from old.from_phone
       or new.to_phone is distinct from old.to_phone
       or new.media_url is distinct from old.media_url
       or new.direction is distinct from old.direction
       or new.conversation_id is distinct from old.conversation_id
    then
      raise exception 'Cannot UPDATE body/content/template/phone/media of sent outbound whatsapp_message (ADR-004 immutability). Only delivery_status/provider_timestamp/failure_reason/retry_count may update.'
        using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_message_immutability on public.whatsapp_messages;
create trigger trg_whatsapp_message_immutability
  before update on public.whatsapp_messages
  for each row execute function public.enforce_whatsapp_message_immutability();

-- DELETE is always blocked (both inbound and outbound) — messages are audit-grade
create or replace function public.enforce_whatsapp_message_no_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'whatsapp_messages cannot be DELETEd (ADR-004 audit). Use PII anonymization (super-admin) instead.'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists trg_whatsapp_message_no_delete on public.whatsapp_messages;
create trigger trg_whatsapp_message_no_delete
  before delete on public.whatsapp_messages
  for each row execute function public.enforce_whatsapp_message_no_delete();

-- ---------------------------------------------------------------------------
-- 9. RLS on whatsapp_conversations (ADR-004 §2)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_conversations enable row level security;

-- Branch-scoped read: agent can read conversations for their branch
create policy "whatsapp_conversations_branch_read"
  on public.whatsapp_conversations for select
  to authenticated, anon
  using (
    branch_id in (
      select ur.branch_id from public.user_roles ur
      where ur.user_id = auth.uid()
      and ur.assignment_status = 'ACTIVE'
    )
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid()
      and ur.assignment_status = 'ACTIVE'
      and ur.role_code = 'super-admin'
    )
  );

-- Service role can do everything (backend API uses service-role key)
create policy "whatsapp_conversations_service_all"
  on public.whatsapp_conversations for all
  to service_role
  using (true)
  with check (true);

grant select on public.whatsapp_conversations to authenticated, anon, service_role;
grant insert, update on public.whatsapp_conversations to service_role;
-- No DELETE granted — messages are audit-grade (trigger blocks anyway)

-- ---------------------------------------------------------------------------
-- 10. RLS on whatsapp_messages
-- ---------------------------------------------------------------------------
alter table public.whatsapp_messages enable row level security;

create policy "whatsapp_messages_branch_read"
  on public.whatsapp_messages for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.whatsapp_conversations c
      where c.id = whatsapp_messages.conversation_id
      and (
        c.branch_id in (
          select ur.branch_id from public.user_roles ur
          where ur.user_id = auth.uid()
          and ur.assignment_status = 'ACTIVE'
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
          and ur.assignment_status = 'ACTIVE'
          and ur.role_code = 'super-admin'
        )
      )
    )
  );

create policy "whatsapp_messages_service_all"
  on public.whatsapp_messages for all
  to service_role
  using (true)
  with check (true);

grant select on public.whatsapp_messages to authenticated, anon, service_role;
grant insert, update on public.whatsapp_messages to service_role;

-- ---------------------------------------------------------------------------
-- 11. RLS on whatsapp_conversation_events (read-only for agents; service_role writes)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_conversation_events enable row level security;

create policy "whatsapp_conversation_events_branch_read"
  on public.whatsapp_conversation_events for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.whatsapp_conversations c
      where c.id = whatsapp_conversation_events.conversation_id
      and (
        c.branch_id in (
          select ur.branch_id from public.user_roles ur
          where ur.user_id = auth.uid()
          and ur.assignment_status = 'ACTIVE'
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = auth.uid()
          and ur.assignment_status = 'ACTIVE'
          and ur.role_code = 'super-admin'
        )
      )
    )
  );

create policy "whatsapp_conversation_events_service_all"
  on public.whatsapp_conversation_events for all
  to service_role
  using (true)
  with check (true);

grant select on public.whatsapp_conversation_events to authenticated, anon, service_role;
grant insert on public.whatsapp_conversation_events to service_role;
-- No UPDATE/DELETE granted — trigger blocks anyway (append-only)

-- ---------------------------------------------------------------------------
-- 12. RLS on whatsapp_message_templates (read for all; service_role writes)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_message_templates enable row level security;

create policy "whatsapp_message_templates_read"
  on public.whatsapp_message_templates for select
  to authenticated, anon
  using (is_active = true);

create policy "whatsapp_message_templates_service_all"
  on public.whatsapp_message_templates for all
  to service_role
  using (true)
  with check (true);

grant select on public.whatsapp_message_templates to authenticated, anon, service_role;
grant insert, update, delete on public.whatsapp_message_templates to service_role;

-- ---------------------------------------------------------------------------
-- 13. RLS on whatsapp_inbound_events (service_role only)
-- ---------------------------------------------------------------------------
alter table public.whatsapp_inbound_events enable row level security;

create policy "whatsapp_inbound_events_service_all"
  on public.whatsapp_inbound_events for all
  to service_role
  using (true)
  with check (true);

grant select, insert, update on public.whatsapp_inbound_events to service_role;
-- Not granted to authenticated/anon — internal queue table

-- ---------------------------------------------------------------------------
-- 14. Insert 'created' event on new conversation
-- ---------------------------------------------------------------------------
create or replace function public.whatsapp_conversation_created_event()
returns trigger
language plpgsql
as $$
begin
  insert into public.whatsapp_conversation_events (
    conversation_id, event_type, previous_value, new_value, reason
  )
  values (
    new.id, 'created', null,
    jsonb_build_object(
      'branch_id', new.branch_id,
      'customer_id', new.customer_id,
      'contact_phone', new.contact_phone,
      'status', new.status
    ),
    'conversation created'
  );
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_conversation_created on public.whatsapp_conversations;
create trigger trg_whatsapp_conversation_created
  after insert on public.whatsapp_conversations
  for each row execute function public.whatsapp_conversation_created_event();

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
