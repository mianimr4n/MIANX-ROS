# ADR-004: WhatsApp Conversation Ownership & Routing

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260814180200_adr_004_whatsapp_conversation_ownership.sql`)

---

## Context

Phase 2.2 (WhatsApp Foundation) introduces two-way WhatsApp messaging
between customers and the business. Customers will message a single
WhatsApp Business number (the WABA phone number), but the business
operates multiple branches. A customer asking "where is my order?" may be
referring to an order placed at any branch — the message itself does not
declare its branch.

The existing schema has `orders.order_channel` (which can be `whatsapp`)
and `customers.phone` (E.164, partially normalized), but no conversation
model, no message audit, no agent assignment, and no template registry.
The Phase 2 readiness audit (`SUPPORT_WHATSAPP_READINESS.md`) proposed a
data model and webhook plan; this ADR formalizes the ownership and routing
decisions that underpin that model.

The decisions here are tightly coupled to ADR-003 (Provider-Secret
Boundary — secrets never in DB) and to the existing branch-isolation RBAC
pattern (`exists (select 1 from user_roles ur where ur.user_id = auth.uid()
and ur.assignment_status = 'ACTIVE')`).

## Decision

### 1. Conversations belong to the receiving branch

A `whatsapp_conversations` row is created on the first inbound message
from a given customer phone number, and is attributed to a specific
`branch_id`. Branch attribution is determined by:

1. **Linked order** — if the customer has an open order placed via
   WhatsApp (`order_channel = 'whatsapp'`) at exactly one branch within
   the last 24 hours, the conversation attaches to that branch.
2. **Default branch** — otherwise, the conversation attaches to the
   organization's `default_branch_id` (configurable per
   `whatsapp_provider_configs`). A `super-admin` can re-assign the
   conversation to a different branch via the admin API.

Once attributed, the conversation stays with that branch for its lifetime.
Closing and re-opening creates a NEW conversation row (the old one
remains read-only for audit).

### 2. Agent RLS scoped by branch; super-admin cross-branch

Row-level security on `whatsapp_conversations` and `whatsapp_messages`
uses the canonical branch-scoping pattern:

```sql
-- Branch-scoped read: agent can read conversations for their branch
create policy "whatsapp_conversations_branch_read"
  on public.whatsapp_conversations for select
  using (
    branch_id in (
      select ur.branch_id from public.user_roles ur
      where ur.user_id = auth.uid()
      and ur.assignment_status = 'ACTIVE'
    )
  );

-- Super-admin bypasses via the existing auth.uid() IN super-admins check
-- (pattern established in user_roles RLS, not duplicated here)
```

Permissions by role:

| Role | Read | Send | Assign | Escalate | Close | Anonymize |
|------|------|------|--------|----------|-------|-----------|
| `customer-support` | Own branch | Own branch | ❌ | ❌ | Own branch | ❌ |
| `branch-manager` | Own branch | Own branch | Own branch | Own branch | Own branch | ❌ |
| `super-admin` | All branches | All branches | All branches | All branches | All branches | ✅ |

### 3. Provisional customer identity for unknown phone numbers

When an inbound WhatsApp message arrives from a phone number with no
matching `customers.phone`:

1. Create a `customers` row with `status = 'provisional'` (new status
   value added by this ADR's migration), `phone = <E.164>`,
   `full_name = 'WhatsApp <last 4 digits>'` (placeholder).
2. The conversation's `customer_id` points to this provisional row.
3. When Phase 2.3 (CRM) lands, the provisional record can be merged into
   a canonical customer via the ADR-006 merge process. Until then, the
   provisional record IS the customer for WhatsApp purposes.

Provisional customers are visible only to `super-admin` and
`customer-support` / `branch-manager` of the receiving branch. They do
NOT appear in marketing campaign audiences (the
`marketing_campaign_submissions` query excludes `status = 'provisional'`).

### 4. Conversation state machine

```
open → in_progress → resolved → closed
                ↘ escalated → closed
```

- `open` — initial state, no agent assigned
- `in_progress` — agent assigned, conversation active
- `escalated` — flagged for super-admin / branch-manager attention
- `resolved` — agent marked resolved, awaiting customer confirmation
  (auto-closes after 24h of customer silence)
- `closed` — terminal; further inbound messages from the same customer
  create a NEW conversation

Transitions are enforced by a SQL trigger
(`trg_validate_conversation_state_transition`) mirroring the ADR-007
pattern. Every transition is recorded in
`whatsapp_conversation_events` (append-only audit).

### 5. Message immutability (sent + received)

- **Outbound messages**: once `delivery_status` reaches `sent`, the
  `body`, `content_type`, `template_id`, and `from_phone` columns are
  IMMUTABLE. Only `delivery_status`, `provider_timestamp`,
  `failure_reason`, and `retry_count` may update (driven by webhook
  callbacks). Enforced by trigger mirroring ADR-011.
- **Inbound messages**: append-only. No UPDATE or DELETE allowed
  (enforced by trigger). The only mutation permitted is PII anonymization
  by `super-admin` (sets `from_phone = '[REDACTED]'`, `content =
  '[REDACTED]'`), which is logged in `whatsapp_conversation_events` with
  `event_type = 'pii_anonymized'`.
- **Idempotent webhook upsert**: `whatsapp_messages.provider_message_id`
  (the Meta `wamid`) has a UNIQUE constraint. Duplicate webhook deliveries
  hit `ON CONFLICT (provider_message_id) DO NOTHING` and return 200 OK
  silently. No duplicate processing.

### 6. PII retention: 24 months from conversation close, then anonymize

- Message content (`body`, `from_phone`, `media_url`) is retained for
  **24 months** from `whatsapp_conversations.closed_at`.
- After 24 months, a background job (mirroring the existing notification
  outbox worker pattern) anonymizes all messages in the closed
  conversation: sets `body = '[REDACTED]'`, `from_phone = '[REDACTED]'`,
  `media_url = NULL`. The message envelope (`id`, `conversation_id`,
  `direction`, `provider_message_id`, `delivery_status`, `created_at`)
  is retained forever for audit count.
- Customer phone number on `customers.phone` is retained as long as the
  customer record is `active` or `provisional`. Anonymization only
  happens when a customer exercises the right-to-delete (separate flow,
  Phase 2.3 CRM).

### 7. Webhook contract: verify → 200 OK → async process

The webhook endpoint (`POST /api/v1/webhooks/whatsapp`):

1. **Verify** HMAC-SHA256 signature using `WHATSAPP_APP_SECRET` (env var
   per ADR-003). Budget: 500ms. Invalid signature → 401 Unauthorized.
2. **Return 200 OK immediately** — Meta retries webhook delivery on
   non-2xx with exponential backoff; we must not block on DB writes.
3. **Enqueue** the raw payload to the WhatsApp inbound queue
   (`whatsapp_inbound_events` table, append-only).
4. **Background worker** (mirrors `services/notifications/outbox-worker.ts`
   pattern) drains the queue: normalizes via the provider adapter,
   idempotent-upserts to `whatsapp_messages`, updates conversation
   state, notifies the assigned agent (via the existing notification
   outbox).

The GET handshake (`GET /api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`)
compares `hub.verify_token` against `WHATSAPP_VERIFY_TOKEN` env var and
returns `hub.challenge` as plaintext on match. No DB access.

### 8. Provider adapter contract

A `MessageProviderAdapter` interface normalizes across providers
(WhatsApp today; SMS / email-to-SMS gateway future):

```typescript
interface MessageProviderAdapter {
  sendMessage(to: string, content: MessageContent, templateId?: string): Promise<MessageResult>;
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
  normalizeInboundEvent(rawPayload: unknown): NormalizedInboundEvent;
}
```

The WhatsApp Cloud API implementation
(`services/whatsapp/cloud-api-adapter.ts`) is the only implementation
today. The interface lives in `services/providers/adapter.ts` so future
providers (SMS, email-to-SMS) can plug in.

## Consequences

### Positive

- **Branch autonomy preserved.** Each branch sees only its own
  conversations; agents cannot accidentally read cross-branch customer
  messages. Super-admin retains full visibility for escalations.
- **Audit-grade message integrity.** Combined with ADR-007 (delivery
  state machine) and ADR-011 (accounting immutability), the platform now
  has DB-enforced immutability for delivery, accounting, AND messaging.
- **Idempotent webhooks.** Meta's documented retry behavior (up to 7
  attempts over 24h) cannot cause duplicate message processing. The
  `wamid` UNIQUE constraint is the single source of truth.
- **PII retention bounded.** 24-month anonymization is enforced by a
  background job, not by operator discipline. Audit envelope preserved
  forever.
- **Provisional identity unblocks WhatsApp without CRM.** We can launch
  WhatsApp support before Phase 2.3 (CRM) lands. Provisional records
  merge cleanly into canonical customers later.

### Negative

- **No cross-branch conversation history for agents.** A customer who
  messages about orders at two different branches will have two separate
  conversations. This is intentional (branch autonomy) but may confuse
  agents. Mitigation: super-admin can see both, and Phase 2.3 CRM will
  provide a unified customer view across branches.
- **Provisional customers can accumulate.** If Phase 2.3 CRM is delayed,
  we may accumulate provisional customer records that are actually the
  same person messaging from multiple sessions. The merge process
  (ADR-006) will handle this, but until then, duplicate provisional
  records are a known data-quality debt.
- **Webhook async processing adds latency.** A customer message takes
  ~1-3 seconds (queue → worker → DB write) to appear in the agent UI.
  Acceptable for support; not acceptable for real-time chat. Out of
  scope for v1 — Phase 2.2 is support, not chat.
- **24-month retention is a global policy.** Per-customer retention
  overrides (e.g. a customer requests earlier deletion) require a
  separate flow (right-to-delete, Phase 2.3 CRM). The anonymization
  job runs on the global 24-month schedule regardless.

## Implementation references

- Migration: `supabase/migrations/20260814180200_adr_004_whatsapp_conversation_ownership.sql`
- Provider adapter interface: `backend/api/src/services/providers/adapter.ts`
- WhatsApp Cloud API adapter: `backend/api/src/services/whatsapp/cloud-api-adapter.ts`
- Webhook receiver: `backend/api/src/modules/webhooks/whatsapp.ts`
- Inbound worker: `backend/api/src/services/whatsapp/inbound-worker.ts`
- Outbound worker: `backend/api/src/services/whatsapp/outbox-worker.ts`
- Admin routes: `backend/api/src/modules/admin/whatsapp.ts`
- Tests: `backend/api/tests/whatsapp-*.test.ts`
- Frontend wiring: `apps/website/client/src/pages/admin/AdminWhatsApp.tsx` (flip `integrationChecks()` from `missing` to `present`)

## Future work (out of scope for this ADR)

- **ADR-005** — Canonical Customer Identity Strategy (will resolve
  provisional customers into a unified master record)
- **ADR-006** — Customer Account Merge & Reversal Process (will allow
  merging duplicate provisional records)
- **Real-time agent UI** (SSE / WebSocket for sub-second message
  delivery) — Phase 2.2 ships polling only; real-time is a separate
  workstream
- **WhatsApp Interactive Messages** (buttons, lists, CTAs) — v1 ships
  text + template only; interactive messages are a follow-up
- **WhatsApp Business Catalog sync** (auto-sync menu items to WhatsApp
  catalog) — out of scope; manual catalog management via Meta Business
  Manager for v1
