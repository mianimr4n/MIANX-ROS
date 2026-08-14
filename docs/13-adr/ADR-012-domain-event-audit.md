# ADR-012: Domain Event & Shared Audit Architecture

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260819000000_adr_012_domain_event_audit.sql`)

---

## Context

Telepizza's audit history is currently scattered across individual tables:

- `delivery_state_transitions` (ADR-007) — delivery lifecycle audit
- `whatsapp_conversation_events` (ADR-004) — conversation lifecycle audit
- `order_status_logs` — order lifecycle audit
- `journal_entry_lines` + `finance_postings` (ADR-011) — financial audit
- `customer_merge_log` (ADR-006) — customer merge audit

Each of these tables is correctly domain-specific (they store domain-relevant
metadata that doesn't fit a generic schema). But they share three problems:

1. **No cross-domain query.** "Show me everything that happened to customer
   X across orders, deliveries, conversations, and financial transactions"
   requires querying 5+ tables and stitching results in application code.
2. **No consistent actor record.** Each table stores `actor_user_id` and
   `actor_role` differently — some as separate columns, some inside JSONB
   metadata, some not at all. There is no single "who did what when"
   record.
3. **No generic event stream for AI / analytics.** The Mianx.ai operations
   insights engine needs a feed of "things that happened" to summarize for
   the executive dashboard. Today it must poll each domain table separately,
   which is brittle and slow.

ADR-012 introduces a centralized `domain_events` table that captures a
generic event record for every significant state change across domains,
alongside the existing domain-specific tables. The domain tables remain
the source of truth for domain-specific data; `domain_events` is an
indexed, queryable projection.

## Decision

Implement domain events with these rules:

1. **`domain_events` is append-only.** INSERT only; UPDATE and DELETE are
   blocked by trigger. This is the universal audit contract — once an
   event has happened, it cannot be un-happened (even if the business
   action is reversed, the reversal is a NEW event, not an edit).

2. **Schema is generic but typed.** Each row has:
   - `event_type` — e.g. `order.created`, `delivery.transitioned`,
     `whatsapp.message_received`, `journal.posted`, `customer.merged`
   - `domain` — e.g. `orders`, `deliveries`, `whatsapp`, `finance`,
     `customers`
   - `entity_id` — UUID of the primary entity the event is about
   - `actor_user_id` — UUID of the user who triggered the event (nullable
     for system-triggered events)
   - `actor_role` — role code at time of event (e.g. `super-admin`,
     `rider`, `system`)
   - `metadata` — JSONB with event-specific details (before/after state,
     reason, etc.)
   - `occurred_at` — server-generated timestamp
   - `correlation_id` — optional UUID for tracing events that are part of
     the same business transaction (e.g. an order creation that triggers
     a delivery creation that triggers a notification)

3. **Domain tables remain source of truth.** `domain_events` is a
   projection, not a replacement. Domain tables continue to store
   domain-specific data (e.g. `delivery_state_transitions.from_status`
   and `to_status` are real columns, not just JSONB blobs). `domain_events`
   provides the cross-domain query layer.

4. **Insert via helper RPC.** A SQL function `emit_domain_event()` is
   the canonical way to insert. It validates the event_type format
   (must be `<domain>.<action>` lowercase) and returns the inserted row's
   id. Application code calls this RPC; direct INSERT is blocked by RLS
   (only service_role can insert).

5. **Domain triggers fire events.** Each domain-specific audit table
   (delivery_state_transitions, whatsapp_conversation_events,
   customer_merge_log, etc.) gets an AFTER INSERT trigger that calls
   `emit_domain_event()` to mirror the domain-specific event into
   `domain_events`. This keeps the two layers in sync without requiring
   application code changes.

6. **Branch-scoped RLS.** Most events are branch-scoped (an order
   belongs to a branch, a delivery belongs to a branch, etc.). The
   `domain_events.branch_id` column is populated by the helper RPC based
   on the entity's domain. Branch staff can read events for their branch;
   super-admin can read all events.

7. **Retention is 24 months.** Events older than 24 months are archived
   to cold storage (Supabase Storage Parquet export) and deleted from
   the hot table. This is a future job (Phase 2.5 follow-up); the schema
   supports it via the `occurred_at` index.

8. **Correlation IDs for tracing.** When a single user action triggers
   multiple events across domains (e.g. "mark order delivered" triggers
   `delivery.transitioned`, `order.transitioned`, `cod.collection_recorded`,
   `journal.posted`), the application sets a single `correlation_id` on
   all of them. This enables end-to-end tracing of business transactions.

## Consequences

### Positive

- **Cross-domain queries are easy.** "Show me everything that happened
  to customer X in the last 24 hours" is a single SELECT on
  `domain_events` with `metadata->>'customer_id' = X`.
- **Consistent actor record.** Every event has `actor_user_id` and
  `actor_role` columns — no more grepping JSONB for who did what.
- **AI/analytics feed.** Mianx.ai can subscribe to a single event stream
  instead of polling 5+ tables.
- **Audit compliance.** Append-only contract is enforceable; 24-month
  retention is documented.

### Negative

- **Storage cost.** Every domain event is now stored twice — once in
  the domain-specific table, once in `domain_events`. For high-volume
  domains (e.g. rider locations), this would be unacceptable. The
  triggers therefore only fire for significant state changes, not for
  every row (e.g. a rider location ping does NOT emit a domain event;
  a delivery transition does).
- **Two layers to keep in sync.** If a domain table is updated without
  going through the trigger (e.g. direct SQL by an admin), the
  `domain_events` projection will be stale. This is mitigated by the
  append-only contract on domain tables (most are already append-only
  via their own triggers).
- **Schema migration risk.** Adding a new domain event type is a
   CHECK constraint extension + trigger addition. Schema changes
   require migration.

## Implementation references

- Migration: `supabase/migrations/20260819000000_adr_012_domain_event_audit.sql`
- TypeScript service: `backend/api/src/services/audit/domain-event-service.ts`
- Admin route: `backend/api/src/modules/admin/audit.ts`
- Tests: `backend/api/tests/domain-event-service.test.ts`

## Future work (out of scope for this ADR)

- **24-month archival job** — Exports events older than 24 months to
  Supabase Storage as Parquet, then deletes from hot table.
- **Real-time event stream** — WebSocket/SSE layer that pushes new
  domain_events to subscribed admin clients (e.g. executive dashboard).
- **Event sourcing migration** — Some domains may eventually move to
  full event sourcing (replayable state from events). Out of scope; the
  current projection model is sufficient.
