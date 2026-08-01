# RC4 Final Certification — Final Report

## Decision

**RC4_SCHEMA_DRIFT_BLOCKED**

## Why

Linked Production (`supabase migration list --linked`) remote tip is `20260730290000` while local tip is `20260801180000`. Pending migrations include:

- `20260731040000` → `supplier_invoices.due_date`
- `20260731050000` → `hr_employees.employee_number`

These match the observed Production `42703` errors. Per mission rule: RC4 cannot be certified while Production reports missing required columns.

## Phase 1 merge record

| Item | Value |
| --- | --- |
| PR | #161 MERGED |
| Merged head | `ecf5b772fae5fc8a6c2dda6f3730fa8b72e6851b` |
| Merge / origin/main | `1d648950a8ea5bfb982713a203bacc6c7dd93ec1` |

## Repository-side fix included

Supabase connectivity probe now sends anon `apikey` + Bearer headers to stop unauthenticated `/auth/v1/health` 401 noise (tests added). **Does not clear schema drift.**

## Branch

`feature/rc4-final-certification` — evidence + health probe fix only. Not pushed unless instructed.

## Next ops action (human)

Apply pending Production migrations through approved runbook (not this agent). Then re-run certification.
