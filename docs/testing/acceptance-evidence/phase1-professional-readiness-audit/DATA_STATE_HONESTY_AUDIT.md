# Phase 1.1 — Data-state honesty audit

## Recommended cross-product vocabulary

| State | Meaning | Must not look like |
| --- | --- | --- |
| loading | Fetch in flight | empty / zero |
| loaded | Success with data | — |
| empty | Success, zero records | error / unavailable |
| filtered_empty | Filters exclude all | global empty |
| partial | Some sources ok | complete LIVE |
| stale | Data older than freshness SLA | fresh |
| permission_restricted | Authz deny | empty |
| unavailable | Source failed/missing | zero |
| configuration_missing | Setup required | broken code |
| source_failed | Request error | all-clear |
| unsupported | Capability not in product | Available |
| deferred | Phase 2+ | active control |
| zero_value | Real numeric zero | empty catalog |

## Critical violations found

| ID | Severity | Violation |
| --- | --- | --- |
| P11-STATE-01 | P1 | Inventory low-stock clear when no stock items (`unavailable/empty` → all-clear) |
| P11-STATE-02 | P1 | Settings Available for unsupported-in-place categories |
| P11-STATE-03 | P2 | Finance empty GL panels need explicit empty vs unavailable |

Command Center generally distinguishes estimated vs accounting-posted — retain and extend pattern.
