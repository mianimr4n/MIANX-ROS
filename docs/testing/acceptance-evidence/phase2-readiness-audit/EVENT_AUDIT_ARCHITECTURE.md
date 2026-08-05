# Phase 2 Readiness Audit — Event and Audit Architecture

**Audit date:** 2026-08-04
**Status:** PROPOSED — for acceptance before Phase 2 implementation

---

## Current Event/History Capabilities (Repository Evidence)

### What Exists

| Capability | Evidence | Notes |
|---|---|---|
| `updated_at` column | All major tables | Timestamp of last mutation; no history |
| `updated_by` | `organization_settings.updated_by` | Single actor capture; no append-only |
| `finance_postings` | `20260731040000` | Source → journal linkage; idempotency; not an event table |
| `journal_entries.reversed_by_journal_id` | `20260731040000` | Reversal link on journal; not an event |
| `pos_z_report_events` | `20260730210000` | Z-Report trigger log; domain-specific event table |
| `ai_tasks` status machine | `20260730120000` | Task status with transitions; append-only by pattern |
| `configuration_change_log` | **PROPOSED** | Does not exist yet |
| `conversation_events` | **PROPOSED** | Does not exist yet |
| `customer_merge_log` | **PROPOSED** | Does not exist yet |
| `delivery_attempts` | **PROPOSED** | Does not exist yet |
| `period_close_log` | **PROPOSED** | Does not exist yet |

### What Does Not Exist

- No generic append-only domain event table
- No correlation IDs across requests
- No event replay capability
- No PII-aware redaction on events
- No audit tables for most domains
- No request/response logs in application code beyond platform logs

---

## Minimum Event/Audit Architecture for Phase 2

### Design Principle: Domain-Specific Event Tables

**Do NOT propose one universal event stream without evidence it is appropriate.**

Evidence: The repository has domain-specific tables (pos_z_report_events, ai_tasks). This pattern is appropriate for a monolithic application. Universal event streaming (Kafka, EventBridge) is not warranted at current scale.

**Proposed architecture:** Per-domain append-only event tables + a shared audit event bus implemented as a PostgreSQL table with RLS.

---

## Event Taxonomy

### Domain Events
Events that represent significant state changes within a bounded domain.
- `OrderStatusChanged`
- `DeliveryAssigned`
- `CustomerMerged`
- `JournalPosted`

### Audit Events
Events that record who did what to which resource for compliance/traceability.
- `ConfigurationActivated` (who activated which config version)
- `CustomerAnonymized`
- `PeriodClosed`
- `StaffInvited`

### Integration Events
Events emitted to trigger cross-domain workflows.
- `CodCollected` → triggers Finance posting
- `GRNApproved` → triggers Inventory update + AP posting
- `PayrollApproved` → triggers Finance posting

### Analytics Events
Events captured for business intelligence (non-operational).
- `OrderViewed`
- `MenuItemClickedToCart`
These are kept separate from operational events.

### Operational Logs
Platform-level logs (request logs, error logs). These are NOT audit events.
These live in platform logging (Render/Vercel) and are not in the application database.

---

## Proposed Event Tables

### `audit_events` (new — shared audit log)
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
event_name VARCHAR(100) NOT NULL
domain TEXT NOT NULL -- 'settings', 'customer', 'finance', 'delivery', 'support', 'ai'
aggregate_type VARCHAR(100) NOT NULL -- 'configuration_version', 'customer', 'journal_entry', etc.
aggregate_id uuid NOT NULL -- ID of the affected entity
actor_type TEXT CHECK (actor_type IN ('user', 'system', 'provider')) DEFAULT 'user'
actor_id uuid -- user.id or null for system
organization_id uuid -- future multi-org support (null = current org)
branch_id uuid REFERENCES branches(id) -- null = org-wide event
correlation_id uuid -- groups related events in one operation
idempotency_key VARCHAR(200) UNIQUE -- prevents duplicate event emission
payload_classification TEXT CHECK (payload_classification IN ('non_pii', 'pii_reference', 'pii_masked')) DEFAULT 'non_pii'
payload JSONB NOT NULL DEFAULT '{}'
pii_fields TEXT[] -- field names that contain PII (for redaction reference)
is_redacted BOOLEAN DEFAULT false
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**RLS:** Only `service_role` may INSERT. `super-admin` and audit role may SELECT. No UPDATE or DELETE permitted.

**Retention:** 7 years minimum. Redaction replaces PII fields with `[REDACTED]`; does not delete row.

---

## Proposed Events by Domain

### Phase 2.1 — Settings/Configuration

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `ConfigurationDraftCreated` | configuration_version | user | None | Audit |
| `ConfigurationActivated` | configuration_version | user | None | All config consumers |
| `ConfigurationRolledBack` | configuration_version | user | None | Audit |
| `ConfigurationChangeApproved` | configuration_version | user | None | Audit |

### Phase 2.2 — Support/WhatsApp

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `ConversationCreated` | conversation | provider/user | phone_ref | CRM (identity link) |
| `MessageReceived` | message | provider | none (no content) | Agent notification |
| `MessageSent` | message | user | none | Delivery tracking |
| `ConversationAssigned` | conversation | user | none | Agent |
| `ConversationResolved` | conversation | user | none | Audit |
| `ConversationAnonymized` | conversation | system | none | Audit |

### Phase 2.3 — CRM/Customer

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `CustomerCreated` | customer | system/user | phone_ref | Loyalty, Support |
| `CustomerUpdated` | customer | user | phone_ref | CRM |
| `CustomerMerged` | customer | user | none | Loyalty, Orders, Support |
| `CustomerConsentChanged` | customer | user/customer | none | Marketing |
| `CustomerAnonymized` | customer | user | none | All |
| `PrivacyRequestSubmitted` | privacy_request | customer | none | CRM |

### Phase 2.4 — Delivery/Riders

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `DeliveryAssigned` | delivery | user | none | Rider notification |
| `DeliveryStatusChanged` | delivery | rider/user | none | Orders, Finance (COD) |
| `CodCollected` | delivery | rider | amount | Finance |
| `DeliveryPosted` | delivery_pod | rider | location_ref | Audit |
| `DeliveryFailed` | delivery | rider | none | Orders, Support |
| `RiderCheckedIn` | rider | rider | location_ref | Delivery |
| `LocationRecorded` | rider_location | system | lat_lng | Delivery (24h TTL) |

### Phase 2.5 — Finance/Accounting

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `JournalPosted` | journal_entry | user/system | none | Reports, AI |
| `JournalReversed` | journal_entry | user | none | Reports, Audit |
| `PeriodClosed` | posting_period | user | none | Reports, AI |
| `PeriodReopened` | posting_period | user | none | Audit |
| `CodJournalized` | journal_entry | system | amount | Reports |
| `PayrollPosted` | journal_entry | system | none | Reports |

### Phase 2.6 — AI

| Event | Aggregate | Actor | PII | Consumers |
|---|---|---|---|---|
| `AiTaskCreated` | ai_task | system | none | AI team |
| `AiRecommendationGenerated` | ai_recommendation | system | none | Approvers |
| `AiApprovalDecided` | ai_approval | user | none | AI team, Audit |
| `AiTaskFailed` | ai_task | system | none | Operations alert |

---

## Idempotency and Replay

- All event emitters must check `idempotency_key` before inserting
- Replay: events can be re-processed by consuming `audit_events` WHERE `domain = X` AND `created_at BETWEEN` (for recovery)
- No full event sourcing — state is not reconstructed from events; events are audit evidence only

---

## Redaction Rules

| PII Type | Redaction Method |
|---|---|
| Customer phone | Replace with `[REDACTED]` in payload JSONB; set `is_redacted = true` |
| Customer email | Replace with `[REDACTED]` |
| Rider GPS coordinates | Delete `rider_locations` row (24h TTL); event payload contains no coordinates |
| Message content | Replace with `[REDACTED]` after retention window |
| Financial amounts | NOT redacted — financial amounts are retained for statutory period |

---

## Architecture Decision Required

This architecture requires **ADR-012** (Event/Audit Architecture) to be accepted before Phase 2 implementation. The key decision: use per-domain append-only tables with a shared `audit_events` log vs. a full event-sourcing approach. The repository evidence supports the simpler approach.
