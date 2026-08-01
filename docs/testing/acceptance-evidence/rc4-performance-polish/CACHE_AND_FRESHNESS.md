# Cache and Freshness

## Policy (documented; no shared cross-tenant cache introduced)

| Surface | Key scope | TTL / refresh | Stale behavior | Security |
| --- | --- | --- | --- | --- |
| Live ops (orders/kitchen/delivery) | Branch + principal via `useOperationalData` | Poll / manual refresh | STALE badge keeps last value | Auth + branch |
| Owner Dashboard | Principal + branch selection | Fetch on load / refresh | Unavailable vs zero distinct | Auth |
| Analytics / Reports | Principal + filters | On demand | UNAVAILABLE when incomplete | Auth; no shared browser cache of payroll/finance blobs |
| Menu catalog | Device + optional live reload | Catalog context | Bundled fallback honest | Public catalog |
| Loyalty balance | Customer / staff token | On demand | Empty / unavailable honest | Customer sees own; staff scoped |
| Payroll / Finance | Staff token + branch | On demand | No client TTL cache | Never shared across users |
| Supplier Portal | Supplier principal | On demand | Portal-scoped only | Supplier isolation |

## Rules

- No React Query/SWR global cache added in this slice.
- Never share cached tenant data across users/branches/suppliers.
- Sensitive payroll/finance responses not put in a shared browser cache.
