# Approval Workflow

1. Create pay period (+ optional pay_date) — overlap rejected
2. Create draft payroll run (one active root run per period)
3. Calculate → calculated or review_required; writes lines/components/exceptions/payslips
4. Review exceptions; reject returns to draft
5. Approve (requires calculation not unavailable)
6. Mark payment_ready (explicit; still unpaid)
7. Lock (immutability; locks period)
8. Cancel before paid; reverse approved/payment_ready/locked with reason
9. Recalculate only in draft/calculated/under_review/review_required — approved+ immutable in place
