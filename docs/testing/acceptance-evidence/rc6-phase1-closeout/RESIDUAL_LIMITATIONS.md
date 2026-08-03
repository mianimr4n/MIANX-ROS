# RC6 Phase 1 — Residual limitations

Honest inventory of what Phase 1 does **not** complete. These are not cutover blockers unless noted.

## Architecture / data

| Limitation | Detail |
| --- | --- |
| No universal event store | What Changed is device-local review baseline only |
| What Changed device-local | Not org-wide immutable audit trail |
| Incomplete audit history | Exception Center / approvals lack full historical depth |
| EOD preview never final | Export/print preview only; never FINAL/CLOSED state |

## Accessibility

| Limitation | Detail |
| --- | --- |
| No full admin WCAG | Only public + Owner Command Center gated (0/0 critical/serious) |
| Moderate a11y advisories | May exist on ungated admin routes; not certified away |

## Observability

| Limitation | Detail |
| --- | --- |
| Alerts not enabled | Not a release claim |
| APM not enabled | Not a release claim |
| Paging not enabled | Not a release claim |
| Bulk log export not proven | Diagnostic export not verified at scale |

## Product scope deferred

| Module | Status |
| --- | --- |
| Delivery / Rider | Partial — Phase 2 |
| Settings | Partial — Phase 2 |
| Full accounting profitability | Deferred |
| WhatsApp ops integration | Deferred |
| CRM | Deferred |
| Recipe / COGS | Deferred |
| GPS / POD / COD | Deferred |

## Release mechanics

| Item | Status |
| --- | --- |
| `v1.5.0` annotated tag | **created** — object `d52f3a47…`; peeled `830dbc8…` |
| GitHub Release object | **none** (tag-only; retained limitation) |
| Backend deployment in cutover | none |
| Migration / Production SQL in cutover | none |

**Stance:** Phase 1 delivers verified Owner Command Center on Production and is released as `v1.5.0`; ERP breadth and operational maturity remain future work.
