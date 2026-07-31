# Balance Sheet Contract

RPC `finance_balance_sheet(branch, as_of)` from posted journals.

- Assets / Liabilities / Equity by account_type
- Current earnings = revenue − expense included in equity
- `balanced` flag: assets ≈ liabilities + equity
- No fabricated opening retained earnings seed
