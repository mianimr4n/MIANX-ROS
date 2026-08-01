# RLS, grants, and RPCs (post-migrate schema dump)

**Source:** post-migrate linked schema dump (gitignored). No secrets.

## RLS enabled (sample)

| Table | ENABLE RLS | CREATE POLICY hits |
| --- | ---: | ---: |
| `finance_postings` | 1 | 1 |
| `cash_reconciliations` | 1 | 1 |
| `expense_claims` | 1 | 1 |
| `hr_employees` | 1 | 1 |
| `hr_compensation_profiles` | 1 | 1 |
| `loyalty_accounts` | 1 | 1 |
| `supplier_portal_users` | 1 | 1 |
| `supplier_invoices` | 1 | 1 |
| `loyalty_rewards` | 1 | 0* |
| `analytics_scheduled_reports` | 1 | 0* |

\*RLS on with no permissive policies ⇒ default deny for `anon`/`authenticated` via PostgREST; `service_role` bypasses RLS. Treated as **restrictive**, not a weaken.

## Grants

| Check | Result |
| --- | --- |
| `GRANT ALL/INSERT/UPDATE/DELETE ON TABLE … TO "anon"` | **0** matches |
| `GRANT SELECT ON TABLE … TO "anon"` | 4 (pre-existing public-read style objects; not new write grants) |

## RPCs present

| RPC | Dump hits (definition/grants/comments) |
| --- | ---: |
| `reverse_journal_entry_atomic` | ≥1 (definition + service_role grant) |
| `record_supplier_payment_atomic` | ≥1 |
| `create_journal_entry_atomic` | ≥1 |

## Isolation matrices against Production

**Not executed** in this session — no Production Owner/supplier credentials available (local handover password rejected: `Invalid login credentials`).

Required supplier A/B, branch, and employee self-service Production matrices remain **PENDING** operator credentials.
