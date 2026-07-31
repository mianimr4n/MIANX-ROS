# RC4-3 Payroll Baseline

Branch: `feature/rc4-payroll`
Starting SHA: `6460d142f070b85569927d290c9a5e29894ad91d` (origin/main after RC4-5 + RC4-9)

## Prerequisites

| Item | Status |
| --- | --- |
| RC4-5 Documents | COMPLETE on origin/main (PR #155) |
| RC4-9 Inventory Recipes | COMPLETE on origin/main (PR #156) |
| RC4-8 Finance Phase 2 | **Not on origin/main** — Option B: not required for payroll calculation; GL posting DEFERRED |

## Pre-existing RC3 payroll foundation

- Migration `20260731080000_hr_payroll_foundation.sql`
- Service shell with `paymentTriggered=false` and calculation previously unavailable
- Admin HR UI PayrollOverview workflow shell
