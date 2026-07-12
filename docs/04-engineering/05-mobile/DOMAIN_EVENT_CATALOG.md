# 📚 DOMAIN EVENT CATALOG

> Official Domain Event Catalog for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Engineering |
| Document | DOMAIN_EVENT_CATALOG.md |
| Version | 1.0.0 |
| Status | Engineering Specification |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines every official domain event used across the Telepizza Platform.

It standardizes

- Event Names
- Event Payloads
- Publishers
- Subscribers
- Event Versions
- Idempotency Rules
- Security Classification

This document serves as the authoritative reference for Mobile, Backend, Frontend, AI services, and future event-driven systems.

---

# 2. Event Naming Standard

Format

```
domain.entity.action
```

Examples

```
order.created

order.cancelled

payment.completed

inventory.low_stock

customer.registered

delivery.completed

ai.response.generated
```

Rules

- Lowercase only
- Dot-separated
- Past-tense actions
- Immutable names after release

---

# 3. Standard Event Metadata

Every event must include

```
event_id

event_name

event_version

correlation_id

causation_id

timestamp

source

actor

tenant_id

branch_id

payload

metadata
```

---

# 4. Event Classification

Business Events

System Events

Analytics Events

AI Events

Security Events

Notification Events

Synchronization Events

Lifecycle Events

---

# 5. Order Events

## order.created

Trigger

Customer successfully places an order.

Publisher

Order Service

Subscribers

- Kitchen
- Inventory
- Payment
- Notifications
- Analytics
- Sync Engine

Payload

```
order_id

customer_id

branch_id

items

total

created_at
```

Idempotent

```
Yes
```

---

## order.updated

Trigger

Order details modified.

Subscribers

- Kitchen
- Customer Timeline
- Analytics

---

## order.cancelled

Trigger

Order cancelled.

Subscribers

- Kitchen
- Refund Service
- Notifications
- Analytics

---

## order.completed

Trigger

Order delivered successfully.

Subscribers

- Loyalty
- Analytics
- Customer History

---

# 6. Payment Events

## payment.initiated

Publisher

Payment Service

Subscribers

- Analytics
- Notifications

---

## payment.completed

Subscribers

- Order Service
- Loyalty
- Finance

Payload

```
payment_id

order_id

amount

method

status
```

---

## payment.failed

Subscribers

- Customer App
- Notifications
- Analytics

---

## refund.completed

Subscribers

- Finance
- Customer Timeline

---

# 7. Customer Events

customer.registered

customer.updated

customer.deleted

customer.login

customer.logout

customer.loyalty.updated

---

# 8. Inventory Events

inventory.updated

inventory.low_stock

inventory.out_of_stock

inventory.received

inventory.adjusted

---

# 9. Delivery Events

delivery.created

delivery.assigned

delivery.accepted

delivery.started

delivery.arrived

delivery.completed

delivery.failed

---

# 10. Kitchen Events

kitchen.order_received

kitchen.preparation_started

kitchen.ready

kitchen.delayed

---

# 11. AI Events

ai.chat.started

ai.prompt.submitted

ai.response.streaming

ai.response.generated

ai.response.failed

ai.recommendation.generated

---

# 12. Notification Events

notification.created

notification.sent

notification.delivered

notification.read

notification.dismissed

---

# 13. Synchronization Events

sync.started

sync.completed

sync.failed

sync.conflict.detected

sync.queue.updated

sync.retry.started

---

# 14. Security Events

authentication.success

authentication.failed

authorization.denied

session.expired

device.blocked

permission.changed

---

# 15. Lifecycle Events

application.started

application.updated

application.backgrounded

application.foregrounded

application.closed

---

# 16. Analytics Events

screen.viewed

button.clicked

search.executed

checkout.started

checkout.completed

feature.used

experiment.assigned

---

# 17. Event Versioning

Every event contains

```
v1

v2

v3
```

Breaking changes require a new version.

---

# 18. Event Compatibility

Rules

- Preserve backward compatibility where practical.
- Never silently change payload meanings.
- Deprecate before removing events.

---

# 19. Security Classification

Public

Internal

Confidential

Restricted

Sensitive payload fields should never be exposed to unauthorized consumers.

---

# 20. Event Retention

Suggested defaults

Business Events

```
365 Days
```

Analytics Events

```
180 Days
```

Debug Events

```
30 Days
```

Retention policies should align with legal and business requirements.

---

# 21. Monitoring

Track

- Published Events
- Failed Events
- Duplicate Events
- Processing Time
- Subscriber Failures

---

# 22. Testing

Verify

- Event Names
- Payload Schema
- Subscribers
- Idempotency
- Version Compatibility
- Security Classification

---

# 23. Best Practices

- Publish facts, not commands.
- Keep payloads concise.
- Version events carefully.
- Make subscribers independent.
- Ensure idempotent processing.
- Document every public event.

---

# 24. Related Documents

- EVENT_DRIVEN_ARCHITECTURE.md
- SYNC_ENGINE_ARCHITECTURE.md
- SYNC_PROTOCOL_SPECIFICATION.md
- ANALYTICS_AND_TELEMETRY.md
- MOBILE_API_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
