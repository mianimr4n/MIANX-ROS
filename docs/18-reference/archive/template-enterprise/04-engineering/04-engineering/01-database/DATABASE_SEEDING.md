# 🌱 DATABASE SEEDING

> Official Database Seeding Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Database Engineering |
| Document | DATABASE_SEEDING.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines how seed data is managed across Development, Staging, Testing, and Production environments.

Goals:

- Consistent environments
- Repeatable setup
- Faster onboarding
- Reliable testing
- Safe production deployment

---

# 2. What is Seed Data?

Seed data is the initial data required for the application to function correctly after database creation.

Examples:

- Roles
- Permissions
- Super Admin
- Branches
- Settings
- Tax Configuration
- Payment Methods

---

# 3. Environment Strategy

## Development

Contains:

- Demo customers
- Demo employees
- Demo products
- Demo orders
- Demo inventory

---

## Testing

Contains:

- Test users
- Test products
- Test orders

No production data.

---

## Staging

Contains:

- Production-like configuration
- No sensitive production data

---

## Production

Contains only required initial records.

Never insert demo data.

---

# 4. Seeder Structure

```text
database/

└── prisma/

    ├── schema.prisma

    ├── seed.ts

    └── seeds/

        ├── roles.seed.ts
        ├── permissions.seed.ts
        ├── admin.seed.ts
        ├── branches.seed.ts
        ├── settings.seed.ts
        ├── menu.seed.ts
        ├── products.seed.ts
        ├── customers.seed.ts
        ├── employees.seed.ts
        └── index.ts
```

---

# 5. Seeding Order

Database

↓

Roles

↓

Permissions

↓

Admin User

↓

Branches

↓

Settings

↓

Categories

↓

Products

↓

Menu

↓

Customers

↓

Employees

↓

Inventory

↓

Payment Methods

---

# 6. Core Seed Data

Always create:

- Super Admin Role
- Admin Role
- Branch Manager
- Cashier
- Kitchen Staff
- Rider
- Customer

---

# 7. Permission Seed

Seed permissions by module.

Examples:

Users

Orders

Menu

Kitchen

Inventory

Finance

Reports

AI

Settings

---

# 8. Super Admin

Default account:

```text
Email:
admin@telepizza.local

Password:
Change Immediately
```

Password must be hashed before insertion.

---

# 9. Branch Seed

Initial branch:

Head Office

Future branches can be added through the Admin Panel.

---

# 10. Settings Seed

Seed:

- Company Name
- Currency
- Time Zone
- Tax Rate
- Order Prefix
- Invoice Prefix
- Language
- Theme

---

# 11. Demo Data

Development only.

Examples:

- Customers
- Menu
- Products
- Inventory
- Orders
- Coupons

Never deploy demo data to production.

---

# 12. Seeder Rules

Every seeder must:

- Be idempotent
- Avoid duplicate records
- Validate dependencies
- Log execution
- Return execution summary

---

# 13. Execution

Generate Prisma Client

```bash
pnpm prisma generate
```

Run seed

```bash
pnpm prisma db seed
```

Reset database

```bash
pnpm prisma migrate reset
```

---

# 14. Error Handling

If a seed fails:

- Stop execution
- Log the error
- Roll back the transaction where applicable
- Display clear error messages

---

# 15. Logging

Log:

- Seeder name
- Records inserted
- Records skipped
- Duration
- Errors

---

# 16. Testing

Verify:

- Required data exists
- Relationships are valid
- Passwords are hashed
- No duplicates
- Permissions assigned correctly

---

# 17. Production Rules

Production seed should include only:

- Roles
- Permissions
- System Settings
- Initial Super Admin
- Branches
- Payment Configuration

Never include:

- Demo customers
- Demo orders
- Demo inventory
- Test accounts

---

# 18. Related Documents

- DATABASE_ENGINEERING.md
- DATABASE_MIGRATION_GUIDE.md
- PRISMA_GUIDE.md
- DATABASE_SCHEMA.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
