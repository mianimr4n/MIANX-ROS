# Campaign Lifecycle

## Depth statuses

`draft` → `awaiting_approval` → `approved` → `scheduled` | `running` → `paused` | `completed` | `cancelled`

Terminal: `completed`, `cancelled` (no further transitions).

## Queue gate

Submissions allowed only when status ∈ `{ approved, scheduled, running }`.

Unapproved queue → `409 CAMPAIGN_NOT_APPROVED`.

## APIs

- `POST /api/v1/admin/marketing/campaigns/depth`
- `PATCH /api/v1/admin/marketing/campaigns/:id/lifecycle`
- Queue uses provider gate (adapter validateConfig — always unconfigured today)

## Honesty

Provider delivery is never claimed. UI notes awaiting_approval/approved before queue.
