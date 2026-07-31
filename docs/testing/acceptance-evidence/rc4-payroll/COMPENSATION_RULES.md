# Compensation Rules

- Effective-dated profiles: salary_type monthly|hourly|daily, base_rate, currency PKR default
- Unique active open-ended profile per employee (partial unique index)
- Creating new open-ended profile closes prior open profile
- Historical payroll lines store compensation_profile_id + input/formula snapshots
- Missing profile → line_status blocked; amounts not invented as payable zero without exception
- Sensitive: gated by hr.manage|staff.manage|admin.access + branch membership; no bank fields in this slice
