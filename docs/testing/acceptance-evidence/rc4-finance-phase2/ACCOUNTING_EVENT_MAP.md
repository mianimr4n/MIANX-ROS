# RC4-8 Accounting Event Map

Branch: `feature/rc4-finance-phase2`  
Base: `origin/main` @ `6460d14` (RC4-5 + RC4-9 merged)  
Scope: foundation-first

## Legend

| Field | Meaning |
| --- | --- |
| Missing config | Block posting; write `finance_exceptions`; never invent accounts |
| Idempotency | Unique `finance_postings (source_module, source_id)` and/or explicit key |

## Live RC3 events (unchanged)

| Event | Trigger | Debit | Credit | Amount | Branch | Idempotency | Reversal |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cash_recon.variance | Approve/post recon variance ≠ 0 | cash ↔ over/short | opposite | variance | recon.branch | `cash_recon_post:{id}` | reverse JE |
| expense.claim_post | Expense pay/post | expense map | cash/bank | claim amount | claim.branch | `expense_post:{id}` | reverse JE |
| ap.payment_post | `POST …/supplier-payments/:id/post` | ap_control | cash/bank | payment | payment.branch | `supplier_payment_post:{id}` | reverse JE |
| journal.manual | Admin create | user lines | user lines | user | JE.branch | N/A | reverse JE |

## Phase 2 events

| Event | Trigger | Debit | Credit | Amount source | Org/Branch | Source entity | Idempotency | Reversal | Missing config |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| sales.order_recognize | Order paid/completed (server amounts) | cash_on_hand \| bank_clearing \| ar_control | sales_revenue (+ output_tax if tax lines) | orders.total / tax / discount server fields | order.branch | order | `sales_post:{orderId}` | linked reverse / credit note | exception + 409/422 |
| sales.refund | Approved refund settlement | sales_revenue / output_tax | cash/bank/AR | payment refund amount | order.branch | payment | `sales_refund:{paymentId}` | reverse of refund JE | block |
| ap.invoice_accrual | Supplier invoice approve/issue | inventory_asset \| expense_default | ap_control | invoice total (server) | invoice.branch | supplier_invoice | `supplier_invoice_post:{id}` | reverse JE | block |
| cogs.consume | `inventory_cogs_events` status deferred → post | cogs | inventory_asset | event.amount (cost_price derived) | event.branch | cogs_event | event.idempotency_key | cogs_reverse_ready | block + leave deferred |
| ar.invoice_issue | Issue customer invoice | ar_control | sales_revenue (+ tax) | invoice totals | invoice.branch | customer_invoice | `ar_invoice_post:{id}` | void/credit workflow | block |
| ar.receipt | Post customer receipt | cash/bank | ar_control | receipt amount | receipt.branch | customer_receipt | `ar_receipt_post:{id}` | reverse receipt | block |
| ar.credit_note | Issue credit note | sales_revenue (+ tax) | ar_control | credit totals | note.branch | credit_note | `ar_credit_post:{id}` | reverse note | block |
| cash.transfer | Register transfer | cash/bank A | cash/bank B | transfer amount | branch | register_entry | `cash_xfer:{id}` | reverse transfer | block |
| period.close | Close period | — | — | — | branch | finance_period | audit event | reopen by finance.manage | N/A |

## Policies

1. **AP recognition:** inventory/expense + AP at **supplier invoice**; GRN does not post JE.
2. **Sales:** never trust client totals; use server order/payment rows.
3. **Credit note ≠ cash refund:** cash repayment requires separate settlement.
4. **Tax:** only when active `tax_definitions` + `output_tax` mapping exist; otherwise tax line omitted or blocked per invoice config (no hardcoded rates).
5. **COGS:** Finance consumes RC4-9 events; does not re-consume kitchen stock.
