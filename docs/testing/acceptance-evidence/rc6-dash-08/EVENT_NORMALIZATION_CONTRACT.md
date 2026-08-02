# Event normalization contract

Runtime fields: id, eventType, domain, title, summary, occurredAt, organizationId (null), branchId/Name, actorType (`unavailable`), actorDisplaySafe (`Actor unavailable`), entityType, severity, source, trustState, persistenceState (`DERIVED` for list-derived; `BROWSER_LOCAL` for metric diffs), correlationReferenceSafe (null), drillDown, limitation.

Rules:

- Retain source event type internally (`orders.recent_status`, etc.)
- Concise Owner titles without order contents or employee identity
- Deduplicate by id; sort `occurredAt` desc, then id asc
- Do not invent actors; do not edit/mutate events
- Do not derive a historical event from “latest status alone” without a timestamped list row
