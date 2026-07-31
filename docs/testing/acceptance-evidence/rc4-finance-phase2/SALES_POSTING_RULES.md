# Sales Posting Rules

| Field | Value |
| --- | --- |
| Trigger | Order `payment_status=paid` or `status=completed` |
| Amount source | Server `orders` row (never client totals) |
| Debit | `cash_on_hand` (paid) or `ar_control` |
| Credit | `sales_revenue` + optional `output_tax` |
| Idempotency | `sales_post:{orderId}` / `finance_postings(source_module=order)` |
| Failure | Exception queue + no fabricated JE |
| Reversal | Journal reverse / credit note path |
