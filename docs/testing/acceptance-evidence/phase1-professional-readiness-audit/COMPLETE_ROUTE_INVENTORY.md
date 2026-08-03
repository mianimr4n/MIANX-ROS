# Phase 1.1 — Complete route inventory

**Source of truth:** `apps/website/client/src/App.tsx` (wouter)  
**Nav/gates:** `apps/website/client/src/lib/admin-access.ts`  
**Registered `<Route>` count (approx):** 87 path declarations

Maturity uses audit vocabulary: LIVE | PARTIAL_LIVE | FOUNDATION | UI_ONLY | DEFERRED | INACCESSIBLE | DEAD_ROUTE | UNKNOWN_REQUIRES_AUDIT

| Route | Role | Capability | Data source | Mutation | Maturity |
| --- | --- | --- | --- | --- | --- |
| `/` | PUBLIC | Marketing home | Bundled + optional API | N | LIVE |
| `/menu` | PUBLIC | Menu browse | Catalog API / bundle | N | LIVE |
| `/menu/:productId` | PUBLIC | Product detail | Catalog | N | LIVE |
| `/about` `/contact` `/branches` | PUBLIC | Marketing | Static/content | N | LIVE |
| `/book` `/book/cancel` | PUBLIC | Reservations public | Reservations API | partial | PARTIAL_LIVE |
| `/checkout` | PUBLIC | Checkout | Orders API | Y | PARTIAL_LIVE |
| `/order-success/:orderNumber` | PUBLIC | Confirmation | Order | N | PARTIAL_LIVE |
| `/track` `/track/:orderNumber` | PUBLIC | Tracking | Orders | N | PARTIAL_LIVE |
| `/login` `/register` `/forgot-password` `/reset-password` `/auth/callback` `/welcome` | AUTH | Customer auth | Supabase Auth | partial | PARTIAL_LIVE |
| `/my-telepizza/*` | AUTH | Customer hub | Me APIs | partial | PARTIAL_LIVE |
| `/orders` `/settings` `/notifications` | AUTH | Legacy customer | Me APIs | partial | PARTIAL_LIVE |
| `/account` | AUTH | Redirect hub | — | N | DEAD_ROUTE |
| `/favorites` | AUTH | Favorites alias | — | Y | DEAD_ROUTE |
| `/loyalty` | PUBLIC | Coming Soon | — | N | DEAD_ROUTE |
| `/staff/login` `/staff/accept` | AUTH | Staff entry | Auth/invite | partial | PARTIAL_LIVE |
| `/ops` `/ops/orders` `/ops/kitchen` `/ops/dispatch` | STAFF | Legacy ops | Ops APIs | Y | PARTIAL_LIVE |
| `/supplier/*` | SUPPLIER | Supplier portal | Supplier APIs | partial | FOUNDATION |
| `/admin/login` | PUBLIC | Owner login | Auth | N | LIVE |
| `/admin` | STAFF | Home redirect | `resolveStaffHome` | N | LIVE |
| `/admin/unauthorized` | STAFF | Access denied | — | N | LIVE |
| `/admin/dashboard` | OWNER / order.manage | Command Center | Admin KPIs | partial | LIVE |
| `/admin/branch` | BRANCH_MANAGER | BM home | Branch APIs | partial | PARTIAL_LIVE |
| `/admin/kitchen-dashboard` | KITCHEN | KDS home | Kitchen | partial | PARTIAL_LIVE |
| `/admin/home/*` | Role homes | D4 homes | Role APIs | N | PARTIAL_LIVE |
| `/admin/orders` `/admin/orders/:id` | order.manage | Orders | Admin orders | partial | PARTIAL_LIVE |
| `/admin/kitchen` | Kitchen roles | Kitchen ERP | Tickets | Y | PARTIAL_LIVE |
| `/admin/delivery` | Delivery roles | Dispatch | Deliveries | Y | PARTIAL_LIVE |
| `/admin/pos` | Cashier/POS | POS | POS orders | Y | FOUNDATION |
| `/admin/whatsapp` | order.manage | WA center | Orders filter | N | PARTIAL_LIVE |
| `/admin/floor` `/admin/reservations` `/admin/waitlist` `/admin/floor-plan` | Host/floor | Floor ops | Dine-in | Y | FOUNDATION |
| `/admin/menu` | menu.write | Menu admin | Menu write | Y | PARTIAL_LIVE |
| `/admin/inventory` | inventory.manage | Inventory | Inventory APIs | Y | FOUNDATION |
| `/admin/purchasing` | purchasing.manage | Purchasing | PO/GRN | Y | FOUNDATION |
| `/admin/supplier-operations` | purchasing | Supplier review | Purchasing | Y | DEAD_ROUTE |
| `/admin/marketing` `/admin/promotions` | marketing | Coupons | Marketing | partial | PARTIAL_LIVE |
| `/admin/crm` `/admin/customers` | order.manage | CRM | Orders-derived | N | PARTIAL_LIVE |
| `/admin/loyalty` | loyalty.manage | Loyalty | Loyalty APIs | Y | FOUNDATION |
| `/admin/hr` `/admin/staff` | staff.* | HR | HR APIs | Y | FOUNDATION |
| `/admin/finance` | finance.manage | Finance | Finance APIs | partial | PARTIAL_LIVE |
| `/admin/reports` | reports.read | Reports | Analytics | partial | FOUNDATION |
| `/admin/settings` | admin.access | Settings | Org/branch + stubs | partial | PARTIAL_LIVE |
| `/admin/ai-team` | super-admin | Mianx | AI read APIs | N | FOUNDATION |
| `/admin/support` `/admin/ai-command-center` `/admin/integrations` | STAFF | Coming Soon | — | N | DEAD_ROUTE / DEFERRED |
| `/admin/branches` | STAFF | Coming Soon | — | N | DEFERRED |

Full gate citations: see explore inventory derived from `App.tsx` + `admin-access.ts` (audit working notes).
