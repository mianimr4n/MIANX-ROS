# Phase 2 Readiness Audit — Current Capability Truth

**Audit date:** 2026-08-04
**Source:** Repository file-system inspection — `apps/website`, `backend/api`, `supabase/migrations`
**Principle:** Maturity is derived from repository evidence only. Route existence ≠ capability.

---

## Maturity Vocabulary

| Label | Meaning |
|---|---|
| LIVE | Fully implemented, tested, and Production-verified |
| PARTIAL_LIVE | Core path implemented; documented gaps remain |
| FOUNDATION | Schema and/or backend APIs exist; UI is incomplete or labeled honestly |
| NAVIGATION_ONLY | Route exists; renders Coming Soon or stub |
| METADATA_ONLY | Read-only display of data populated by other systems |
| CONFIGURATION_REQUIRED | Implemented but requires provider or config setup |
| UNAVAILABLE | No implementation; no active route |
| DEFERRED | Explicitly deferred; stub or banner exists |

---

## Domain Inventory

### 1. Organization

| Attribute | Value |
|---|---|
| Route/module | `/admin/settings` (AdminSettings) → org sub-tab |
| Backend API | `GET/PUT /api/v1/admin/organization-settings` |
| Persistence | `organization_settings` (singleton, migration `20260729140000`) |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Supabase `organization_settings` table |
| Role access | `super-admin` (write), authenticated staff (read) |
| Current mutations | Company name, phone, email, address |
| Branch/org scope | Organization-wide singleton |
| Audit history | `updated_at`, `updated_by` only — no version history |
| Known limitations | No versioning; no draft state; no change approval; no scheduled activation |
| Phase 2 dependency | Phase 2.1 settings control plane |
| Security sensitivity | Low — public contact info |

---

### 2. Branches

| Attribute | Value |
|---|---|
| Route/module | `/admin/branch` (AdminBranchManager); `/admin/branches` → NAVIGATION_ONLY (Coming Soon) |
| Backend API | `GET /api/v1/branches`, `GET/PUT /api/v1/admin/branch-profile/:id` |
| Persistence | `branches` table (foundation schema); `branch_settings` (partial) |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Supabase `branches` table |
| Role access | `super-admin`, `branch-manager` (scoped) |
| Current mutations | Branch profile (hours, contact, radius); delivery fee/radius |
| Branch scope | Per-branch |
| Audit history | `updated_at` only |
| Known limitations | No branch cloning; no inheritance model; no config versioning; no readiness gate |
| Phase 2 dependency | Phase 2.1 (branch settings control plane) |
| Security sensitivity | Medium — branch operational config |

---

### 3. Settings

| Attribute | Value |
|---|---|
| Route/module | `/admin/settings` (AdminSettings) |
| Backend API | `GET/PUT /api/v1/admin/organization-settings`, `GET/PUT /api/v1/admin/branch-settings/:id`, `GET/PUT /api/v1/admin/delivery-settings/:id` |
| Persistence | `organization_settings`, `branch_settings`, partial `branches` columns |
| Current maturity | **PARTIAL_LIVE** |
| Current mutations | Org profile, branch hours, delivery radius, delivery fee |
| Branch scope | Per-branch (branch-manager scoped) |
| Audit history | None beyond `updated_at` |
| Known limitations | No effective-value inheritance; no draft state; no activation workflow; no rollback; no schema versioning |
| Phase 2 dependency | Phase 2.1 (core requirement) |
| Security sensitivity | Medium |

---

### 4. Orders

| Attribute | Value |
|---|---|
| Route/module | `/admin/orders`, `/admin/orders/:id` |
| Backend API | `GET /api/v1/orders`, `GET /api/v1/orders/:id`, `POST /api/v1/orders`, admin list/detail |
| Persistence | `orders`, `order_items`, `order_snapshots` |
| Current maturity | **LIVE** |
| Current data source | Supabase orders tables |
| Role access | `super-admin`, `branch-manager`, `cashier`, `kitchen` (read), `rider` (delivery orders) |
| Current mutations | Create, status transition (`pending`→`confirmed`→`preparing`→`ready`→`dispatched`→`delivered`/`failed`) |
| Branch scope | Per-branch RLS |
| Audit history | Status transitions via order status column; no append-only event log |
| Known limitations | No cancellation matrix; no refund flow; no notification on transition |
| Phase 2 dependency | Customer Support (2.2), CRM (2.3), Delivery completion (2.4) |
| Security sensitivity | High — customer PII in order details |

---

### 5. Kitchen / KDS

| Attribute | Value |
|---|---|
| Route/module | `/admin/kitchen`, `/admin/kitchen-dashboard` |
| Backend API | `GET /api/v1/kitchen/tickets`, `PATCH /api/v1/kitchen/tickets/:id/status` |
| Persistence | `kitchen_tickets` (migration `20260718160000`) |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Supabase kitchen_tickets |
| Role access | `kitchen`, `branch-manager`, `super-admin` |
| Current mutations | Status transitions on tickets |
| Branch scope | Per-branch |
| Audit history | `updated_at` only; no append-only ticket event log |
| Known limitations | No timer/SLA tracking; no item-level KDS; no requeue; no bump-bar support |
| Phase 2 dependency | Delivery (2.4) for dispatch coordination |
| Security sensitivity | Low |

---

### 6. Delivery

| Attribute | Value |
|---|---|
| Route/module | `/admin/delivery` (AdminDelivery) |
| Backend API | `GET /api/v1/riders/assignments`, `POST /api/v1/riders/assignments/:id/assign`, `PATCH /api/v1/riders/assignments/:id/status` |
| Persistence | `delivery_assignments` (via operations service) |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Supabase delivery tables |
| Role access | `super-admin`, `branch-manager` (assign), `rider` (status update) |
| Current mutations | Rider assignment, status update (`assigned`→`picked-up`→`delivered`) |
| Branch scope | Per-branch |
| Audit history | None beyond status column |
| Known limitations | No GPS; no POD; no COD; no failed delivery workflow; no ETA; no return-to-branch; no reassignment |
| Phase 2 dependency | Phase 2.4 (core completion target) |
| Security sensitivity | High — customer address/phone exposed to rider |

---

### 7. Riders

| Attribute | Value |
|---|---|
| Route/module | Embedded in `/admin/delivery` |
| Backend API | `GET /api/v1/riders/roster` |
| Persistence | Rider roster via `users` table with `user_type='rider'` |
| Current maturity | **FOUNDATION** |
| Current data source | Users table + user_roles |
| Role access | `super-admin`, `branch-manager` |
| Current mutations | None in Phase 1 |
| Known limitations | No rider profile; no availability; no shifts; no check-in; no zone assignment; no dispatch eligibility rules |
| Phase 2 dependency | Phase 2.4 (rider profile, availability, shifts) |
| Security sensitivity | High — location, COD handling |

---

### 8. POS

| Attribute | Value |
|---|---|
| Route/module | `/admin/pos` (AdminPos) |
| Backend API | POS Z-Report (`POST /api/v1/admin/pos/z-report`), cash checkout |
| Persistence | `pos_z_report_events` (migration `20260730210000`) |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Order/payment data |
| Role access | `cashier`, `branch-manager`, `super-admin` |
| Current mutations | Cash checkout, Z-Report |
| Known limitations | No opening float; no counted cash; no variance; no reconciliation; no till management |
| Phase 2 dependency | Accounting (2.5) for financial integration |
| Security sensitivity | High — cash handling |

---

### 9. Live Floor

| Attribute | Value |
|---|---|
| Route/module | `/admin/floor` (AdminFloorConsole), `/admin/floor-plan` |
| Backend API | Floor session APIs |
| Persistence | `restaurant_tables`, `dine_in_sessions` |
| Current maturity | **PARTIAL_LIVE** |
| Current data source | Supabase floor tables |
| Role access | `host`, `waiter`, `cashier`, `super-admin` |
| Current mutations | Table assignment, session open/close |
| Known limitations | No multi-room; no zone management; limited guest count |
| Phase 2 dependency | None critical for Phase 2 |
| Security sensitivity | Low |

---

### 10. Reservations

| Attribute | Value |
|---|---|
| Route/module | `/admin/reservations` (AdminReservations), `/book` (public) |
| Backend API | `POST /api/v1/reservations`, `GET /api/v1/reservations`, etc. |
| Persistence | `reservations` table (migration `20260725100000`) |
| Current maturity | **PARTIAL_LIVE** |
| Role access | `host`, `super-admin`, `branch-manager` |
| Known limitations | No deposit integration for Phase 2 |
| Phase 2 dependency | None critical |
| Security sensitivity | Medium — customer PII |

---

### 11. Waitlist

| Attribute | Value |
|---|---|
| Route/module | `/admin/waitlist` (AdminWaitlist) |
| Persistence | Waitlist table (in reservations migration) |
| Current maturity | **PARTIAL_LIVE** |
| Phase 2 dependency | None critical |

---

### 12. WhatsApp-Attributed Orders

| Attribute | Value |
|---|---|
| Route/module | `/admin/whatsapp` (AdminWhatsApp) |
| Backend API | No dedicated WhatsApp backend API — uses `listAdminOrders` filtered by `order_channel` |
| Persistence | `orders.order_channel` field only |
| Current maturity | **FOUNDATION** (UI exists; data is order-derived; no live WhatsApp integration) |
| Current data source | Orders table — WhatsApp orders identified by channel flag |
| Role access | `super-admin`, `branch-manager`, `customer-support` |
| Current mutations | None (read-only view of orders) |
| Known limitations | No real WhatsApp integration; no conversation storage; no agent assignment; no message history; no webhook; no provider connection |
| Phase 2 dependency | Phase 2.2 (full WhatsApp + Support implementation) |
| Security sensitivity | High — customer contact, PII |

---

### 13. Customer Support

| Attribute | Value |
|---|---|
| Route/module | `/admin/support` → NAVIGATION_ONLY (Coming Soon) |
| Current maturity | **NAVIGATION_ONLY** |
| Known limitations | No support module exists; route renders AdminComingSoon |
| Phase 2 dependency | Phase 2.2 (core deliverable) |
| Security sensitivity | High |

---

### 14. CRM

| Attribute | Value |
|---|---|
| Route/module | `/admin/crm`, `/admin/customers` |
| Backend API | None dedicated — aggregates from `listAdminOrders` |
| Persistence | No dedicated CRM table; customer data from `customers`, `orders` |
| Current maturity | **FOUNDATION** |
| Current data source | Order-derived aggregation in browser (`aggregateCustomersFromOrders`) |
| Role access | `super-admin`, `branch-manager` |
| Current mutations | None — read-only view |
| Known limitations | No canonical customer ID; no dedup; no merge; no consent management; no address history; no communication preferences; no VIP/blocked flags with audit trail; loaded from last 100 orders only |
| Phase 2 dependency | Phase 2.3 (core deliverable) |
| Security sensitivity | High — PII |

---

### 15. Loyalty

| Attribute | Value |
|---|---|
| Route/module | `/admin/loyalty` (AdminLoyalty) |
| Backend API | Loyalty management APIs |
| Persistence | `loyalty_ledger`, `loyalty_tiers`, `loyalty_rewards` (migration `20260731090000`) |
| Current maturity | **PARTIAL_LIVE** |
| Phase 2 dependency | Integrates with CRM (2.3) |
| Security sensitivity | Medium |

---

### 16. Menu

| Attribute | Value |
|---|---|
| Route/module | `/admin/menu` (AdminMenu) |
| Backend API | `GET/PATCH /api/v1/admin/menu/*` (prices, availability, categories) |
| Persistence | `menu_categories`, `menu_items`, `menu_variants` |
| Current maturity | **LIVE** (write APIs merged in PR #129) |
| Phase 2 dependency | Low — menu is stable |
| Security sensitivity | Low |

---

### 17. Inventory

| Attribute | Value |
|---|---|
| Route/module | `/admin/inventory` (AdminInventory) |
| Backend API | Inventory management APIs |
| Persistence | `inventory_items`, `inventory_ledger`, `inventory_adjustments` (migration `20260730160000`) |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | Adjustment atomicity residual; GRN→stock posting repository-implemented but not Production-verified |
| Phase 2 dependency | Accounting (2.5) for COGS |
| Security sensitivity | Medium |

---

### 18. Purchasing

| Attribute | Value |
|---|---|
| Route/module | `/admin/purchasing` (AdminPurchasing) |
| Backend API | Supplier, PO, requisition, GRN APIs |
| Persistence | `suppliers`, `purchase_orders`, `requisitions`, `goods_receiving_notes` |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | Invoice matching / payables depth; GRN stock post Production-unverified |
| Phase 2 dependency | Accounting (2.5) for invoice/payment integration |
| Security sensitivity | Medium |

---

### 19. HR

| Attribute | Value |
|---|---|
| Route/module | `/admin/hr`, `/admin/staff` (AdminHr) |
| Backend API | HR employee, workforce, scheduling, payroll APIs |
| Persistence | `employees`, `shifts`, `attendance`, `payroll_periods` |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | Broader update lifecycle and Production verification incomplete; Phase-2 banners in UI |
| Phase 2 dependency | Delivery (2.4) for rider employment records |
| Security sensitivity | High — salary, personal data |

---

### 20. Payroll

| Attribute | Value |
|---|---|
| Route/module | Embedded in `/admin/hr` |
| Persistence | `payroll_periods`, `payroll_runs`, `payroll_line_items` (migration `20260731080000`) |
| Current maturity | **FOUNDATION** |
| Known limitations | Calculation engine not Production-verified; no payroll finance posting |
| Phase 2 dependency | Accounting (2.5) for payroll posting |
| Security sensitivity | High — salary data |

---

### 21. Finance

| Attribute | Value |
|---|---|
| Route/module | `/admin/finance` (AdminFinance) |
| Backend API | Finance management APIs (CoA, journals, TB, P&L) |
| Persistence | `chart_of_accounts`, `journal_entries`, `journal_lines`, `finance_postings` |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | Balance sheet / cash flow / AR / tax UI honesty outstanding; not all postings Production-verified |
| Phase 2 dependency | Phase 2.5 (core deepening target) |
| Security sensitivity | High — financial data |

---

### 22. Accounting

| Attribute | Value |
|---|---|
| Route/module | Embedded in `/admin/finance` |
| Persistence | `journal_entries` with `reversed_by_journal_id` / `reverses_journal_id` (migration `20260731040000`); `finance_postings` with idempotency |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | No period-close; no period lock; no approval workflow; no systematic revenue recognition; no tax engine; no COGS automation |
| Phase 2 dependency | Phase 2.5 (deep completion) |
| Security sensitivity | High — financial truth |

---

### 23. Reports

| Attribute | Value |
|---|---|
| Route/module | `/admin/reports` (AdminReports) |
| Backend API | Sales analytics, CSV export |
| Persistence | Derived from orders/finance |
| Current maturity | **PARTIAL_LIVE** |
| Known limitations | CSV formula hardening outstanding (maintenance item) |
| Phase 2 dependency | Accounting (2.5) for posted P&L accuracy |
| Security sensitivity | Medium — financial summary |

---

### 24. Owner Command Center / Dashboard

| Attribute | Value |
|---|---|
| Route/module | `/admin/dashboard` (AdminDashboard) |
| Backend API | Dashboard summary APIs |
| Persistence | Derived |
| Current maturity | **PARTIAL_LIVE** (accepted as PASS WITH LIMITATIONS from D1) |
| Known limitations | Live KPIs derived from orders/kitchen/delivery; no deep exception center; no AI integration |
| Phase 2 dependency | Phase 2.6 (AI Command Center) |
| Security sensitivity | Medium |

---

### 25. Audit / Event History

| Attribute | Value |
|---|---|
| Current state | No append-only event tables; audit exists only as `updated_at`/`updated_by` columns on mutation tables |
| Persistence | Scattered column-level audit across tables |
| Current maturity | **FOUNDATION** |
| Known limitations | No domain event tables; no correlation IDs; no replay capability; no PII-aware redaction |
| Phase 2 dependency | Required for all Phase 2 domains |
| Security sensitivity | High |

---

### 26. Authentication

| Attribute | Value |
|---|---|
| Route/module | `/admin/login`, `/login`, `/register`, `/staff/accept` |
| Backend API | `POST /api/v1/auth/session`, `GET /api/v1/auth/me`, staff invite accept |
| Persistence | Supabase Auth + `users`, `user_roles`, `staff_invites` |
| Current maturity | **LIVE** |
| Known limitations | WhatsApp OTP provider not connected (Phase 3 paused) |
| Phase 2 dependency | Roles needed for all Phase 2 domains |
| Security sensitivity | Critical |

---

### 27. Roles and Permissions

| Attribute | Value |
|---|---|
| Persistence | `roles`, `permissions`, `user_roles`, `role_permissions` |
| Current roles | super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter |
| Current maturity | **LIVE** |
| Known limitations | No customer-support role fully exercised; no support permissions wired to support module |
| Phase 2 dependency | All Phase 2 domains require role extensions |
| Security sensitivity | Critical |

---

### 28. Integrations / Providers

| Attribute | Value |
|---|---|
| Route/module | `/admin/integrations` → NAVIGATION_ONLY (Coming Soon) |
| Current maturity | **NAVIGATION_ONLY** |
| Known limitations | No provider connection; no webhook infrastructure; no secret management UI |
| Phase 2 dependency | Phase 2.2 (WhatsApp provider), Phase 2.4 (map/GPS provider) |
| Security sensitivity | Critical — provider credentials |

---

### 29. AI-Related Surfaces

| Attribute | Value |
|---|---|
| Route/module | `/admin/ai-team` (AdminAiTeam), `/admin/ai-command-center` → NAVIGATION_ONLY |
| Backend API | `GET /api/v1/ai/teams`, `GET /api/v1/ai/agents`, `GET /api/v1/ai/tasks` |
| Persistence | `ai_teams`, `ai_agents`, `ai_tasks`, `ai_approvals` (migration `20260730120000`) |
| Current maturity | **FOUNDATION** |
| Known limitations | No runtime execution; no model calls; no agent loop; no prompt management; no provider connection |
| Phase 2 dependency | Phase 2.6 (AI Command Center) — requires all prior domains first |
| Security sensitivity | High — prompt injection, data exfiltration risk |

---

## Summary Table

| Domain | Maturity | Phase 2 Relevance |
|---|---|---|
| Organization | PARTIAL_LIVE | 2.1 |
| Branches | PARTIAL_LIVE | 2.1 |
| Settings | PARTIAL_LIVE | 2.1 |
| Orders | LIVE | 2.2/2.3/2.4 |
| Kitchen/KDS | PARTIAL_LIVE | 2.4 |
| Delivery | PARTIAL_LIVE | 2.4 |
| Riders | FOUNDATION | 2.4 |
| POS | PARTIAL_LIVE | 2.5 |
| Live Floor | PARTIAL_LIVE | Stable |
| Reservations | PARTIAL_LIVE | Stable |
| Waitlist | PARTIAL_LIVE | Stable |
| WhatsApp Orders | FOUNDATION | 2.2 |
| Customer Support | NAVIGATION_ONLY | 2.2 |
| CRM | FOUNDATION | 2.3 |
| Loyalty | PARTIAL_LIVE | 2.3 |
| Menu | LIVE | Stable |
| Inventory | PARTIAL_LIVE | 2.5 |
| Purchasing | PARTIAL_LIVE | 2.5 |
| HR | PARTIAL_LIVE | 2.4/2.5 |
| Payroll | FOUNDATION | 2.5 |
| Finance | PARTIAL_LIVE | 2.5 |
| Accounting | PARTIAL_LIVE | 2.5 |
| Reports | PARTIAL_LIVE | 2.5 |
| Command Center | PARTIAL_LIVE | 2.6 |
| Audit/Events | FOUNDATION | All |
| Authentication | LIVE | All |
| Roles/Permissions | LIVE | All |
| Integrations | NAVIGATION_ONLY | 2.2/2.4 |
| AI Platform | FOUNDATION | 2.6 |
