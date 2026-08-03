# RC6 Phase 1 — Production verification summary

**UTC window:** `2026-08-03T00:44:05Z`  
**Website SHA:** `b14163ccbc82fca0b2856ea137bddb746ed5716b`

| Verification | Result | Detail |
| --- | --- | --- |
| Anchor reconciliation | PASS | `ALREADY_ACTIVE` on `dpl_Hi35GYu…` |
| Public route smoke | PASS | 8/8 |
| Owner smoke | PASS | `ok: true`, `failCount: 0` |
| Public a11y | PASS | 0 critical / 0 serious |
| Owner a11y (3 modes) | PASS | 0 critical / 0 serious |
| Performance sanity | PASS | entry gzip ~251.58 kB |
| API `/healthz` | PASS | 200 |
| API `/readyz` | PASS | 200, `issues: []` |
| Backend deploy (Phase 1) | N/A | none performed |
| Database action | N/A | none required |
| Rollback exercised | No | target retained `bf5912c…` |

## Prior local validation

Green on prior candidate `bf5912c…` (`pnpm check`, `pnpm test`, DASH + QA suites, Owner e2e 3×). QA-04 CI `30775027483` success post-merge.

**Overall:** Production verification **PASS WITH LIMITATIONS** — see `RESIDUAL_LIMITATIONS.md`.
