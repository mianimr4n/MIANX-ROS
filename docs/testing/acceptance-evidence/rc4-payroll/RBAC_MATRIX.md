# RBAC Matrix

| Role / principal | Payroll API | Compensation view | Payslips | Mutate calculate/approve | Notes |
| --- | --- | --- | --- | --- | --- |
| Unauthenticated | 401 | deny | deny | deny | |
| Supplier | no HR routes | deny | deny | deny | |
| Cashier (no hr/staff.manage) | deny / no manage UI | deny | deny | deny | Playwright denial |
| Branch manager (staff.manage) | branch-scoped | yes | branch | yes | assertBranchMembership |
| HR / admin.access | branch or all | yes | yes | yes | |
| Auditor read-only | if lacking mutate perms | select via RLS | select | no | service writes via service_role |
| Employee self-service | not in this slice | N/A | own payslip deferred | no | HTML payslips via HR for now |

Compensation and payslips are HR-gated. No salary breakdowns in logs.
