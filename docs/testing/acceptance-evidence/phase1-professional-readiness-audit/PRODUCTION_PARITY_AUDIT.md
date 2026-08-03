# Phase 1.1 — Production parity audit

## Anchors

| Surface | Value |
| --- | --- |
| Tag | `v1.5.0` → `830dbc8…` |
| Vercel | `dpl_BtPH8…` @ `830dbc8…` |
| Feature tip | `b14163c…` (`apps/website` ≡) |
| API observed | `830dbc8…` |

## Read-only Production checks (sanitized)

| Check | Result |
| --- | --- |
| Public smoke 8/8 | PASS |
| Public a11y 0/0 | PASS |
| Entry gzip / no admin eager | PASS |
| API healthz/readyz | PASS |
| Authenticated Owner deep matrix | Not re-run in this PR (prior release evidence PASS); no mutations |

## Drift

| Item | Notes |
| --- | --- |
| Living docs on main | Still partially pre-tag until PR #193 merges |
| Repository tip after this audit PR | Will advance with docs only |

## Material mismatches

None between Production deploy commit and `v1.5.0` peel. Website runtime files match QA-04 tip.
