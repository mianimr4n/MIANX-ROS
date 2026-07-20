# 🔗 DATABASE RELATIONSHIPS

> Master database relationship blueprint for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Architecture |
| Document | DATABASE_RELATIONSHIPS.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines table relationships, cardinality, cascade rules, junction tables, and relationship ownership for the Telepizza Platform database.

---

# 2. Relationship Principles

- Business history must not be deleted.
- Critical records use `RESTRICT` instead of cascade delete.
- Soft delete is preferred for business entities.
- Junction tables are used for many-to-many relationships.
- Every foreign key should be indexed.
- Branch-specific data must include `branch_id`.
- Cross-domain relationships should be clear and controlled.

---

# 3. Main Relationship Map

```text
branches
   ├── orders
   ├── riders
   ├── employees
   ├── inventory_items
   ├── kitchen_orders
   ├── deliveries
   ├── warehouses
   ├── cash_drawers
   └── reports

customers
   ├── customer_addresses
   ├── orders
   ├── loyalty_accounts
   ├── support_tickets
   └── campaign_recipients

orders
   ├── order_items
   ├── payment_transactions
   ├── payment_refunds
   ├── kitchen_orders
   ├── deliveries
   └── order_status_logs
```

---

# 4. Identity Relationships

## users → user_roles

Cardinality:

```text
users 1:N user_roles
```

Rule:

```text
ON DELETE RESTRICT
```

---

## roles → role_permissions

Cardinality:

```text
roles 1:N role_permissions
```

Rule:

```text
ON DELETE RESTRICT
```

---

## permissions → role_permissions

Cardinality:

```text
permissions 1:N role_permissions
```

Rule:

```text
ON DELETE RESTRICT
```

---

## users → user_sessions

Cardinality:

```text
users 1:N user_sessions
```

Rule:

```text
ON DELETE CASCADE
```

---

# 5. Branch Relationships

## branches → branch_settings

Cardinality:

```text
branches 1:1 branch_settings
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → delivery_zones

Cardinality:

```text
branches 1:N delivery_zones
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → orders

Cardinality:

```text
branches 1:N orders
```

Rule:

```text
ON DELETE RESTRICT
```

Reason:

Order history must remain permanent.

---

## branches → employees

Cardinality:

```text
branches 1:N employees
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 6. Customer Relationships

## users → customers

Cardinality:

```text
users 1:1 customers
```

Rule:

```text
ON DELETE SET NULL
```

---

## customers → customer_addresses

Cardinality:

```text
customers 1:N customer_addresses
```

Rule:

```text
ON DELETE CASCADE
```

---

## customers → orders

Cardinality:

```text
customers 1:N orders
```

Rule:

```text
ON DELETE SET NULL
```

Reason:

Guest orders and historical orders must remain.

---

## customers → loyalty_accounts

Cardinality:

```text
customers 1:1 loyalty_accounts
```

Rule:

```text
ON DELETE RESTRICT
```

---

## customers → customer_segment_members

Cardinality:

```text
customers 1:N customer_segment_members
```

Rule:

```text
ON DELETE CASCADE
```

---

# 7. Menu Relationships

## categories → products

Cardinality:

```text
categories 1:N products
```

Rule:

```text
ON DELETE RESTRICT
```

---

## products → product_variants

Cardinality:

```text
products 1:N product_variants
```

Rule:

```text
ON DELETE RESTRICT
```

---

## products → product_addon_links

Cardinality:

```text
products 1:N product_addon_links
```

Rule:

```text
ON DELETE CASCADE
```

---

## product_addons → product_addon_links

Cardinality:

```text
product_addons 1:N product_addon_links
```

Rule:

```text
ON DELETE CASCADE
```

Result:

```text
products N:N product_addons
```

---

# 8. Order Relationships

## customers → carts

Cardinality:

```text
customers 1:N carts
```

Rule:

```text
ON DELETE SET NULL
```

---

## carts → cart_items

Cardinality:

```text
carts 1:N cart_items
```

Rule:

```text
ON DELETE CASCADE
```

---

## orders → order_items

Cardinality:

```text
orders 1:N order_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## orders → order_status_logs

Cardinality:

```text
orders 1:N order_status_logs
```

Rule:

```text
ON DELETE RESTRICT
```

---

## products → order_items

Cardinality:

```text
products 1:N order_items
```

Rule:

```text
ON DELETE RESTRICT
```

Reason:

Order items must preserve product reference/history.

---

# 9. Payment Relationships

## orders → payment_transactions

Cardinality:

```text
orders 1:N payment_transactions
```

Rule:

```text
ON DELETE RESTRICT
```

---

## payment_transactions → payment_refunds

Cardinality:

```text
payment_transactions 1:N payment_refunds
```

Rule:

```text
ON DELETE RESTRICT
```

---

## payment_providers → payment_transactions

Cardinality:

```text
payment_providers 1:N payment_transactions
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 10. Kitchen Relationships

## orders → kitchen_orders

Cardinality:

```text
orders 1:1 kitchen_orders
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → kitchen_stations

Cardinality:

```text
branches 1:N kitchen_stations
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 11. Delivery Relationships

## orders → deliveries

Cardinality:

```text
orders 1:1 deliveries
```

Rule:

```text
ON DELETE RESTRICT
```

---

## riders → deliveries

Cardinality:

```text
riders 1:N deliveries
```

Rule:

```text
ON DELETE SET NULL
```

---

## users → riders

Cardinality:

```text
users 1:1 riders
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 12. Inventory Relationships

## inventory_categories → inventory_items

Cardinality:

```text
inventory_categories 1:N inventory_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## inventory_units → inventory_items

Cardinality:

```text
inventory_units 1:N inventory_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → inventory_items

Cardinality:

```text
branches 1:N inventory_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## inventory_items → inventory_batches

Cardinality:

```text
inventory_items 1:N inventory_batches
```

Rule:

```text
ON DELETE RESTRICT
```

---

## inventory_items → stock_movements

Cardinality:

```text
inventory_items 1:N stock_movements
```

Rule:

```text
ON DELETE RESTRICT
```

---

## products → recipes

Cardinality:

```text
products 1:N recipes
```

Rule:

```text
ON DELETE RESTRICT
```

---

## recipes → recipe_items

Cardinality:

```text
recipes 1:N recipe_items
```

Rule:

```text
ON DELETE CASCADE
```

---

# 13. Supplier & Purchase Relationships

## suppliers → supplier_products

Cardinality:

```text
suppliers 1:N supplier_products
```

Rule:

```text
ON DELETE RESTRICT
```

---

## inventory_items → supplier_products

Cardinality:

```text
inventory_items 1:N supplier_products
```

Rule:

```text
ON DELETE RESTRICT
```

---

## suppliers → purchase_orders

Cardinality:

```text
suppliers 1:N purchase_orders
```

Rule:

```text
ON DELETE RESTRICT
```

---

## purchase_orders → purchase_order_items

Cardinality:

```text
purchase_orders 1:N purchase_order_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## purchase_requests → purchase_request_items

Cardinality:

```text
purchase_requests 1:N purchase_request_items
```

Rule:

```text
ON DELETE CASCADE
```

---

# 14. Warehouse Relationships

## warehouses → warehouse_locations

Cardinality:

```text
warehouses 1:N warehouse_locations
```

Rule:

```text
ON DELETE RESTRICT
```

---

## purchase_orders → goods_receiving

Cardinality:

```text
purchase_orders 1:N goods_receiving
```

Rule:

```text
ON DELETE RESTRICT
```

---

## goods_receiving → goods_receiving_items

Cardinality:

```text
goods_receiving 1:N goods_receiving_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

## stock_transfers → stock_transfer_items

Cardinality:

```text
stock_transfers 1:N stock_transfer_items
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 15. Loyalty Relationships

## customers → loyalty_accounts

Cardinality:

```text
customers 1:1 loyalty_accounts
```

Rule:

```text
ON DELETE RESTRICT
```

---

## loyalty_accounts → loyalty_transactions

Cardinality:

```text
loyalty_accounts 1:N loyalty_transactions
```

Rule:

```text
ON DELETE RESTRICT
```

---

## reward_catalog → reward_redemptions

Cardinality:

```text
reward_catalog 1:N reward_redemptions
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 16. HR Relationships

## departments → designations

Cardinality:

```text
departments 1:N designations
```

Rule:

```text
ON DELETE RESTRICT
```

---

## departments → employees

Cardinality:

```text
departments 1:N employees
```

Rule:

```text
ON DELETE RESTRICT
```

---

## designations → employees

Cardinality:

```text
designations 1:N employees
```

Rule:

```text
ON DELETE RESTRICT
```

---

## employees → attendance

Cardinality:

```text
employees 1:N attendance
```

Rule:

```text
ON DELETE RESTRICT
```

---

## employees → leave_requests

Cardinality:

```text
employees 1:N leave_requests
```

Rule:

```text
ON DELETE RESTRICT
```

---

## employees → payroll

Cardinality:

```text
employees 1:N payroll
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 17. Finance Relationships

## chart_of_accounts → journal_entry_lines

Cardinality:

```text
chart_of_accounts 1:N journal_entry_lines
```

Rule:

```text
ON DELETE RESTRICT
```

---

## journal_entries → journal_entry_lines

Cardinality:

```text
journal_entries 1:N journal_entry_lines
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → expenses

Cardinality:

```text
branches 1:N expenses
```

Rule:

```text
ON DELETE RESTRICT
```

---

## expense_categories → expenses

Cardinality:

```text
expense_categories 1:N expenses
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 18. Reporting Relationships

## reports → report_templates

Cardinality:

```text
reports 1:N report_templates
```

Rule:

```text
ON DELETE CASCADE
```

---

## reports → report_schedules

Cardinality:

```text
reports 1:N report_schedules
```

Rule:

```text
ON DELETE CASCADE
```

---

## branches → analytics_snapshots

Cardinality:

```text
branches 1:N analytics_snapshots
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 19. Notification Relationships

## notification_channels → notification_templates

Cardinality:

```text
notification_channels 1:N notification_templates
```

Rule:

```text
ON DELETE RESTRICT
```

---

## notifications → notification_queue

Cardinality:

```text
notifications 1:1 notification_queue
```

Rule:

```text
ON DELETE CASCADE
```

---

## notifications → notification_history

Cardinality:

```text
notifications 1:N notification_history
```

Rule:

```text
ON DELETE CASCADE
```

---

# 20. AI Platform Relationships

## ai_teams → ai_agents

Cardinality:

```text
ai_teams 1:N ai_agents
```

Rule:

```text
ON DELETE RESTRICT
```

---

## ai_agents → ai_tasks

Cardinality:

```text
ai_agents 1:N ai_tasks
```

Rule:

```text
ON DELETE RESTRICT
```

---

## ai_tasks → ai_task_history

Cardinality:

```text
ai_tasks 1:N ai_task_history
```

Rule:

```text
ON DELETE CASCADE
```

---

## ai_workflows → ai_workflow_steps

Cardinality:

```text
ai_workflows 1:N ai_workflow_steps
```

Rule:

```text
ON DELETE CASCADE
```

---

## ai_agents → ai_memory

Cardinality:

```text
ai_agents 1:N ai_memory
```

Rule:

```text
ON DELETE CASCADE
```

---

# 21. Settings Relationships

## branches → branch_settings

Cardinality:

```text
branches 1:1 branch_settings
```

Rule:

```text
ON DELETE RESTRICT
```

---

## payment_providers → payment_settings

Cardinality:

```text
payment_providers 1:1 payment_settings
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 22. Audit Relationships

## users → audit_logs

Cardinality:

```text
users 1:N audit_logs
```

Rule:

```text
ON DELETE SET NULL
```

---

## audit_logs → audit_log_details

Cardinality:

```text
audit_logs 1:N audit_log_details
```

Rule:

```text
ON DELETE CASCADE
```

---

# 23. Franchise Relationships

## franchises → franchise_branches

Cardinality:

```text
franchises 1:N franchise_branches
```

Rule:

```text
ON DELETE RESTRICT
```

---

## branches → franchise_branches

Cardinality:

```text
branches 1:N franchise_branches
```

Rule:

```text
ON DELETE RESTRICT
```

---

# 24. Important Junction Tables

```text
user_roles
role_permissions
product_addon_links
customer_segment_members
campaign_recipients
franchise_branches
```

---

# 25. Important Self-References

```text
inventory_categories.parent_id
chart_of_accounts.parent_account_id
```

---

# 26. Polymorphic References

Some tables use flexible references:

```text
stock_movements.reference_type + reference_id
audit_logs.entity_name + entity_id
approval_history.module + reference_id
```

These must be handled carefully in application logic.

---

# 27. Cascade Rule Summary

## CASCADE Allowed

Use only for dependent temporary/detail data:

```text
cart_items
user_sessions
recipe_items
notification_queue
notification_history
ai_task_history
ai_workflow_steps
audit_log_details
```

---

## RESTRICT Required

Use for business-critical data:

```text
orders
payments
inventory
finance
hr
purchase_orders
stock_movements
audit_logs
```

---

## SET NULL Allowed

Use when history must remain but owner may be removed:

```text
orders.customer_id
deliveries.rider_id
audit_logs.user_id
customers.user_id
```

---

# 28. Index Strategy

## Required Foreign Key Indexes

Every FK column should be indexed.

Examples:

```text
orders.customer_id
orders.branch_id
order_items.order_id
payment_transactions.order_id
inventory_items.branch_id
employees.branch_id
deliveries.rider_id
```

---

## Required Unique Indexes

```text
users.email
users.phone
branches.branch_code
orders.order_number
products.slug
roles.code
permissions.code
```

---

## Required Composite Indexes

```text
orders(branch_id, status)
orders(branch_id, created_at)
orders(customer_id, created_at)
inventory_items(branch_id, sku)
employees(branch_id, status)
deliveries(branch_id, status)
payment_transactions(order_id, status)
audit_logs(module, created_at)
ai_tasks(agent_id, status)
```

---

# 29. ERD Planning

ERD should be divided into diagrams:

```text
01 Identity ERD
02 Branch ERD
03 Customer & CRM ERD
04 Menu & Order ERD
05 Payment ERD
06 Kitchen & Delivery ERD
07 Inventory ERD
08 Procurement ERD
09 Warehouse ERD
10 HR ERD
11 Finance ERD
12 AI Platform ERD
13 Audit & Security ERD
```

---

# 30. Implementation Notes

When implementing in Prisma:

- Use explicit relation names where needed.
- Use enums for statuses.
- Use Decimal for money.
- Use Json for configuration.
- Add indexes on all FK columns.
- Avoid cascade delete on financial and order records.
- Use soft delete for business entities.
- Use migrations for every schema change.

---

# 31. Related Documents

- DATABASE_ARCHITECTURE.md
- DATABASE_SCHEMA.md
- DOMAIN_DRIVEN_DESIGN.md
- API_ARCHITECTURE.md
- SECURITY_REQUIREMENTS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai