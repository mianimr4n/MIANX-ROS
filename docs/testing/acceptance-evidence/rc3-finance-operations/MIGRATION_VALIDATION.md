# Local migration validation evidence

**Date:** 2026-07-31  
**Database:** local Docker `supabase_db_telepizza-platform` (NOT Production)  
**Prior head:** `20260726120000`  
**Applied through:** `20260731040000`

## Result

`MIGRATION_CHAIN_OK`

Verified relations:

| Relation | Present |
| --- | --- |
| `finance_account_mappings` | yes |
| `cash_reconciliations` | yes |
| `expense_claims` | yes |
| `finance_postings` | yes |
| `chart_of_accounts` | yes |

Full apply log: `migration-apply.log`

## Note

Local stack was behind finance_core; pending migrations from `20260728180000` through RC3 finance were applied in order for validation only. Production was not mutated.
