# RC6 Phase 1 — Feature and contract matrix

**Production SHA:** `b14163ccbc82fca0b2856ea137bddb746ed5716b`

| Capability | Contract / behavior | Phase 1 status | Limitation |
| --- | --- | --- | --- |
| Owner Command Center | Integrated DASH-01…08 across PRE_OPEN / LIVE / CLOSING | Verified Production | EOD preview never FINAL/CLOSED |
| What Changed | Device-local review baseline | Implemented | Not org-wide event store |
| Exception Center | Read-only aggregation | Implemented | Incomplete audit history |
| Approval Inbox | Read-only queue surface | Implemented | Not full workflow engine |
| Branch Health | Panel + KPI honesty | Implemented | Depends on existing API contracts |
| Profitability truth | Ops ≠ posted finance labels | Implemented | Full accounting profitability deferred |
| Mode emphasis | Presentation-only mode switch | Implemented | No backend mode state |
| Public menu / cart | WhatsApp order flow | Unchanged from RC5 | — |
| Admin login / logout | Session + route guards | Verified Production | — |
| Delivery / Rider | — | Partial / deferred | Phase 2 |
| Settings | — | Partial / deferred | Phase 2 |
| CRM | — | Deferred | Future |
| WhatsApp ops | — | Deferred | Future |
| Recipe / COGS | — | Deferred | Future |
| GPS / POD / COD | — | Deferred | Future |
| Universal event store | — | Not implemented | Residual |
| Alerting / APM / paging | — | Not enabled | Residual |

**Honesty rule:** Implemented = repository + verified where marked; Deferred = not claimed complete.
