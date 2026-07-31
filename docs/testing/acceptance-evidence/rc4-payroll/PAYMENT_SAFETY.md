# Payment Safety

- Default paymentTriggered = false on every API response
- APPROVED ≠ PAID; PAYMENT_READY ≠ PAID
- paid_at not set by this slice; status paid requires settlement (not auto)
- hr_payroll_settlements is the verified settlement contract; empty until authorized workflow
- No bank/provider integration
