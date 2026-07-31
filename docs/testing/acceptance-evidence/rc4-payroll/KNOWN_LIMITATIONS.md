# Known Limitations

1. RC4-8 Finance not on main → GL posting DEFERRED (Option B)
2. No hard-coded Pakistan statutory rates; withholding UNAVAILABLE
3. No bank/provider payment; settlement table empty; paymentTriggered always false in API responses
4. PDF payslips deferred — printable HTML/JSON payload only
5. Employee self-service payslip portal not implemented
6. OT multiplier / unpaid leave auto-deduction not configured (review exceptions instead)
7. Hourly hours derived as presentDays×8 (no punch-duration wage calc yet)
8. Playwright coverage is UI honesty + RBAC; full live API calculate path depends on local stack/seed
