# RC6-DASH-02 — Filter contract

| Context | Propagation |
| --- | --- |
| Branch | Owner branch selector context — destinations read `branchIdFilter` |
| Date range | **Not propagated** — orders date filter is Planned for Phase 2 |
| Order status | `?status=` when destination supports |
| Kitchen view | `?view=queue\|delayed` |
| Delivery status | `?status=picked-up` (closest honest out-for-delivery) |
| Low stock | `?lowStock=1` |
| Invalid status | sanitized to empty |

Client filters are not authorization.
