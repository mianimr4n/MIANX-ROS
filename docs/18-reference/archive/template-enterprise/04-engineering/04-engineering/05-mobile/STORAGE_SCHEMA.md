# 🗄️ STORAGE SCHEMA

> Official Local Storage Database Schema for the Telepizza Platform Mobile Applications.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Engineering |
| Document | STORAGE_SCHEMA.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the SQLite database schema used by all Telepizza mobile applications.

Objectives

- Offline-first architecture
- Reliable synchronization
- Versioned database
- AI-friendly schema
- Fast local queries

---

# 2. Database Overview

```
SQLite

↓

Application Database

↓

Tables

↓

Indexes

↓

Relationships

↓

Sync Engine
```

---

# 3. Database Version

Current Version

```
v1
```

Future upgrades require migrations.

---

# 4. Core Tables

```
products

categories

customers

orders

order_items

inventory

employees

branches

settings

sync_queue

sync_log

cache_metadata
```

---

# 5. Products

Columns

```
id

server_id

name

sku

barcode

category_id

price

status

updated_at

sync_status
```

---

# 6. Categories

```
id

server_id

name

parent_id

status

updated_at
```

---

# 7. Customers

```
id

server_id

name

phone

email

loyalty_points

updated_at

sync_status
```

---

# 8. Orders

```
id

server_id

customer_id

branch_id

status

subtotal

discount

tax

total

created_at

updated_at

sync_status
```

---

# 9. Order Items

```
id

order_id

product_id

quantity

price

discount

total
```

---

# 10. Inventory

```
id

server_id

product_id

branch_id

quantity

minimum_quantity

updated_at
```

---

# 11. Employees

```
id

server_id

name

role

branch_id

status
```

---

# 12. Branches

```
id

server_id

name

city

phone

status
```

---

# 13. Settings

Store

- Theme
- Language
- Notification Settings
- Accessibility
- Feature Flags

---

# 14. Sync Queue

```
id

entity

operation

payload

status

retry_count

created_at

updated_at
```

Operations

- CREATE
- UPDATE
- DELETE

---

# 15. Sync Log

```
id

entity

result

duration

error

timestamp
```

---

# 16. Cache Metadata

```
table_name

last_sync

expires_at

version
```

---

# 17. Relationships

```
Customers

↓

Orders

↓

Order Items

↓

Products

↓

Categories
```

Inventory belongs to

```
Branch

↓

Inventory

↓

Product
```

---

# 18. Index Strategy

Index

```
server_id

status

updated_at

branch_id

customer_id

product_id

sync_status
```

---

# 19. Sync Status

Allowed values

```
PENDING

SYNCING

SYNCED

FAILED

CONFLICT
```

---

# 20. Soft Delete

Deleted records

```
deleted_at

is_deleted
```

Never permanently remove records until synchronization is complete.

---

# 21. Database Migration

Each migration requires

- Version Number
- Migration Script
- Rollback Plan
- Testing

---

# 22. Cleanup Jobs

Automatic cleanup

- Expired Cache
- Old Logs
- Completed Queue Entries

Keep storage usage under control.

---

# 23. Security

Sensitive fields

- Encrypt when stored
- Never expose in logs
- Validate before sync

---

# 24. Performance

Recommendations

- Indexed queries
- Batch updates
- Transactions
- Prepared statements

Avoid full table scans.

---

# 25. Testing

Verify

- CRUD Operations
- Relationships
- Index Performance
- Sync Queue
- Migrations
- Cleanup Jobs

---

# 26. Related Documents

- LOCAL_STORAGE_GUIDE.md
- OFFLINE_SYNC.md
- MOBILE_API_GUIDE.md
- MOBILE_SECURITY.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
