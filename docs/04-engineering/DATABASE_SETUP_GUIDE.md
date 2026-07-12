# 🗄️ DATABASE SETUP GUIDE

> PostgreSQL database initialization and setup for Telepizza Platform

---

# Quick Start

```bash
# Using Docker Compose
docker compose up -d postgres

# Using local PostgreSQL
createdb telepizza_dev
psql -d telepizza_dev < database/schema/initial.sql

# Run Prisma migrations
pnpm prisma migrate dev

# Seed database
pnpm prisma db seed
```

---

# Connection String

```
Development:   postgresql://telepizza:dev_password@localhost:5432/telepizza_dev
Testing:       postgresql://telepizza:test_password@localhost:5432/telepizza_test
Production:    postgresql://{user}:{password}@{host}:{port}/{database}
```

---

# Initial Tables

- users (authentication & user management)
- customers (customer profiles)
- branches (restaurant locations)
- orders (order records)
- order_items (order line items)
- menu_items (menu products)
- inventory (stock tracking)
- payments (payment records)
- addresses (delivery addresses)

---

# Useful Commands

```bash
# View database
psql -U telepizza -d telepizza_dev

# Reset database
pnpm prisma migrate reset

# Create migration
pnpm prisma migrate dev --name init

# View migrations
pnpm prisma migrate status

# Seed data
pnpm prisma db seed
```

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
