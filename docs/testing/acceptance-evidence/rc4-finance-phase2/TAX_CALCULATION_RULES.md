# Tax Calculation Rules

- Rates come only from `tax_definitions` (no hardcoded Pakistan rates).
- Rounding: half-up to 2 decimal places.
- Exclusive: tax = taxable_base × rate; total = base + tax.
- Inclusive: net = gross / (1+rate); tax = gross − net.
- Discount applied to subtotal before exclusive tax.
- Filing/export: DEFERRED.
