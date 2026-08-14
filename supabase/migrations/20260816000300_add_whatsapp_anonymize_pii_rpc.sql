-- =============================================================================
-- ADR-004 §5/§9 — RPC for WhatsApp PII anonymization (24-month retention)
-- =============================================================================
-- Creates the `whatsapp_anonymize_pii(p_conversation_ids uuid[])` RPC that
-- the PII anonymization job calls.
--
-- The RPC:
--   1. Sets `app.bypass_message_immutability = 'on'` so the trigger on
--      whatsapp_messages allows UPDATE of content/from_phone/to_phone/media_url.
--   2. Sets `app.pii_anonymize = 'on'` (documented for future use).
--   3. UPDATEs whatsapp_messages rows in the given conversations to set
--      PII fields to '[REDACTED]'.
--   4. UPDATEs whatsapp_conversations rows to set contact_phone,
--      last_message_preview to '[REDACTED]' and pii_anonymized_at = now().
--   5. INSERTs a 'pii_anonymized' event into whatsapp_conversation_events
--      for each conversation.
--   6. Returns a summary { anonymized_conversations, anonymized_messages }.
--
-- Idempotent: conversations already anonymized (pii_anonymized_at IS NOT NULL)
-- are NOT re-processed — the UPDATE on pii_anonymized_at is gated by
-- `pii_anonymized_at IS NULL`. The message UPDATEs are NOT idempotent (they
-- would re-write '[REDACTED]' over '[REDACTED]') but the count returned
-- reflects only the rows actually changed (via ROW_COUNT).
--
-- Authority: ADR-004 §5 (PII anonymization via app.bypass_message_immutability)
--           ADR-004 §9 (24-month retention policy)
-- =============================================================================

begin;

create or replace function public.whatsapp_anonymize_pii(p_conversation_ids uuid[])
returns table(anonymized_conversations bigint, anonymized_messages bigint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_conv_count bigint;
  v_msg_count bigint;
begin
  -- Validate input.
  if p_conversation_ids is null or array_length(p_conversation_ids, 1) is null then
    return query select 0::bigint, 0::bigint;
    return;
  end if;

  -- Set bypass flags so the immutability trigger allows the UPDATE.
  -- These are session-local; they don't affect other connections.
  perform set_config('app.bypass_message_immutability', 'on', false);
  perform set_config('app.pii_anonymize', 'on', false);

  -- Anonymize messages: only for conversations not yet anonymized.
  with target as (
    select id from public.whatsapp_conversations
    where id = any(p_conversation_ids)
      and pii_anonymized_at is null
  )
  update public.whatsapp_messages m
  set
    content = '[REDACTED]',
    from_phone = '[REDACTED]',
    to_phone = '[REDACTED]',
    media_url = '[REDACTED]'
  from target
  where m.conversation_id = target.id;

  get diagnostics v_msg_count = row_count;

  -- Anonymize conversations: set pii_anonymized_at, redact contact_phone + preview.
  update public.whatsapp_conversations
  set
    contact_phone = '[REDACTED]',
    last_message_preview = '[REDACTED]',
    pii_anonymized_at = timezone('utc', now())
  where id = any(p_conversation_ids)
    and pii_anonymized_at is null;

  get diagnostics v_conv_count = row_count;

  -- Insert audit events for each anonymized conversation.
  insert into public.whatsapp_conversation_events (
    conversation_id, event_type, actor_role, new_value, reason
  )
  select
    c.id,
    'pii_anonymized',
    'system',
    jsonb_build_object(
      'anonymized_at', c.pii_anonymized_at,
      'fields', array['contact_phone', 'last_message_preview', 'content', 'from_phone', 'to_phone', 'media_url']
    ),
    '24-month PII retention policy (ADR-004 §9)'
  from public.whatsapp_conversations c
  where c.id = any(p_conversation_ids)
    and c.pii_anonymized_at = timezone('utc', now());  -- only the ones we just updated

  -- Clear bypass flags.
  perform set_config('app.bypass_message_immutability', '', false);
  perform set_config('app.pii_anonymize', '', false);

  return query select v_conv_count, v_msg_count;
  return;
end;
$$;

comment on function public.whatsapp_anonymize_pii is
  'Anonymize PII in WhatsApp conversations + messages older than 24 months (ADR-004 §5/§9). Sets app.bypass_message_immutability=''on'' to allow the immutability trigger to permit the UPDATE. Idempotent: conversations with pii_anonymized_at NOT NULL are skipped.';

-- SECURITY DEFINER + restrict to service_role only.
revoke all on function public.whatsapp_anonymize_pii(uuid[]) from public, anon, authenticated;
grant execute on function public.whatsapp_anonymize_pii(uuid[]) to service_role;

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
