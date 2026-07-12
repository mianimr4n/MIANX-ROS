# 💻 CODING STANDARDS

> Official coding standards for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Engineering Standards |
| Document | CODING_STANDARDS.md |
| Version | 1.0.0 |
| Status | Final |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the coding standards for all Telepizza Platform projects.

Goals:

- Consistency
- Maintainability
- Readability
- Scalability
- AI-Friendly Development
- Enterprise Quality

---

# 2. General Principles

Every developer and AI agent must follow:

- SOLID Principles
- DRY (Don't Repeat Yourself)
- KISS (Keep It Simple)
- YAGNI (You Aren't Gonna Need It)
- Clean Code
- Clean Architecture
- Domain Driven Design

---

# 3. Language Standards

Backend

- TypeScript

Frontend

- TypeScript

Mobile

- TypeScript

Avoid JavaScript except for build tooling when unavoidable.

---

# 4. Naming Conventions

## Variables

```typescript
const customerName
const totalAmount
const deliveryFee
```

---

## Constants

```typescript
const MAX_LOGIN_ATTEMPTS = 5
const DEFAULT_PAGE_SIZE = 20
```

---

## Functions

```typescript
createOrder()

calculateTax()

updateInventory()
```

Functions should start with a verb.

---

## Classes

```typescript
OrderService

PaymentGateway

InventoryRepository
```

Use PascalCase.

---

## Interfaces

```typescript
interface CreateOrderRequest

interface PaymentProvider
```

Do not prefix interfaces with `I`.

---

## Enums

```typescript
enum OrderStatus

enum PaymentStatus
```

---

## Files

Use kebab-case.

```text
order.service.ts

payment.controller.ts

inventory.repository.ts
```

---

# 5. Folder Rules

One responsibility per folder.

Example

```text
orders/

controllers/

services/

repositories/

dto/

entities/

validators/

tests/
```

---

# 6. NestJS Standards

Controllers

- Handle HTTP only
- No business logic

Services

- Business logic only

Repositories

- Database access only

DTOs

- Validation
- Serialization

Guards

- Authentication
- Authorization

Interceptors

- Logging
- Response formatting

Filters

- Exception handling

---

# 7. API Standards

Every endpoint should:

- Validate input
- Return standard response
- Use correct HTTP status
- Handle exceptions
- Log request ID

---

# 8. Database Standards

Use Prisma ORM.

Never write business logic inside SQL.

Use transactions for multi-step updates.

Prefer UUID primary keys.

Always use migrations.

---

# 9. Error Handling

Never expose internal errors.

Return:

```json
{
  "success": false,
  "message": "Validation failed."
}
```

Log full error internally.

---

# 10. Logging

Log:

- Authentication
- Payments
- Inventory
- AI Tasks
- System Errors

Never log:

- Passwords
- Tokens
- Secrets
- Payment credentials

---

# 11. Security

Always:

- Validate input
- Escape output where applicable
- Use parameterized queries
- Encrypt sensitive data
- Hash passwords using Argon2 or bcrypt (Argon2 preferred for new deployments)

---

# 12. Testing Standards

Every module should include:

- Unit Tests
- Integration Tests
- API Tests

Critical flows should also include end-to-end tests.

---

# 13. Documentation

Every public class and API should include:

- Purpose
- Parameters
- Return value
- Exceptions (if applicable)

README files should exist for major packages.

---

# 14. Git Standards

Every commit should be atomic.

Example:

```text
feat(order): add order creation endpoint

fix(payment): resolve refund validation

refactor(inventory): simplify stock calculation
```

Follow Conventional Commits.

---

# 15. Code Review Checklist

Before merge:

- Builds successfully
- Tests pass
- Lint passes
- Formatting passes
- Documentation updated
- Security reviewed
- No duplicated logic

---

# 16. Performance

Avoid:

- N+1 queries
- Unnecessary API calls
- Blocking operations
- Large payloads

Use:

- Pagination
- Caching
- Background jobs

---

# 17. AI Development Guidelines

AI-generated code must:

- Compile successfully
- Pass linting
- Pass tests
- Follow project naming rules
- Avoid duplicate implementations
- Reference existing modules before creating new ones

Human review is required before merging AI-generated changes into protected branches.

---

# 18. Related Documents

- TECH_STACK.md
- API_ARCHITECTURE.md
- BRANCHING_STRATEGY.md
- CI_CD_PIPELINE.md
- IMPLEMENTATION_ROADMAP.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai