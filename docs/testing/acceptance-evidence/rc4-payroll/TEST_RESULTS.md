# Test Results

Branch: `feature/rc4-payroll`
Evidence date: 2026-07-31
Starting SHA: `6460d142f070b85569927d290c9a5e29894ad91d`

## Gates

| Command | Result |
| --- | --- |
| `pnpm check` | **PASS** |
| `pnpm test` | **PASS** (Node static 782 + Vitest 577) |
| `pnpm test:db` | **PASS** (included in static suite; payroll DB 9/9) |
| `pnpm rc1:gate` | **PASS** (0 blocking failures) |
| `git diff --check` | **PASS** |

## Targeted payroll

| Suite | Passed |
| --- | --- |
| `backend/api/tests/payroll-calc.test.ts` | **12 / 12** |
| `backend/api/tests/hr-employees.test.ts` (payroll cases among file) | calculate / payment-ready / lines 401 PASS |
| `tests/database/hr-payroll-rc4.test.mjs` | **9 / 9** |
| Playwright `e2e/rc4/payroll.spec.ts` | **2 / 2** |
| axe critical / serious | **0 / 0** |

## Totals (payroll-focused)

| Layer | Count |
| --- | --- |
| Unit (payroll-calc) | 12 |
| API (payroll lifecycle assertions in hr-employees) | 3+ (payment-free calculate, payment-ready unpaid, lines auth) |
| Database (static migration/contracts) | 9 |
| Playwright | 2 |
| Accessibility (critical/serious) | 0 / 0 |
