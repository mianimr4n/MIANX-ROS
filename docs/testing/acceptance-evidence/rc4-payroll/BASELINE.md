# RC4-3 Payroll Baseline

Branch: `feature/rc4-payroll`
Starting SHA after Finance merge rebase: `06e6d618c7c19d6393c05873c0fb8851a318191f` (origin/main = RC4-5 + RC4-9 + RC4-8)

## Prerequisites

| Item | Status |
| --- | --- |
| RC4-5 Documents | COMPLETE on origin/main (PR #155) |
| RC4-9 Inventory Recipes | COMPLETE on origin/main (PR #156) |
| RC4-8 Finance Phase 2 | COMPLETE on origin/main (PR #157) — payroll accrual/settlement posting integrated when mappings exist |

## LOCAL_QA_ENVIRONMENT_ISSUE

```text
Multiple local API instances competed for port 4000 during tsx reloads.
The API had served traffic before termination.
Observed failures were EADDRINUSE process conflicts, not application-logic crashes.
Subsequent QA must use one env-loaded API instance only.
```

## Pre-existing RC3 payroll foundation

- Migration `20260731080000_hr_payroll_foundation.sql`
- RC4-3 adds calculation foundation + Finance mapping purposes
