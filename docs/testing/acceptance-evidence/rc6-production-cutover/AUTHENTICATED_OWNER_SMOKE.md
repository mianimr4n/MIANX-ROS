# RC6 Phase 1 — Authenticated Owner Production smoke

**Status:** `PASS`
**Target:** `https://telepizza-website.vercel.app`
**UTC:** `2026-08-03T00:44:05Z`
**Historical runtime (first green):** `b14163ccbc82fca0b2856ea137bddb746ed5716b` / `dpl_Hi35GYu…`
**Release re-verify runtime:** `830dbc8b5916cc0a724a0d7489a0e34387a26f78` / `dpl_BtPH8…` (`apps/website` ≡ tip)
**Deploy action (QA-04 window):** `ALREADY_ACTIVE` (git Production on PR #191 merge)

## Summary

| Field | Value |
| --- | --- |
| `ok` | `true` |
| `failCount` | `0` |
| Prior failure diagnosis | `OWNER_SMOKE_FAILURE_DIAGNOSIS.md` (7 harness + 1 product defect; all resolved) |

## Check results

| Check | Result |
| --- | --- |
| branch_health | PASS |
| profitability_truth | PASS |
| mode_pre_open | PASS |
| mode_live_operations | PASS |
| mode_closing | PASS |
| refresh | PASS |
| a11y all modes | PASS (0 critical / 0 serious) |
| mobile | PASS |
| logout_and_protect | PASS — `/admin/dashboard` after logout shows staff-access-required; `occ=0`; no staff-home bounce |

## Fix applied (QA-04)

`apps/website/client/src/pages/admin/AdminDashboard.tsx` — do not role-route signed-out principals.

## Repository regression

- `tests/website/rc6-owner-smoke-contract.test.mjs`
- `e2e/rc5/owner-command-center-integration.spec.ts`

## Explicit non-changes

- no backend deploy
- no migrations / Production SQL
- no provider/secret changes
