# Migration Alignment

Source: `npx supabase migration list --linked` (2026-08-01).

| Tip | Version |
| --- | --- |
| Local tip | `20260801180000` (`rc4_loyalty_marketing_depth`) |
| Remote (linked Production) tip | `20260730290000` |
| Gap | All local versions from `20260731010000` … `20260801180000` show `remote: ""` |

## Columns tied to Production 42703

| Column | Introduced | Compatibility re-assert | Remote status |
| --- | --- | --- | --- |
| `hr_employees.employee_number` | `20260731050000` | **Not** in `20260731150000` | Pending |
| `supplier_invoices.due_date` | `20260731040000` | Yes — `20260731150000` | Pending |

## Local schema spot-check

Local Supabase DB container has both columns present (`employee_number`, `due_date`).

## Safety

- Forward-only additive migrations in repo.
- Duplicate timestamps: none observed for pending set.
- Production migrate **not** executed in this slice.

Raw listing artifact: `migration-list-linked.json` (if present) / CLI output captured in evidence session.
