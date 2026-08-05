# Phase 2 Readiness Audit — API Contracts

**Audit date:** 2026-08-04
**Status:** PROPOSED — Contract specification only. No backend code implemented.

---

## Bounded Domain API Inventory (Phase 2 Proposed)

### Domain 2.1: Settings & Branch Control Plane (`/api/v1/admin/config/*`)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/config/effective` | `authenticated` | Branch/Org | `?branchId=UUID&keys=a,b` | `{ values: Record<string, EffectiveValue> }` | N/A | None | No |
| `GET` | `/api/v1/admin/config/schemas` | `authenticated` | Org | None | `{ schemas: ConfigSchema[] }` | N/A | None | No |
| `POST` | `/api/v1/admin/config/drafts` | `super-admin`, `branch-manager` | Branch/Org | `{ scopeType, scopeId, key, value }` | `{ draftId, status: "draft" }` | Yes | `ConfigDraftCreated` | No |
| `POST` | `/api/v1/admin/config/activate` | `super-admin` | Branch/Org | `{ versionId, reason }` | `{ versionId, status: "active" }` | Yes | `ConfigActivated` | No |
| `POST` | `/api/v1/admin/config/rollback` | `super-admin` | Branch/Org | `{ schemaId, scopeId, targetVersionId }` | `{ activeVersionId }` | Yes | `ConfigRolledBack` | No |

---

### Domain 2.2: Support & WhatsApp (`/api/v1/admin/support/*` & Webhook)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `POST` | `/api/v1/webhooks/whatsapp` | System (HMAC Signature) | Public Provider | Raw WABA Webhook JSON | `{ status: "ok" }` | Yes (`wamid`) | `MessageReceived` | Masked in log |
| `GET` | `/api/v1/admin/support/conversations` | `customer-support`, `branch-manager`, `super-admin` | Branch | `?status=open&limit=20` | `{ conversations: Conversation[] }` | N/A | None | Yes (Phone/Name) |
| `POST` | `/api/v1/admin/support/conversations/:id/messages` | `customer-support`, `branch-manager` | Branch | `{ content, templateId?, mediaUrl? }` | `{ messageId, status: "sent" }` | Yes (`clientMsgId`) | `MessageSent` | Yes |
| `PATCH` | `/api/v1/admin/support/conversations/:id/assign` | `customer-support`, `branch-manager` | Branch | `{ agentId: UUID }` | `{ conversationId, assignedAgentId }` | Yes | `ConversationAssigned` | No |

---

### Domain 2.3: CRM & Customer Master (`/api/v1/admin/crm/*`)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/crm/customers` | `super-admin`, `customer-support`, `branch-manager` | Org/Branch | `?q=phone_or_name&limit=20` | `{ customers: CustomerMaster[] }` | N/A | None | Yes (Masked for Branch) |
| `GET` | `/api/v1/admin/crm/customers/:id` | `super-admin`, `customer-support`, `branch-manager` | Org | None | `{ customer: CustomerDetail }` | N/A | None | Yes |
| `POST` | `/api/v1/admin/crm/customers/merge` | `super-admin` | Org | `{ sourceCustomerId, targetCustomerId, reason }` | `{ mergeLogId, targetCustomer }` | Yes | `CustomerMerged` | High |
| `POST` | `/api/v1/admin/crm/customers/:id/privacy-request` | `super-admin`, `customer-support` | Org | `{ requestType: "anonymize" \| "export" }` | `{ requestId, status: "pending" }` | Yes | `PrivacyRequested` | High |

---

### Domain 2.4: Delivery & Rider Completion (`/api/v1/admin/delivery/*` & `/api/v1/rider/*`)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `POST` | `/api/v1/admin/delivery/assignments/:id/dispatch` | `branch-manager`, `super-admin` | Branch | `{ riderId: UUID }` | `{ deliveryId, status: "assigned" }` | Yes | `DeliveryAssigned` | Address/Phone |
| `POST` | `/api/v1/rider/deliveries/:id/status` | `rider` (assigned rider) | Branch | `{ status: "out_for_delivery" \| "delivered" \| "failed", podPhotoUrl?, codCollected? }` | `{ deliveryId, status }` | Yes | `DeliveryStatusChanged` | Address/Phone |
| `POST` | `/api/v1/rider/location` | `rider` | Branch | `{ latitude, longitude, deliveryId? }` | `{ recorded: true }` | No (High Rate) | `LocationRecorded` | Lat/Long (24h TTL) |
| `POST` | `/api/v1/admin/delivery/cod/settle` | `branch-manager`, `super-admin` | Branch | `{ riderId, amountSettled, notes }` | `{ settlementId, financePostingId }` | Yes | `CodSettled` | No |

---

### Domain 2.5: Accounting & Period Close (`/api/v1/admin/finance/*`)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/finance/periods` | `super-admin`, `finance` | Org/Branch | `?branchId=UUID` | `{ periods: PostingPeriod[] }` | N/A | None | No |
| `POST` | `/api/v1/admin/finance/periods/:id/close` | `super-admin` | Org/Branch | `{ reason }` | `{ periodId, status: "closed" }` | Yes | `PeriodClosed` | No |
| `POST` | `/api/v1/admin/finance/periods/:id/reopen` | Founder Authorization Only | Org/Branch | `{ reason, authCode }` | `{ periodId, status: "reopened" }` | Yes | `PeriodReopened` | No |
| `POST` | `/api/v1/admin/finance/postings/reconcile-cod` | `super-admin`, `finance` | Branch | `{ settlementId }` | `{ postingId, journalId }` | Yes | `CodJournalized` | No |

---

### Domain 2.6: AI Command Center (`/api/v1/admin/ai/*`)

| Method | Route | Roles | Scope | Request Body / Query | Response Schema | Idempotency | Audit Event | PII |
|---|---|---|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/ai/recommendations` | `super-admin`, `branch-manager` | Org/Branch | `?status=pending` | `{ recommendations: AiRecommendation[] }` | N/A | None | No |
| `POST` | `/api/v1/admin/ai/approvals/:id/decide` | `super-admin` | Org | `{ decision: "approved" \| "rejected", comments }` | `{ approvalId, status }` | Yes | `AiApprovalDecided` | No |

---

## Common Contract Standards

1. **Standard Error Payload**:
   ```json
   {
     "error": {
       "code": "VALIDATION_ERROR | UNAUTHORIZED | NOT_FOUND | CONFLICT | PERIOD_LOCKED",
       "message": "Human readable summary",
       "details": {}
     }
   }
   ```
2. **Strict Optimistic Concurrency**: Financial and settings mutations require `if-match` header or `version` property in payload to prevent lost updates.
3. **No Generic Admin Endpoints**: All APIs enforce strict role-based and branch-scoped context checks via `AuthPrincipal`.
