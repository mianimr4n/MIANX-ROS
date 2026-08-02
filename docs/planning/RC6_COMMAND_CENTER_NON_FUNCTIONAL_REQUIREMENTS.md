# RC6 Command Center Non-Functional Requirements

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`

## Accessibility

| Requirement | Contract |
| --- | --- |
| Keyboard | All interactive widgets operable without pointer |
| Visible focus | Focus rings on Command Center chrome |
| Names | Icon-only controls named; no nested unnamed buttons (RC6-A11Y-02 lessons) |
| Touch | ≥44×44 px primary actions |
| Non-color status | Severity uses text/icon + color |
| Mobile | Zone 1–3 prioritized; tables progressive disclosure |

## Performance

| Requirement | Target (proposed) |
| --- | --- |
| Initial shell | Interactive shell without waiting all zones |
| Lazy zones | Zones 4–6 deferred |
| Widget timeout | Fail to UNAVAILABLE; do not block shell |
| Batching | Prefer batched attention endpoints |
| Polling | Fast for live ops (≤15–60s); slow for analytics |
| Stale cancellation | Abort superseded requests |
| Payload budget | Avoid unbounded lists in summary cards |
| Degraded mode | Show last good + STALE |

## Security

| Requirement | Contract |
| --- | --- |
| Tenant/branch isolation | Enforce server-side |
| RLS | Preserve harden design; no blanket anon writes |
| PII masking | Phone/address/payroll masked on cards |
| Re-authentication | High-risk actions |
| Approval | Per Action Registry |
| Audit | Unified Event Model |
| Secrets | Never in Git/UI |
| Export | Role-gated; audited |

## Reliability

| Requirement | Contract |
| --- | --- |
| Idempotency | Mutation APIs support keys where applicable |
| Retry | Safe retries only |
| Provider outage | Partial UNAVAILABLE |
| Stale / partial data | Labeled |
| No fake zero | Errors ≠ 0 |
| Rollback | Config via new version; financial via compensating entries |

## Observability

| Requirement | Contract |
| --- | --- |
| Correlation IDs | On API calls |
| Widget failure visibility | Per-widget error |
| Error rates | Tracked for attention endpoints |
| Operator diagnostics | `/healthz` `/readyz` + runbooks |
| Alert ownership | Founder-gated OPS-02 |

## Relation to RC6-A11Y-02

Public surfaces remediated; Command Center new UI must not regress naming/contrast/touch patterns.
