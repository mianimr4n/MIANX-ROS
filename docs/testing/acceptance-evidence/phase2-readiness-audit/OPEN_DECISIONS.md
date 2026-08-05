# Phase 2 Readiness Audit — Open Decisions & Blockers

**Audit date:** 2026-08-04
**Status:** AUDIT — Register of architectural choices awaiting explicit approval

---

## Proposed Architecture Decision Records (ADRs)

| ADR ID | Title | Status | Impact Area |
|---|---|---|---|
| **ADR-001** | Branch Configuration Inheritance & Overrides | `PROPOSED` | 2.1 Settings |
| **ADR-002** | Settings Versioning, Activation & Rollback Model | `PROPOSED` | 2.1 Settings |
| **ADR-003** | Provider-Secret Boundary Architecture | `PROPOSED` | 2.1 / 2.2 Providers |
| **ADR-004** | WhatsApp Conversation Ownership & Routing | `PROPOSED` | 2.2 Support |
| **ADR-005** | Canonical Customer Identity Strategy | `PROPOSED` | 2.3 CRM |
| **ADR-006** | Customer Account Merge & Reversal Process | `PROPOSED` | 2.3 CRM |
| **ADR-007** | Delivery State Machine & Transition Rules | `PROPOSED` | 2.4 Delivery |
| **ADR-008** | Rider Location Retention & Privacy Policy | `PROPOSED` | 2.4 Delivery |
| **ADR-009** | Proof of Delivery (POD) Data Format & Storage | `PROPOSED` | 2.4 Delivery |
| **ADR-010** | Cash on Delivery (COD) Financial Ownership | `PROPOSED` | 2.4 / 2.5 Accounting |
| **ADR-011** | Accounting Immutability & Double-Entry Reversals | `PROPOSED` | 2.5 Accounting |
| **ADR-012** | Domain Event & Shared Audit Architecture | `PROPOSED` | All Domains |
| **ADR-013** | AI Provider Boundary & Data Governance | `PROPOSED` | 2.6 AI |
| **ADR-014** | AI Human-Approval Gate Architecture | `PROPOSED` | 2.6 AI |
| **ADR-015** | AI Prompt & Data Retention Policy | `PROPOSED` | 2.6 AI |

---

## Detailed ADR Proposals

### ADR-001: Branch Configuration Inheritance & Overrides
- **Context**: Current configuration stores flat settings per branch, leading to duplication and sync errors across branches.
- **Decision**: Introduce `configuration_schemas` and `configuration_versions`. Effective values resolve hierarchy: `Branch Override -> Organization Default -> System Fallback`.
- **Alternatives**: Retain JSONB blob on `branches` table; compile settings per request in memory.
- **Consequences**: Enables centralized management with localized flexibility; requires effective-value API resolution logic.

### ADR-002: Settings Versioning, Activation & Rollback Model
- **Context**: Setting updates apply directly to live tables without draft state or approval, posing operational risk.
- **Decision**: Implement explicit draft creation (`status = "draft"`), super-admin activation (`status = "active"`), and single-step rollback.
- **Alternatives**: Auto-save active changes with audit log.
- **Consequences**: Eliminates accidental operational breakage; requires admin UI draft badge and activation workflows.

### ADR-003: Provider-Secret Boundary Architecture
- **Context**: External provider integration (WhatsApp WABA, Maps, AI) requires secret credentials.
- **Decision**: Secrets MUST NEVER be written to database tables or client bundles. Database stores secret reference keys (`provider_config_ref: "WHATSAPP_API_KEY"`), resolved strictly at backend runtime from server environment variables.
- **Alternatives**: Encrypt secrets in database using pgcrypto.
- **Consequences**: Prevents database leak from compromising API credentials; requires backend environment variable configuration.

### ADR-004: WhatsApp Conversation Ownership & Routing
- **Context**: Incoming customer messages can originate from any branch or central line.
- **Decision**: Conversations belong to the receiving branch. Support agents are scoped by branch context; `super-admin` retains cross-branch visibility.
- **Alternatives**: Centralized support pool only.
- **Consequences**: Respects branch operational autonomy; requires branch-scoped RLS policies on `conversations`.

### ADR-005: Canonical Customer Identity Strategy
- **Context**: Customers are currently aggregated client-side from recent orders; no single authoritative master record exists.
- **Decision**: Establish `customers.id` as canonical UUID, backed by normalized `customer_identities` table mapping E.164 phone numbers, emails, and auth IDs.
- **Alternatives**: Rely on Supabase Auth `user_id` as primary key.
- **Consequences**: Unifies guest checkout, registered users, and support contacts; requires phone backfill normalization migration.

### ADR-006: Customer Account Merge & Reversal Process
- **Context**: Multiple profiles exist for single customers across guest orders and registered accounts.
- **Decision**: Allow `super-admin` to merge source customer into target customer, transferring orders, loyalty, and addresses. Log merge in `customer_merge_log` with 30-day reversal window.
- **Alternatives**: Permanent immediate merge with no reversal; no merge capability.
- **Consequences**: Cleans CRM master data; requires complex FK pointer updates and reversal logic.

### ADR-007: Delivery State Machine & Transition Rules
- **Context**: Delivery transitions currently skip intermediate states (`assigned` directly to `delivered`).
- **Decision**: Enforce strict linear state machine: `created -> pending -> assigned -> picked_up -> out_for_delivery -> delivered / failed_attempt -> returned`.
- **Alternatives**: Allow free-form status setting by rider.
- **Consequences**: Guarantees operational truth and accurate SLA metrics; requires rider app state validation.

### ADR-008: Rider Location Retention & Privacy Policy
- **Context**: Real-time rider location tracking generates privacy risks and high database volume.
- **Decision**: Retain rider GPS pings in `rider_locations` strictly during active delivery. Purge all location rows 24 hours post-delivery completion via background TTL job.
- **Alternatives**: Retain full location history indefinitely; store only latest location.
- **Consequences**: Protects rider privacy and controls database growth; requires scheduled cleanup process.

### ADR-009: Proof of Delivery (POD) Data Format & Storage
- **Context**: Delivery confirmation lacks verifiable proof for customer disputes.
- **Decision**: Store POD photos in Supabase Storage bucket (`delivery-pod`) and store SVG paths for signatures. Reference URLs in `delivery_pod` table with server-generated timestamp.
- **Alternatives**: Base64 strings in database table.
- **Consequences**: Keeps database lean; requires Supabase Storage bucket policy configuration.

### ADR-010: Cash on Delivery (COD) Financial Ownership
- **Context**: Riders collect cash upon delivery without formal ledger accounting.
- **Decision**: COD collection creates a `cod_collections` record. Branch manager reconciles cash at shift end, triggering an automated double-entry posting (Debit: Cash, Credit: Accounts Receivable).
- **Alternatives**: Cashier manually creates manual journal for rider cash.
- **Consequences**: Prevents cash leakage and automates accounting reconciliation; requires POS/Delivery shift end boundary.

### ADR-011: Accounting Immutability & Double-Entry Reversals
- **Context**: Financial records must adhere to strict accounting auditing standards.
- **Decision**: Posted `journal_entries` are IMMUTABLE (no UPDATE/DELETE). Corrections require atomic reversal via `reverse_journal_entry_atomic` creating an offsetting journal.
- **Alternatives**: Allow editing posted journals by super-admin.
- **Consequences**: Guarantees audit compliance; requires strict database RLS policies.

### ADR-012: Domain Event & Shared Audit Architecture
- **Context**: Audit history is scattered across individual table `updated_at` columns.
- **Decision**: Introduce a centralized, append-only `audit_events` table for compliance events alongside domain-specific event tables (`conversation_events`, `period_close_log`).
- **Alternatives**: Universal event sourcing architecture (Kafka/EventBridge).
- **Consequences**: Provides complete audit trail without over-engineering event streaming.

### ADR-013: AI Provider Boundary & Data Governance
- **Context**: Integrating AI agents introduces data privacy and prompt injection risks.
- **Decision**: AI calls must pass through a backend proxy (`/api/v1/admin/ai/*`) that redacts PII before forwarding to model providers. Providers must have executed DPAs.
- **Alternatives**: Client-side direct OpenAI API calls.
- **Consequences**: Protects customer PII and enforces API key security; requires PII scrubbing middleware.

### ADR-014: AI Human-Approval Gate Architecture
- **Context**: Autonomous AI actions pose operational and financial risks.
- **Decision**: AI agent outputs are ADVISORY ONLY. Actions requiring state mutation MUST create an `ai_approvals` record and await explicit human decision.
- **Alternatives**: Fully autonomous agent execution.
- **Consequences**: Eliminates risk of automated bad decisions; requires admin approval inbox UI.

### ADR-015: AI Prompt & Data Retention Policy
- **Context**: Logging AI prompts can inadvertently store customer PII.
- **Decision**: `ai_prompt_logs` stores prompt SHA-256 hashes, token counts, and execution costs. Raw prompt text containing PII is NOT stored in application database.
- **Alternatives**: Store full raw prompt and completion text.
- **Consequences**: Ensures data privacy compliance; relies on provider dashboard for deep debugging.

---

## Blockers Status

- **P0 Audit Blockers**: 0
- **P1 Prerequisite Blockers**: All 15 ADRs are currently in `PROPOSED` status. Implementation of dependent PRs cannot begin until the corresponding ADR is accepted by Founder/Chief Architect.
