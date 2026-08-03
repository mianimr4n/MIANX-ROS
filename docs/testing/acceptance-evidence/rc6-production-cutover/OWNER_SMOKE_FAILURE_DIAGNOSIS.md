# RC6 Phase 1 — Owner smoke failure diagnosis

**Production anchors (unchanged during diagnosis)**

| Field | Value |
| --- | --- |
| Active website SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |
| Active deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Rollback deployment | `dpl_G9rZdi8mcp4dYUdsa2RfRLtqeiYF` |
| Rollback SHA | `9fed3b4392015db69ebdc652dd9a693811d335c8` |
| Migration tip | `20260801180000` |

**Smoke source:** `.tmp/rc6-prod-owner-smoke.mjs`  
**Reference contract:** `e2e/rc5/owner-command-center-integration.spec.ts`

## Per-failure classification

| Failure | Selector/action | Expected | Actual | Classification | Root cause | Fix surface | Redeploy needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `branch_health` | `getByTestId("branch-health")` | Panel visible | testid absent | `TEST_HARNESS_DEFECT` | Product uses `branch-health-panel` | harness | no |
| `profitability_truth` | `getByTestId("profitability-truth")` | Panel visible | testid absent | `TEST_HARNESS_DEFECT` | Product uses `profitability-truth-panel` (lanes already PASS via text) | harness | no |
| `mode_pre-open` | `getByRole("button", /Pre-open/i)` | Mode selectable | 0 buttons | `TEST_HARNESS_DEFECT` | Modes are `role=radio` inside labels (`command-mode-selector`) | harness | no |
| `mode_live_operations` | `getByRole("button", /Live Operations/i)` | Mode selectable | 0 buttons | `TEST_HARNESS_DEFECT` | same as above | harness | no |
| `mode_closing` | `getByRole("button", /Closing/i)` | Mode selectable | 0 buttons | `TEST_HARNESS_DEFECT` | same as above | harness | no |
| `refresh` | `occ.count()` after `reload` + 1.5s | OCC visible | timeout/false | `TEST_HARNESS_DEFECT` | Wait too short; e2e uses 60s visibility wait after reload | harness | no |
| `a11y_pre-open` serious=1 | axe after failed mode click | 0 serious | 1 serious | `EXPECTATION_OR_CONTRACT_MISMATCH` → re-verify after harness fix | Mode click failed; first axe likely scanned unsettled/default Pre-open without wait; rule ID not captured by harness | harness diagnostics + re-scan; runtime only if serious reproduces after correct mode settle | TBD |
| `logout_and_protect` | logout then goto dashboard | OCC denied + login/staff-access gate; no staff-home bounce | After harness fix: logout settles to email; goto dashboard lands `/admin/home/staff` with `occ=0` | `PRODUCT_RUNTIME_DEFECT` | `AdminDashboard` role-home effect runs `resolveStaffHome` for signed-out empty principal → `/admin/home/staff` | runtime: skip bounce when `!isAuthenticated`; harness/e2e assert no staff-home bounce | **yes** (website) |

## Capability evidence already PASS (do not weaken)

- What Changed wording
- Exception Center
- Approval Inbox
- EOD Pack + CSV/JSON/print downloads
- Operational Estimate
- Accounting Posted distinction
- Mobile dashboard (no overflow)
- Live / Closing axe: 0 critical / 0 serious (moderate advisories retained)

## Decision path

**Harness-only path** unless Pre-open serious axe **reproduces** after corrected mode selection + OCC settle wait.

No Production promote/rollback during diagnosis.
