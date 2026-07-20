# 📚 DATABASE NAMING CONVENTIONS

> Official naming standards for the Telepizza Platform PostgreSQL database.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Database |
| Document | DATABASE_NAMING_CONVENTIONS.md |
| Version | 1.0.0 |
| Status | Final |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines naming conventions used across the Telepizza Platform database.

The goal is to ensure:

- Consistency
- Readability
- Maintainability
- Scalability
- AI-friendly schema generation

---

# 2. General Rules

Always use:

- lowercase
- snake_case
- plural table names
- singular enum values
- descriptive names

Example

✅ customers

❌ Customers

❌ customer

❌ tblCustomer

---

# 3. Table Naming

Format

```text
plural_snake_case
```

Examples

```text
customers

customer_addresses

orders

order_items

inventory_items

payment_transactions

notification_templates

audit_logs
```

Avoid

```text
Customer

tblCustomer

customerTable

cust
```

---

# 4. Column Naming

Format

```text
snake_case
```

Examples

```text
customer_id

branch_id

created_at

updated_at

payment_status

delivery_fee
```

Avoid

```text
CustomerID

BranchId

CreatedDate

paymentStatus
```

---

# 5. Primary Keys

Every table uses

```sql
id UUID PRIMARY KEY
```

Never use

```text
customer_id

order_id

employee_id
```

as the table primary key.

Use only

```text
id
```

---

# 6. Foreign Keys

Always

```text
table_singular_id
```

Examples

```text
customer_id

branch_id

order_id

payment_id

inventory_item_id

warehouse_id

employee_id
```

---

# 7. Timestamp Columns

Use

```text
created_at

updated_at

deleted_at
```

Avoid

```text
create_date

last_update

timestamp
```

---

# 8. Boolean Columns

Prefix

```text
is_

has_

can_
```

Examples

```text
is_active

is_deleted

is_available

has_discount

can_deliver

is_default
```

---

# 9. Status Columns

Use

```text
status
```

Examples

```text
status

payment_status

delivery_status

approval_status
```

Do not use

```text
state

current_status

status_value
```

---

# 10. Date Columns

Examples

```text
order_date

invoice_date

joining_date

expiry_date

delivery_date
```

---

# 11. Time Columns

Examples

```text
start_time

end_time

check_in

check_out
```

---

# 12. Money Columns

Always use Decimal.

Examples

```text
subtotal

discount_amount

tax_amount

delivery_fee

total_amount

unit_price

purchase_price

average_cost

net_salary
```

---

# 13. Quantity Columns

Examples

```text
quantity

current_stock

minimum_stock

maximum_stock

received_quantity

rejected_quantity
```

---

# 14. Code Columns

Use

```text
*_code
```

Examples

```text
branch_code

employee_code

product_code

supplier_code

account_code
```

---

# 15. Number Columns

Use

```text
*_number
```

Examples

```text
order_number

invoice_number

batch_number

tracking_number

card_number
```

---

# 16. URL Columns

Use

```text
*_url
```

Examples

```text
image_url

logo_url

file_url

document_url
```

---

# 17. JSON Columns

Use

```text
configuration

settings

metadata

permissions

snapshot_data
```

Stored as JSONB.

---

# 18. Enum Naming

Enum Types

Use

```text
PascalCase
```

Examples

```text
OrderStatus

PaymentStatus

DeliveryStatus

UserType

EmploymentType
```

Values

Use

```text
Pending

Completed

Cancelled

Active

Inactive
```

---

# 19. Junction Tables

Use

```text
table_table
```

Examples

```text
user_roles

role_permissions

product_addon_links

customer_segment_members

campaign_recipients

franchise_branches
```

---

# 20. Index Naming

Format

```text
idx_table_column
```

Examples

```text
idx_orders_customer_id

idx_orders_branch_id

idx_products_slug

idx_customers_phone
```

Composite

```text
idx_orders_branch_status

idx_inventory_branch_stock
```

---

# 21. Unique Index Naming

Format

```text
uq_table_column
```

Examples

```text
uq_users_email

uq_users_phone

uq_orders_order_number

uq_branches_branch_code
```

---

# 22. Foreign Key Naming

Format

```text
fk_child_parent
```

Examples

```text
fk_orders_customers

fk_orders_branches

fk_order_items_orders

fk_inventory_branches
```

---

# 23. Primary Key Naming

Format

```text
pk_table
```

Examples

```text
pk_orders

pk_customers

pk_products
```

---

# 24. Constraint Naming

Check Constraint

```text
chk_table_name
```

Examples

```text
chk_orders_total

chk_products_price
```

Default Constraint

```text
df_table_column
```

---

# 25. Sequence Naming

If sequences are required

```text
seq_orders

seq_customers

seq_payments
```

---

# 26. Trigger Naming

Format

```text
trg_table_event
```

Examples

```text
trg_orders_insert

trg_orders_update

trg_inventory_update
```

---

# 27. Function Naming

Format

```text
fn_action_object
```

Examples

```text
fn_calculate_order_total

fn_update_inventory

fn_generate_invoice
```

---

# 28. View Naming

Format

```text
vw_name
```

Examples

```text
vw_sales_summary

vw_branch_performance

vw_inventory_status
```

---

# 29. Materialized View Naming

Format

```text
mv_name
```

Examples

```text
mv_daily_sales

mv_monthly_revenue

mv_ai_usage
```

---

# 30. Stored Procedure Naming

Format

```text
sp_action
```

Examples

```text
sp_close_shift

sp_generate_payroll

sp_archive_orders
```

---

# 31. File Naming

Database files

```text
schema.prisma

seed.ts

enums.ts

constants.ts

indexes.sql

constraints.sql

views.sql

functions.sql

triggers.sql
```

---

# 32. Migration Naming

Use descriptive names.

Examples

```text
20260707_initial_schema

20260710_add_loyalty_tables

20260715_inventory_improvements

20260718_ai_platform
```

---

# 33. Documentation Naming

Examples

```text
DATABASE_SCHEMA.md

DATABASE_ARCHITECTURE.md

DATABASE_RELATIONSHIPS.md

DATABASE_INDEX_STRATEGY.md

DATABASE_NAMING_CONVENTIONS.md
```

---

# 34. AI Platform Naming

Tables

```text
ai_agents

ai_tasks

ai_workflows

ai_memory

ai_usage_logs
```

Columns

```text
agent_id

workflow_id

model_id

prompt_version

estimated_cost
```

---

# 35. Reserved Words

Avoid using SQL reserved keywords as table or column names.

Avoid names such as:

```text
user
order
group
select
table
index
key
```

Prefer:

```text
users
orders
user_account
order_record
```

---

# 36. Examples

Good

```text
orders

order_items

customer_addresses

payment_transactions

inventory_items

audit_logs
```

Bad

```text
Order

ORDER

tblOrders

CustomerData

ProductsTable

inv
```

---

# 37. Naming Checklist

Before creating a new database object verify:

- Uses lowercase
- Uses snake_case
- Uses descriptive names
- Uses plural table names
- Uses UUID id
- Uses *_id for foreign keys
- Uses *_code for business codes
- Uses *_number for document numbers
- Uses *_url for URLs
- Follows index naming rules
- Avoids SQL reserved words

---

# 38. Related Documents

- DATABASE_ARCHITECTURE.md
- DATABASE_SCHEMA.md
- DATABASE_RELATIONSHIPS.md
- DATABASE_INDEX_STRATEGY.md
- schema.prisma

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai