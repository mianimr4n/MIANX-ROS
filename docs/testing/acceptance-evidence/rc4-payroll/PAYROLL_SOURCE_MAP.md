# Payroll Source Map

| Input | Authoritative source | Calculation rule | Effective date | Branch scope | Approval | Missing data | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Base salary / wage | hr_compensation_profiles | monthly=rate; daily=rate×present; hourly=rate×present×8 | profile effective_from/to | branch_id | HR create | BLOCKED MISSING_COMPENSATION | payroll.calculate + profile rows |
| Attendance | hr_attendance (check_in_time date) | PRESENT/LATE count; ABSENT→REVIEW only | work day in period | branch_id | corrections approved before overwrite | hourly/daily empty → REVIEW_REQUIRED | attendance + payroll.calculate |
| Leave | hr_leave_requests APPROVED | no auto unpaid deduct without config | leave dates overlap period | branch_id | leave approve | LEAVE_REVIEW | leave events + payroll exceptions |
| Overtime | approved hours input (optional) | 1× base rate; no invented multiplier | run calculate time | branch | explicit OT hours | omit OT | formula_snapshot |
| Allowances | optional major amount | add earning ALLOWANCE | run | branch | authorized | omit | components |
| Deductions | optional other | OTHER; negative net BLOCKED | run | branch | authorized | omit | components |
| Statutory | hr_statutory_rule_configs | UNAVAILABLE until is_active configs | effective_from/to | jurisdiction | requirements approval | STATUTORY_DEFERRED | configs + exceptions |
| Accounting | posting-ready events | DEFERRED without RC4-8 mappings | run calculate / payment_ready | branch | N/A | deferred_reason | hr_payroll_posting_events |
| Payment | hr_payroll_settlements | PAID only with settlement row | settled_at | run/employee | verified settlement | stay unpaid | settlements + events |
