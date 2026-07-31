# Attendance Input Rules

- Source: hr_attendance.check_in_time (or created_at) date within period — no work_date column
- PRESENT and LATE count as worked for daily/hourly
- ABSENT → ABSENCE_REVIEW (no silent unpaid deduction)
- Missing attendance for hourly/daily → MISSING_ATTENDANCE / REVIEW_REQUIRED (hours not invented)
- Monthly salaried does not require attendance rows for base pay
- Leave APPROVED → LEAVE_REVIEW; no auto deduction without unpaid leave type config
