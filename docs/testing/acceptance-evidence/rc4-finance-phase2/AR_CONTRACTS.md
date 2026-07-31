# AR Contracts

Statuses: DRAFT → ISSUED → PARTIALLY_PAID / PAID / OVERDUE; VOID; CREDITED.

- Draft create calculates totals server-side (tax optional via `tax_definitions`).
- Issue posts Dr AR / Cr revenue (+ output tax) once mappings exist; idempotent via `finance_postings`.
- Receipts allocate transactionally; over-allocation rejected; branch isolation enforced.
- Credit note updates AR balance; cash repayment is a separate settlement (not implied).
