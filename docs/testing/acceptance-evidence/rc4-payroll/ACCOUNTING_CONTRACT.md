# Accounting Contract

RC4-8 Finance Phase 2 is on `origin/main` (PR #157). Payroll uses Finance mappings when present.

## Accrual (on approve)

When mappings exist for the branch:

- Debit `salary_expense` = sum(gross_pay) for non-blocked lines
- Credit `payroll_payable` = sum(net_pay)
- Credit `payroll_deduction_payable` = sum(deductions) when > 0

Idempotency key: `payroll_accrual:{payrollRunId}` / finance_postings source `payroll_run`.

Missing mapping → `ACCOUNT_MAPPING_REQUIRED`, `finance_exceptions` row, run `accrual_posting_status=blocked`, `accountingStatus=BLOCKED`. Approval still retained; posting blocked honestly.

## Settlement payment journal (only after verified settlement)

- Debit `payroll_payable` = settlement amount
- Credit `cash_on_hand` (fallback `bank_clearing`)

Idempotency: `payroll_settlement:{settlementId}`.

No payment journal before `hr_payroll_settlements` row. `paymentTriggered` remains false in unsafe auto-pay sense; payslip `payment_status=paid` only after settlement; run `paid` only when all payslips paid.

## Mapping purposes added

`salary_expense`, `allowance_expense`, `payroll_payable`, `payroll_tax_payable`, `payroll_deduction_payable`

Migration: `20260731210000_rc4_payroll_finance_mapping_purposes.sql`
