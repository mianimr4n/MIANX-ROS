# RC6 v1.5.0 — Stale reference audit

Classification legend:

- `CURRENT_STATE_STALE` — living/current wording contradicted final anchors (corrected in this PR)
- `HISTORICAL_EVIDENCE_KEEP` — true at the time; retained with historical labeling
- `CORRECT_CURRENT_STATE` — already matched final anchors
- `NEEDS_CLARIFICATION` — needed tip vs deploy commit distinction (clarified)

## Summary

| Class | Count (approx) | Action |
| --- | --- | --- |
| CURRENT_STATE_STALE | many living + closeout/cutover current rows | updated to `v1.5.0` / `830dbc8…` / `dpl_BtPH8…` |
| HISTORICAL_EVIDENCE_KEEP | QA-04 smoke window, first-green deploy `dpl_Hi35GY…`, RC5 cutover rows | retained as historical |
| CORRECT_CURRENT_STATE | residual limitations (except tag row), migration tip | kept / tag row updated |
| NEEDS_CLARIFICATION | tip vs active deploy commit | distinguished everywhere current-state |

## Stale current-state examples (corrected)

| Location | Was | Now |
| --- | --- | --- |
| `REPOSITORY_STATUS.md` | Production `b14163c…` / `dpl_Hi35GY…`; `v1.5.0` pending | Released `v1.5.0`; deploy `830dbc8…` / `dpl_BtPH8…` |
| `RELEASE_HISTORY.md` | Latest tag `v1.4.0`; closeout in progress | Latest tag `v1.5.0`; Production commit `830dbc8…` |
| `RC6_ROADMAP.md` / `RC6_BASELINE.md` / `RC6_CAPABILITY_TRUTH.md` | tip/deploy conflated or outdated | current released anchors |
| `RC6_COMMAND_CENTER_TRACEABILITY.md` | “cutover pending” | Production-verified + released |
| cutover/closeout “current active” tables | `dpl_Hi35GY…` / `b14163c…` as active | `dpl_BtPH8…` / `830dbc8…` as active |
| `RESIDUAL_LIMITATIONS.md` / `RELEASE_RECOMMENDATION.md` | tag not yet created | tag created; GitHub Release still none |

## Historical references preserved

| Location | Anchor retained | Why |
| --- | --- | --- |
| `AUTHENTICATED_OWNER_SMOKE.md` | first-green `b14163c…` / `dpl_Hi35GY…` @ `2026-08-03T00:44:05Z` | historical smoke window |
| `PUBLIC_ROUTE_SMOKE.md` | historical runtime SHA | same |
| `rc6-qa-04/**` | QA-04 defect/fix evidence | slice history |
| `RC6_BASELINE.md` RC5 rows | `152ce40…` / `dpl_7xaV34…` | RC5 cutover history |
| Rollback tables | `dpl_Hi35GY…` / `dpl_HhvEuM…` | retained rollback candidates |

## Explicitly not rewritten

- Per-slice DASH/QA evidence packs (except living planning headers)
- Owner smoke failure diagnosis narrative
- Residual product/architecture limitations (still open)
