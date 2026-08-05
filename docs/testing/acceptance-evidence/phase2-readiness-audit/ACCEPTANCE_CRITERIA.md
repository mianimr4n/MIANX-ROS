# Phase 2 Readiness Audit — Acceptance Criteria

**Audit date:** 2026-08-04
**Status:** PROPOSED — Testable acceptance criteria for all Phase 2 slices

---

## Acceptance Criteria by Slice

### Slice 2.1: Branch Management & Settings Control Plane
1. **AC-21-01 (Effective Value Resolution)**: Given an organization default delivery fee of 150 PKR and no branch override, when `GET /api/v1/admin/config/effective?branchId=B1` is called, then the resolved value MUST be 150 PKR with source `"organization"`.
2. **AC-21-02 (Branch Override)**: Given a branch override of 200 PKR set for branch B1, when effective value is requested for B1, then the resolved value MUST be 200 PKR with source `"branch"`.
3. **AC-21-03 (Draft & Activation Gate)**: When a `branch-manager` edits delivery radius, the change MUST save as `status = "draft"`. The active configuration MUST NOT change until a `super-admin` executes activation.
4. **AC-21-04 (Rollback Support)**: When a `super-admin` triggers rollback to version N-1, the system MUST immediately make version N-1 active, mark version N as `rolled_back`, and record an entry in `configuration_change_log`.

### Slice 2.2: Customer Support & WhatsApp Foundation
1. **AC-22-01 (Webhook Signature Verification)**: Given an inbound HTTP POST to `/api/v1/webhooks/whatsapp`, if the HMAC-SHA256 signature does not match `WHATSAPP_APP_SECRET`, the server MUST reject the request with HTTP 401 Unauthorized.
2. **AC-22-02 (Idempotent Webhook Processing)**: Given a valid inbound message webhook with `wamid=12345`, sending the exact same payload twice MUST result in exactly one message row inserted into the `messages` table.
3. **AC-22-03 (Agent Conversation Assignment)**: When a `customer-support` agent assigns conversation C1 to themselves, `conversations.assigned_agent_id` MUST update to the agent's user ID and emit a `ConversationAssigned` audit event.

### Slice 2.3: CRM & Authoritative Customer Master
1. **AC-23-01 (Phone E.164 Normalization)**: When a customer orders or registers with phone `"03041110495"`, the system MUST store the primary identity value normalized to `"+923041110495"`.
2. **AC-23-02 (Customer Merge Audit)**: Given Customer A and Customer B merged by a `super-admin`, all order references MUST point to target Customer B, Customer A status MUST be set to `merged`, and an entry MUST exist in `customer_merge_log`.
3. **AC-23-03 (Right-to-Delete Anonymization)**: When a right-to-delete request is executed, `full_name` MUST be updated to `"[Deleted Customer]"`, `phone` set to `"[REDACTED]"`, and email set to `null`. Aggregate order statistics MUST remain intact.

### Slice 2.4: Delivery & Rider Completion
1. **AC-24-01 (Delivery State Transitions)**: An order marked `assigned` MUST only transition to `picked_up` -> `out_for_delivery` -> `delivered` or `failed_attempt`. Direct jump from `assigned` to `delivered` MUST be rejected with HTTP 400.
2. **AC-24-02 (COD Reconciliation)**: When a rider settles COD cash, the branch manager MUST confirm the amount, generating a `cod_collections` record with `settled_at` timestamp and an automated finance posting.
3. **AC-24-03 (Rider Location TTL)**: All rows in `rider_locations` associated with a completed delivery MUST be automatically purged 24 hours after `delivered_at`.

### Slice 2.5: Accounting & Profitability Depth
1. **AC-25-01 (Period Close Enforcement)**: Given a posting period for August 2026 marked `closed`, any attempt to post a journal entry with a posting date in August 2026 MUST fail with HTTP 422 `PERIOD_LOCKED`.
2. **AC-25-02 (Atomic Journal Reversal)**: Reversing journal J1 MUST create a new balanced journal J2 with debits and credits swapped, link `J1.reversed_by_journal_id = J2.id`, and require a non-empty reversal reason.
3. **AC-25-03 (COGS Automatic Posting)**: When an order is completed, the system MUST compute recipe consumption costs and post a balanced journal (Debit: COGS, Credit: Inventory) via `finance_postings` with unique idempotency key.

### Slice 2.6: AI Command Center
1. **AC-26-01 (Human Approval Gate)**: Any AI-generated recommendation flagged as `requires_approval = true` MUST remain pending in `ai_approvals` and MUST NOT mutate system state until explicitly approved by a `super-admin`.
2. **AC-26-02 (Advisory Attribution)**: Every AI-generated dashboard summary MUST include metadata indicating model ID, source data timestamp, and confidence rating.
