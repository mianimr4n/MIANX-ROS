# Account Mapping Rules

Purposes resolve by `finance_account_mappings.purpose` + `branch_id` → `account_id` (active CoA). Never by display name.

## Required for auto-post

| Purpose | Used by |
| --- | --- |
| `cash_on_hand` | Sales cash settle, receipts (cash), expense/cash recon |
| `bank_clearing` | Bank/card receipts, AP payments |
| `ar_control` | AR invoice issue, receipts, credit notes, credit sales |
| `sales_revenue` | Sales post, AR issue, credit notes |
| `output_tax` | Tax lines when amount &gt; 0 |
| `ap_control` | AP invoice accrual, supplier payment |
| `inventory_asset` | AP invoice (preferred) / COGS credit |
| `cogs` | COGS event post |
| `expense_default` | AP invoice fallback if inventory_asset unmapped |

Missing mapping → `ACCOUNT_MAPPING_REQUIRED` + `finance_exceptions` row. `GET /finance/mapping-health` reports missing purposes as UNAVAILABLE.
