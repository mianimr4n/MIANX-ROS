# Phase 2 Readiness Audit — CRM and Customer Master Readiness

**Audit date:** 2026-08-04
**Status:** AUDIT — current truth + proposed scope

---

## Current CRM Truth (Repository Evidence)

### Existing Tables

| Table | Migration | Key Columns | Notes |
|---|---|---|---|
| `customers` | `20260713190000` | id, user_id, full_name, phone, email, date_of_birth, gender, status (active/inactive/blocked), marketing_consent, created_at, updated_at | Primary customer record; phone not always E.164 |
| `customer_addresses` | `20260719090000` | id, customer_id, label, address_line1, city, area, lat, long, is_default | Linked to customers table |
| `customer_favorites` | `20260719100000` | id, customer_id, menu_item_id | Simple favorites |
| `order_reviews` | `20260719110000` | id, order_id, customer_id, rating, comment | Per-order reviews |

### Existing Phone Normalization

Migration `20260716150000_customer_identity_phone_e164.sql` — targeted E.164 normalization. Full normalization status is partial (normalization function exists; backfill coverage uncertain).

### Current CRM UI (AdminCrm.tsx)

- Route: `/admin/crm` (alias `/admin/customers`)
- Data source: `aggregateCustomersFromOrders()` — **browser-side aggregation of last 100 orders**
- No dedicated CRM API; no canonical customer lookup
- Provides: displayName, phone, orderCount, lifetimeSpend, averageSpend, lastOrderAt
- Filters: status (by order status), repeat-only, search, pagination (client-side)
- Drawer: shows customer order history from the loaded 100 orders

**Critical limitation:** CRM accuracy is limited to the last 100 orders loaded. Customers with >100 orders have incomplete history. Customers with no orders in the window do not appear.

### Current Customer Identifiers

- `customers.id` — UUID, auto-generated
- `customers.user_id` — FK to `users.id` (nullable for guests)
- `customers.phone` — unique; primary lookup key
- No canonical stable ID guaranteed across systems

### Current Duplicate Behavior

- No dedup detection
- Same person could have multiple records if they ordered as guest + registered + used different phones
- No merge functionality

### Loyalty Linkage

- `loyalty_ledger` table exists (migration `20260731090000`)
- Linkage via `customer_id` FK — partial

### Reservation/Waitlist Linkage

- `reservations` table: `customer_name`, `customer_phone` stored as text (not FK to customers)
- No hard linkage to canonical customer record

### Support Linkage

- None — support module does not yet exist

### Delivery Address Linkage

- `customer_addresses` table exists and links to `customers.id`

### Consent/Contact Preferences

- `customers.marketing_consent` — single boolean
- No per-channel consent; no timestamp of consent change; no consent reason

### Current Exports

- No customer export functionality
- Orders export exists in reports module

### Role Restrictions

- CRM accessible to `super-admin`, `branch-manager` (scoped by branch via orders)
- No `customer-support` specific CRM restriction

### Current PII Exposure

- Customer phone and email are visible to branch-manager and super-admin
- No field-level masking (last 4 digits of phone, etc.)
- No export controls

---

## Required Decisions (Phase 2.3)

**Canonical identity strategy:**
- Proposed: `customers.id` remains canonical UUID
- Phone number is the primary identity signal for incoming events (WhatsApp, orders)
- E.164 normalization must be completed before 2.3 goes live

**Duplicate/merge rules:**
- Proposed trigger conditions: same E.164 phone, same email, same name + address combination within threshold
- Merge requires super-admin or customer-support-lead approval
- Source record becomes 'merged_into'; target record gains all linked data
- Merge is not automatically reversible after 30 days

**Customer ownership:**
- Customer master owned by CRM service
- Support, Loyalty, Orders are read-only consumers unless explicitly granted write scope

**Cross-branch visibility:**
- Customer is org-wide (not branch-scoped)
- Order history is branch-scoped; customer profile is org-wide
- Branch-manager sees customers from their branch orders only

**PII masking:**
- Phone: show last 4 digits only to branch-manager; full number to customer-support and super-admin
- Email: show domain portion only to branch-manager

**Consent source of truth:**
- `customer_consent_events` table (proposed) is the authoritative log
- `customers.marketing_consent` updated to reflect latest consent state

**Blocked-customer authorization:**
- Only super-admin can set `status = 'blocked'`
- customer-support can flag for review; cannot directly block

**Retention:**
- Active customer records: indefinite
- Inactive customers with no orders in 5 years: anonymize non-essential PII

**Right-to-delete behavior:**
- Anonymize: full_name → `[Deleted Customer]`, phone → `[REDACTED]`, email → null
- Retain: id, order count (non-PII aggregate), created_at
- Log deletion request in `customer_privacy_requests`
- Orders retain anonymized customer reference

**Immutable vs. editable fields:**
- `customers.id` — immutable
- `customers.created_at` — immutable
- `customers.phone` — mutable with audit log
- All other fields — mutable with `updated_at` and future consent/audit log

**Event emission:**
- `CustomerCreated`, `CustomerMerged`, `CustomerAnonymized`, `CustomerConsentChanged` — all emitted to audit log

---

## Proposed Data Model

### `customer_identities` (new)
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id) NOT NULL
identity_type TEXT CHECK (identity_type IN ('phone', 'email', 'supabase_auth', 'whatsapp_id')) NOT NULL
identity_value VARCHAR(200) NOT NULL
is_verified BOOLEAN DEFAULT false
is_primary BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
UNIQUE (identity_type, identity_value)
```

### `customer_merge_log` (new)
```sql
id uuid PRIMARY KEY
source_customer_id uuid -- customer record absorbed
target_customer_id uuid REFERENCES customers(id) -- canonical record
merged_by uuid REFERENCES users(id)
merged_at TIMESTAMPTZ
reason TEXT
can_reverse_until TIMESTAMPTZ -- 30 days from merge
reversal_at TIMESTAMPTZ
reversal_by uuid REFERENCES users(id)
```

### `customer_consent_events` (new)
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id) NOT NULL
channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email', 'push')) NOT NULL
consent_given BOOLEAN NOT NULL
source TEXT -- 'order_checkout', 'support_agent', 'customer_request', 'import'
actor_id uuid REFERENCES users(id)
created_at TIMESTAMPTZ
```

### `customer_privacy_requests` (new)
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id) NOT NULL
request_type TEXT CHECK (request_type IN ('deletion', 'anonymization', 'export', 'correction')) NOT NULL
status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')) DEFAULT 'pending'
requested_at TIMESTAMPTZ
completed_at TIMESTAMPTZ
completed_by uuid REFERENCES users(id)
notes TEXT
```

### `customer_notes` (new)
```sql
id uuid PRIMARY KEY
customer_id uuid REFERENCES customers(id) NOT NULL
author_id uuid REFERENCES users(id)
content TEXT NOT NULL
is_pinned BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
```

---

## Readiness Assessment

| Item | Status |
|---|---|
| `customers` table | EXISTS |
| `customer_addresses` | EXISTS |
| Phone E.164 normalization | PARTIAL |
| Canonical customer ID | EXISTS (customers.id) |
| Duplicate detection | MISSING |
| Merge process | MISSING |
| Consent event log | MISSING |
| Privacy request workflow | MISSING |
| Customer notes | MISSING |
| CRM API (dedicated) | MISSING |
| Field-level PII masking | MISSING |
| ADR-005 (canonical identity strategy) required | YES |
| ADR-006 (merge/reversal) required | YES |
| Phase 2.3 maturity | FOUNDATION → target PARTIAL_LIVE |

**Verdict: READY TO PLAN — ADR-005 and ADR-006 must be accepted. E.164 backfill migration must be verified before canonical identity is relied upon.**
