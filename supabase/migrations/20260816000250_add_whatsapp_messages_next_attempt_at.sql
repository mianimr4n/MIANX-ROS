-- =============================================================================
-- ADR-004 FU-2 — Add provider_next_attempt_at to whatsapp_messages
-- =============================================================================
-- The original `whatsapp_messages` table (migration 20260816000100) has no
-- column to gate retries by time. The outbound outbox worker (Phase 2.2
-- Follow-up PR #3) needs to defer retries with exponential backoff:
--
--   - On failure: bump retry_count + set provider_next_attempt_at = now() + backoff(n)
--   - On claim: only pick rows where provider_next_attempt_at IS NULL
--     OR provider_next_attempt_at <= now()
--
-- Pattern mirrors `reservation_communications.next_attempt_at` (D3 outbox).
--
-- Backward compatible: nullable column with default NULL. Existing rows are
-- eligible for immediate processing (which is correct — there are no existing
-- outbound rows since the feature is new).
-- =============================================================================

begin;

alter table public.whatsapp_messages
  add column if not exists provider_next_attempt_at timestamptz;

comment on column public.whatsapp_messages.provider_next_attempt_at is
  'Next time the outbound worker may attempt to send this row. NULL = eligible immediately. Set on failure to enforce exponential backoff (ADR-004 §5).';

-- Partial index for the outbox worker's claim query.
-- Drops first if exists to keep the migration idempotent.
drop index if exists public.whatsapp_messages_outbox_pending_idx;
create index if not exists whatsapp_messages_outbox_pending_idx
  on public.whatsapp_messages (created_at)
  where direction = 'outbound'
    and delivery_status in ('pending', 'failed')
    and (provider_next_attempt_at is null or provider_next_attempt_at <= timezone('utc', now()));

comment on index public.whatsapp_messages_outbox_pending_idx is
  'Partial index for the WhatsApp outbound worker claim query (ADR-004 §5). Covers pending + retryable-failed rows whose backoff has elapsed.';

commit;

-- =============================================================================
-- End of migration
-- =============================================================================
