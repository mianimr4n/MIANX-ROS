# Accounting Contract (Option B)

RC4-8 Finance Phase 2 is **not merged to origin/main**.

- Payroll calculation does **not** require Finance
- On calculate: emit payroll_accrual_ready posting event with status=deferred
- On payment_ready: emit payroll_payment_ready deferred
- No GL journals posted; accountingStatus=DEFERRED on run records
- When Finance mappings land, consumers may post from these events idempotently
