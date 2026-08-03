# RC6-QA-04 — Production Owner smoke blockers

## Production baseline (pre-fix)

| Field | Value |
| --- | --- |
| Website SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |
| Deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Rollback after this fix deploys | retain `dpl_HhvEuM…` / `bf5912c…` |

## Original eight failures (harness re-run)

After harness alignment with QA-03 selectors, **7/8** cleared on unchanged Production:

PASS: branch_health, profitability_truth, modes ×3, refresh, a11y all modes (0 critical / 0 serious), mobile.

Remaining FAIL:

- `logout_and_protect` — after logout settle (`email`), `goto /admin/dashboard` landed `/admin/home/staff` with `occ=0`

## Classification

| Item | Classification | Fix |
| --- | --- | --- |
| Wrong panel testids / mode buttons / refresh wait / a11y timing | TEST_HARNESS_DEFECT | `.tmp` smoke + `rc6-owner-smoke-contract` + existing QA-03 e2e |
| Post-logout dashboard → `/admin/home/staff` | PRODUCT_RUNTIME_DEFECT | `AdminDashboard` skips `resolveStaffHome` when `!isAuthenticated` |

## Runtime change

`apps/website/client/src/pages/admin/AdminDashboard.tsx` — do not role-route signed-out principals.

## Tests

- `tests/website/rc6-owner-smoke-contract.test.mjs`
- `e2e/rc5/owner-command-center-integration.spec.ts` — assert no staff-home bounce after logout revisit

## Explicit non-changes

- no backend deploy
- no migrations / Production SQL
- no provider/secret changes
