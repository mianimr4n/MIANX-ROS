# 📦 MODULE TEMPLATE

> Official NestJS Module Engineering Template for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Backend Engineering |
| Document | MODULE_TEMPLATE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the standard structure for every backend module.

Every module must follow the same architecture.

Objectives

- Consistency
- Maintainability
- Reusability
- AI-friendly generation
- Enterprise scalability

---

# 2. Standard Module Structure

```text
orders/

controllers/
│
├── order.controller.ts
└── order-admin.controller.ts

services/
│
├── order.service.ts
├── order-validation.service.ts
└── order-calculation.service.ts

repositories/
│
└── order.repository.ts

dto/
│
├── create-order.dto.ts
├── update-order.dto.ts
├── order-response.dto.ts
├── order-query.dto.ts
└── index.ts

entities/
│
└── order.entity.ts

interfaces/
│
├── order.interface.ts
└── order-filter.interface.ts

validators/
│
└── order.validator.ts

events/
│
├── order-created.event.ts
├── order-cancelled.event.ts
└── order-completed.event.ts

listeners/
│
└── order.listener.ts

jobs/
│
└── order.job.ts

constants/
│
└── order.constants.ts

tests/
│
├── order.service.spec.ts
├── order.controller.spec.ts
└── order.integration.spec.ts

order.module.ts
index.ts
```

---

# 3. Responsibilities

## Controller

Responsible for

- HTTP endpoints
- DTO validation
- Authentication
- Authorization
- Response formatting

Never:

- Query database
- Execute business logic

---

## Service

Responsible for

- Business rules
- Transactions
- Event publishing
- Workflow orchestration

---

## Repository

Responsible for

- Prisma queries
- Database access
- Data mapping
- Query optimization

---

## DTO

Separate DTOs

Create

Update

Response

Search

Filter

Pagination

---

## Validators

Contains

- Business validation
- Cross-field validation
- Complex rule validation

---

## Events

Every important action publishes events.

Examples

```text
OrderCreated

OrderUpdated

OrderCancelled

OrderDelivered
```

---

## Jobs

Background processing.

Examples

- Email
- Notification
- AI Processing
- Report Generation

---

# 4. Dependency Flow

```mermaid
flowchart LR

Controller

↓

Service

↓

Repository

↓

Prisma

↓

Database
```

No layer should bypass another.

---

# 5. Event Flow

```mermaid
flowchart LR

OrderCreated

↓

Publish Event

↓

Notification

↓

Inventory Update

↓

AI Analytics

↓

Audit Log
```

---

# 6. Naming Convention

Controllers

```text
order.controller.ts
```

Services

```text
order.service.ts
```

Repositories

```text
order.repository.ts
```

DTOs

```text
create-order.dto.ts

update-order.dto.ts

order-response.dto.ts
```

Events

```text
order-created.event.ts
```

---

# 7. Dependency Injection

Inject only required dependencies.

Avoid circular dependencies.

Prefer interfaces for abstraction where appropriate.

---

# 8. Transactions

Use Prisma Transactions for

- Orders
- Payments
- Inventory
- Purchase
- Refunds

Never split a single business transaction across multiple independent database commits.

---

# 9. Error Handling

Services throw domain-specific exceptions.

Controllers should not contain try/catch unless handling transport-specific concerns.

Global Exception Filter handles API responses.

---

# 10. Logging

Log

- Business Events
- Errors
- Processing Time
- User Actions

Never log

- Passwords
- Tokens
- Secrets

---

# 11. Testing Requirements

Each module requires

- Unit Tests
- Integration Tests

Critical modules require

- E2E Tests

Coverage goal

```text
80%+
```

---

# 12. AI Compatibility

Modules should expose

- Clear service boundaries
- Reusable interfaces
- Typed DTOs
- Documented events

This enables AI-assisted code generation and maintenance.

---

# 13. Checklist

Every module should include:

- Controllers
- Services
- Repository
- DTOs
- Validators
- Events
- Tests
- Documentation
- Swagger decorators
- Audit logging

---

# 14. Related Documents

- BACKEND_BLUEPRINT.md
- NESTJS_GUIDELINES.md
- EVENT_HANDLERS.md
- CODING_STANDARDS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
