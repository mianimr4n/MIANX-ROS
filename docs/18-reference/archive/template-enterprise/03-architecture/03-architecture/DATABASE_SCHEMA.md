# 🗄️ DATABASE SCHEMA

> Official database schema for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Architecture |
| Document | DATABASE_SCHEMA.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the database tables, relationships, and domain ownership for the Telepizza Platform.

The schema supports:

- Multi-branch restaurant operations
- Website ordering
- Mobile app ordering
- POS
- Kitchen dashboard
- Rider app
- Inventory
- CRM
- HR
- Finance
- AI platform
- Reporting
- Audit logs

---

# 2. Database Engine

Primary Database:

```text
PostgreSQL
```

ORM:

```text
Prisma ORM
```

Primary key strategy:

```text
UUID
```

---

# 3. Schema Domains

```text
01 Identity & Access
02 Branch Management
03 Customers & CRM
04 Menu & Products
05 Orders
06 Payments
07 Kitchen
08 Delivery
09 Inventory
10 Procurement
11 Warehouse
12 HR
13 Finance
14 Reporting
15 AI Platform
16 Notifications
17 Settings
18 Audit & Security
```

---

# 4. Common Columns

Most business tables should include:

```sql
id UUID PRIMARY KEY
created_at TIMESTAMP NOT NULL DEFAULT NOW()
updated_at TIMESTAMP NOT NULL DEFAULT NOW()
created_by UUID NULL
updated_by UUID NULL
deleted_at TIMESTAMP NULL
is_active BOOLEAN NOT NULL DEFAULT TRUE
```

---

# 5. Identity & Access Tables

## users

Stores platform users.

```sql
users
- id UUID PRIMARY KEY
- full_name VARCHAR(150)
- email VARCHAR(150) UNIQUE
- phone VARCHAR(30) UNIQUE
- password_hash TEXT
- user_type VARCHAR(50)
- status VARCHAR(50)
- last_login_at TIMESTAMP
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## roles

```sql
roles
- id UUID PRIMARY KEY
- name VARCHAR(100)
- code VARCHAR(100) UNIQUE
- description TEXT
- is_system_role BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## permissions

```sql
permissions
- id UUID PRIMARY KEY
- module VARCHAR(100)
- action VARCHAR(100)
- code VARCHAR(150) UNIQUE
- description TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## user_roles

```sql
user_roles
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- role_id UUID REFERENCES roles(id)
- branch_id UUID NULL
- created_at TIMESTAMP
```

---

## role_permissions

```sql
role_permissions
- id UUID PRIMARY KEY
- role_id UUID REFERENCES roles(id)
- permission_id UUID REFERENCES permissions(id)
- created_at TIMESTAMP
```

---

## user_sessions

```sql
user_sessions
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- device_name VARCHAR(150)
- ip_address VARCHAR(100)
- user_agent TEXT
- started_at TIMESTAMP
- expires_at TIMESTAMP
- revoked_at TIMESTAMP NULL
```

---

# 6. Branch Management Tables

## branches

```sql
branches
- id UUID PRIMARY KEY
- branch_code VARCHAR(50) UNIQUE
- name VARCHAR(150)
- city VARCHAR(100)
- area VARCHAR(150)
- address TEXT
- phone VARCHAR(30)
- email VARCHAR(150)
- latitude DECIMAL(10,8)
- longitude DECIMAL(11,8)
- status VARCHAR(50)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## branch_settings

```sql
branch_settings
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- opening_time TIME
- closing_time TIME
- delivery_radius_km DECIMAL(8,2)
- minimum_order_amount DECIMAL(12,2)
- delivery_fee DECIMAL(12,2)
- currency VARCHAR(10)
- timezone VARCHAR(100)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## delivery_zones

```sql
delivery_zones
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- zone_name VARCHAR(150)
- area_name VARCHAR(150)
- delivery_fee DECIMAL(12,2)
- estimated_time_minutes INT
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

# 7. Customer & CRM Tables

## customers

```sql
customers
- id UUID PRIMARY KEY
- user_id UUID NULL REFERENCES users(id)
- full_name VARCHAR(150)
- phone VARCHAR(30)
- email VARCHAR(150)
- date_of_birth DATE
- gender VARCHAR(30)
- status VARCHAR(50)
- marketing_consent BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## customer_addresses

```sql
customer_addresses
- id UUID PRIMARY KEY
- customer_id UUID REFERENCES customers(id)
- label VARCHAR(100)
- address_line TEXT
- city VARCHAR(100)
- area VARCHAR(150)
- latitude DECIMAL(10,8)
- longitude DECIMAL(11,8)
- is_default BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## customer_segments

```sql
customer_segments
- id UUID PRIMARY KEY
- name VARCHAR(100)
- code VARCHAR(100)
- description TEXT
- rules JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## customer_segment_members

```sql
customer_segment_members
- id UUID PRIMARY KEY
- customer_id UUID REFERENCES customers(id)
- segment_id UUID REFERENCES customer_segments(id)
- assigned_at TIMESTAMP
```

---

# 8. Menu & Product Tables

## categories

```sql
categories
- id UUID PRIMARY KEY
- name VARCHAR(150)
- slug VARCHAR(150) UNIQUE
- description TEXT
- image_url TEXT
- sort_order INT
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## products

```sql
products
- id UUID PRIMARY KEY
- category_id UUID REFERENCES categories(id)
- name VARCHAR(150)
- slug VARCHAR(150) UNIQUE
- description TEXT
- base_price DECIMAL(12,2)
- sale_price DECIMAL(12,2) NULL
- image_url TEXT
- product_type VARCHAR(50)
- is_available BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## product_variants

```sql
product_variants
- id UUID PRIMARY KEY
- product_id UUID REFERENCES products(id)
- variant_name VARCHAR(100)
- size VARCHAR(50)
- price DECIMAL(12,2)
- is_available BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## product_addons

```sql
product_addons
- id UUID PRIMARY KEY
- name VARCHAR(150)
- description TEXT
- price DECIMAL(12,2)
- is_available BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## product_addon_links

```sql
product_addon_links
- id UUID PRIMARY KEY
- product_id UUID REFERENCES products(id)
- addon_id UUID REFERENCES product_addons(id)
- created_at TIMESTAMP
```

---

# 9. Order Tables

## carts

```sql
carts
- id UUID PRIMARY KEY
- customer_id UUID NULL REFERENCES customers(id)
- branch_id UUID NULL REFERENCES branches(id)
- session_id VARCHAR(150)
- status VARCHAR(50)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## cart_items

```sql
cart_items
- id UUID PRIMARY KEY
- cart_id UUID REFERENCES carts(id)
- product_id UUID REFERENCES products(id)
- variant_id UUID NULL REFERENCES product_variants(id)
- quantity INT
- unit_price DECIMAL(12,2)
- total_price DECIMAL(12,2)
- instructions TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## orders

```sql
orders
- id UUID PRIMARY KEY
- order_number VARCHAR(100) UNIQUE
- customer_id UUID NULL REFERENCES customers(id)
- branch_id UUID REFERENCES branches(id)
- order_type VARCHAR(50)
- order_source VARCHAR(50)
- status VARCHAR(50)
- subtotal DECIMAL(12,2)
- discount_amount DECIMAL(12,2)
- tax_amount DECIMAL(12,2)
- delivery_fee DECIMAL(12,2)
- total_amount DECIMAL(12,2)
- payment_status VARCHAR(50)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## order_items

```sql
order_items
- id UUID PRIMARY KEY
- order_id UUID REFERENCES orders(id)
- product_id UUID REFERENCES products(id)
- variant_id UUID NULL REFERENCES product_variants(id)
- product_name VARCHAR(150)
- quantity INT
- unit_price DECIMAL(12,2)
- total_price DECIMAL(12,2)
- instructions TEXT
- created_at TIMESTAMP
```

---

## order_status_logs

```sql
order_status_logs
- id UUID PRIMARY KEY
- order_id UUID REFERENCES orders(id)
- previous_status VARCHAR(50)
- new_status VARCHAR(50)
- changed_by UUID NULL REFERENCES users(id)
- reason TEXT
- created_at TIMESTAMP
```

---

# 10. Payment Tables

## payment_providers

```sql
payment_providers
- id UUID PRIMARY KEY
- name VARCHAR(100)
- code VARCHAR(100) UNIQUE
- provider_type VARCHAR(50)
- is_active BOOLEAN
- settings JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## payment_transactions

```sql
payment_transactions
- id UUID PRIMARY KEY
- order_id UUID REFERENCES orders(id)
- provider_id UUID NULL REFERENCES payment_providers(id)
- payment_method VARCHAR(50)
- transaction_reference VARCHAR(150)
- amount DECIMAL(12,2)
- status VARCHAR(50)
- paid_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## payment_refunds

```sql
payment_refunds
- id UUID PRIMARY KEY
- payment_transaction_id UUID REFERENCES payment_transactions(id)
- order_id UUID REFERENCES orders(id)
- amount DECIMAL(12,2)
- reason TEXT
- status VARCHAR(50)
- approved_by UUID NULL REFERENCES users(id)
- refunded_at TIMESTAMP NULL
- created_at TIMESTAMP
```

---

# 11. Kitchen Tables

## kitchen_orders

```sql
kitchen_orders
- id UUID PRIMARY KEY
- order_id UUID REFERENCES orders(id)
- branch_id UUID REFERENCES branches(id)
- status VARCHAR(50)
- priority VARCHAR(50)
- started_at TIMESTAMP NULL
- ready_at TIMESTAMP NULL
- completed_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## kitchen_stations

```sql
kitchen_stations
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- name VARCHAR(100)
- station_type VARCHAR(50)
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

# 12. Delivery Tables

## riders

```sql
riders
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- branch_id UUID REFERENCES branches(id)
- full_name VARCHAR(150)
- phone VARCHAR(30)
- vehicle_type VARCHAR(50)
- vehicle_number VARCHAR(100)
- status VARCHAR(50)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## deliveries

```sql
deliveries
- id UUID PRIMARY KEY
- order_id UUID REFERENCES orders(id)
- rider_id UUID NULL REFERENCES riders(id)
- branch_id UUID REFERENCES branches(id)
- delivery_address TEXT
- latitude DECIMAL(10,8)
- longitude DECIMAL(11,8)
- status VARCHAR(50)
- assigned_at TIMESTAMP NULL
- picked_up_at TIMESTAMP NULL
- delivered_at TIMESTAMP NULL
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

# 13. Next Part

Part 2 should include:

- Inventory tables
- Supplier tables
- Purchase tables
- Warehouse tables
- Loyalty tables
- HR tables
- Finance tables
- Reporting tables
- AI tables
- Notification tables
- Settings tables
- Audit tables

---

# 14. Inventory Tables

## inventory_categories

```sql
inventory_categories
- id UUID PRIMARY KEY
- name VARCHAR(150)
- description TEXT
- parent_id UUID NULL REFERENCES inventory_categories(id)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## inventory_units

```sql
inventory_units
- id UUID PRIMARY KEY
- name VARCHAR(100)
- short_name VARCHAR(20)
- created_at TIMESTAMP
```

Examples

- KG
- Gram
- Litre
- ml
- Piece
- Box

---

## inventory_items

```sql
inventory_items
- id UUID PRIMARY KEY
- category_id UUID REFERENCES inventory_categories(id)
- branch_id UUID REFERENCES branches(id)
- unit_id UUID REFERENCES inventory_units(id)
- sku VARCHAR(100)
- item_name VARCHAR(150)
- minimum_stock DECIMAL(12,2)
- reorder_level DECIMAL(12,2)
- current_stock DECIMAL(12,2)
- average_cost DECIMAL(12,2)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## inventory_batches

```sql
inventory_batches
- id UUID PRIMARY KEY
- inventory_item_id UUID REFERENCES inventory_items(id)
- batch_number VARCHAR(100)
- expiry_date DATE
- quantity DECIMAL(12,2)
- purchase_price DECIMAL(12,2)
- created_at TIMESTAMP
```

---

## recipes

```sql
recipes
- id UUID PRIMARY KEY
- product_id UUID REFERENCES products(id)
- version INT
- preparation_time INT
- created_at TIMESTAMP
```

---

## recipe_items

```sql
recipe_items
- id UUID PRIMARY KEY
- recipe_id UUID REFERENCES recipes(id)
- inventory_item_id UUID REFERENCES inventory_items(id)
- quantity DECIMAL(12,2)
- unit_id UUID REFERENCES inventory_units(id)
```

---

## stock_movements

```sql
stock_movements
- id UUID PRIMARY KEY
- inventory_item_id UUID REFERENCES inventory_items(id)
- branch_id UUID REFERENCES branches(id)
- movement_type VARCHAR(50)
- quantity DECIMAL(12,2)
- reference_type VARCHAR(100)
- reference_id UUID
- remarks TEXT
- created_by UUID REFERENCES users(id)
- created_at TIMESTAMP
```

Movement Types

- Purchase
- Sale
- Transfer
- Waste
- Adjustment
- Production

---

## stock_adjustments

```sql
stock_adjustments
- id UUID PRIMARY KEY
- inventory_item_id UUID
- old_quantity DECIMAL(12,2)
- new_quantity DECIMAL(12,2)
- adjustment_reason TEXT
- approved_by UUID
- created_at TIMESTAMP
```

---

## stock_counts

```sql
stock_counts
- id UUID PRIMARY KEY
- branch_id UUID
- inventory_item_id UUID
- system_quantity DECIMAL(12,2)
- physical_quantity DECIMAL(12,2)
- variance DECIMAL(12,2)
- counted_by UUID
- counted_at TIMESTAMP
```

---

## stock_waste

```sql
stock_waste
- id UUID PRIMARY KEY
- inventory_item_id UUID
- quantity DECIMAL(12,2)
- reason VARCHAR(200)
- approved_by UUID
- created_at TIMESTAMP
```

---

# 15. Supplier Tables

## suppliers

```sql
suppliers
- id UUID PRIMARY KEY
- supplier_code VARCHAR(50)
- company_name VARCHAR(200)
- contact_person VARCHAR(150)
- phone VARCHAR(30)
- email VARCHAR(150)
- address TEXT
- city VARCHAR(100)
- status VARCHAR(50)
- created_at TIMESTAMP
```

---

## supplier_contacts

```sql
supplier_contacts
- id UUID PRIMARY KEY
- supplier_id UUID REFERENCES suppliers(id)
- full_name VARCHAR(150)
- designation VARCHAR(100)
- phone VARCHAR(30)
- email VARCHAR(150)
```

---

## supplier_products

```sql
supplier_products
- id UUID PRIMARY KEY
- supplier_id UUID REFERENCES suppliers(id)
- inventory_item_id UUID REFERENCES inventory_items(id)
- supplier_sku VARCHAR(100)
- unit_price DECIMAL(12,2)
- lead_time_days INT
```

---

## supplier_ratings

```sql
supplier_ratings
- id UUID PRIMARY KEY
- supplier_id UUID
- quality_score DECIMAL(5,2)
- delivery_score DECIMAL(5,2)
- pricing_score DECIMAL(5,2)
- overall_score DECIMAL(5,2)
```

---

## supplier_returns

```sql
supplier_returns
- id UUID PRIMARY KEY
- supplier_id UUID
- purchase_order_id UUID
- reason TEXT
- status VARCHAR(50)
- created_at TIMESTAMP
```

---

# 16. Purchase Tables

## purchase_requests

```sql
purchase_requests
- id UUID PRIMARY KEY
- request_number VARCHAR(100)
- branch_id UUID
- requested_by UUID
- status VARCHAR(50)
- required_date DATE
- remarks TEXT
- created_at TIMESTAMP
```

---

## purchase_request_items

```sql
purchase_request_items
- id UUID PRIMARY KEY
- purchase_request_id UUID
- inventory_item_id UUID
- quantity DECIMAL(12,2)
```

---

## purchase_orders

```sql
purchase_orders
- id UUID PRIMARY KEY
- po_number VARCHAR(100)
- supplier_id UUID
- branch_id UUID
- status VARCHAR(50)
- subtotal DECIMAL(12,2)
- tax DECIMAL(12,2)
- total DECIMAL(12,2)
- expected_delivery DATE
- created_at TIMESTAMP
```

---

## purchase_order_items

```sql
purchase_order_items
- id UUID PRIMARY KEY
- purchase_order_id UUID
- inventory_item_id UUID
- quantity DECIMAL(12,2)
- unit_price DECIMAL(12,2)
- total_price DECIMAL(12,2)
```

---

## purchase_approvals

```sql
purchase_approvals
- id UUID PRIMARY KEY
- purchase_order_id UUID
- approved_by UUID
- approval_level VARCHAR(50)
- approved_at TIMESTAMP
```

---

## purchase_invoices

```sql
purchase_invoices
- id UUID PRIMARY KEY
- purchase_order_id UUID
- supplier_invoice_number VARCHAR(100)
- invoice_date DATE
- total_amount DECIMAL(12,2)
- payment_status VARCHAR(50)
```

---

# 17. Warehouse Tables

## warehouses

```sql
warehouses
- id UUID PRIMARY KEY
- warehouse_code VARCHAR(100)
- warehouse_name VARCHAR(150)
- branch_id UUID
- address TEXT
- manager_id UUID
```

---

## warehouse_locations

```sql
warehouse_locations
- id UUID PRIMARY KEY
- warehouse_id UUID
- location_code VARCHAR(50)
- description TEXT
```

---

## goods_receiving

```sql
goods_receiving
- id UUID PRIMARY KEY
- grn_number VARCHAR(100)
- purchase_order_id UUID
- warehouse_id UUID
- received_by UUID
- received_at TIMESTAMP
```

---

## goods_receiving_items

```sql
goods_receiving_items
- id UUID PRIMARY KEY
- goods_receiving_id UUID
- inventory_item_id UUID
- quantity_received DECIMAL(12,2)
- accepted_quantity DECIMAL(12,2)
- rejected_quantity DECIMAL(12,2)
```

---

## stock_transfers

```sql
stock_transfers
- id UUID PRIMARY KEY
- transfer_number VARCHAR(100)
- from_branch_id UUID
- to_branch_id UUID
- status VARCHAR(50)
- created_by UUID
- created_at TIMESTAMP
```

---

## stock_transfer_items

```sql
stock_transfer_items
- id UUID PRIMARY KEY
- stock_transfer_id UUID
- inventory_item_id UUID
- quantity DECIMAL(12,2)
```

---

# 18. Loyalty Tables

## loyalty_accounts

```sql
loyalty_accounts
- id UUID PRIMARY KEY
- customer_id UUID
- points_balance DECIMAL(12,2)
- tier VARCHAR(50)
- joined_at TIMESTAMP
```

---

## loyalty_transactions

```sql
loyalty_transactions
- id UUID PRIMARY KEY
- loyalty_account_id UUID
- order_id UUID
- transaction_type VARCHAR(50)
- points DECIMAL(12,2)
- created_at TIMESTAMP
```

---

## reward_catalog

```sql
reward_catalog
- id UUID PRIMARY KEY
- reward_name VARCHAR(150)
- points_required DECIMAL(12,2)
- description TEXT
- is_active BOOLEAN
```

---

## reward_redemptions

```sql
reward_redemptions
- id UUID PRIMARY KEY
- reward_id UUID
- loyalty_account_id UUID
- redeemed_at TIMESTAMP
```

---

## gift_cards

```sql
gift_cards
- id UUID PRIMARY KEY
- card_number VARCHAR(100)
- balance DECIMAL(12,2)
- expiry_date DATE
- status VARCHAR(50)
```

---

# 19. Human Resources (HR) Tables

## departments

```sql
departments
- id UUID PRIMARY KEY
- department_code VARCHAR(50) UNIQUE
- department_name VARCHAR(150)
- description TEXT
- manager_id UUID NULL REFERENCES users(id)
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## designations

```sql
designations
- id UUID PRIMARY KEY
- designation_name VARCHAR(150)
- department_id UUID REFERENCES departments(id)
- description TEXT
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## employees

```sql
employees
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- employee_code VARCHAR(100) UNIQUE
- branch_id UUID REFERENCES branches(id)
- department_id UUID REFERENCES departments(id)
- designation_id UUID REFERENCES designations(id)
- joining_date DATE
- employment_type VARCHAR(50)
- basic_salary DECIMAL(12,2)
- status VARCHAR(50)
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## employee_documents

```sql
employee_documents
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- document_type VARCHAR(100)
- document_number VARCHAR(150)
- file_url TEXT
- expiry_date DATE NULL
- created_at TIMESTAMP
```

---

## employee_shifts

```sql
employee_shifts
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- branch_id UUID REFERENCES branches(id)
- shift_date DATE
- start_time TIME
- end_time TIME
- created_at TIMESTAMP
```

---

## attendance

```sql
attendance
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- attendance_date DATE
- check_in TIMESTAMP
- check_out TIMESTAMP
- status VARCHAR(50)
- working_hours DECIMAL(5,2)
```

---

## leave_types

```sql
leave_types
- id UUID PRIMARY KEY
- leave_name VARCHAR(100)
- annual_quota INT
- is_paid BOOLEAN
```

---

## leave_requests

```sql
leave_requests
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- leave_type_id UUID REFERENCES leave_types(id)
- start_date DATE
- end_date DATE
- reason TEXT
- status VARCHAR(50)
- approved_by UUID NULL REFERENCES users(id)
```

---

## payroll

```sql
payroll
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- payroll_month DATE
- gross_salary DECIMAL(12,2)
- deductions DECIMAL(12,2)
- net_salary DECIMAL(12,2)
- payment_status VARCHAR(50)
```

---

## performance_reviews

```sql
performance_reviews
- id UUID PRIMARY KEY
- employee_id UUID REFERENCES employees(id)
- reviewer_id UUID REFERENCES users(id)
- review_period VARCHAR(50)
- performance_score DECIMAL(5,2)
- remarks TEXT
- created_at TIMESTAMP
```

---

## training_programs

```sql
training_programs
- id UUID PRIMARY KEY
- title VARCHAR(200)
- description TEXT
- trainer_name VARCHAR(150)
- training_date DATE
- created_at TIMESTAMP
```

---

## recruitment

```sql
recruitment
- id UUID PRIMARY KEY
- position VARCHAR(150)
- department_id UUID REFERENCES departments(id)
- candidate_name VARCHAR(150)
- phone VARCHAR(30)
- interview_date DATE
- status VARCHAR(50)
```

---

# 20. Finance Tables

## chart_of_accounts

```sql
chart_of_accounts
- id UUID PRIMARY KEY
- account_code VARCHAR(50)
- account_name VARCHAR(150)
- account_type VARCHAR(50)
- parent_account_id UUID NULL
```

---

## journal_entries

```sql
journal_entries
- id UUID PRIMARY KEY
- journal_number VARCHAR(100)
- entry_date DATE
- description TEXT
- created_by UUID REFERENCES users(id)
```

---

## journal_entry_lines

```sql
journal_entry_lines
- id UUID PRIMARY KEY
- journal_entry_id UUID REFERENCES journal_entries(id)
- account_id UUID REFERENCES chart_of_accounts(id)
- debit DECIMAL(12,2)
- credit DECIMAL(12,2)
```

---

## bank_accounts

```sql
bank_accounts
- id UUID PRIMARY KEY
- bank_name VARCHAR(150)
- account_title VARCHAR(150)
- account_number VARCHAR(100)
- iban VARCHAR(100)
- branch_name VARCHAR(150)
```

---

## cash_drawers

```sql
cash_drawers
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- opening_balance DECIMAL(12,2)
- closing_balance DECIMAL(12,2)
- business_date DATE
```

---

## expense_categories

```sql
expense_categories
- id UUID PRIMARY KEY
- category_name VARCHAR(150)
- description TEXT
```

---

## expenses

```sql
expenses
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- category_id UUID REFERENCES expense_categories(id)
- amount DECIMAL(12,2)
- expense_date DATE
- description TEXT
- approved_by UUID NULL REFERENCES users(id)
```

---

## budgets

```sql
budgets
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- budget_year INT
- total_budget DECIMAL(12,2)
```

---

## budget_items

```sql
budget_items
- id UUID PRIMARY KEY
- budget_id UUID REFERENCES budgets(id)
- account_id UUID REFERENCES chart_of_accounts(id)
- allocated_amount DECIMAL(12,2)
```

---

## taxes

```sql
taxes
- id UUID PRIMARY KEY
- tax_name VARCHAR(100)
- tax_percentage DECIMAL(5,2)
- is_default BOOLEAN
```

---

## customer_invoices

```sql
customer_invoices
- id UUID PRIMARY KEY
- invoice_number VARCHAR(100)
- order_id UUID REFERENCES orders(id)
- customer_id UUID REFERENCES customers(id)
- total_amount DECIMAL(12,2)
- status VARCHAR(50)
```

---

## financial_years

```sql
financial_years
- id UUID PRIMARY KEY
- year_name VARCHAR(50)
- start_date DATE
- end_date DATE
- is_closed BOOLEAN
```

---

# 21. Reporting Tables

## reports

```sql
reports
- id UUID PRIMARY KEY
- report_name VARCHAR(150)
- report_code VARCHAR(100)
- report_category VARCHAR(100)
- created_at TIMESTAMP
```

---

## report_templates

```sql
report_templates
- id UUID PRIMARY KEY
- report_id UUID REFERENCES reports(id)
- template_name VARCHAR(150)
- configuration JSONB
```

---

## report_schedules

```sql
report_schedules
- id UUID PRIMARY KEY
- report_id UUID REFERENCES reports(id)
- frequency VARCHAR(50)
- next_run TIMESTAMP
```

---

## dashboard_widgets

```sql
dashboard_widgets
- id UUID PRIMARY KEY
- widget_name VARCHAR(150)
- widget_type VARCHAR(100)
- configuration JSONB
```

---

## analytics_snapshots

```sql
analytics_snapshots
- id UUID PRIMARY KEY
- snapshot_date DATE
- branch_id UUID REFERENCES branches(id)
- snapshot_data JSONB
```

---

## kpi_definitions

```sql
kpi_definitions
- id UUID PRIMARY KEY
- kpi_name VARCHAR(150)
- formula TEXT
- target_value DECIMAL(12,2)
```

---

## saved_reports

```sql
saved_reports
- id UUID PRIMARY KEY
- report_id UUID REFERENCES reports(id)
- user_id UUID REFERENCES users(id)
- report_name VARCHAR(150)
```

---

# 22. Notification Tables

## notification_channels

```sql
notification_channels
- id UUID PRIMARY KEY
- channel_name VARCHAR(100)
- provider_name VARCHAR(100)
- is_active BOOLEAN
```

---

## notification_templates

```sql
notification_templates
- id UUID PRIMARY KEY
- channel_id UUID REFERENCES notification_channels(id)
- template_name VARCHAR(150)
- subject VARCHAR(200)
- body TEXT
```

---

## notifications

```sql
notifications
- id UUID PRIMARY KEY
- user_id UUID NULL REFERENCES users(id)
- customer_id UUID NULL REFERENCES customers(id)
- channel_id UUID REFERENCES notification_channels(id)
- template_id UUID NULL REFERENCES notification_templates(id)
- title VARCHAR(200)
- message TEXT
- status VARCHAR(50)
- scheduled_at TIMESTAMP NULL
- sent_at TIMESTAMP NULL
```

---

## notification_queue

```sql
notification_queue
- id UUID PRIMARY KEY
- notification_id UUID REFERENCES notifications(id)
- priority VARCHAR(50)
- retry_count INT
- next_retry_at TIMESTAMP
```

---

## notification_history

```sql
notification_history
- id UUID PRIMARY KEY
- notification_id UUID REFERENCES notifications(id)
- delivery_status VARCHAR(50)
- provider_response TEXT
- delivered_at TIMESTAMP NULL
```

---

## notification_preferences

```sql
notification_preferences
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- email_enabled BOOLEAN
- sms_enabled BOOLEAN
- push_enabled BOOLEAN
- whatsapp_enabled BOOLEAN
```

---

## marketing_campaigns

```sql
marketing_campaigns
- id UUID PRIMARY KEY
- campaign_name VARCHAR(150)
- campaign_type VARCHAR(100)
- start_date DATE
- end_date DATE
- budget DECIMAL(12,2)
- status VARCHAR(50)
```

---

## campaign_recipients

```sql
campaign_recipients
- id UUID PRIMARY KEY
- campaign_id UUID REFERENCES marketing_campaigns(id)
- customer_id UUID REFERENCES customers(id)
- delivery_status VARCHAR(50)
```

---

# Part 3 Complete

Approximate Tables Added

- HR → 12
- Finance → 12
- Reporting → 7
- Notifications → 8

Total Added ≈ 39 Enterprise Tables

Overall Database Progress ≈ 100+ Enterprise Tables

---

# 23. AI Platform Tables

## ai_teams

```sql
ai_teams
- id UUID PRIMARY KEY
- team_name VARCHAR(150)
- description TEXT
- manager_agent_id UUID NULL
- is_active BOOLEAN
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## ai_agents

```sql
ai_agents
- id UUID PRIMARY KEY
- team_id UUID REFERENCES ai_teams(id)
- agent_name VARCHAR(150)
- agent_role VARCHAR(100)
- model_id UUID
- status VARCHAR(50)
- permission_scope JSONB
- configuration JSONB
- created_at TIMESTAMP
- updated_at TIMESTAMP
```

---

## ai_models

```sql
ai_models
- id UUID PRIMARY KEY
- provider VARCHAR(100)
- model_name VARCHAR(150)
- model_version VARCHAR(100)
- context_window INT
- supports_tools BOOLEAN
- supports_images BOOLEAN
- supports_reasoning BOOLEAN
- created_at TIMESTAMP
```

---

## ai_model_providers

```sql
ai_model_providers
- id UUID PRIMARY KEY
- provider_name VARCHAR(100)
- api_endpoint TEXT
- api_key_reference VARCHAR(255)
- status VARCHAR(50)
```

---

## ai_tasks

```sql
ai_tasks
- id UUID PRIMARY KEY
- agent_id UUID REFERENCES ai_agents(id)
- task_type VARCHAR(100)
- priority VARCHAR(50)
- status VARCHAR(50)
- assigned_by UUID REFERENCES users(id)
- started_at TIMESTAMP
- completed_at TIMESTAMP
```

---

## ai_task_history

```sql
ai_task_history
- id UUID PRIMARY KEY
- task_id UUID REFERENCES ai_tasks(id)
- previous_status VARCHAR(50)
- new_status VARCHAR(50)
- changed_at TIMESTAMP
```

---

## ai_workflows

```sql
ai_workflows
- id UUID PRIMARY KEY
- workflow_name VARCHAR(150)
- description TEXT
- is_active BOOLEAN
- created_at TIMESTAMP
```

---

## ai_workflow_steps

```sql
ai_workflow_steps
- id UUID PRIMARY KEY
- workflow_id UUID REFERENCES ai_workflows(id)
- step_order INT
- agent_id UUID REFERENCES ai_agents(id)
- action_name VARCHAR(150)
```

---

## ai_memory

```sql
ai_memory
- id UUID PRIMARY KEY
- agent_id UUID REFERENCES ai_agents(id)
- memory_type VARCHAR(100)
- content JSONB
- expires_at TIMESTAMP NULL
```

---

## ai_prompt_templates

```sql
ai_prompt_templates
- id UUID PRIMARY KEY
- template_name VARCHAR(150)
- category VARCHAR(100)
- prompt TEXT
- version VARCHAR(20)
```

---

## ai_prompt_versions

```sql
ai_prompt_versions
- id UUID PRIMARY KEY
- template_id UUID REFERENCES ai_prompt_templates(id)
- version VARCHAR(20)
- prompt TEXT
- created_at TIMESTAMP
```

---

## ai_usage_logs

```sql
ai_usage_logs
- id UUID PRIMARY KEY
- agent_id UUID REFERENCES ai_agents(id)
- model_id UUID REFERENCES ai_models(id)
- input_tokens INT
- output_tokens INT
- estimated_cost DECIMAL(12,4)
- execution_time_ms INT
- created_at TIMESTAMP
```

---

## ai_cost_tracking

```sql
ai_cost_tracking
- id UUID PRIMARY KEY
- usage_log_id UUID REFERENCES ai_usage_logs(id)
- billing_period DATE
- total_cost DECIMAL(12,4)
```

---

## ai_approvals

```sql
ai_approvals
- id UUID PRIMARY KEY
- task_id UUID REFERENCES ai_tasks(id)
- approved_by UUID REFERENCES users(id)
- approval_status VARCHAR(50)
- comments TEXT
- approved_at TIMESTAMP
```

---

# 24. Settings Tables

## company_settings

```sql
company_settings
- id UUID PRIMARY KEY
- company_name VARCHAR(200)
- logo_url TEXT
- currency VARCHAR(20)
- timezone VARCHAR(100)
- language VARCHAR(50)
```

---

## branch_settings

```sql
branch_settings
- id UUID PRIMARY KEY
- branch_id UUID REFERENCES branches(id)
- settings JSONB
- updated_at TIMESTAMP
```

---

## system_settings

```sql
system_settings
- id UUID PRIMARY KEY
- setting_key VARCHAR(150)
- setting_value TEXT
- category VARCHAR(100)
```

---

## feature_flags

```sql
feature_flags
- id UUID PRIMARY KEY
- feature_name VARCHAR(150)
- enabled BOOLEAN
- rollout_percentage INT
```

---

## email_settings

```sql
email_settings
- id UUID PRIMARY KEY
- smtp_host VARCHAR(150)
- smtp_port INT
- username VARCHAR(150)
- encrypted_password TEXT
```

---

## sms_settings

```sql
sms_settings
- id UUID PRIMARY KEY
- provider_name VARCHAR(100)
- api_key_reference VARCHAR(255)
```

---

## payment_settings

```sql
payment_settings
- id UUID PRIMARY KEY
- provider_id UUID REFERENCES payment_providers(id)
- configuration JSONB
```

---

## notification_settings

```sql
notification_settings
- id UUID PRIMARY KEY
- default_channel VARCHAR(50)
- retry_limit INT
```

---

## ai_settings

```sql
ai_settings
- id UUID PRIMARY KEY
- default_model UUID REFERENCES ai_models(id)
- approval_required BOOLEAN
```

---

# 25. Security Tables

## api_keys

```sql
api_keys
- id UUID PRIMARY KEY
- service_name VARCHAR(150)
- key_reference VARCHAR(255)
- expires_at TIMESTAMP
```

---

## oauth_clients

```sql
oauth_clients
- id UUID PRIMARY KEY
- client_name VARCHAR(150)
- client_id VARCHAR(255)
- redirect_uri TEXT
```

---

## trusted_devices

```sql
trusted_devices
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- device_name VARCHAR(150)
- fingerprint TEXT
- last_used TIMESTAMP
```

---

## mfa_codes

```sql
mfa_codes
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- secret_reference VARCHAR(255)
- enabled BOOLEAN
```

---

## login_attempts

```sql
login_attempts
- id UUID PRIMARY KEY
- user_id UUID NULL REFERENCES users(id)
- ip_address VARCHAR(100)
- status VARCHAR(50)
- attempted_at TIMESTAMP
```

---

## blocked_ips

```sql
blocked_ips
- id UUID PRIMARY KEY
- ip_address VARCHAR(100)
- reason TEXT
- blocked_until TIMESTAMP
```

---

# 26. Audit Tables

## audit_logs

```sql
audit_logs
- id UUID PRIMARY KEY
- user_id UUID NULL REFERENCES users(id)
- module VARCHAR(100)
- action VARCHAR(100)
- entity_name VARCHAR(100)
- entity_id UUID
- ip_address VARCHAR(100)
- created_at TIMESTAMP
```

---

## audit_log_details

```sql
audit_log_details
- id UUID PRIMARY KEY
- audit_log_id UUID REFERENCES audit_logs(id)
- field_name VARCHAR(150)
- old_value TEXT
- new_value TEXT
```

---

## login_history

```sql
login_history
- id UUID PRIMARY KEY
- user_id UUID REFERENCES users(id)
- login_time TIMESTAMP
- logout_time TIMESTAMP
- ip_address VARCHAR(100)
```

---

## approval_history

```sql
approval_history
- id UUID PRIMARY KEY
- module VARCHAR(100)
- reference_id UUID
- approved_by UUID
- approved_at TIMESTAMP
```

---

# 27. System Tables

## background_jobs

```sql
background_jobs
- id UUID PRIMARY KEY
- job_name VARCHAR(150)
- status VARCHAR(50)
- scheduled_at TIMESTAMP
- completed_at TIMESTAMP
```

---

## scheduled_tasks

```sql
scheduled_tasks
- id UUID PRIMARY KEY
- task_name VARCHAR(150)
- cron_expression VARCHAR(100)
- last_run TIMESTAMP
- next_run TIMESTAMP
```

---

## system_logs

```sql
system_logs
- id UUID PRIMARY KEY
- log_level VARCHAR(50)
- source VARCHAR(150)
- message TEXT
- created_at TIMESTAMP
```

---

## error_logs

```sql
error_logs
- id UUID PRIMARY KEY
- module VARCHAR(100)
- error_message TEXT
- stack_trace TEXT
- created_at TIMESTAMP
```

---

## health_checks

```sql
health_checks
- id UUID PRIMARY KEY
- service_name VARCHAR(150)
- status VARCHAR(50)
- checked_at TIMESTAMP
```

---

## webhooks

```sql
webhooks
- id UUID PRIMARY KEY
- webhook_name VARCHAR(150)
- endpoint TEXT
- secret_reference VARCHAR(255)
```

---

## webhook_logs

```sql
webhook_logs
- id UUID PRIMARY KEY
- webhook_id UUID REFERENCES webhooks(id)
- response_code INT
- executed_at TIMESTAMP
```

---

# 28. Franchise Tables

## franchises

```sql
franchises
- id UUID PRIMARY KEY
- franchise_name VARCHAR(200)
- owner_name VARCHAR(150)
- contact_number VARCHAR(30)
- status VARCHAR(50)
```

---

## franchise_branches

```sql
franchise_branches
- id UUID PRIMARY KEY
- franchise_id UUID REFERENCES franchises(id)
- branch_id UUID REFERENCES branches(id)
```

---

## franchise_contracts

```sql
franchise_contracts
- id UUID PRIMARY KEY
- franchise_id UUID REFERENCES franchises(id)
- contract_start DATE
- contract_end DATE
- royalty_percentage DECIMAL(5,2)
```

---

# 29. Database Summary

Approximate Database Size

Identity & Security ............. 25+

Branch Management ............... 10+

Customer & CRM ................. 10+

Menu & Products ................ 12+

Orders ......................... 15+

Payments ....................... 10+

Kitchen ........................ 6+

Delivery ....................... 6+

Inventory ...................... 15+

Suppliers ...................... 8+

Purchasing ..................... 10+

Warehouse ...................... 10+

Loyalty ........................ 5+

HR ............................. 12+

Finance ........................ 12+

Reporting ...................... 7+

Notifications ................. 8+

AI Platform ................... 14+

Settings ...................... 9+

Audit ......................... 8+

System ........................ 7+

Franchise ..................... 3+

Estimated Total Tables

≈ 220+

---

# 30. Next Documents

After DATABASE_SCHEMA.md:

- DATABASE_RELATIONSHIPS.md
- DATABASE_INDEX_STRATEGY.md
- DATABASE_NAMING_CONVENTIONS.md
- Prisma schema (schema.prisma)
- Seed data
- Database migrations

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai