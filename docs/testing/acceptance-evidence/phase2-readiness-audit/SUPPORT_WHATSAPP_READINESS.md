# Phase 2 Readiness Audit — Support and WhatsApp Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current State Audit

### What Exists

**UI:**
- `/admin/whatsapp` (AdminWhatsApp) — FOUNDATION — renders an order-based WhatsApp view
  - Displays orders filtered by channel (WhatsApp)
  - Components: ConversationWorkspace, CustomerContextPanel, LinkedOrderPanel, WhatsAppIntegrationBanner, WhatsAppActivity, WhatsAppFilters, WhatsAppKPIs, WhatsAppOrderBuilder, WhatsAppOrderQueue, WhatsAppTemplates
  - All data is derived from `listAdminOrders` — no real conversation data
  - `WhatsAppIntegrationBanner` indicates provider not connected
- `/admin/support` — NAVIGATION_ONLY (AdminComingSoon)

**Database:**
- `orders.order_channel` — field exists to flag WhatsApp-attributed orders
- No `conversations` table
- No `messages` table
- No `agent_assignments` table
- No `message_templates` table
- No `conversation_events` table

**Backend:**
- No dedicated WhatsApp or support module in backend
- No webhook endpoint
- No outbox worker for WhatsApp (outbox exists for notifications: `outboxWorker` dependency registered)

**Notification infrastructure:**
- `outbox_worker` service exists in backend (`services/notifications/outbox-worker.js`)
- `manual_contact` service exists
- Notification channels (customer orders, rider dispatch, escalation) are configured per PROJECT_STATUS.md
- These are one-way notifications, not two-way conversations

**Customer contact fields:**
- `customers.phone` (E.164 target; partial)
- `customers.email`
- `customers.marketing_consent` (boolean)

**Provider metadata:**
- No WhatsApp provider configuration stored
- No WABA number stored
- No HMAC secret references

---

## Gap Analysis Against Phase 2.2

### Provider Adapter Contract (Required Decisions)

**Provider adapter contract:**
The adapter must normalize across providers (WhatsApp Business API, future SMS). Define interface:
```typescript
interface MessageProviderAdapter {
  sendMessage(to: string, content: MessageContent, templateId?: string): Promise<MessageResult>;
  verifyWebhookSignature(payload: Buffer, signature: string): boolean;
  normalizeInboundEvent(rawPayload: unknown): NormalizedInboundEvent;
}
```

**Webhook authentication:**
- HMAC-SHA256 signature verification required
- Secret stored in environment variable; never in database
- Webhook endpoint must return 200 OK immediately; process asynchronously

**Idempotency key:**
- WhatsApp assigns a unique message ID (`wamid`)
- Use `wamid` as idempotency key in `messages.provider_message_id UNIQUE`
- Duplicate webhook delivery → idempotent upsert, no duplicate processing

**Message ordering:**
- WhatsApp delivers messages in order per conversation within a short window
- Store `provider_timestamp` from webhook payload; display in provider order
- Do not rely on database `created_at` for ordering

**Duplicate webhook handling:**
- First write wins — idempotent upsert on `provider_message_id`
- Log duplicate receipts; do not error

**PII retention:**
- Message content: retain for 24 months from conversation close date, then anonymize
- Customer phone number: retain as long as customer record is active
- Message media: reference only (URL); do not store binary in DB

**Cross-branch access:**
- A conversation is owned by the branch that received it
- Support agents scoped to a branch can only read their branch's conversations
- super-admin may read all branches

**Agent permissions:**
- `customer-support` role: read conversations, send messages, update status
- `branch-manager`: read conversations, escalate, reassign agent
- `super-admin`: all of the above plus delete/anonymize

**Customer identity ambiguity:**
- Incoming message from unknown phone → create provisional customer record
- Provisional record becomes canonical when confirmed by CRM (Phase 2.3)
- Do not auto-merge provisionals without explicit CRM action

**Failed delivery handling:**
- Track `delivery_status IN ('sent', 'delivered', 'read', 'failed')`
- On failure: record failure reason; retry up to 3 times with exponential backoff
- After 3 failures: mark conversation message as `permanently_failed`; alert agent

**Deletion/anonymization:**
- On customer right-to-delete: anonymize all message `from_phone`, `content` containing PII
- Replace with `[REDACTED]` sentinel; retain message envelope for audit count

**Analytics boundaries:**
- Message counts, response times, resolution rates: permitted
- Message content analysis: not permitted without explicit consent

---

## Proposed Data Model

### `conversations` (new)
```sql
id uuid PRIMARY KEY
branch_id uuid REFERENCES branches(id) NOT NULL
customer_id uuid REFERENCES customers(id) -- nullable until identity resolved
provider TEXT CHECK (provider IN ('whatsapp', 'sms', 'email')) NOT NULL
provider_conversation_id VARCHAR(200) UNIQUE -- provider's thread/contact identifier
contact_phone VARCHAR(30)
status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'escalated', 'closed')) DEFAULT 'open'
assigned_agent_id uuid REFERENCES users(id)
linked_order_id uuid REFERENCES orders(id)
unread_count INTEGER DEFAULT 0
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
closed_at TIMESTAMPTZ
```

### `messages` (new)
```sql
id uuid PRIMARY KEY
conversation_id uuid REFERENCES conversations(id) NOT NULL
direction TEXT CHECK (direction IN ('inbound', 'outbound')) NOT NULL
provider_message_id VARCHAR(200) UNIQUE -- wamid or equivalent
from_phone VARCHAR(30)
content TEXT
content_type TEXT CHECK (content_type IN ('text', 'template', 'image_ref', 'doc_ref', 'audio_ref')) DEFAULT 'text'
media_url TEXT -- external URL reference only; no binary storage
template_id VARCHAR(100)
delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending'
provider_timestamp TIMESTAMPTZ -- timestamp from provider
failure_reason TEXT
retry_count INTEGER DEFAULT 0
created_at TIMESTAMPTZ
```

### `conversation_events` (new)
```sql
id uuid PRIMARY KEY
conversation_id uuid REFERENCES conversations(id)
event_type TEXT NOT NULL -- 'status_change', 'agent_assigned', 'escalated', 'linked_order', 'closed'
actor_id uuid REFERENCES users(id)
previous_value JSONB
new_value JSONB
created_at TIMESTAMPTZ
```

### `message_templates` (new)
```sql
id uuid PRIMARY KEY
branch_id uuid REFERENCES branches(id) -- null = org-wide
template_key VARCHAR(100) NOT NULL
provider_template_id VARCHAR(200) -- WhatsApp approved template name
language VARCHAR(10) DEFAULT 'en'
content TEXT NOT NULL
variables JSONB -- variable names/positions
is_active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
```

---

## Webhook Infrastructure Plan

```
[WhatsApp Platform]
        │ HTTPS POST /api/v1/webhooks/whatsapp
        ▼
[Webhook Endpoint]
  1. Verify HMAC-SHA256 signature (500ms budget)
  2. Return HTTP 200 OK immediately
  3. Enqueue event to outbox_worker
        │
        ▼
[Outbox Worker]
  1. Dequeue event
  2. Normalize via adapter
  3. Idempotent upsert to messages table
  4. Update conversation state
  5. Notify assigned agent (push/SSE)
```

---

## Readiness Assessment

| Item | Status |
|---|---|
| Order-channel attribution | EXISTS (`orders.order_channel`) |
| Customer contact fields | PARTIAL |
| Notification outbox infrastructure | EXISTS |
| Conversation model | MISSING |
| WhatsApp provider connection | MISSING |
| Webhook infrastructure | MISSING |
| Agent assignment | MISSING |
| Message templates | MISSING |
| Consent management | PARTIAL |
| ADR-002 (provider-secret boundary) required | YES |
| ADR-003 (conversation ownership) required | YES |
| Phase 2.2 maturity | NAVIGATION_ONLY / FOUNDATION → target PARTIAL_LIVE |

**Verdict: READY TO PLAN — ADR-002 and ADR-003 must be accepted before implementation. No provider should be connected until sandbox testing is complete.**
