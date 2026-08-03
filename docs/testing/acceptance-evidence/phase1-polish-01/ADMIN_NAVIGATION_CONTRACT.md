# POLISH-01 — Admin navigation contract

**Authority:** Capability gates remain in `apps/website/client/src/lib/admin-access.ts` (`getAdminNavItems`, `filterVisibleAdminNav`, `ownerOnly`, `resolveStaffHome`).  
**Presentation:** `apps/website/client/src/lib/admin-nav-registry.ts`

| Concern | Implementation |
| --- | --- |
| Stable IDs | Existing `AdminNavKey` |
| Labels / href / group | Unchanged blueprint in `admin-access.ts` |
| Active match | `isAdminNavItemActive` (incl. CRM/marketing/HR aliases) |
| Group order | `ADMIN_NAV_GROUP_ORDER` |
| Keywords | `ADMIN_NAV_KEYWORDS` (module navigator only) |
| Role visibility | Still `filterVisibleAdminNav` — UI hide ≠ auth |

Groups retained (product language): Overview, Operations, Commerce, Customers, Management, Intelligence, System.
