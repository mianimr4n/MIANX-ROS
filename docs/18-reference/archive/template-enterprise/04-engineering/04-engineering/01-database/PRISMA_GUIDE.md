# ⚡ PRISMA GUIDE

> Official Prisma Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Database Engineering |
| Document | PRISMA_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines how Prisma ORM is used throughout the Telepizza Platform.

Objectives:

- Consistent schema design
- Type-safe database access
- Maintainable migrations
- High performance
- Enterprise scalability

---

# 2. Technology Stack

Database

- PostgreSQL 16+

ORM

- Prisma ORM

Language

- TypeScript

Migration

- Prisma Migrate

Client

- Prisma Client

---

# 3. Project Structure

```text
database/

└── prisma/

    ├── schema.prisma

    ├── seed.ts

    ├── migrations/

    └── seeds/
```

---

# 4. Prisma Schema Structure

Recommended order

```text
Generator

Datasource

Enums

Models

Views (Future)

Comments
```

---

# 5. Generator

Example

```prisma
generator client {
  provider = "prisma-client-js"
}
```

---

# 6. Datasource

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

# 7. UUID Strategy

Every business table uses UUID.

Example

```prisma
id String @id @default(uuid())
```

---

# 8. Timestamp Convention

Every model includes

```prisma
createdAt DateTime @default(now())

updatedAt DateTime @updatedAt
```

Business models also include

```prisma
deletedAt DateTime?
```

Soft delete is preferred for operational records.

---

# 9. Model Naming

Use PascalCase

Examples

```text
User

Customer

Order

Inventory

PurchaseOrder

KitchenTicket
```

---

# 10. Field Naming

Use camelCase

Examples

```text
customerName

orderNumber

branchId

paymentStatus
```

---

# 11. Database Mapping

Map models to snake_case tables.

Example

```prisma
model Customer {

}

@@map("customers")
```

Field mapping

```prisma
createdAt DateTime @map("created_at")
```

---

# 12. Enum Convention

Example

```prisma
enum OrderStatus {

PENDING

CONFIRMED

PREPARING

READY

DELIVERED

CANCELLED

}
```

Keep enum names singular and values uppercase.

---

# 13. Relationships

One-to-One

```text
User

↓

Employee
```

One-to-Many

```text
Customer

↓

Orders
```

Many-to-Many

```text
Roles

↓

Permissions
```

Always define relations explicitly.

---

# 14. Index Strategy

Create indexes for

- Foreign Keys
- Search Fields
- Email
- Phone
- Status
- Created Date
- Order Number

Example

```prisma
@@index([customerId])

@@index([status])

@@index([createdAt])
```

---

# 15. Unique Constraints

Examples

```prisma
email

phone

sku

barcode

orderNumber

invoiceNumber
```

Use

```prisma
@unique
```

or

```prisma
@@unique([])
```

---

# 16. Transactions

Use Prisma Transactions for

- Order Placement
- Payment Processing
- Inventory Update
- Refunds
- Purchase Orders
- Stock Transfers

Example

```typescript
await prisma.$transaction([
  ...
])
```

---

# 17. Query Best Practices

Prefer

- select
- include
- pagination
- cursor-based pagination
- batch operations

Avoid

- SELECT *
- unnecessary nested queries
- N+1 query patterns

---

# 18. Prisma Client

Use a singleton instance.

```text
backend/

src/

common/

database/

prisma.service.ts
```

Never create multiple PrismaClient instances.

---

# 19. Error Handling

Handle

- Unique constraint violations
- Foreign key violations
- Transaction failures
- Connection errors
- Timeouts

Return business-friendly API errors.

---

# 20. Migration Rules

Never edit an applied migration.

Always

```text
schema.prisma

↓

Migration

↓

Review

↓

Commit

↓

Deploy
```

---

# 21. Performance

Recommendations

- Index frequently queried columns
- Use pagination
- Limit selected columns
- Batch inserts
- Cache expensive queries
- Review execution plans

---

# 22. Security

Never expose

- Password hashes
- Tokens
- Secrets

Hash passwords using Argon2id (preferred).

Always validate application input before database operations.

---

# 23. Folder Layout

```text
database/

prisma/

schema.prisma

seed.ts

migrations/

seeds/
```

Backend

```text
backend/

src/

common/

database/

prisma.module.ts

prisma.service.ts
```

---

# 24. Development Workflow

Requirements

↓

Database Design

↓

schema.prisma

↓

Migration

↓

Seed

↓

Prisma Generate

↓

Backend Development

↓

Testing

↓

Production

---

# 25. Related Documents

- DATABASE_ENGINEERING.md
- DATABASE_SCHEMA.md
- DATABASE_MIGRATION_GUIDE.md
- DATABASE_SEEDING.md
- DATABASE_RELATIONSHIPS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
