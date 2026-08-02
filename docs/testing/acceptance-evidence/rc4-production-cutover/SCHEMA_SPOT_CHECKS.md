# Schema spot checks (post-migrate)

**Method:** linked schema dump to `.local-backups/rc4-production-cutover/20260801-220400-post/post-schema.sql` (720187 bytes, gitignored). Read-only inspection. No data mutation.

## Drift columns (required)

| Object | Result |
| --- | --- |
| `supplier_invoices.due_date` | **PRESENT** (column + comment referencing 20260731040000) |
| `hr_employees.employee_number` | **PRESENT** (+ unique index `uq_hr_employees_branch_number`) |

## Finance

| Object | Result |
| --- | --- |
| `finance_account_mappings` | PRESENT |
| `cash_reconciliations` | PRESENT |
| `expense_claims` | PRESENT |
| `finance_postings` | PRESENT |
| `finance_exceptions` | PRESENT |
| AR / receipt / credit-note objects (`customer_invoices`, receipts, credit notes) | PRESENT in dump |
| Period-control related objects | PRESENT (Phase-2 finance foundation migration applied) |

## Purchasing / supplier

| Object | Result |
| --- | --- |
| `supplier_invoices.due_date` | PRESENT |
| Payment idempotency / exception fields | Present via finance posting / AP migrations |
| `supplier_portal_users` | PRESENT |
| Portal response/document/event objects | PRESENT (portal foundation/hardening applied) |

## HR / Payroll

| Object | Result |
| --- | --- |
| `hr_employees.employee_number` | PRESENT |
| `hr_shift_templates` | PRESENT |
| scheduled shifts objects | PRESENT |
| `hr_attendance.scheduled_shift_id` | PRESENT (references in dump) |
| `hr_attendance_corrections` | PRESENT |
| leave `rejection_reason` | PRESENT |
| `hr_compensation_profiles` | PRESENT |
| payroll periods/runs/items + mapping purposes | PRESENT (RC4 payroll migrations applied) |

## Loyalty / Marketing / Analytics / Inventory / Documents

| Area | Result |
| --- | --- |
| `loyalty_transactions.actor_user_id` / expiry/reversal/idempotency | PRESENT (hits in dump) |
| `loyalty_rewards`, tiers, redemptions, templates | PRESENT |
| `analytics_scheduled_reports`, `analytics_exceptions` | PRESENT |
| recipe / COGS objects | PRESENT |
| document metadata objects | PRESENT |

**Result:** PASS (static schema attestation)
