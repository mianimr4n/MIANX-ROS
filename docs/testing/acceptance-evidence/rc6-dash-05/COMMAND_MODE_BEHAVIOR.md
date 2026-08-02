# RC6-DASH-05 — Command mode behavior

## Unchanged across modes

- Source metrics
- Weights
- Overall score
- Coverage calculation

## Mode may change

- Explanation / component order via `emphasizeBranchHealthForMode`
- Highlighted pressure contributors
- Recommended drill-down emphasis order

| Mode | Emphasis order (first) |
| --- | --- |
| PRE_OPEN | Stock, confirmation, kitchen |
| LIVE_OPERATIONS | Kitchen, delivery late, dispatch |
| CLOSING | Confirmation, dispatch, delivery, cash |

Branch Health section is present in every command mode composition after Approval Inbox.
