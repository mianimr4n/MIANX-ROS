# RC4-2 Analytics RBAC

| Surface | Permission |
| --- | --- |
| Analytics read / workspace / registry / export | `reports.read` OR `order.manage` OR `admin.access` |
| Finance-backed metrics | Engine still requires branch membership; underlying Finance services enforce `finance.manage` where applicable |
| Workforce / payroll metrics | Delegated HR services enforce `hr.manage` / `staff.manage` |
| Supplier portal | Supplier principals denied admin analytics routes (no `reports.read`) |

Branch isolation: `assertBranchMembership` + scoped queries.  
Organization-wide reads: super-admin or multi-branch principal only.  
Employee/payroll privacy: labour cost withheld (`UNAVAILABLE`) without approved payroll totals; no employee PII in analytics envelopes.
