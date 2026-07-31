# RC3 Workforce PR2 — Evidence Map

**Branch:** `feature/rc3-workforce`  
**Base:** `origin/main` @ `29bd88bbbe5f97f18bc0f230aa94a6e21e5c8dc4` (Finance PR #143 merged)  
**Finance dependency:** MERGED — safe to proceed  
**Kitchen RC2:** not mixed  

## REUSE

| Asset | Notes |
| --- | --- |
| `hr_employees` | status: active/inactive/on_leave/terminated |
| `hr_attendance` | PRESENT/ABSENT/LATE/LEAVE |
| `hr_leave_requests` | PENDING/APPROVED/REJECTED |
| `hr_employee_documents` | URL refs only — no expiry |
| Opening M3 SOP/training | separate; surface as compliance unavailable/partial |
| `hr.manage` + branch scope | gates + `assertBranchMembership` |
| Owner attention pattern | mirror financeAttention |

## EXTEND

| Asset | Change |
| --- | --- |
| `hr_employees` | employee_number, emergency contact, deactivate fields, PATCH API |
| Attendance | corrections table; preserve originals |
| Leave | approver, rejection_reason, cancel, overlap checks |
| AdminHr UI | replace Shift/Payroll stubs with live panels |
| Owner Command Center | workforceAttention widgets |

## NEW

| Table | Why |
| --- | --- |
| `hr_employee_events` | No HR audit events today |
| `hr_shift_templates` | No shift model |
| `hr_scheduled_shifts` | No roster |
| `hr_attendance_corrections` | Attendance overwrites open row — need revision |
| `hr_compensation_profiles` | Payroll foundation |
| `hr_pay_periods` / `hr_payroll_runs` | Payment-free foundation only |
| `hr_leave_events` | Leave decision audit |

## CoA / status decision

Keep existing employee/attendance/leave status enums. Map Owner copy to business language without renaming DB values.
