-- =============================================================================
-- ADR-004 FU-1 — Fix immutability trigger column reference (body → content)
-- =============================================================================
-- The original migration `20260816000100_adr_004_whatsapp_conversation_ownership.sql`
-- defined the `whatsapp_messages` table with a column named `content` (line 93):
--
--   create table if not exists public.whatsapp_messages (
--     ...
--     content text,
--     ...
--   );
--
-- But the immutability trigger `enforce_whatsapp_message_immutability()`
-- (line 399) referenced the field as `new.body` / `old.body`:
--
--   if new.body is distinct from old.body
--      or new.content_type is distinct from old.content_type
--      ...
--
-- This is a runtime error: PL/pgSQL records use the table's column shape, so
-- `NEW.body` resolves to a non-existent field and the trigger fails the first
-- time it fires on an UPDATE where `old.delivery_status IN ('sent','delivered',
-- 'read','failed','permanently_failed')`.
--
-- The outbound outbox worker (Phase 2.2 Follow-up PR #3) performs exactly this
-- UPDATE pattern (send → set delivery_status='sent' → later webhook updates
-- 'delivered'/'read'/'failed'). Without this fix the outbound worker cannot
-- function.
--
-- This migration drops and recreates the trigger function with the correct
-- column name (`content`). The function signature is unchanged so the existing
-- trigger `trg_whatsapp_message_immutability` re-binds automatically.
--
-- Backward compatible: no schema change, no data change. Only a trigger
-- function definition is corrected. Existing rows are unaffected.
-- =============================================================================

begin;

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

  -- Outbound messages: once delivery_status reaches 'sent', content/content_type/
  -- template_key/from_phone/to_phone/media_url are immutable.
  if old.delivery_status in ('sent', 'delivered', 'read', 'failed', 'permanently_failed') then
    if new.content is distinct from old.content
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
      raise exception 'Cannot UPDATE content/content_type/template/phone/media of sent outbound whatsapp_message (ADR-004 immutability). Only delivery_status/provider_timestamp/failure_reason/retry_count may update.'
        using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.enforce_whatsapp_message_immutability is
  'Guards whatsapp_messages immutability (ADR-004 §5). Inbound rows are append-only. Outbound rows lock content/template/phone/media once delivery_status reaches ''sent''. Bypass via app.bypass_message_immutability=''on'' (maintenance only).';

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
