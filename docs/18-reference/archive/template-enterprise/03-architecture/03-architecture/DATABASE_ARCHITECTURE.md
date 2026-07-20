# 🗄️ DATABASE ARCHITECTURE

> Official database architecture for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Architecture |
| Document | DATABASE_ARCHITECTURE.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the database architecture for the Telepizza Platform.

The database must support:

- Multi-branch operations
- Online ordering
- POS
- Kitchen operations
- Delivery
- Inventory
- Procurement
- CRM
- HR
- Finance
- Reporting
- AI agents
- Audit logs
- Security

---

# 2. Database Strategy

Primary database:

- PostgreSQL

ORM:

- Prisma ORM

Cache:

- Redis

File storage:

- S3-compatible object storage

Search:

- PostgreSQL full-text search initially
- Dedicated search engine in future if required

---

# 3. Architecture Approach

The platform will start with a **shared PostgreSQL database** using clear domain-based table ownership.

Future evolution:

```text
Phase 1
Shared PostgreSQL Database

↓

Phase 2
Schema-per-domain

↓

Phase 3
Service-owned databases where required

↓

Phase 4
Analytics warehouse
```

---

# 4. Database Design Principles

- Normalize core transactional data
- Use UUID primary keys
- Use clear foreign keys
- Use audit metadata
- Use soft deletes where required
- Use indexes on frequently queried fields
- Use constraints for business integrity
- Keep reporting views separate from core tables
- Keep AI memory separate from transactional data

---

# 5. Naming Conventions

## Tables

Use plural snake_case.

Examples:

```text
customers
orders
order_items
inventory_items
payment_transactions
```

## Columns

Use snake_case.

Examples:

```text
created_at
updated_at
branch_id
customer_id
order_status
```

## Primary Keys

```text
id UUID PRIMARY KEY
```

## Foreign Keys

```text
customer_id
branch_id
order_id
product_id
```

---

# 6. Common Columns

Most tables should include:

```text
id
created_at
updated_at
created_by
updated_by
deleted_at
is_active
```

Where not required, these can be omitted.

---

# 7. Multi-Branch Data Model

Every branch-specific table should include:

```text
branch_id
```

Examples:

- orders
- inventory_items
- cash_drawers
- shifts
- kitchen_orders
- deliveries

Head Office users can query all branches.

Branch Managers can query only assigned branches.

---

# 8. Core Database Domains

```text
01 Identity & Access
02 Branch Management
03 Customer & CRM
04 Menu & Products
05 Orders
06 Payments
07 Kitchen
08 Delivery & Riders
09 Inventory
10 Suppliers
11 Purchases
12 Warehouse
13 Loyalty
14 HR
15 Finance
16 Reporting
17 Notifications
18 AI Platform
19 Audit Logs
20 Settings
21 Security
```

---

# 9. Domain Table Ownership

## Identity Domain

Owns:

- users
- roles
- permissions
- user_roles
- role_permissions
- user_sessions
- refresh_tokens

---

## Branch Domain

Owns:

- branches
- branch_settings
- branch_users
- branch_hours
- delivery_zones

---

## Customer Domain

Owns:

- customers
- customer_addresses
- customer_preferences
- customer_segments

---

## Menu Domain

Owns:

- categories
- products
- product_variants
- product_addons
- combos
- combo_items
- product_images

---

## Order Domain

Owns:

- orders
- order_items
- order_status_logs
- order_timeline
- carts
- cart_items

---

## Payment Domain

Owns:

- payment_transactions
- payment_methods
- payment_providers
- payment_refunds
- payment_settlements

---

## Inventory Domain

Owns:

- inventory_items
- inventory_categories
- inventory_units
- recipes
- recipe_items
- stock_movements
- stock_adjustments

---

## AI Domain

Owns:

- ai_agents
- ai_teams
- ai_tasks
- ai_memory
- ai_workflows
- ai_approvals
- ai_usage_logs

---

# 10. Data Relationship Overview

```text
branches
   ├── orders
   ├── employees
   ├── inventory
   ├── riders
   ├── kitchen_orders
   └── finance_records

customers
   ├── orders
   ├── loyalty_accounts
   ├── addresses
   └── support_tickets

orders
   ├── order_items
   ├── payments
   ├── kitchen_orders
   ├── deliveries
   └── order_timeline

products
   ├── product_variants
   ├── recipe_items
   ├── order_items
   └── inventory_consumption
```

---

# 11. Transaction Strategy

Use database transactions for:

- Order creation
- Payment confirmation
- Stock deduction
- Refund processing
- Purchase receiving
- Stock transfers
- Loyalty point updates

Example:

```text
Create Order
↓
Create Order Items
↓
Calculate Total
↓
Reserve Inventory
↓
Create Payment Intent
↓
Commit Transaction
```

---

# 12. Indexing Strategy

Indexes required for:

- branch_id
- customer_id
- order_id
- product_id
- status
- created_at
- email
- phone
- payment_reference
- order_number

Composite indexes:

```text
(branch_id, created_at)
(branch_id, status)
(customer_id, created_at)
(order_id, status)
```

---

# 13. Audit Metadata

Important tables must include audit metadata:

```text
created_by
updated_by
deleted_by
created_at
updated_at
deleted_at
```

Critical actions must also be recorded in audit logs.

---

# 14. Soft Delete Strategy

Use soft delete for:

- customers
- products
- employees
- suppliers
- branches
- users

Do not hard delete business history.

---

# 15. Data Retention

Suggested retention:

| Data Type | Retention |
|----------|-----------|
| Orders | Permanent |
| Payments | Permanent |
| Audit Logs | 5 Years |
| Notifications | 1 Year |
| AI Logs | Configurable |
| Sessions | 90 Days |
| Backups | Configurable |

---

# 16. Security Requirements

Database must support:

- Encryption at rest
- Encryption in transit
- Role-based database access
- Restricted production access
- Backup encryption
- Audit logging
- Secrets management

---

# 17. Reporting Strategy

Reporting should use:

- Materialized views
- Aggregated tables
- Daily snapshots
- Analytics jobs

Avoid heavy reporting queries directly on transactional tables during peak hours.

---

# 18. AI Data Strategy

AI data must be separated into:

- AI tasks
- AI memory
- AI logs
- AI approvals
- AI cost tracking

AI should never access sensitive data without permission checks.

---

# 19. Backup Strategy

Database backup must support:

- Full backup
- Incremental backup
- Point-in-time recovery
- Encrypted backup storage
- Restore testing

---

# 20. Future Database Scaling

Future scaling options:

- Read replicas
- Table partitioning
- Analytics warehouse
- Service-owned databases
- Multi-region replication

---

# 21. Related Documents

- SYSTEM_ARCHITECTURE.md
- DOMAIN_DRIVEN_DESIGN.md
- MICROSERVICES_ARCHITECTURE.md
- DATABASE_SCHEMA.md
- SECURITY_REQUIREMENTS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai