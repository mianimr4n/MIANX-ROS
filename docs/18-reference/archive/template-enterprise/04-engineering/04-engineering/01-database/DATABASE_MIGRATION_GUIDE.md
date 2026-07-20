# 🔄 DATABASE MIGRATION GUIDE

> Official Database Migration Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Database Engineering |
| Document | DATABASE_MIGRATION_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the database migration strategy for the Telepizza Platform.

Goals:

- Safe schema evolution
- Version-controlled database changes
- Rollback support
- Zero data loss
- Consistent environments

---

# 2. Migration Philosophy

Every database change must:

- Be version controlled
- Be reproducible
- Be reviewed
- Be tested
- Be reversible whenever practical

Never modify production databases manually.

---

# 3. Technology

Database

- PostgreSQL 16+

ORM

- Prisma ORM

Migration Tool

- Prisma Migrate

---

# 4. Migration Workflow

```text
Requirement

↓

Update schema.prisma

↓

Generate Migration

↓

Review SQL

↓

Test Migration

↓

Commit

↓

CI Validation

↓

Deploy

↓

Production
```

---

# 5. Migration Folder

```text
database/

└── prisma/

    ├── schema.prisma

    ├── seed.ts

    └── migrations/

        ├── 20260707110000_init/

        ├── 20260708100000_add_orders/

        └── migration_lock.toml
```

---

# 6. Naming Convention

Migration folders should describe the change.

Examples:

```text
init

add_customers

add_orders

add_inventory

add_payment_tables

add_loyalty_program
```

---

# 7. Development Workflow

Modify

```text
schema.prisma
```

Generate migration

```bash
pnpm prisma migrate dev --name add_orders
```

Generate Prisma Client

```bash
pnpm prisma generate
```

---

# 8. Production Workflow

Never use:

```bash
prisma db push
```

Use:

```bash
pnpm prisma migrate deploy
```

Production only runs reviewed migrations.

---

# 9. Rollback Strategy

Before every production deployment:

- Backup database
- Verify backup
- Apply migration
- Validate application
- Monitor logs

If a failure occurs:

- Restore backup if required
- Deploy previous application version
- Create corrective migration

---

# 10. Seed Data

Initial seed includes:

- Roles
- Permissions
- Super Admin
- Branches
- Settings
- Demo Data (Development Only)

---

# 11. Migration Rules

Allowed:

- Add tables
- Add columns
- Add indexes
- Add constraints

Avoid:

- Dropping columns without migration plan
- Dropping tables with production data
- Renaming columns without compatibility strategy

---

# 12. Review Checklist

Before merge:

- Migration reviewed
- SQL validated
- Backup strategy confirmed
- Performance impact assessed
- Documentation updated

---

# 13. Testing

Test migrations on:

- Empty database
- Development database
- Staging database

Verify:

- Data integrity
- Constraints
- Indexes
- Relationships

---

# 14. CI/CD Integration

Pipeline checks:

- Migration syntax
- Prisma validation
- Client generation
- Build success
- Test execution

Deployment stops if any migration fails.

---

# 15. Best Practices

- One logical change per migration
- Small incremental migrations
- Never edit applied migrations
- Keep migration history in Git
- Review generated SQL before production

---

# 16. Related Documents

- DATABASE_ENGINEERING.md
- DATABASE_SEEDING.md
- PRISMA_GUIDE.md
- DATABASE_SCHEMA.md
- DATABASE_ARCHITECTURE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
