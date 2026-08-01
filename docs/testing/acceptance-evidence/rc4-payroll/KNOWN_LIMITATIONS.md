# Known Limitations

1. No hard-coded Pakistan statutory rates; withholding UNAVAILABLE until approved rule configs are activated
2. No bank/provider payment integration; paymentTriggered remains false without verified `hr_payroll_settlements`
3. PDF payslips deferred — printable HTML/JSON payload only
4. Employee self-service payslip portal not implemented (HR-gated access only)
5. OT multiplier / unpaid leave auto-deduction not configured (review exceptions instead)
6. Hourly hours derived as presentDays×8 (no punch-duration wage calc yet)
7. Accrual GL posting is LIVE only when branch mappings (`salary_expense`, `payroll_payable`, …) exist; otherwise BLOCKED with finance_exceptions
8. Playwright coverage is UI honesty + RBAC; full live calculate path depends on local stack/seed + migration apply

## LOCAL_QA_ENVIRONMENT_ISSUE

```text
Multiple local API instances competed for port 4000 during tsx reloads.
The API had served traffic before termination.
Observed failures were EADDRINUSE process conflicts, not application-logic crashes.
Subsequent QA must use one env-loaded API instance only.
```
