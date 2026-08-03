# RC6 Phase 1 — Production verification summary

**QA-04 Owner smoke UTC:** `2026-08-03T00:44:05Z` @ feature tip `b14163c…` / `dpl_Hi35GY…` (historical first green)
**Release re-verify:** public smoke/a11y + Owner smoke `failCount: 0` on Production commit `830dbc8…` / `dpl_BtPH8…`
**Released tag:** `v1.5.0`

| Verification | Result | Detail |
| --- | --- | --- |
| Anchor reconciliation | PASS | Active alias → `dpl_BtPH8…` → `830dbc8…` |
| Public route smoke | PASS | 8/8 (incl. re-verify on release commit) |
| Owner smoke | PASS | `ok: true`, `failCount: 0` |
| Logout / protected route | PASS | staff-access-required; no staff-home bounce |
| Public a11y | PASS | 0 critical / 0 serious |
| Owner a11y (3 modes) | PASS | 0 critical / 0 serious |
| Performance sanity | PASS | entry gzip ~251.58 kB |
| API `/healthz` | PASS | 200 |
| API `/readyz` | PASS | 200, `issues: []` |
| Backend deploy (Phase 1) | N/A | none intentional |
| Database action | N/A | none required |
| Rollback exercised | No | prior deploy retained |
| CI on `830dbc8…` | PASS | `30775599992` |

## Prior local validation

Green on prior candidate `bf5912c…` (`pnpm check`, `pnpm test`, DASH + QA suites, Owner e2e 3×). QA-04 CI `30775027483` success post-merge.

**Overall:** Production verification **PASS WITH LIMITATIONS** — see `RESIDUAL_LIMITATIONS.md`. Anchor honesty: `../rc6-v1.5.0-anchor-sync/`.
