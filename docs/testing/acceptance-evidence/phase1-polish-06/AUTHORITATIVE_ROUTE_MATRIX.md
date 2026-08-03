# Authoritative route matrix (POLISH-06)

**Source:** `apps/website/client/src/App.tsx`  
**Registered path count:** 87  
**Generated:** 2026-08-03

Coverage classes: FULLY_TESTED · COVERED_BY_SHARED_LAYOUT · COVERED_BY_ROUTE_FAMILY · AUTHORIZATION_ONLY · DEAD_OR_UNREACHABLE · DEFERRED · BLOCKED_BY_MISSING_FIXTURE · REQUIRES_MANUAL_REVIEW

No registered route is omitted.

| Route | Family | Coverage | Notes |
| --- | --- | --- | --- |
| `/` | PUBLIC | FULLY_TESTED | Public axe matrix |
| `/menu/:productId` | PUBLIC | FULLY_TESTED | Public axe matrix |
| `/menu` | PUBLIC | FULLY_TESTED | Public axe matrix |
| `/about` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Marketing family |
| `/contact` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Marketing family |
| `/branches` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Marketing family |
| `/book/cancel` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/book` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/checkout` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/order-success/:orderNumber` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/track/:orderNumber` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/track` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Commerce/reservation family |
| `/login` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Auth forms — login FULLY in public axe; reset family |
| `/register` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Customer auth family |
| `/forgot-password` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Customer auth family |
| `/reset-password` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Auth forms — login FULLY in public axe; reset family |
| `/auth/callback` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Customer auth family |
| `/welcome` | PUBLIC | COVERED_BY_ROUTE_FAMILY | Customer auth family |
| `/staff/accept` | STAFF | COVERED_BY_ROUTE_FAMILY | Staff entry |
| `/staff/login` | STAFF | COVERED_BY_ROUTE_FAMILY | Staff entry |
| `/supplier/login` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/supplier/purchase-orders/:id` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/supplier/purchase-orders` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/supplier/documents` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/supplier/profile` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/supplier` | SUPPLIER | COVERED_BY_ROUTE_FAMILY | Supplier portal foundation |
| `/ops/orders` | OPS_LEGACY | COVERED_BY_ROUTE_FAMILY | Legacy ops — Admin preferred |
| `/ops/kitchen` | OPS_LEGACY | COVERED_BY_ROUTE_FAMILY | Legacy ops — Admin preferred |
| `/ops/dispatch` | OPS_LEGACY | COVERED_BY_ROUTE_FAMILY | Legacy ops — Admin preferred |
| `/ops` | OPS_LEGACY | COVERED_BY_ROUTE_FAMILY | Legacy ops — Admin preferred |
| `/admin/login` | PUBLIC | FULLY_TESTED | Public axe + login form |
| `/admin/unauthorized` | ADMIN_SHELL | AUTHORIZATION_ONLY | Access denied |
| `/admin/dashboard` | OWNER | FULLY_TESTED | Owner Command Center + prior QA/DASH axe |
| `/admin/orders/:orderId` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/orders` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/kitchen` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/delivery` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/pos` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/whatsapp` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/menu` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/inventory` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/purchasing` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/supplier-operations` | DEAD_OR_UNREACHABLE | DEAD_OR_UNREACHABLE | Legacy/coming-soon or unused alias |
| `/admin/crm` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/customers` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/loyalty` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/marketing` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/promotions` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/hr` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/staff` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/finance` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/reports` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/settings` | BUSINESS_ADMIN | COVERED_BY_ROUTE_FAMILY | Business admin — single shell h1 + shared states |
| `/admin/branch` | ROLE_BM | COVERED_BY_ROUTE_FAMILY | Branch manager home |
| `/admin/kitchen-dashboard` | ROLE_KDS | COVERED_BY_ROUTE_FAMILY | KDS specialized shell |
| `/admin/home/cashier` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/home/host` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/home/waiter` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/home/delivery` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/home/staff` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/home/config` | ROLE_HOME | COVERED_BY_ROUTE_FAMILY | Role home shells |
| `/admin/floor` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/floor-plan` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/reservations` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/waitlist` | OPERATIONS | COVERED_BY_ROUTE_FAMILY | Ops family — shared shell + header contracts |
| `/admin/ai-team` | FOUNDATION | REQUIRES_MANUAL_REVIEW | Mianx foundation |
| `/admin/support` | DEFERRED | DEFERRED | Coming Soon / Phase 2 surface |
| `/admin/branches` | DEFERRED | DEFERRED | Coming Soon / Phase 2 surface |
| `/admin/ai-command-center` | DEFERRED | DEFERRED | Coming Soon / Phase 2 surface |
| `/admin/integrations` | DEFERRED | DEFERRED | Coming Soon / Phase 2 surface |
| `/admin` | ADMIN_SHELL | AUTHORIZATION_ONLY | resolveStaffHome redirect |
| `/my-telepizza/orders` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/addresses` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/rewards` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/account/profile` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/account/security` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/account/notifications` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/account` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza/favorites` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/my-telepizza` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/account` | DEAD_OR_UNREACHABLE | DEAD_OR_UNREACHABLE | Legacy/coming-soon or unused alias |
| `/orders` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/favorites` | DEAD_OR_UNREACHABLE | DEAD_OR_UNREACHABLE | Legacy/coming-soon or unused alias |
| `/settings` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/loyalty` | DEAD_OR_UNREACHABLE | DEAD_OR_UNREACHABLE | Legacy/coming-soon or unused alias |
| `/notifications` | CUSTOMER | COVERED_BY_ROUTE_FAMILY | Customer hub family |
| `/404` | SYSTEM | COVERED_BY_SHARED_LAYOUT | Not found |

## Family totals

| Family | Count |
| --- | --- |
| PUBLIC | 19 |
| STAFF | 2 |
| SUPPLIER | 6 |
| OPS_LEGACY | 4 |
| ADMIN_SHELL | 2 |
| OWNER | 1 |
| OPERATIONS | 10 |
| BUSINESS_ADMIN | 13 |
| DEAD_OR_UNREACHABLE | 4 |
| ROLE_BM | 1 |
| ROLE_KDS | 1 |
| ROLE_HOME | 6 |
| FOUNDATION | 1 |
| DEFERRED | 4 |
| CUSTOMER | 12 |
| SYSTEM | 1 |
