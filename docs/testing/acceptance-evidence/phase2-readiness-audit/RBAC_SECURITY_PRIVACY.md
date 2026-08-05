# Phase 2 Readiness Audit — RBAC, Security & Privacy

**Audit date:** 2026-08-04
**Status:** PROPOSED — Security policy, role permission matrix, and threat model analysis

---

## Comprehensive Role Access Matrix

| Domain | `super-admin` | `branch-manager` | `customer-support` | `cashier` | `kitchen` | `rider` | `host` | `waiter` |
|---|---|---|---|---|---|---|---|---|
| **2.1 Org Config** | Full Read/Write/Activate | Read Only | None | None | None | None | None | None |
| **2.1 Branch Config** | Full Read/Write/Activate | Draft/Write Own | None | None | None | None | None | None |
| **2.2 Support Inbox** | Full Control | Read/Assign Own | Full Read/Write | None | None | None | None | None |
| **2.2 WhatsApp Webhook** | System Only | System Only | System Only | None | None | None | None | None |
| **2.3 Customer Master** | Full Read/Write/Merge | Masked Read Own | Full Read/Edit | Read Phone | None | Read Phone | Read Phone | None |
| **2.3 Privacy/Delete** | Full Approval | None | Submit Request | None | None | None | None | None |
| **2.4 Rider Profile** | Full Read/Write | Read/Schedule Own | None | None | None | Read Own | None | None |
| **2.4 Dispatch Control** | Full Control | Full Control Own | Read Status | Read Status | Read Status | Read Assigned | None | None |
| **2.4 COD Settlement** | Full Approval | Execute Own | None | None | None | Handover | None | None |
| **2.5 Journal Entry** | Create/Reverse | None | None | None | None | None | None | None |
| **2.5 Period Close** | Full Authority | Read Status | None | None | None | None | None | None |
| **2.6 AI Approvals** | Approve/Reject | View Advisory | View Advisory | None | None | None | None | None |

---

## Threat Model Analysis & Controls

### 1. Cross-Branch Data Leakage
- **Threat**: A branch manager accesses orders, support chats, or rider locations belonging to another branch.
- **Control**: All SQL queries and RLS policies enforce `branch_id = ANY(auth.principal_branch_ids())` unless `is_super_admin = true`.

### 2. Unauthorized Configuration Activation
- **Threat**: A branch manager activates a negative delivery fee or arbitrary delivery radius bypassing corporate policy.
- **Control**: High-impact settings require `requires_approval = true` in schema; activation endpoint strictly verifies `super-admin` permission.

### 3. Provider Webhook Forgery & Duplication
- **Threat**: Malicious actor posts fake WhatsApp messages to `/api/v1/webhooks/whatsapp`.
- **Control**: Webhook verifies HMAC-SHA256 signature against `WHATSAPP_APP_SECRET`. Deduplication check on `provider_message_id`.

### 4. Customer Identity Merge Abuse
- **Threat**: Malicious support agent merges two customer records to corrupt loyalty points or order history.
- **Control**: Merges require `super-admin` role, generate immutable `customer_merge_log` entries, and support a 30-day reversal window.

### 5. Rider Location & PII Leakage
- **Threat**: Stored rider GPS coordinates or customer phone numbers exposed via unauthenticated endpoints or insecure browser cache.
- **Control**: Location data auto-purged after 24 hours. Phone numbers masked for non-authorized roles. Browser storage never contains raw customer PII or auth JWTs.

### 6. COD Manipulation & Financial Tampering
- **Threat**: Rider or cashier reports false cash collected or modifies posted financial entries.
- **Control**: `cod_collections` entries generate immutable atomic postings via `finance_postings`. Posted entries cannot be updated or deleted except by double-entry reversal entries (`reverse_journal_entry_atomic`).

### 7. AI Prompt Injection & Exfiltration
- **Threat**: Adversary embeds prompt injection instructions in customer WhatsApp messages to exfiltrate system data or bypass policies via AI response.
- **Control**: AI system is strictly advisory (Human-in-the-loop). Inputs are sanitized via PII redaction layer before model forwarding. Model outputs are never executed autonomously.

---

## High-Risk Implementation Decisions Requiring Formal Security Review

1. **WhatsApp Webhook Secret Storage**: Must be loaded from environment variables (`WHATSAPP_WEBHOOK_SECRET`) and validated in middleware before body parsing.
2. **Customer PII Export Controls**: Exporting customer CSVs requires explicit dual-factor or re-authentication step and produces an audit event.
3. **Period Close Override Security**: Reopening a closed financial period requires Founder authorization token.
