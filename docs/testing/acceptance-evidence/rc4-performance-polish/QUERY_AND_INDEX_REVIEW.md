# Query and Index Review

## Reviewed

| Area | Finding | Action |
| --- | --- | --- |
| Loyalty transactions liability | Large unbounded-style select | Application-side paging by type (no new index) |
| Loyalty rewards list | limit 500 | Reduced to 100 |
| Orders/analytics | Existing indexes + paging from prior RC4 slices | No change |
| Payroll / finance / documents | Prior RC migrations | No speculative indexes |

## Migrations in this slice

**None.** No proven missing index with local EXPLAIN evidence required a new migration. Speculative indexes avoided per mission rules.
