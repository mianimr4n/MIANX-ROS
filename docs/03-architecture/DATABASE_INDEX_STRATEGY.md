# ⚡ DATABASE INDEX STRATEGY

> Official indexing strategy for the Telepizza Platform PostgreSQL database.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Database |
| Document | DATABASE_INDEX_STRATEGY.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the indexing strategy used throughout the Telepizza Platform to ensure fast queries, scalability, and efficient database performance.

---

# 2. Objectives

The indexing strategy aims to:

- Improve query performance
- Reduce database load
- Optimize joins
- Speed up searching
- Improve reporting
- Support multi-branch operations
- Scale to millions of records

---

# 3. Index Types

The platform uses:

- Primary Index
- Unique Index
- Foreign Key Index
- Composite Index
- Partial Index
- Full Text Index
- JSONB GIN Index
- BRIN Index (for very large historical tables)

---

# 4. Primary Key Index

Every table must have:

```sql
PRIMARY KEY (id)
```

Using

```text
UUID
```

---

# 5. Foreign Key Indexes

Every foreign key should have an index.

Examples

```sql
orders.customer_id

orders.branch_id

order_items.order_id

payment_transactions.order_id

inventory_items.branch_id

employees.branch_id

deliveries.rider_id

purchase_orders.supplier_id

audit_logs.user_id

ai_tasks.agent_id
```

---

# 6. Unique Indexes

Examples

```sql
users.email

users.phone

branches.branch_code

orders.order_number

products.slug

roles.code

permissions.code

gift_cards.card_number

payment_transactions.transaction_reference
```

---

# 7. Composite Indexes

## Orders

```sql
(branch_id,status)

(branch_id,created_at)

(customer_id,created_at)

(payment_status,created_at)

(order_type,status)
```

---

## Inventory

```sql
(branch_id,sku)

(branch_id,current_stock)

(category_id,is_active)
```

---

## Employees

```sql
(branch_id,status)

(department_id,status)

(employee_code)
```

---

## Delivery

```sql
(branch_id,status)

(rider_id,status)

(branch_id,created_at)
```

---

## Kitchen

```sql
(branch_id,status)

(priority,status)

(branch_id,priority)
```

---

## Finance

```sql
(branch_id,expense_date)

(account_id,created_at)

(financial_year,status)
```

---

## AI Platform

```sql
(agent_id,status)

(model_id,created_at)

(task_type,status)

(team_id,status)
```

---

# 8. Search Indexes

Frequently searched fields

```sql
customers.phone

customers.email

customers.full_name

products.name

suppliers.company_name

employees.employee_code

orders.order_number
```

---

# 9. Full Text Search

Use PostgreSQL Full Text Search for:

Products

```text
Product Name

Description

Keywords
```

Customers

```text
Customer Name

Phone

Email
```

Reports

```text
Report Name

Description
```

---

# 10. JSONB Indexes

Use GIN indexes on JSONB columns.

Examples

```sql
branch_settings.settings

system_settings.configuration

ai_agents.configuration

dashboard_widgets.configuration

analytics_snapshots.snapshot_data
```

---

# 11. Partial Indexes

Example

Only active products

```sql
WHERE is_active = TRUE
```

Only pending orders

```sql
WHERE status='Pending'
```

Only active riders

```sql
WHERE status='Available'
```

---

# 12. BRIN Indexes

For large historical tables

Examples

```sql
audit_logs

login_history

system_logs

notification_history

ai_usage_logs
```

BRIN saves storage and improves performance for time-based queries.

---

# 13. Reporting Indexes

Daily reports

```sql
(created_at)

(branch_id,created_at)

(status,created_at)
```

Monthly reports

```sql
(date_trunc)

(branch_id,month)
```

---

# 14. Audit Indexes

```sql
(module)

(created_at)

(user_id)

(entity_name)

(entity_id)
```

---

# 15. AI Platform Indexes

```sql
ai_tasks(status)

ai_tasks(priority)

ai_usage_logs(created_at)

ai_usage_logs(agent_id)

ai_workflows(is_active)
```

---

# 16. Notification Indexes

```sql
(user_id,status)

(channel_id)

(sent_at)

(created_at)
```

---

# 17. Security Indexes

```sql
login_attempts(ip_address)

trusted_devices(user_id)

audit_logs(user_id)

blocked_ips(ip_address)
```

---

# 18. Multi-Branch Optimization

Almost every operational table should include:

```sql
branch_id
```

Indexes

```sql
(branch_id)

(branch_id,status)

(branch_id,created_at)
```

---

# 19. Query Optimization Rules

Avoid

```sql
SELECT *
```

Always select only required columns.

Use LIMIT for pagination.

Filter using indexed columns.

Avoid unnecessary JOINs.

---

# 20. Pagination Strategy

Use cursor-based pagination where possible.

Example

```sql
WHERE id > last_seen_id

ORDER BY id

LIMIT 50
```

For user-facing lists, offset pagination can be acceptable for small datasets.

---

# 21. Archive Strategy

Large historical tables

```text
Audit Logs

AI Logs

Notification History

System Logs

Login History
```

Archive yearly.

---

# 22. Monitoring

Track

- Slow Queries
- Missing Indexes
- Index Usage
- Sequential Scans
- Table Bloat
- Vacuum Status

---

# 23. Maintenance

Weekly

- Analyze tables
- Vacuum

Monthly

- Reindex if necessary
- Review slow queries

Quarterly

- Remove unused indexes
- Add indexes for new query patterns

---

# 24. Performance Targets

Customer Search

<100 ms

Order Search

<100 ms

Dashboard

<500 ms

Reports

<2 sec

AI Queries

<500 ms

---

# 25. Related Documents

- DATABASE_ARCHITECTURE.md
- DATABASE_SCHEMA.md
- DATABASE_RELATIONSHIPS.md
- API_ARCHITECTURE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai