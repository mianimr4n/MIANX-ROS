# RC3 PR1 Finance Operations — Evidence Map

**Branch:** `feature/rc3-finance-operations`  
**Base:** `origin/main` @ `876e6437bc9c7ff687162c9006593a8c7bb61b28`  
**Kitchen RC2:** not mixed (`feature/kitchen-completion-rc2` remains at `034bc56`)

## REUSE

| Asset | Path / symbol |
| --- | --- |
| Chart of accounts | `chart_of_accounts` — types ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE |
| Journals | `journal_entries`, `journal_entry_lines`, `create_journal_entry_atomic` |
| Reports | `finance_trial_balance`, `finance_profit_loss` |
| AP invoices/payments | `supplier_invoices`, `supplier_payments`, `record_supplier_payment_atomic` |
| Three-way match | `matching_status` UNMATCHED/MATCHED/DISCREPANCY |
| Procurement | requisitions, POs, GRN / goods_receiving |
| Z-report sales calc | `createPosZReportService` cash paid payments |
| Permissions | `finance.manage`, `purchasing.manage`, `admin.access` |
| Owner attention pattern | `owner-command-builders.ts` |

## EXTEND

| Asset | Change |
| --- | --- |
| `pos_z_report_events` | Remains audit of shift close; cash recon is separate lifecycle |
| Z-report service/UI | Feeds cash sales into reconciliation; does not invent float |
| Payment RPC | Idempotency key + mismatch gate + optional posting hook |
| Owner Command Center | Finance Attention from verified `/admin/finance/attention` |
| Admin Finance / POS UI | Live expense + cash recon panels |

## NEW (justified)

| Table / RPC | Why existing model is insufficient |
| --- | --- |
| `finance_account_mappings` | No purpose→account config; cannot hardcode account IDs |
| `cash_reconciliations` (+ events) | `pos_z_report_events` is append-only confirm log — no draft/approve, float, counted, variance, immutability after approve |
| `expense_claims` (+ events) | No expense claim schema or API |
| `finance_postings` | Need source uniqueness / idempotent journal link |
| `reverse_journal_entry_atomic` | Status enum has voided but no reverse RPC |
| Invoice exception columns | DISCREPANCY must not silently settle |
| Payment `idempotency_key` | Concurrent retries can duplicate without uniqueness |

## CoA decision

Keep existing five account types. Cash / AP / expense categories use **mappings**, not new enum values.
