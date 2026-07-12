# ⚡ EVENT DRIVEN ARCHITECTURE

> Official Event-Driven Architecture for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Architecture |
| Document | EVENT_DRIVEN_ARCHITECTURE.md |
| Version | 1.0.0 |
| Status | Final |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines how events are produced, published, processed, monitored, and audited across the Telepizza Platform.

The platform uses an event-driven architecture to improve scalability, reliability, and decoupling between services.

---

# 2. Objectives

The event system should:

- Decouple services
- Enable asynchronous processing
- Improve scalability
- Support retries
- Reduce API response times
- Enable real-time updates
- Provide auditability

---

# 3. Architecture Overview

```text
Website
Mobile App
POS
Kitchen
Rider App
Admin

        │
        ▼

 REST API

        │
        ▼

Domain Service

        │
        ▼

Domain Event

        │
        ▼

Event Bus / Queue

        │
        ├────────► Notification Service
        ├────────► Inventory Service
        ├────────► Kitchen Service
        ├────────► Delivery Service
        ├────────► Analytics Service
        ├────────► AI Platform
        └────────► Audit Service
```

---

# 4. Event Types

The platform supports:

- Domain Events
- Integration Events
- System Events
- AI Events
- Notification Events

---

# 5. Domain Events

Examples:

```text
CustomerRegistered

OrderCreated

OrderConfirmed

OrderCancelled

PaymentCompleted

PaymentFailed

KitchenStarted

KitchenCompleted

DeliveryAssigned

DeliveryCompleted

InventoryUpdated

PurchaseOrderCreated

PayrollProcessed

EmployeeCreated
```

---

# 6. Integration Events

Examples:

```text
PaymentGatewayCallback

WhatsAppMessageReceived

EmailDelivered

SMSDelivered

WebhookReceived

POSOrderImported
```

---

# 7. System Events

Examples:

```text
UserLoggedIn

UserLoggedOut

PasswordChanged

BackupCompleted

DeploymentCompleted

HealthCheckFailed
```

---

# 8. AI Events

Examples:

```text
AITaskCreated

AITaskStarted

AITaskCompleted

AIApprovalRequested

AIApprovalGranted

AIModelChanged
```

---

# 9. Event Structure

Every event should contain:

```json
{
  "eventId": "uuid",
  "eventType": "OrderCreated",
  "occurredAt": "timestamp",
  "aggregateId": "uuid",
  "aggregateType": "Order",
  "branchId": "uuid",
  "actorId": "uuid",
  "payload": {}
}
```

---

# 10. Event Publishers

Publishers include:

- Orders Module
- Payments Module
- Inventory Module
- Kitchen Module
- Delivery Module
- HR Module
- Finance Module
- AI Platform

---

# 11. Event Subscribers

Subscribers include:

- Notification Service
- Analytics Service
- Audit Service
- Inventory Service
- Kitchen Service
- Delivery Service
- AI Platform

---

# 12. Background Jobs

Examples:

- Send Emails
- Send SMS
- Send WhatsApp Messages
- Generate Reports
- Process AI Tasks
- Recalculate Inventory
- Backup Database

These jobs should be processed asynchronously.

---

# 13. Retry Policy

If event processing fails:

- Retry with exponential backoff
- Log the error
- Move to Dead Letter Queue (DLQ) after retry limit
- Notify administrators for critical failures

---

# 14. Dead Letter Queue (DLQ)

Events that cannot be processed should be stored separately.

Examples:

- Invalid Payload
- External API Failure
- Database Timeout
- Unknown Event Type

DLQ events should be reviewable from the Admin Panel.

---

# 15. Event Ordering

Maintain ordering where required.

Examples:

```text
OrderCreated
↓

PaymentCompleted
↓

KitchenStarted
↓

KitchenCompleted
↓

DeliveryAssigned
↓

DeliveryCompleted
```

Events for the same aggregate (e.g., a single order) should be processed in sequence.

---

# 16. Idempotency

Event handlers must be idempotent.

If the same event is received multiple times:

- Ignore duplicates
- Do not create duplicate records
- Log duplicate detection if needed

---

# 17. Event Versioning

Support versioning.

Examples:

```text
OrderCreated.v1

OrderCreated.v2
```

Older consumers should continue to work until deprecated.

---

# 18. Monitoring

Track:

- Published events
- Processed events
- Failed events
- Retry count
- Queue length
- Processing latency

---

# 19. Security

- Validate event payloads
- Authenticate external event sources
- Sign webhooks where applicable
- Restrict publisher permissions
- Log sensitive events

---

# 20. Related Documents

- SYSTEM_ARCHITECTURE.md
- API_ARCHITECTURE.md
- AI_ARCHITECTURE.md
- DATABASE_SCHEMA.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai