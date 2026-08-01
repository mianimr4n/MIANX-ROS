# Schema Certification

## Local

| Check | Result |
| --- | --- |
| `hr_employees.employee_number` | Present |
| `supplier_invoices.due_date` | Present |
| Local migration tip | `20260801180000` |

## Linked Production (remote)

| Check | Result |
| --- | --- |
| Remote tip | `20260730290000` |
| Pending includes `20260731040000` / `20260731050000` | **Yes** |
| Matches observed 42703 | **Yes** |

## Certification

Schema **not** aligned Production ↔ local tip. Clean local reset cycle not required to prove drift; linked list is authoritative. Production migrate not run.
