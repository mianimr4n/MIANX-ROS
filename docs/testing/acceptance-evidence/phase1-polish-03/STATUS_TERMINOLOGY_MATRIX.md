# POLISH-03 — Status terminology matrix

Source of truth: repository enums. Presentation helpers in `apps/website/client/src/lib/operations-status-labels.ts`.

## Order

| Enum | Presentation label |
| --- | --- |
| pending | Pending confirmation |
| confirmed | Accepted |
| preparing | Preparing |
| ready | Ready |
| dispatched | Out for delivery |
| completed | Completed |
| cancelled | Cancelled |

## Delivery assignment

| Enum | Presentation label |
| --- | --- |
| pending | Waiting for rider |
| assigned | Assigned |
| picked-up | Picked up / out for delivery |
| delivered | Delivered |
| failed | Failed |
| cancelled | Cancelled |

## Kitchen ticket

| Enum | Presentation label |
| --- | --- |
| queued | Queued |
| accepted | Accepted |
| preparing | Preparing |
| ready | Ready |
| completed | Completed |
| cancelled | Cancelled |

## Data states

LOADING · LIVE · EMPTY · FILTERED_EMPTY · PARTIAL · STALE · UNAVAILABLE · CONFIGURATION_REQUIRED · PERMISSION_RESTRICTED · ERROR

Distinct statuses are not merged for visual simplicity.
