# ADR-041: Staff App & Support Panel Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.7.0` (closes Phase 12 — Customer and Staff Apps, ADR-041 of 3)

---

## Context

Telepizza's staff-facing surface (the "Staff App") and the customer
support surface (the "Support Panel") have been live in Production
across multiple prior waves, but neither has been elevated to a formal
ADR:

1. **Admin dashboard** (Phase 6, v2.1.0, ADR-019/020/021/022) —
   `apps/website/client/src/pages/admin/*` (37 admin pages) +
   `apps/website/client/src/pages/ops/*` (5 ops pages) + 32 admin
   router modules in `backend/api/src/modules/admin/` totaling 350+
   routes. Desktop-first; not optimized for mobile.
2. **Kitchen Display System** (Phase 8, v2.3.0, ADR-027/028/029) —
   `AdminKitchenDashboard.tsx` 4-column board, 8s polling, 6-state
   ticket lifecycle. Branch-isolated via RLS. Mounted at
   `/api/v1/kitchen/tickets` (2 routes in
   `backend/api/src/modules/kitchen/routes.ts`).
3. **POS cashier workflow** (Phase 7, v2.2.0, ADR-023/024/025/026) —
   `AdminPos.tsx` + `AdminCashierHome.tsx`; cash-only contract with
   4 payment methods; branch sync + offline-safe via Idempotency-Key.
4. **Customer support role** (Foundation, v1.5.0) — `customer-support`
   role seeded in `20260713191000_seed_foundation_data.sql` (line
   1-15); elevated to canonical `support` role in Identity 01
   migration (`20260807100000_identity_01_tenant_owner_onboarding.sql`
   lines 6-15). Legacy `customer-support` row remains valid for
   backward compatibility but new invitations use `support`.
5. **Customer CRM surface** (Phase 6, v2.1.0) — `AdminCrm.tsx` (306
   lines) + `backend/api/src/modules/admin/customers.ts` (8 routes)
   covering customer list, detail, order history, loyalty balance,
   notes, and merge initiation (ADR-006). Mounted at
   `/admin/crm`.
6. **WhatsApp conversation surface** (Phase 2.2, v1.9.0, ADR-003/004) —
   `AdminWhatsApp.tsx` + `backend/api/src/modules/admin/whatsapp.ts`
   (11 routes) for conversation list, message send, template
   management, assignment, and state transitions. This is the de
   facto support panel for inbound customer inquiries.

Despite this, the staff app mobile surface and the dedicated support
panel contract were never elevated to a formal ADR. The deferral of
PWA-installable admin, branch-manager mobile checklist, kitchen
handheld view, customer 360 unified view, ticketing system, and
refund workflow is documented piecemeal across ADR-019 §"Deferred",
ADR-022 §"Deferred", ADR-026 §5 (offline-safe POS), ADR-027 §8
(kitchen handheld), ADR-037 §6 (refunds), and ADR-038 §8 (discounts
master + refunds table). This ADR consolidates those deferrals into
a single accepted decision with explicit trigger conditions.

This ADR formally accepts the as-built staff app + support panel
surface as the canonical Phase 12 contract. It deliberately scopes
kitchen ticket lifecycle to ADR-027, KOT snapshot to ADR-028, kitchen
display to ADR-029, and POS cashier workflow to ADR-023/024/025/026.

---

## Decision

### 1. Staff app — admin web on desktop, NOT mobile-optimized

The staff-facing surface is `apps/website` (the same React + Vite SPA)
with role-based routing. There is **no** native iOS staff app, **no**
native Android staff app, and **no** React Native / Expo codebase.
The admin UI is desktop-first; mobile access is technically possible
but not optimized.

| Surface | As-built | Location |
|---|---|---|
| Admin shell | ✅ Live — `AdminShell.tsx` with sidebar + topbar + permission-gated routes | `apps/website/client/src/pages/admin/AdminShell.tsx` |
| Admin dashboard | ✅ Live — `AdminDashboard.tsx` with owner workspace widgets | `apps/website/client/src/pages/admin/AdminDashboard.tsx` |
| Branch manager home | ✅ Live — `AdminBranchManager.tsx` (689 lines) | `apps/website/client/src/pages/admin/AdminBranchManager.tsx` |
| Cashier home | ✅ Live — `AdminCashierHome.tsx` | `apps/website/client/src/pages/admin/AdminCashierHome.tsx` |
| Kitchen dashboard | ✅ Live — `AdminKitchenDashboard.tsx` (ADR-027/028/029) | `apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx` |
| POS | ✅ Live — `AdminPos.tsx` (ADR-023/024/025/026) | `apps/website/client/src/pages/admin/AdminPos.tsx` |
| Orders | ✅ Live — `AdminOrders.tsx` + `AdminOrderDetail.tsx` | `apps/website/client/src/pages/admin/AdminOrders.tsx` |
| Inventory | ✅ Live — `AdminInventory.tsx` (ADR-033/034/035) | `apps/website/client/src/pages/admin/AdminInventory.tsx` |
| Finance | ✅ Live — `AdminFinance.tsx` (ADR-036/037/038) | `apps/website/client/src/pages/admin/AdminFinance.tsx` |
| Reports | ✅ Live — `AdminReports.tsx` (ADR-022) | `apps/website/client/src/pages/admin/AdminReports.tsx` |
| HR | ✅ Live — `AdminHr.tsx` | `apps/website/client/src/pages/admin/AdminHr.tsx` |
| Loyalty | ✅ Live — `AdminLoyalty.tsx` (ADR-021) | `apps/website/client/src/pages/admin/AdminLoyalty.tsx` |
| Marketing | ✅ Live — `AdminMarketing.tsx` | `apps/website/client/src/pages/admin/AdminMarketing.tsx` |
| Menu | ✅ Live — `AdminMenu.tsx` (ADR-020) | `apps/website/client/src/pages/admin/AdminMenu.tsx` |
| Reservations | ✅ Live — `AdminReservations.tsx` | `apps/website/client/src/pages/admin/AdminReservations.tsx` |
| Settings | ✅ Live — `AdminSettings.tsx` (ADR-001/002) | `apps/website/client/src/pages/admin/AdminSettings.tsx` |
| WhatsApp convos | ✅ Live — `AdminWhatsApp.tsx` (ADR-003/004) | `apps/website/client/src/pages/admin/AdminWhatsApp.tsx` |
| CRM | ✅ Live — `AdminCrm.tsx` (306 lines) | `apps/website/client/src/pages/admin/AdminCrm.tsx` |
| Floor plan | ✅ Live — `AdminFloorPlan.tsx` + `AdminFloorConsole.tsx` | `apps/website/client/src/pages/admin/AdminFloorPlan.tsx` |
| Ops shell | ✅ Live — `OpsShell.tsx` + 4 ops pages (Dashboard/Dispatch/Kitchen/Orders) | `apps/website/client/src/pages/ops/` |
| Mobile-optimized staff UI | 🟡 NOT implemented — admin is desktop-first | DEFERRED §8.1 |
| PWA-installable admin | 🟡 NOT implemented — no service worker | DEFERRED §8.2 |
| Branch manager mobile checklist | 🟡 NOT implemented | DEFERRED §8.3 |
| Kitchen handheld view | 🟡 NOT implemented | DEFERRED §8.4 |
| Offline-tolerant POS continuation | 🟡 NOT implemented (ADR-026 §5 deferral) | DEFERRED §8.5 |

**Why desktop-first instead of mobile?** Staff workflows (POS,
inventory, finance, reports) are data-dense and benefit from large
screens. A branch manager on the floor uses a tablet (iPad) for the
ops shell (`OpsShell.tsx`), which is responsive but not
mobile-optimized. Cashier stations are dedicated desktops/tablets.
Kitchen display is mounted on a wall screen. The only role that
genuinely needs mobile-optimized UI is the branch manager doing
walk-throughs (§8.3).

### 2. Staff role catalog (as-built)

The staff role catalog is the canonical RBAC model (ADR-019).
Staff roles are seeded in two waves:

**Foundation wave** (`20260713191000_seed_foundation_data.sql`):
- `super-admin` — Full system access (legacy; superseded by `platform_super_admin`)
- `branch-manager` — Branch operations, staff, order oversight (legacy)
- `kitchen` — Kitchen order preparation workflows (legacy)
- `cashier` — POS and payment workflows (legacy)
- `rider` — Delivery assignment and completion workflows (legacy)
- `customer-support` — Customer support and order resolution (legacy)

**Identity 01 wave** (`20260807100000_identity_01_tenant_owner_onboarding.sql`):
- `platform_super_admin` — Platform-only administration; never a restaurant operating role
- `organization_owner` — Owner administration within exactly one organization
- `finance` — Organization finance operations
- `hr` — Organization workforce administration
- `auditor` — Read-only organization audit access
- `branch_manager` — Management of explicitly assigned branches (canonical, supersedes `branch-manager`)
- `kitchen_manager` — Kitchen operations for explicitly assigned branches (canonical, supersedes `kitchen`)
- `support` — Support operations for explicitly assigned branches (canonical, supersedes `customer-support`)

The Identity 01 migration (`20260807100000` lines 33-40) copies
permissions from legacy roles to canonical roles:
```
legacy 'branch-manager' → canonical 'branch_manager'
legacy 'kitchen'        → canonical 'kitchen_manager'
legacy 'customer-support' → canonical 'support'
```
Legacy `cashier` and `rider` rows remain valid (no canonical
replacement); new invitations use the legacy codes until a future
Identity 02 migration elevates them.

`users.user_type` CHECK constraint (foundation schema line 21)
allows: `'customer'`, `'staff'`, `'rider'`, `'admin'`, `'support'`,
`'franchise'`. The `'franchise'` user_type is reserved for future
Phase 12 §8.9 franchisee onboarding (ADR-039); no user is currently
seeded with this type.

### 3. Staff auth — `/staff/login` (phone-first)

All staff authenticate via `/staff/login` (ADR-017 phone-first auth
session handoff). The login flow:

| Step | Surface | Permission |
|---|---|---|
| 1. Phone entry | `StaffLogin.tsx` | Public |
| 2. OTP send | `POST /api/v1/auth/otp/send` | Public — rate-limited 3/min/phone |
| 3. OTP verify | `POST /api/v1/auth/otp/verify` | Public — 5 attempts max, 10-min TTL |
| 4. Session handoff | `POST /api/v1/auth/session` (HTTP-only cookie) | Authenticated |
| 5. Profile read | `GET /api/v1/me` | Any staff role |

The `AuthPrincipal` returned by `/api/v1/me` (ADR-019) includes
`userType`, `roles`, `branchIds`, `permissions`. The admin shell
uses this to:
- Gate sidebar items by permission (e.g., `payment.manage` for Finance)
- Filter data by `branchIds` (branch_manager sees only their branches)
- Show role-appropriate home page (`AdminCashierHome` for cashier,
  `AdminKitchenDashboard` for kitchen, `AdminDeliveryHome` for rider)

### 4. Kitchen Display System (KDS) — Phase 8 elevation

The KDS (ADR-027/028/029) is the canonical kitchen staff surface:

| Surface | As-built | Location |
|---|---|---|
| 4-column board | ✅ Live — Queued / Accepted / Preparing / Ready | `AdminKitchenDashboard.tsx` |
| 8s polling | ✅ Live — `GET /api/v1/kitchen/tickets` | `backend/api/src/modules/kitchen/routes.ts:54` |
| 6-state ticket lifecycle | ✅ Live — queued→accepted→preparing→ready→completed\|cancelled (ADR-027) | Same |
| KOT snapshot | ✅ Live — `kitchen_ticket_items` with frozen `item_name` + `modifiers_snapshot` JSONB (ADR-028) | Same |
| Atomic stock consume | ✅ Live — `kitchen_ticket_set_preparing_atomic` SECURITY DEFINER RPC | Same |
| Branch isolation | ✅ Live — RLS + `enforce_kitchen_ticket_branch_match` trigger | Same |
| Per-item prep ticks | 🟡 NOT implemented (`is_completed` column EXISTS, mutation DEFERRED per ADR-028) | DEFERRED §8.4 |
| KOT print format | 🟡 NOT implemented (data model complete; print + sequence_number DEFERRED per ADR-028) | DEFERRED §8.6 |
| Server-side SLA + late-alert | 🟡 NOT implemented (client-side elapsed only; ADR-029 §2-4) | DEFERRED §8.7 |
| Priority mutation + auto-priority | 🟡 NOT implemented (`priority` column EXISTS; mutation DEFERRED per ADR-029) | DEFERRED §8.8 |
| `kitchen_stations` table + routing | 🟡 NOT implemented (KITCHEN_STATION_CATALOG display-only; ADR-029 §7) | DEFERRED §8.9 |
| Realtime updates | 🟡 NOT implemented (8s polling; ADR-027 §8) | DEFERRED §8.10 |
| Audible alarms + bump-bar + recall | 🟡 NOT implemented (ADR-029 §8) | DEFERRED §8.11 |
| AI-driven kitchen prediction | 🟡 NOT implemented (Phase 13) | DEFERRED §8.12 |

### 5. Support panel — AdminCrm + AdminWhatsApp (de facto)

There is **no dedicated support panel UI**. The support agent's
workflow is split across two admin pages:

**5.1. `AdminCrm.tsx` (306 lines)** — Customer relationship management:
| Surface | As-built | Location |
|---|---|---|
| Customer list | ✅ Live — search by phone/name/email, paginated | `AdminCrm.tsx` |
| Customer detail | ✅ Live — profile + order history + loyalty balance + notes | Same |
| Customer merge | ✅ Live — ADR-006 merge initiation | Same |
| Order history per customer | ✅ Live — embedded in customer detail | Same |
| Customer notes | ✅ Live — free-text notes with author + timestamp | Same |
| Customer 360 unified view | 🟡 NOT implemented — no unified timeline of orders + WhatsApp + support tickets + returns | DEFERRED §8.13 |
| Ticketing system | 🟡 NOT implemented | DEFERRED §8.14 |
| Refund initiation | 🟡 NOT implemented (refunds table itself deferred per ADR-038 §8) | DEFERRED §8.15 |
| Support agent assignment | 🟡 NOT implemented — no `support_tickets.assignee_id` | DEFERRED §8.14 |
| SLA tracking | 🟡 NOT implemented | DEFERRED §8.14 |

**5.2. `AdminWhatsApp.tsx`** — WhatsApp conversation management
(ADR-003/004):
| Surface | As-built | Location |
|---|---|---|
| Conversation list | ✅ Live — branch-scoped, filter by status/assignee | `AdminWhatsApp.tsx` |
| Message send | ✅ Live — `POST /api/v1/admin/whatsapp/conversations/:id/messages` | `backend/api/src/modules/admin/whatsapp.ts` |
| Template management | ✅ Live — `GET/POST/DELETE /api/v1/admin/whatsapp/templates` | Same |
| Conversation assignment | ✅ Live — `PATCH /api/v1/admin/whatsapp/conversations/:id` with `assigned_to` | Same |
| State transitions | ✅ Live — open/pending/closed/resolved | Same |
| Conversation → customer link | ✅ Live — ADR-004 routing by phone → ADR-005 canonical identity | Same |
| 24-month PII anonymization | ✅ Live — scheduled job (Phase 2.2 PR #221) | `backend/api/src/services/whatsapp/pii-anonymizer.ts` |
| Auto-routing to support agent | 🟡 NOT implemented — manual assignment only | DEFERRED §8.16 |
| Sentiment analysis | 🟡 NOT implemented (Phase 13) | DEFERRED §8.17 |
| Auto-reply bot | 🟡 NOT implemented (Phase 13) | DEFERRED §8.17 |

### 6. Admin router module catalog (32 modules, 350+ routes)

The admin backend surface is organized into 32 router modules in
`backend/api/src/modules/admin/`:

| Module | Routes | Mounted at | Purpose |
|---|---|---|---|
| `hr.ts` | 48 | `/api/v1/admin/hr/*` | HR lifecycle (staff, shifts, payroll) |
| `finance.ts` | 35 | `/api/v1/admin/finance/*` | GL, AR, AP, COGS, expenses (ADR-036/037/038) |
| `opening-governance.ts` | 33 | `/api/v1/admin/opening/governance/*` | Opening readiness governance |
| `opening-operations.ts` | 25 | `/api/v1/admin/opening/operations/*` | Opening operations |
| `marketing.ts` | 23 | `/api/v1/admin/marketing/*` | Campaigns, promotions |
| `purchasing.ts` | 22 | `/api/v1/admin/purchasing/*` | POs, suppliers, GRN (ADR-035) |
| `loyalty.ts` | 19 | `/api/v1/admin/loyalty/*` | Loyalty program (ADR-021) |
| `reservations.ts` | 14 | `/api/v1/admin/reservations/*` | Reservations |
| `routes.ts` | 13 | `/api/v1/admin/*` (root) | Misc admin routes |
| `reports.ts` | 13 | `/api/v1/admin/reports/*` | Analytics + reports (ADR-022) |
| `whatsapp.ts` | 11 | `/api/v1/admin/whatsapp/*` | WhatsApp conversations (ADR-003/004) |
| `delivery-rider.ts` | 10 | `/api/v1/admin/delivery-rider/*` | Delivery dashboard (ADR-040) |
| `payments.ts` | 9 | `/api/v1/admin/payments/*` | Payment settlement (ADR-037) |
| `customers.ts` | 8 | `/api/v1/admin/customers/*` | CRM (ADR-005/006) |
| `inventory.ts` | 8 | `/api/v1/admin/inventory/*` | Inventory (ADR-033) |
| `inventory-recipes.ts` | 8 | `/api/v1/admin/inventory/recipes/*` | Recipes + BOM (ADR-034) |
| `pos.ts` | 7 | `/api/v1/admin/pos/*` | POS cashier (ADR-023/024/025) |
| `orders.ts` | 7 | `/api/v1/admin/orders/*` | Order management |
| `ai-governance.ts` | 6 | `/api/v1/admin/ai/*` | AI governance (ADR-013/014/015) |
| `tables.ts` | 6 | `/api/v1/admin/tables/*` | Tables + floor |
| `table-sessions.ts` | 6 | `/api/v1/admin/table-sessions/*` | Dine-in sessions (ADR-024) |
| `staff-assignments.ts` | 5 | `/api/v1/admin/staff-assignments/*` | Staff assignments |
| `audit.ts` | 5 | `/api/v1/admin/audit/*` | Audit log (ADR-012) |
| `branch-profile.ts` | 5 | `/api/v1/admin/branch-profile/*` | Branch profile |
| `dashboard.ts` | 5 | `/api/v1/admin/dashboard/*` | Dashboard summaries |
| `delivery-settings.ts` | 5 | `/api/v1/admin/delivery-settings/*` | Delivery settings |
| `floor.ts` | 5 | `/api/v1/admin/floor/*` | Floor plan |
| `settings.ts` | 5 | `/api/v1/admin/settings/*` | Settings (ADR-001/002) |
| `bills.ts` | 4 | `/api/v1/admin/bills/*` | Bill settlement (ADR-024) |
| `configuration.ts` | 4 | `/api/v1/admin/configuration/*` | Configuration |
| `booking-policy.ts` | 3 | `/api/v1/admin/booking-policy/*` | Booking policy |
| `organization-settings.ts` | 3 | `/api/v1/admin/organization-settings/*` | Org settings |
| `opening-dry-run.ts` | 3 | `/api/v1/admin/opening/dry-run/*` | Opening dry-run |

Plus 2 rider/kitchen-facing modules:
- `backend/api/src/modules/riders/routes.ts` — 4 routes (`/api/v1/riders/*`)
- `backend/api/src/modules/kitchen/routes.ts` — 2 routes (`/api/v1/kitchen/*`)

All admin routes use `requireAuthenticatedUser` + `requirePermission`
(or `requireAnyPermission`) + `adminRateLimiter` (60/min/IP) +
`scopeFrom(principal)` for branch enforcement.

### 7. Ops shell — branch-manager floor operations

The `OpsShell.tsx` (89 lines) + 4 ops pages is the branch-manager
floor operations surface:

| Page | Lines | Purpose |
|---|---|---|
| `OpsShell.tsx` | 89 | Tab shell with Today / Dispatch / Kitchen / Orders tabs |
| `OpsDashboard.tsx` | 193 | Today's overview: sales, orders, kitchen load, rider status |
| `OpsDispatch.tsx` | 162 | Dispatch board: unassigned deliveries, rider roster, assign |
| `OpsKitchen.tsx` | 143 | Kitchen summary: active tickets, prep time, late count |
| `OpsOrders.tsx` | 218 | Orders list with status filter + quick actions |

Designed for tablet (iPad) use on the floor. Branch-scoped via
`scopeFrom(principal)`. Requires `admin.access` permission.

---

## 8. DEFERRED items with explicit trigger conditions

### 8.1 Mobile-optimized staff UI
**Trigger:** Branch manager complaint about admin UI on tablet OR
staff adoption of mobile workflows.
**Scope:** Responsive breakpoints for all admin pages; touch-friendly
button sizes (44x44px min); bottom navigation for mobile; collapsible
sidebar.
**Depends on:** Nothing — can ship incrementally per page.

### 8.2 PWA-installable admin
**Trigger:** Branch manager requests "install admin as app" on
tablet OR §8.1 mobile-optimized staff UI shipped.
**Scope:** Service worker (Workbox) for admin shell; offline cache
for static assets; NO offline data (admin requires real-time data).
**Depends on:** §8.1 mobile-optimized staff UI.

### 8.3 Branch manager mobile checklist
**Trigger:** Branch manager requests opening/closing walkthrough on
mobile.
**Scope:** `BranchChecklist.tsx` page with: opening checklist (cash
float, staff present, inventory check, kitchen prep); closing
checklist (Z-report, cash recon, security, equipment shutdown);
checklist template per branch; submission creates audit event.
**Depends on:** §8.1 mobile-optimized staff UI.

### 8.4 Kitchen handheld view (per-item prep ticks)
**Trigger:** Kitchen staff complaint about walking to wall screen
to mark items complete OR head chef requests per-item tracking.
**Scope:** `KitchenHandheld.tsx` mobile-optimized page; per-item
`is_completed` mutation via `PATCH /api/v1/kitchen/tickets/:id/items/:itemId`
with `is_completed` boolean; haptic feedback on tap; audio cue on
all-items-complete.
**Depends on:** ADR-028 §4-5 per-item prep ticks deferral resolution.

### 8.5 Offline-tolerant POS continuation
**Trigger:** Branch internet outage >5 minutes OR ADR-026 §5
offline-safe POS contract resolution.
**Scope:** IndexedDB queue for POS orders created offline; sync on
reconnect with Idempotency-Key (already supported); conflict
resolution: server-side inventory wins, cashier notified of
out-of-stock items.
**Depends on:** ADR-026 §5 offline PWA resolution (Phase 7
deferral).

### 8.6 KOT print format + sequence_number + fiscal printer
**Trigger:** Owner requests printed kitchen tickets OR fiscal
compliance review (FBR Phase 15).
**Scope:** `kot_print_format` config per branch (58mm thermal
printer); `kitchen_tickets.sequence_number` per-branch daily
sequence; `POST /api/v1/kitchen/tickets/:id/print` route; printer
integration via ESC/POS over USB or network.
**Depends on:** ADR-028 §5 deferral resolution + Phase 15 fiscal
compliance review.

### 8.7 Server-side SLA + late-alert events
**Trigger:** Kitchen SLA breach rate >5% OR branch manager requests
late-alert dashboard.
**Scope:** `kitchen_ticket_sla_due_at` column computed at `accepted`;
late-alert event inserted when `now() > sla_due_at AND status NOT IN
('completed','cancelled')`; `late_alert_count` KPI in ops dashboard.
**Depends on:** ADR-029 §2-4 deferral resolution.

### 8.8 Priority mutation endpoint + auto-priority
**Trigger:** Kitchen staff complaint about VIP orders getting
delayed OR branch manager requests priority queue.
**Scope:** `PATCH /api/v1/kitchen/tickets/:id` with `priority`
integer; auto-priority rules: prepaid + delivery = +10, large
order (>5 items) = +5, VIP customer = +20, wait >10 min = +3.
**Depends on:** ADR-029 §8 deferral resolution.

### 8.9 `kitchen_stations` table + station routing
**Trigger:** Branch has >2 kitchen stations (pizza oven, fryer,
grill, salad) OR head chef requests station-based routing.
**Scope:** `kitchen_stations` table (branch_id, name, type);
`kitchen_ticket_items.station_id` FK; station-filtered KDS view;
station-specific prep queues.
**Depends on:** ADR-029 §7 deferral resolution.

### 8.10 Realtime kitchen updates (Supabase Realtime)
**Trigger:** Kitchen staff complaint about 8s polling latency OR
branch has >20 active tickets at peak.
**Scope:** Supabase Realtime channel on `kitchen_tickets` + `kitchen_ticket_items`;
8s polling retained as fallback; optimistic UI updates with
server reconciliation.
**Depends on:** Supabase Realtime enabled on Production (shared
dependency with ADR-039 §8.4 and ADR-040 §8.10/§8.11).

### 8.11 Audible alarms + bump-bar + recall
**Trigger:** Kitchen staff complaint about missed tickets during
rush hour.
**Scope:** Web Audio API alarm on new ticket; bump-bar keyboard
shortcut (Space = next ticket); recall modal for last-5-min
completed tickets.
**Note:** Shared infra with ADR-040 §8.17 (rider push notifications
+ alarms).

### 8.12 AI-driven kitchen prediction
**Trigger:** Phase 13 AI track active AND kitchen data has 90+
days of history.
**Scope:** Predicted prep time per ticket (based on item mix +
historical prep times); predicted ready-time displayed to customer;
auto-priority based on predicted lateness.
**Depends on:** Phase 13 AI and Automation track.

### 8.13 Customer 360 unified view
**Trigger:** Support agent complaint about switching between
AdminCrm + AdminWhatsApp + AdminOrders OR customer complaint
resolution time >10 minutes.
**Scope:** `Customer360.tsx` page with unified timeline: orders +
WhatsApp messages + support tickets + returns + loyalty events +
payment history. Filterable by channel + date range. Exportable
as PDF for compliance.
**Depends on:** §8.14 ticketing system (for unified timeline).

### 8.14 Ticketing system
**Trigger:** Support agent complaint about WhatsApp-only tracking
OR owner requests support SLA reporting.
**Scope:** `support_tickets` table (customer_id, subject, status,
assignee_id, sla_due_at, created_at, resolved_at);
`support_ticket_events` audit; `POST /api/v1/admin/support/tickets`
create; assignment + SLA tracking; auto-routing by keyword
(e.g., "refund" → finance team).
**Depends on:** ADR-019 `support` role elevation (already shipped).

### 8.15 Refund initiation workflow
**Trigger:** ADR-038 §8 `refunds` table shipped (Phase 11 deferral).
**Scope:** `POST /api/v1/admin/refunds` with order_id + amount +
reason + approval flow; refund lifecycle (requested → approved →
processed → rejected); integration with `payments.refunded_at`
+ `customer_credit_notes`; refund WhatsApp notification to customer.
**Depends on:** ADR-038 §8 `refunds` table deferral resolution
(Phase 11 follow-up).

### 8.16 Auto-routing WhatsApp to support agent
**Trigger:** Support agent complaint about manual assignment OR
support conversation volume >50/day.
**Scope:** Rules engine: keyword match (e.g., "refund" → finance,
"delivery" → ops); customer tier match (VIP → senior agent);
round-robin if no rule matches; auto-escalation after 5 min
unanswered.
**Depends on:** §8.14 ticketing system (shared routing infra).

### 8.17 Sentiment analysis + auto-reply bot
**Trigger:** Phase 13 AI track active AND WhatsApp conversation
volume >100/day.
**Scope:** Sentiment analysis per message (positive/neutral/negative);
auto-reply for common queries (order status, hours, menu); human
handoff on negative sentiment or complex query.
**Depends on:** Phase 13 AI and Automation track + ADR-013/014/015
AI governance.

### 8.18 Support agent role refinement
**Trigger:** §8.14 ticketing system shipped OR support team grows
>5 agents.
**Scope:** `support` role split into `support_agent` (read customer +
create ticket + send WhatsApp) and `support_lead` (assign tickets +
approve refunds + SLA reporting). Permission matrix update in
`role_permissions` table.

### 8.19 Multi-role staff (e.g., cashier + kitchen)
**Trigger:** Branch manager requests cross-trained staff assignment.
**Scope:** `user_roles` already supports multiple roles per user
(ADR-019 §3). UI: role switcher in topbar; permission union across
assigned roles. No new schema — just UI work.
**Depends on:** Nothing — can ship immediately.

---

## 9. Negative consequences

1. **Admin UI is desktop-first; mobile access is poor.** Branch
   managers on the floor struggle with small tap targets and dense
   tables. Mitigation: §8.1 mobile-optimized staff UI.

2. **No dedicated support panel means support agents use 3+ admin
   pages per customer inquiry.** Friction + slower resolution.
   Mitigation: §8.13 customer 360 unified view.

3. **No ticketing system means support SLA is not tracked.** Owner
   cannot measure support quality. Mitigation: §8.14 ticketing.

4. **No refund workflow means support agents escalate to finance
   for every refund.** Slow + creates friction between teams.
   Mitigation: §8.15 refund initiation (depends on ADR-038 §8
   `refunds` table).

5. **No realtime kitchen updates means 8s polling latency.** Kitchen
   staff may see stale state during peak. Mitigation: §8.10 realtime.

6. **No per-item prep ticks means kitchen staff mark whole tickets
   complete.** Loses granularity for partial-ready orders. Mitigation:
   §8.4 kitchen handheld view.

7. **Legacy role codes (`branch-manager`, `kitchen`, `customer-support`)
   coexist with canonical codes (`branch_manager`, `kitchen_manager`,
   `support`).** Confusing for new engineers. Mitigation: future
   Identity 02 migration to deprecate legacy codes.

---

## 10. Security & RLS

### 10.1 Staff role enforcement
All admin routes use `requirePermission(code)` middleware. The
`AuthPrincipal` (ADR-019) carries the user's permission set, computed
at session creation from `user_roles` + `role_permissions` joins.
Branch scope enforced via `scopeFrom(principal)` which extracts
`branchIds` from role assignments.

### 10.2 Branch isolation
All branch-scoped tables (`orders`, `kitchen_tickets`, `inventory_items`,
`purchase_orders`, `cash_reconciliations`, etc.) have RLS policies
using `current_user_has_branch_access(branch_id)` helper. Super-admin
bypasses via `auth.jwt() ->> 'role' = 'service_role'` or platform
authority check.

### 10.3 Support agent data access
The `support` role has `delivery.read`, `order.read`, `payment.read`
permissions (via legacy `customer-support` permission copy in
Identity 01 migration). Support agents can read customer data across
their assigned branches but cannot modify orders or payments
directly — they must escalate to `branch_manager` or `finance`.

### 10.4 Audit log
All staff actions (order state changes, payment captures, refund
initiations, customer merges, WhatsApp sends) are recorded in the
`audit_log` table (ADR-012) with actor `user_id` + action + target
+ before/after JSONB. The `AdminAuditLog` page (mounted at
`/admin/audit`) lets `auditor` role + super-admin review all actions.

### 10.5 PII anonymization
WhatsApp conversation PII is anonymized after 24 months (Phase 2.2
PR #221). Customer order PII is retained indefinitely for accounting
compliance. Staff PII (name, phone, email, address) is retained for
the duration of employment + 7 years for HR compliance.

---

## 11. Migration strategy

**No new migrations in v2.7.0.** This is a closeout-only release.
The staff app + support panel surface is fully implemented in prior
migrations:

- `20260713190000_foundation_schema.sql` — users, orders, audit_log
- `20260713191000_seed_foundation_data.sql` — staff role seeds
- `20260716020000_sprint3_authorization_foundation.sql` — RBAC
- `20260725100000_d3_floor_dinein_reservations.sql` — floor + dine-in
- `20260728180000_opening_m1_people_floor_booking.sql` — opening
- `20260729030000_opening_m4_staff_seed_dry_run.sql` — staff dry-run
- `20260731120000_supplier_portal_foundation.sql` — supplier portal
- `20260807100000_identity_01_tenant_owner_onboarding.sql` — canonical
  roles (organization_owner, branch_manager, kitchen_manager, support)

Production DB tip remains `20260821000000` (Phase 3 OTP, same as
Phase 5/6/7/8/9/10/11 closeouts).

Future migrations for §8 deferrals will be numbered per the
`YYYYMMDDHHMMSS_adr_NNN_description.sql` convention.

---

## 12. Open questions

1. **Should the support panel (§8.13 customer 360) be a separate
   top-level admin route or embedded in `AdminCrm`?** Decision:
   separate route (`/admin/support/customer-360`) — cleaner scope,
   easier to add ticketing (§8.14) later.
2. **Should `support` role be split into `support_agent` +
   `support_lead` (§8.18)?** Defer until ticketing (§8.14) ships.
3. **Should the admin shell be rewritten as a separate mobile app
   (React Native) or stay responsive web (§8.1)?** Decision: stay
   responsive web — too much duplicated effort for native; the
   ops shell + cashier home already work on tablet.
4. **Should legacy role codes be deprecated in Identity 02?** Defer
   until all branches are on Identity 01 canonical codes (migration
   tracking needed).

---

## 13. References

- ADR-001 — Branch Configuration Inheritance & Overrides
- ADR-002 — Settings Versioning, Activation & Rollback Model
- ADR-003 — Provider-Secret Boundary Architecture (WhatsApp)
- ADR-004 — WhatsApp Conversation Ownership & Routing
- ADR-005 — Canonical Customer Identity Strategy
- ADR-006 — Customer Account Merge & Reversal Process
- ADR-012 — Domain Event & Shared Audit Architecture
- ADR-017 — Phone-First Auth & Session Handoff (staff uses `/staff/login`)
- ADR-019 — RBAC Authorization Principal & Permission Model
- ADR-021 — Deals, Coupons & Loyalty Promotion Engine
- ADR-022 — Reports & Analytics Framework — Query-Time KPI Registry
- ADR-023 — POS Cashier Workflow & Order Source Contract
- ADR-024 — Dine-in Bill Settlement & Multi-tender Payments
- ADR-025 — POS Shifts, Z-Report & Cash Reconciliation
- ADR-026 — Branch Sync & Offline-Safe POS Contract (offline PWA deferral)
- ADR-027 — Kitchen Ticket Lifecycle & Queue Contract
- ADR-028 — Kitchen Order Ticket (KOT) Snapshot & Per-Item Status Model
- ADR-029 — Kitchen Timers, Priority & Display Contract
- ADR-036 — Branch GL, P&L, Balance Sheet & Cash Flow Contract
- ADR-037 — Cash Reconciliation, Z-Report & COD Financial Ownership Contract
- ADR-038 — Tax, AR, AP, COGS & Expense Posting Contract (refunds table deferral)
- `apps/website/client/src/pages/admin/AdminShell.tsx`
- `apps/website/client/src/pages/admin/AdminCrm.tsx`
- `apps/website/client/src/pages/admin/AdminWhatsApp.tsx`
- `apps/website/client/src/pages/admin/AdminKitchenDashboard.tsx`
- `apps/website/client/src/pages/admin/AdminCashierHome.tsx`
- `apps/website/client/src/pages/ops/OpsShell.tsx`
- `backend/api/src/modules/admin/customers.ts` (8 CRM routes)
- `backend/api/src/modules/admin/whatsapp.ts` (11 WhatsApp routes)
- `backend/api/src/modules/admin/audit.ts` (5 audit routes)
- `backend/api/src/modules/kitchen/routes.ts` (2 kitchen routes)
- `backend/api/src/services/auth/principal.ts` (CUSTOMER_FORBIDDEN_PERMISSIONS)
- `supabase/migrations/20260713191000_seed_foundation_data.sql` (legacy roles)
- `supabase/migrations/20260807100000_identity_01_tenant_owner_onboarding.sql` (canonical roles)
- Master Roadmap §Phase 12 — Customer and Staff Apps
- Master Roadmap §Phase 8 — Kitchen Dashboard (KDS deferrals)
