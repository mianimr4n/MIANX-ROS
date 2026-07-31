# AP Posting Rules

Policy: **Recognize inventory/expense + AP at supplier invoice.** GRN does not post JE.

| Event | Debit | Credit | Idempotency |
| --- | --- | --- | --- |
| Invoice accrual | `inventory_asset` else `expense_default` | `ap_control` | `supplier_invoice_post:{id}` |
| Payment (existing) | `ap_control` | cash/bank | `supplier_payment_post:{id}` |
