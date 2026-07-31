# Calculation Formulas (rc4-3.payroll.v1)

Money: integer paisa (minor units). toMinor = round(major*100).

- Monthly: earnings = base_rate
- Daily: earnings = base_rate × count(PRESENT|LATE)
- Hourly: earnings = base_rate × (presentDays × 8)
- OT: otHours × base_rate (1×; no OT multiplier configured)
- Gross = earnings (+ allowances)
- Net = gross − deductions; if net < 0 → BLOCKED NEGATIVE_NET_PAY, net stored 0
- Snapshots: formula_snapshot, input_snapshot, calculation_version, calculated_at
