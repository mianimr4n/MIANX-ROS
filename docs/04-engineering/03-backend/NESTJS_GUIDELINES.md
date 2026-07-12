# 🚀 NESTJS GUIDELINES

> Official NestJS Development Guidelines for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Backend Engineering |
| Document | NESTJS_GUIDELINES.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official NestJS development standards for the Telepizza Platform.

Goals

- Clean Architecture
- Modular Design
- High Performance
- Enterprise Standards
- AI-Friendly Development

---

# 2. Framework

Framework

- NestJS 11+

Language

- TypeScript

Package Manager

- pnpm

Runtime

- Node.js LTS

---

# 3. Application Structure

```text
backend/

src/

app.module.ts

main.ts

common/

config/

database/

modules/

shared/

integrations/

workflows/

policies/

contracts/

jobs/

events/
```

---

# 4. Bootstrap

Application startup should initialize:

- Environment Variables
- Logger
- Prisma
- Redis
- BullMQ
- Swagger
- Validation Pipe
- Global Filters
- Global Interceptors
- Global Guards

---

# 5. Dependency Injection

Always use NestJS Dependency Injection.

Example

```typescript
@Injectable()
export class OrderService {
  constructor(
    private readonly repository: OrderRepository
  ) {}
}
```

Never instantiate services manually.

---

# 6. Controllers

Controllers should:

- Handle HTTP
- Validate DTOs
- Return Responses

Controllers should NOT:

- Execute Business Logic
- Query Database
- Manage Transactions

---

# 7. Services

Services should:

- Execute Business Rules
- Call Repositories
- Publish Events
- Execute Transactions

---

# 8. Repositories

Repositories should:

- Execute Prisma Queries
- Map Data
- Optimize Queries

Repositories should never:

- Return HTTP Responses
- Contain Business Rules

---

# 9. DTO

Use DTOs for:

- Create
- Update
- Response
- Search
- Filter

Validation

```typescript
@IsEmail()

@IsUUID()

@IsString()
```

---

# 10. Validation

Global ValidationPipe

Rules

- whitelist
- transform
- forbidNonWhitelisted

Reject invalid requests immediately.

---

# 11. Authentication

Use

- JWT
- Passport

Support

- Access Token
- Refresh Token

Future

- MFA
- OAuth
- SSO

---

# 12. Authorization

RBAC

Roles

- Super Admin
- Admin
- Branch Manager
- Cashier
- Kitchen Staff
- Rider
- Customer

Future

ABAC

---

# 13. Exception Handling

Global Exception Filter

Responsibilities

- Standard Response
- Logging
- Request ID
- Error Mapping

---

# 14. Interceptors

Use for

- Logging
- Response Formatting
- Performance Metrics
- Audit

---

# 15. Guards

Use for

- Authentication
- Authorization
- Branch Access
- API Keys

---

# 16. Middleware

Use for

- Request Logging
- Correlation IDs
- Security Headers
- Tenant Resolution (Future)

---

# 17. Background Jobs

BullMQ

Queues

- Email
- SMS
- WhatsApp
- Reports
- AI
- Notifications

---

# 18. Scheduler

Use @nestjs/schedule

Examples

- Daily Reports
- Cleanup Jobs
- Cache Refresh
- Backup Verification

---

# 19. Configuration

Centralize configuration.

Files

```text
.env.development

.env.staging

.env.production
```

Use ConfigModule.

---

# 20. Swagger

Every endpoint requires

- Summary
- Description
- Request DTO
- Response DTO
- Error Responses

Swagger URL

```text
/api/docs
```

---

# 21. Logging

Use structured logging.

Log

- Requests
- Responses
- Errors
- Business Events

Avoid logging secrets.

---

# 22. Health Checks

Endpoints

```text
/health

/health/live

/health/ready
```

Verify

- PostgreSQL
- Redis
- Queue
- AI Gateway

---

# 23. Testing

Required

- Unit
- Integration
- E2E

Target Coverage

```text
80%+
```

---

# 24. Security

Implement

- Helmet
- CORS
- Rate Limiting
- JWT
- Input Validation
- Output Sanitization

---

# 25. Performance

Recommendations

- Pagination
- Query Optimization
- Redis Cache
- Background Processing
- Lazy Loading

---

# 26. AI Readiness

Every module should support

- Typed DTOs
- Events
- Clear Interfaces
- Swagger Documentation

AI-generated code must follow these standards.

---

# 27. Related Documents

- BACKEND_BLUEPRINT.md
- MODULE_TEMPLATE.md
- EVENT_HANDLERS.md
- API_SPECIFICATIONS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
