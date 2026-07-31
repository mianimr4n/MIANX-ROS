# Earnings and Deductions

## Catalogs (seeded codes, no statutory rates)

Earnings: BASE, OVERTIME, ALLOWANCE, BONUS, ADJUSTMENT
Deductions: UNPAID_LEAVE, ABSENCE, ADVANCE_RECOVERY, OTHER

## Engine behavior (v1)

- BASE from compensation type
- OVERTIME only when overtimeHoursApproved > 0 (1× rate)
- ALLOWANCE when allowancesMajor > 0
- OTHER deduction when otherDeductionsMajor > 0
- UNPAID_LEAVE / ABSENCE not auto-applied without explicit unpaid policy (exceptions raised instead)
