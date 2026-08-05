# Phase 2 Readiness Audit — Data Model Impact

**Audit date:** 2026-08-04
**Status:** PROPOSED — Documentation only. No migration files written.

---

## Data Impact Matrix

| Domain | Existing Tables | Proposed Tables | Modified Tables | Migration Risk |
|---|---|---|---|---|
| **2.1 Branch & Settings** | `organization_settings`, `branches`, `branch_settings` | `configuration_schemas`, `configuration_versions`, `configuration_change_log` | `organization_settings` (deprecate flat columns for schema references) | Additive low risk / data normalization |
| **2.2 Support & WhatsApp** | None (orders.order_channel flag only) | `conversations`, `messages`, `conversation_events`, `message_templates` | `orders` (add `conversation_id` FK) | Additive low risk |
| **2.3 CRM & Customer Master** | `customers`, `customer_addresses`, `customer_favorites`, `order_reviews` | `customer_identities`, `customer_merge_log`, `customer_consent_events`, `customer_privacy_requests`, `customer_notes` | `customers` (add `canonical_id`, `status` enum hardening, `merged_into_id`) | Data normalization / irreversible risk (merges) |
| **2.4 Delivery & Rider** | `deliveries` / `delivery_assignments` | `rider_profiles`, `rider_locations`, `delivery_attempts`, `delivery_pod`, `cod_collections` | `deliveries` (add `out_for_delivery`, `failed`, `returned` state transitions) | Additive / privacy-sensitive (GPS retention) |
| **2.5 Accounting** | `chart_of_accounts`, `journal_entries`, `journal_lines`, `finance_postings`, `cash_reconciliations`, `supplier_invoices`, `supplier_payments` | `posting_periods`, `period_close_log`, `tax_postings`, `discount_postings` | `journal_entries` (add `period_id` FK), `finance_postings` (add period reference) | Additive / financial-sensitive |
| **2.6 AI Command Center** | `ai_teams`, `ai_agents`, `ai_tasks`, `ai_approvals` | `ai_provider_configs`, `ai_prompt_logs`, `ai_recommendations` | `ai_tasks` (add `recommendation_id` FK) | Additive low risk |

---

## Detailed Migration Risk Classification

### 1. Additive Low Risk
- `conversations`, `messages`, `conversation_events`, `message_templates`
- `rider_profiles`, `delivery_attempts`, `delivery_pod`
- `posting_periods`, `period_close_log`, `tax_postings`, `discount_postings`
- `ai_provider_configs`, `ai_prompt_logs`, `ai_recommendations`
- `configuration_schemas`, `configuration_versions`, `configuration_change_log`

### 2. Additive with Backfill
- Adding E.164 phone normalization columns/triggers to `customers`
- Linking existing `orders` to `customer_identities`

### 3. Data Normalization
- Splitting `customers` flat fields into `customer_identities` (phone, email, auth_id)
- Migrating JSONB `branch_settings` into versioned `configuration_versions`

### 4. Authorization / RLS-Sensitive
- RLS policies on `messages` and `conversations` (branch-scoped)
- RLS policies on `rider_locations` (rider own / manager branch)
- RLS policies on `posting_periods` (period lock enforcement)

### 5. High-Volume / Retention-Sensitive
- `rider_locations`: High write volume during deliveries; 24-hour TTL automatic cleanup required.
- `messages`: Message volume growth; retention policy enforcement (24 months).

### 6. Irreversible / High Risk
- `customer_merge_log`: Merging two customer accounts transfers order history, loyalty points, and addresses. Reversal window (30 days) must be strictly managed with full audit trail.
- Period Close in Accounting: Locking a posting period prevents any future backdated journals without Founder authorization.

---

## Safe Migration Strategy & Rules

1. **No Destructive Migrations**: No `DROP TABLE`, `DROP COLUMN`, or destructive `ALTER TABLE` allowed without prior explicit ADR approval and migration testing.
2. **No Silent Nullable-to-Required Conversions**: Any newly introduced FK or column on existing tables must remain `NULLABLE` or have a safe default backfill.
3. **Immutability Contracts**:
   - `journal_entries` remains append-only; reversals create new journals (`reversed_by_journal_id`).
   - `audit_events` and `configuration_change_log` allow NO `UPDATE` or `DELETE` for non-superadmin/service-role.
4. **Data Retention Policies**:
   - `rider_locations`: Auto-purged via pg_cron or worker after 24 hours post-delivery completion.
   - PII redaction: Anonymization replaces values with `[REDACTED]` rather than deleting the audit row.
