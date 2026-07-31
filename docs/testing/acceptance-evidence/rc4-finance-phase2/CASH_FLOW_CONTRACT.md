# Cash Flow Contract

Method: **indirect**.

RPC `finance_cash_flow_indirect(branch, from, to)`:

- Starts from P&amp;L net income
- Classifies cash/bank mapped purposes into operating / investing / financing
- Unclassified movements returned explicitly and logged to `finance_exceptions` (never silent operating)
- Opening/closing cash from cash_on_hand + bank_clearing ledger balances
