# RC1 Module Status

Classification from repository audit (routes, pages, APIs).

| Module | Status | Primary routes | Notes |
| --- | --- | --- | --- |
| Customer Website | Partial | `/`, `/menu`, `/checkout`, account routes | Core order path works; depth varies |
| Admin Shell | Complete | `/admin`, `/admin/login` | Role redirect |
| RBAC helpers | Complete | cross-cutting | Server remains authoritative |
| Executive Dashboard | Partial | `/admin/dashboard` | Live ops KPIs; trends foundation |
| Orders | Partial | `/admin/orders` | Live transitions |
| Kitchen (Owner) | Partial | `/admin/kitchen` | Live tickets in AdminShell |
| Kitchen Manager KDS | Partial | `/admin/kitchen-dashboard` | Commit E maturity PARTIAL |
| POS | Partial | `/admin/pos` | Quote/create live; payment foundation |
| Delivery | Partial | `/admin/delivery` | Assign/status live; map foundation |
| CRM | Partial | `/admin/crm` | Order-derived |
| Loyalty | Partial | `/admin/loyalty` | No points ledger API |
| WhatsApp | Partial | `/admin/whatsapp` | No provider send |
| Menu | Partial | `/admin/menu` | Read live; writes unavailable |
| Inventory | Foundation | `/admin/inventory` | No stock API |
| Purchasing | Foundation | `/admin/purchasing` | No PO API |
| Finance | Foundation | `/admin/finance` | No ledger API |
| HR | Foundation | `/admin/hr` | Invites for SA; rest placeholder |
| Reports | Partial | `/admin/reports` | Ops-dashboard derived |
| Settings | Foundation | `/admin/settings` | No persistence API |
| Branch Manager | Partial | `/admin/branch` | Commit D |
| AI Command Center | Placeholder | `/admin/ai-command-center` | ComingSoon |
| Promotions | Placeholder | `/admin/promotions` | ComingSoon |
| Support | Placeholder | `/admin/support` | ComingSoon |
| Branches admin | Placeholder | `/admin/branches` | ComingSoon |
| Integrations | Placeholder | `/admin/integrations` | ComingSoon |

## Parallel kitchen surfaces

RC1 intentionally retains three kitchen UIs: Owner `/admin/kitchen`, KDS `/admin/kitchen-dashboard`, Ops `/ops/kitchen`. Consolidation is RC2 debt.
