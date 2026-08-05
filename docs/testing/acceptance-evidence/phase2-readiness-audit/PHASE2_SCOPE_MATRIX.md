# Phase 2 Readiness Audit — Phase 2 Scope Matrix

**Audit date:** 2026-08-04
**Status:** PROPOSED — awaiting Founder authorization before runtime implementation

---

> [!IMPORTANT]
> Phase 2 runtime implementation has **NOT STARTED**.
> This matrix defines the proposed scope only.
> No implementation is authorized until `PHASE2_IMPLEMENTATION_AUTHORIZED` is issued.

---

## Phase 2.1 — Branch Management and Settings Control Plane

**Goal:** Replace ad-hoc flat settings with a governed, versioned, inheritance-aware configuration system.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| Organization defaults | Structured org-level configuration schema | `organization_settings` singleton (flat) | Additive low risk |
| Branch overrides | Per-branch configuration overrides with inheritance | Flat `branch_settings` JSONB | Additive with schema |
| Effective-value resolution | API returns computed effective value (org default + branch override) | Not implemented | Additive |
| Draft state | Settings may be saved as draft before activation | Not implemented | Additive |
| Activation workflow | Explicit activation step with role-gated approval | Not implemented | Additive |
| Versioning | Configuration versions retained; previous version recoverable | Not implemented | Additive |
| Rollback | Activate previous version | Not implemented | Additive |
| Change history | Append-only configuration change log | Not implemented | Additive |
| Conflict detection | Alert when org default conflicts with branch override | Not implemented | Additive |
| Provider references | Configuration values may reference external provider credentials by name (not value) | Not implemented | Additive |
| Branch cloning | Copy configuration from one branch to another | Not implemented | Additive (deferred for later PR) |
| Configuration readiness | Per-branch readiness gate (all required settings configured) | Not implemented | Additive |
| Secrets boundary | Provider secrets stored outside app tables (env/secret manager reference only) | Not enforced | Architecture decision required |

**New tables proposed:** `configuration_schemas`, `configuration_drafts`, `configuration_versions`, `configuration_change_log`

---

## Phase 2.2 — Customer Support and WhatsApp Foundation

**Goal:** Deliver a real, provider-connected support inbox with conversation management.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| WhatsApp Business API adapter | Provider-agnostic adapter contract; sandbox first | No provider | Provider-dependent |
| Webhook ingestion | HTTPS webhook endpoint; HMAC validation; idempotency | None | Additive |
| Conversation model | Conversations, messages, delivery state | None | Additive |
| Customer identity linking | Link incoming phone number to canonical customer | Orders table only | Additive + normalization |
| Agent assignment | Assign conversations to support staff | None | Additive |
| Conversation status | open, in-progress, resolved, escalated | None | Additive |
| Message templates | Pre-approved templates for outbound messages | None | Provider-dependent |
| Message delivery state | sent, delivered, read, failed | None | Additive |
| Retry and idempotency | Failed send retry with idempotency key | None | Additive |
| Opt-in / consent | Record customer opt-in for messaging | `customers.marketing_consent` only | Additive |
| Opt-out / unsubscribe | Process opt-out, stop messaging | None | Additive |
| Retention policy | Message content retention rules | None | Policy + additive |
| Media/attachment policy | Limit attachment storage; reference only | None | Policy |
| Branch routing | Route incoming messages to correct branch inbox | None | Additive |
| Order linking | Link conversation to order(s) | None | Additive |
| Privacy masking | Mask phone/name in logs | None | Architecture required |
| Provider outage behavior | Graceful degradation; queue messages | None | Architecture required |

**New tables proposed:** `conversations`, `messages`, `message_templates`, `agent_assignments`, `conversation_events`

---

## Phase 2.3 — CRM and Authoritative Customer Master

**Goal:** Replace order-derived customer view with a canonical, authoritative customer master.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| Canonical customer ID | Single stable UUID per customer | No canonical ID (aggregated from orders) | Data normalization |
| Phone E.164 normalization | All phones stored in E.164 | `customers.phone` exists; normalization partial | Additive with migration |
| Email normalization | Lowercase, trimmed | `customers.email` exists | Additive |
| Address history | Multiple addresses per customer with timestamps | `customer_addresses` table exists | Additive |
| Communication preferences | Channel, frequency, language | None | Additive |
| Consent management | Opt-in per channel; audit trail | `customers.marketing_consent` (boolean only) | Additive |
| Duplicate detection | Flag likely duplicate customers | None | Additive (background) |
| Merge process | Merge two customer records with audit trail | None | Additive; irreversibility risk |
| Merge reversal | Undo merge within policy window | None | Additive |
| Order history linkage | All orders linked to canonical customer | Orders have customer_id; needs normalization | Additive |
| Support linkage | Conversations linked to canonical customer | None | Additive |
| Loyalty linkage | Loyalty ledger linked to canonical customer | Partial linkage exists | Additive |
| VIP/blocked flags | Authoritative source with audit trail | `customers.status` only | Additive |
| Notes | Internal staff notes on customer | None | Additive |
| Privacy requests | Record deletion/anonymization requests | None | Additive; high risk |
| Right-to-delete | Anonymize PII fields on request | None | Irreversibility risk |
| Export | Export customer data | None (orders-derived only) | Additive |

**New tables proposed:** `customer_identities`, `customer_merge_log`, `customer_privacy_requests`, `customer_notes`, `customer_consent_events`

---

## Phase 2.4 — Delivery and Rider Completion

**Goal:** Complete the delivery state machine with rider profiles, GPS tracking, POD, COD, and failed delivery workflows.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| Rider profile | Full profile: employment, contract, documents | Users table only (user_type=rider) | Additive |
| Rider availability | Real-time availability flag | None | Additive |
| Shifts | Rider shift scheduling | HR shifts exist; rider-specific | Additive |
| Check-in / check-out | Rider check-in to branch | None | Additive |
| Zone assignment | Geographic zones assigned to riders | None | Provider-dependent |
| Dispatch eligibility | Rules for who can be assigned | None | Additive |
| Manual assignment | Manager assigns rider to order | EXISTS (limited) | Enhancement |
| Automatic assignment rules | Rule-based assignment (not AI) | None | Additive |
| Delivery state machine | pending → assigned → picked-up → out-for-delivery → delivered / failed / returned | Partial (assigned, picked-up, delivered) | Additive |
| Proof of delivery | Photo/signature capture at delivery | None | Provider-dependent |
| COD collection | Record cash collected at delivery | None | Financial sensitivity |
| COD settlement | Reconcile rider cash with branch | None | Financial; audit-sensitive |
| ETA | Estimated arrival time | None | Provider-dependent |
| GPS location | Rider current location | None | Privacy-sensitive |
| Location retention | Location data retention policy | None | Policy required |
| Failed delivery | Attempt, document failure reason | None | Additive |
| Return-to-branch | State for returned goods | None | Additive |
| Incident flags | Safety/incident reporting | None | Additive |
| Reassignment | Reassign delivery to different rider | None | Additive |

**New tables proposed:** `rider_profiles`, `rider_availability`, `delivery_attempts`, `delivery_pod`, `cod_collections`, `cod_settlements`, `rider_locations` (with retention policy)

---

## Phase 2.5 — Accounting and Profitability Depth

**Goal:** Deepen the existing finance foundation into a complete, period-closed, auditable accounting system.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| Chart of accounts | Structured CoA with account types | EXISTS | Enhancement |
| Journal entries | Double-entry with line items | EXISTS | Enhancement |
| Posting idempotency | Prevent duplicate postings | EXISTS (`finance_postings`) | Enhancement |
| Posting reversal | Atomic reverse with reason | EXISTS (`reverse_journal_entry_atomic`) | Enhancement |
| Posting periods | Fiscal periods with open/closed state | None | Additive |
| Period close | Close a period; prevent new postings | None | Additive |
| Period reopen | Authorized reopen with audit | None | Additive |
| Revenue recognition | Post revenue on order completion | None (partial) | Additive |
| Tax handling | Tax calculation and posting | Tax labels exist; no posting | Additive |
| Discount handling | Discount posting | None | Additive |
| Refund posting | Reverse revenue on refund | None | Additive |
| Cash posting | POS cash → journal | None (partial) | Additive |
| Expense claims | Staff expense → journal | `expense_claims` table exists | Enhancement |
| Supplier invoice posting | AP → journal | None | Additive |
| Payment posting | Supplier payment → journal | None | Additive |
| Inventory valuation | FIFO/AVCO for stock | None | Additive |
| COGS posting | Recipe consumption → COGS | `kitchen_recipe_stock_consume` exists | Enhancement |
| Waste posting | Wastage → journal | None | Additive |
| COD to journal | COD collection → cash journal | None | Financial; additive |
| Payroll posting | Payroll run → journal | None | Financial; additive |
| Period P&L | Branch/org P&L for closed period | Partial (live TB/P&L exists) | Enhancement |
| Reconciliation | Cash reconciliation per period | `cash_reconciliations` table exists | Enhancement |

**New tables proposed:** `posting_periods`, `period_close_log`, `tax_postings`, `discount_postings`

**Modified tables:** `journal_entries` (period FK), `finance_postings` (period reference)

---

## Phase 2.6 — AI Command Center

**Goal:** Layer AI advisory capabilities on top of verified authoritative domain data.

| Capability | Proposed Scope | Current State | Migration Risk |
|---|---|---|---|
| Data readiness gate | Verify all prerequisite domain data is authoritative before AI reads it | None | Additive |
| AI evaluation harness | Testing framework for AI outputs | None | Additive |
| Exception center summaries | AI-generated exception explanations | None (rule-based summaries exist) | Additive |
| Anomaly explanation | AI explains detected anomaly in plain language | None | Additive |
| Sales forecast | AI-generated demand forecast | None | Additive |
| Draft support response | AI drafts WhatsApp response for agent review | None | Provider-dependent |
| Approval-required actions | AI suggests operational action; human must approve | `ai_approvals` table exists | Enhancement |
| Approval inbox | UI for reviewing AI recommendations | None | Additive |
| Provider governance | Model provider selection, version pinning | None | Architecture decision |
| Prompt retention | Prompt logging with PII redaction | None | Privacy-sensitive |
| Rate limits | Per-model rate limiting | None | Additive |
| Fallback behavior | Graceful degradation when AI provider unavailable | None | Additive |
| Hallucination containment | Never display AI output as operational truth without attribution | Architecture rule | Design |
| Cost controls | Per-model cost limits and alerts | None | Additive |

**Prerequisite gate (all must be TRUE before Phase 2.6):**
- All Phase 2.1–2.5 domains operational and tested
- Authoritative customer master exists (2.3)
- Finance postings are period-closed and auditable (2.5)
- Event/audit architecture provides verifiable data lineage
- Provider contract signed and sandboxed

---

## Scope Boundary

**In scope for Phase 2:**
- All items listed above under 2.1–2.6

**Explicitly out of scope for Phase 2 (Parallel Maintenance):**
- backend CSV formula hardening
- CSP rollout
- marketing image optimization
- `/ops/*` discoverability
- dual branch/filter chrome cleanup
- VIS-02 / VIS-03 accessibility items
- moderate/minor accessibility residuals
- Production-role fixture coverage

**Explicitly deferred beyond Phase 2:**
- Native mobile apps
- Kubernetes / microservices
- Event bus (external)
- Payment provider integration
- Northern Bypass activation
- AI autonomous agent runtime (no human-in-loop)
- Phone OTP via WhatsApp (Phase 3 paused)
