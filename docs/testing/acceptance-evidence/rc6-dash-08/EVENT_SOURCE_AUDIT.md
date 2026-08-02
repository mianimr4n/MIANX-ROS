# RC6-DASH-08 — Event / history source audit

**Baseline (post–DASH-07 merge):** `1dcc8ba076ac0aee56de021e3c30b156ebc8c068`  
**Branch:** `feature/rc6-dash-08-what-changed-timeline`  
**Database impact:** NONE

| Event family | Source | Persisted | Actor reliable | Branch scoped | Timestamp | Safe for DASH-08 | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unified domain_events | — | no | — | — | — | no | NOT_PRESENT |
| Previous login watermark | `users.last_login_at` unused; Auth `last_sign_in_at` not Owner-wired | schema only | no | n/a | ambiguous | no as “last login” | SCHEMA_ONLY / PARTIAL_SOURCE |
| Browser review baseline | `localStorage` `telepizza.admin.whatChanged.v1` | device | n/a | yes (branchId) | reviewedAt | yes | BROWSER_LOCAL_COMPARISON |
| Ops KPI deltas | Operations dashboard KPIs | no | n/a | yes | derived | yes | VERIFIED_DERIVED_CHANGE |
| Exception / approval / health deltas | DASH-01/04/05 aggregates | no | n/a | yes | derived | yes | VERIFIED_DERIVED_CHANGE |
| Recent orders list | Admin orders list | entity rows | no | yes | created/updated | yes (redacted titles) | VERIFIED_DERIVED_CHANGE |
| Kitchen tickets | Kitchen list timestamps | entity rows | no | yes | ready/accepted/updated | yes | VERIFIED_DERIVED_CHANGE |
| Delivery assignments | Delivery list | entity rows | no | yes | assigned/picked/delivered | yes | VERIFIED_DERIVED_CHANGE |
| Stock movements | Inventory movements | entity rows | no | yes | createdAt | yes (SKU omitted) | VERIFIED_DERIVED_CHANGE |
| Purchase orders | Purchasing list | entity rows | no | yes | updated/created | yes | VERIFIED_DERIVED_CHANGE |
| HR employee updates | HR list | yes | identity present | yes | updatedAt | **no** (PII) | DEFERRED / excluded |
| `order_status_logs` | Per-order API only | yes | partial | yes | yes | not as org feed | PARTIAL_SOURCE |
| Domain `*_events` audit tables | migrations | yes | varies | varies | yes | not unified product feed | PARTIAL_SOURCE |
| API observability logs | backend observability | logs | n/a | n/a | yes | no | LOG_ONLY_NOT_PRODUCT_SOURCE |
| Settings history | — | no | — | — | — | no | NOT_PRESENT |
| Finance activity feed | finance gated | — | — | — | — | restricted / deferred | PERMISSION_RESTRICTED / DEFERRED |
