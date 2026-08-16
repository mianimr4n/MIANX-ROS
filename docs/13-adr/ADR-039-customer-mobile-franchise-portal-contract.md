# ADR-039: Customer Mobile & Franchise Portal Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.7.0` (closes Phase 12 — Customer and Staff Apps, ADR-039 of 3)

---

## Context

Telepizza's customer-facing surface and franchise (multi-branch owner) surface
have been live in Production across multiple prior waves:

1. **Customer website foundation** (Phase 1, v1.2.0) — `apps/website`
   React + Vite single-page app with Home, Menu, Branches, About, Contact,
   Product Detail, Cart, and Checkout pages. Catalog fetched live from
   Supabase (`menu_items` + `menu_categories` + `menu_item_variants`).
   Pizza customizer (`apps/website/client/src/components/menu/`) supports
   size + crust + toppings selection with server-side price re-quote via
   `POST /api/v1/orders/quote`.
2. **Customer auth foundation** (Phase 2, v1.6.0/v1.9.0) — phone-first
   register/login via ADR-016 OTP verification + ADR-017 phone-first auth
   session handoff. `customer` role seeded in `20260713191000_seed_foundation_data.sql`
   and elevated in `20260716010000_sprint3_customer_auth_foundation.sql`.
   `users.user_type` CHECK constraint includes `'customer'` (foundation
   schema `20260713190000` line 21).
3. **Order placement + tracking** (Phase 4, v1.7.0) — guest and authenticated
   checkout via `POST /api/v1/orders`, order tracking via
   `apps/website/client/src/pages/TrackOrder.tsx` (316 lines) polling
   `GET /api/v1/orders/:id` for status + delivery state.
4. **Loyalty + customer account** (Phase 6, v2.1.0) — ADR-021 deals/coupons/
   loyalty engine; `MyTelepizza.tsx` (2,303 lines) consolidates loyalty
   wallet, order history, favorites, addresses, and saved payment methods
   into one customer-account surface.
5. **Organization owner onboarding** (Identity 01, `20260807100000`)
   — `organization_owner` role seeded (lines 6-15 of the migration) with
   explicit least-privilege grants: `admin.access`, `staff.read`,
   `staff.create`, `staff.assign_role`, `staff.manage`, `hr.manage`,
   `branch.read`. Legacy `super-admin` remains as platform authority.
6. **Owner workspace analytics** (RC4-11, v2.1.0) — `getOwnerWorkspace`
   service (`backend/api/src/services/analytics/engine.ts:1325`)
   aggregates 25 analytics modules into one super-admin/owner surface,
   including `branch_comparison` module (`registry.ts:750`) for
   cross-branch KPI comparison. Mounted at
   `GET /api/v1/admin/reports/owner-workspace` in `modules/admin/reports.ts:196`.
7. **Multi-branch admin view** (Phase 6, v2.1.0) — `AdminBranchManager.tsx`
   (689 lines) gives `organization_owner` + `super-admin` a unified
   multi-branch roster with per-branch settings, hours, and readiness.

Despite this, the customer mobile surface and the franchise portal
contract were never elevated to a formal ADR. The deferral of native
mobile app (iOS/Android), push notifications, offline PWA, dedicated
franchisee onboarding, and multi-tenant SaaS isolation is documented
piecemeal across ADR-017 §"Negative consequences", ADR-021 §6, ADR-022
§"Deferred", and ADR-026 §5 (offline-safe POS contract). This ADR
consolidates those deferrals into a single accepted decision with
explicit trigger conditions.

This ADR formally accepts the as-built customer mobile + franchise portal
surface as the canonical Phase 12 contract. It deliberately scopes rider
mobile + delivery dashboard to ADR-040, and staff app + support panel to
ADR-041.

---

## Decision

### 1. Customer surface — web-first PWA, NOT native mobile app

The customer surface is `apps/website`, a React + Vite single-page app
served from the same domain as the marketing site. It is the **only**
customer-facing app. There is **no** native iOS app, **no** native
Android app, and **no** React Native / Expo codebase.

| Surface | As-built | Location |
|---|---|---|
| Catalog browsing | ✅ Live — `Menu.tsx`, `ProductDetail.tsx`, server-side quote | `apps/website/client/src/pages/Menu.tsx` |
| Cart + checkout | ✅ Live — `Checkout.tsx` with branch resolution + delivery/pickup | `apps/website/client/src/pages/Checkout.tsx` |
| Order tracking | ✅ Live — `TrackOrder.tsx` (316 lines), polls `GET /api/v1/orders/:id` | `apps/website/client/src/pages/TrackOrder.tsx` |
| Customer account | ✅ Live — `MyTelepizza.tsx` (2,303 lines), loyalty wallet + history + favorites + addresses | `apps/website/client/src/pages/MyTelepizza.tsx` |
| Loyalty program | ✅ Live — ADR-021 loyalty engine, `Loyalty.tsx` page, points + rewards | `apps/website/client/src/pages/Loyalty.tsx` |
| Auth | ✅ Live — ADR-016 OTP + ADR-017 phone-first; `Login.tsx` + `Register.tsx` + `ForgotPassword.tsx` + `ResetPassword.tsx` | `apps/website/client/src/pages/{Login,Register,ForgotPassword,ResetPassword}.tsx` |
| PWA manifest | ✅ Live — `site.webmanifest` exists with name/icons/theme | `apps/website/client/public/site.webmanifest` |
| Service worker | 🟡 NOT installed — no `serviceWorker.js`, no Workbox, no offline cache | DEFERRED §8.1 |
| Push notifications | 🟡 NOT implemented — no Web Push API, no FCM integration | DEFERRED §8.2 |
| Installable banner | 🟡 Manifest exists but no `beforeinstallprompt` handling | DEFERRED §8.3 |
| Order tracking realtime | 🟡 8s polling only — no Supabase Realtime channel for `orders` table | DEFERRED §8.4 |

**Why web-first instead of native?** Telepizza's catalog and pricing
change weekly (Phase 1 catalog freeze v1.2.0). A web-first surface
avoids app-store review cycles for catalog/menu changes, eliminates
binary signing overhead, and lets the same codebase serve SEO-driven
marketing traffic and authenticated ordering. The `site.webmanifest`
is configured so a customer can "Add to Home Screen" on iOS/Android
and get an app-like icon + standalone display mode.

**Why no offline PWA yet?** Phase 7 (ADR-026) explicitly deferred
offline PWA because the POS cashier workflow requires real-time
inventory + price verification. The customer ordering flow has the
same constraint: server-side quote engine (`POST /api/v1/orders/quote`)
must validate current price + branch availability + delivery zone.
Offline ordering would require conflict-resolution logic for stale
carts, deferred pricing, and out-of-stock notifications — none of
which exist. DEFERRED §8.5.

### 2. Customer auth contract — phone-first, session-based

The customer auth flow (ADR-016 + ADR-017) is the canonical
authentication surface for `apps/website`:

| Step | Surface | Permission |
|---|---|---|
| 1. Phone entry | `Login.tsx` / `Register.tsx` | Public |
| 2. OTP send | `POST /api/v1/auth/otp/send` | Public — rate-limited 3/min/phone |
| 3. OTP verify | `POST /api/v1/auth/otp/verify` | Public — 5 attempts max, 10-min TTL |
| 4. Session handoff | `POST /api/v1/auth/session` (HTTP-only cookie) | Authenticated |
| 5. Profile read | `GET /api/v1/me` | `customer` role |

The `customer` role (seeded in `20260713191000_seed_foundation_data.sql`)
has zero admin permissions and is excluded from all admin routes by
`APPROVED_CUSTOMER_PERMISSIONS: ReadonlySet<string> = new Set()`
(`backend/api/src/services/auth/principal.ts`). The
`CUSTOMER_FORBIDDEN_PERMISSIONS` set explicitly denies customer access
to admin endpoints even if a misconfiguration grants a permission.

`/api/v1/me` returns the `AuthPrincipal` (ADR-019) including
`userType`, `roles`, `branchIds`, and `permissions`. The customer
surface uses this to gate UI elements (e.g., "Sign in for faster
checkout" vs. "Hi, Imran").

### 3. Customer order placement — guest + authenticated

Both guest and authenticated customers can place orders. The order
schema (`20260713190000_foundation_schema.sql`) supports both via
`orders.customer_id` (nullable for guest) + `orders.contact_phone` +
`orders.contact_name` (always required).

| Surface | As-built | Location |
|---|---|---|
| Guest checkout | ✅ Live — `Checkout.tsx` collects phone+name+address | `apps/website/client/src/pages/Checkout.tsx` |
| Authenticated checkout | ✅ Live — pre-fills from `users` + `customer_addresses` | Same component, conditional |
| Server-side quote | ✅ Live — `POST /api/v1/orders/quote` (ADR-018) | `backend/api/src/modules/orders/routes.ts` |
| Order create | ✅ Live — `POST /api/v1/orders` with Idempotency-Key | Same |
| Order tracking | ✅ Live — `TrackOrder.tsx` polls `GET /api/v1/orders/:id` | `apps/website/client/src/pages/TrackOrder.tsx` |
| Order history | ✅ Live — `MyTelepizza.tsx` lists past orders for authed customers | `apps/website/client/src/pages/MyTelepizza.tsx` |
| Guest order lookup | ✅ Live — `TrackOrder.tsx` accepts order_id + phone for guest access | Same |
| Reorder | 🟡 UI button exists; backend endpoint exists; NO one-tap reorder that re-validates current price + branch availability | DEFERRED §8.6 |

### 4. Loyalty wallet — points + rewards + coupons

The customer loyalty surface (ADR-021) is fully integrated into
`MyTelepizza.tsx`:

| Surface | As-built | Location |
|---|---|---|
| Points balance | ✅ Live — `loyalty_point_balances` table (ADR-021 §3.1) | `apps/website/client/src/components/my-telepizza/LoyaltyWallet.tsx` |
| Points history | ✅ Live — `loyalty_point_ledger` immutable ledger | Same |
| Reward catalog | ✅ Live — `loyalty_rewards` (free item / discount / cashback) | `apps/website/client/src/pages/Loyalty.tsx` |
| Coupon apply | ✅ Live — `POST /api/v1/orders/quote` with `coupon_code` | `backend/api/src/modules/orders/routes.ts` |
| Coupon validation | ✅ Live — server-side; one-use-per-customer, expiry, min-spend | `backend/api/src/services/orders/quote-engine.ts` |
| Birthday reward | 🟡 NOT implemented — no `customers.birthday` column | DEFERRED §8.7 |
| Tiered loyalty | 🟡 NOT implemented — single tier only | DEFERRED §8.8 |

### 5. Franchise portal — `organization_owner` role + owner workspace

The franchise portal is the multi-branch owner surface, built on
two foundations:

**5.1. `organization_owner` role** — Seeded in Identity 01 migration
(`20260807100000_identity_01_tenant_owner_onboarding.sql` lines 6-15).
Each `organization_owner` user_role row is scoped to exactly one
`organization_id` (FK on `user_roles.organization_id`, added in the
same migration). The role receives 7 explicit permissions:
`admin.access`, `staff.read`, `staff.create`, `staff.assign_role`,
`staff.manage`, `hr.manage`, `branch.read`.

**5.2. Owner workspace analytics** — The
`AnalyticsService.getOwnerWorkspace` method
(`backend/api/src/services/analytics/engine.ts:1325`) composes 25
analytics modules into one payload, including:

- `sales` (gross/net/aov/discounts/refunds)
- `orders` (count/avg_value/cancellation_rate)
- `finance` (profit/margin/revenue/expense)
- `branch_comparison` (cross-branch KPI matrix)
- `inventory` (low_stock_count/reorder_count)
- `kitchen` (avg_prep_time/late_count)
- `delivery` (on_time_rate/avg_distance)
- `loyalty` (active_members/redeem_rate)
- `hr` (staff_count/shift_coverage)
- `executive` (composite scorecard)
- 15 additional modules

Mounted at `GET /api/v1/admin/reports/owner-workspace`
(`modules/admin/reports.ts:196`) with `requirePermission('reports.read')`.
Branch scope enforced via `scopeFrom(principal)` which limits to
`principal.branchIds` (empty = all branches the owner can access).

**5.3. Multi-branch admin UI** — `AdminBranchManager.tsx` (689 lines)
in `apps/website/client/src/pages/admin/` provides:

| Surface | As-built | Location |
|---|---|---|
| Branch roster | ✅ Live — list of all branches with status (active/inactive) | `AdminBranchManager.tsx` |
| Per-branch settings | ✅ Live — hours, contact, delivery zones, payment methods | Same |
| Per-branch readiness | ✅ Live — opening-readiness checklist (M4 dry-run) | Same |
| Per-branch staff | ✅ Live — branch-scoped staff list + assignments | Same |
| Cross-branch KPI matrix | ✅ Live — `branch_comparison` analytics module | Same |
| Per-branch P&L | ✅ Live — ADR-036 `finance_profit_loss` RPC, branch-scoped | Same |
| Franchisee onboarding | 🟡 NOT implemented — no `franchisee` role; only `organization_owner` | DEFERRED §8.9 |
| Multi-tenant SaaS isolation | 🟡 NOT implemented — single Supabase project, single schema | DEFERRED §8.10 |
| Franchise agreement tracking | 🟡 NOT implemented — no `franchise_agreements` table | DEFERRED §8.11 |
| Royalty computation | 🟡 NOT implemented — no royalty % config or monthly run | DEFERRED §8.12 |

### 6. Customer-facing branch + zone resolution

When a customer enters an address or selects a branch, the surface
must resolve which branch serves them. This is handled by:

| Surface | As-built | Location |
|---|---|---|
| Branch list | ✅ Live — `GET /api/v1/branches` (public) | `backend/api/src/modules/branches/routes.ts` |
| Delivery zone check | ✅ Live — `POST /api/v1/orders/quote` with address; server validates branch_id + delivery zone | `backend/api/src/services/orders/quote-engine.ts` |
| Pickup branch select | ✅ Live — `Branches.tsx` page | `apps/website/client/src/pages/Branches.tsx` |
| Address autocomplete | 🟡 NOT implemented — manual entry only | DEFERRED §8.13 |
| Reverse geocode | 🟡 NOT implemented — no `address → lat/lng` service | DEFERRED §8.14 |

### 7. Customer notifications

The customer notification surface uses WhatsApp (ADR-003/004) as the
primary channel:

| Surface | As-built | Location |
|---|---|---|
| Order confirmation WhatsApp | ✅ Live — outbound outbox worker (ADR-003 §4) | `backend/api/src/services/whatsapp/outbox-worker.ts` |
| Order status updates | ✅ Live — order confirmed/preparing/ready/dispatched/delivered events | Same |
| Delivery ETA WhatsApp | ✅ Live — sent on `orders.status='dispatched'` | Same |
| Push notifications | 🟡 NOT implemented — no FCM/APNs integration | DEFERRED §8.2 |
| SMS fallback | 🟡 NOT implemented — Twilio Verify for OTP only, no transactional SMS | DEFERRED §8.15 |
| Email receipts | 🟡 NOT implemented — no transactional email provider | DEFERRED §8.16 |

---

## 8. DEFERRED items with explicit trigger conditions

Each deferral has an explicit trigger condition. Work does NOT begin
until the trigger fires.

### 8.1 Service worker / offline cache
**Trigger:** Customer complains about slow catalog load on flaky
mobile networks, OR owner decides to enable Phase 7 ADR-026 §5
offline PWA (whichever comes first).
**Scope:** Workbox runtime caching for catalog images + menu JSON;
stale-while-revalidate for `GET /api/v1/menu`; NO offline ordering.
**Depends on:** Phase 7 ADR-026 offline-safe contract resolution.

### 8.2 Push notifications (Web Push + FCM)
**Trigger:** Marketing requests abandoned-cart recovery campaign,
OR owner signs up for FCM after Google Play Console onboarding.
**Scope:** Web Push API for installed PWA; FCM for Android; APNs
bridge for iOS (via FCM APNs config). Opt-in via UI prompt.
**Depends on:** Phase 13 marketing automation (campaign scheduler).

### 8.3 Installable banner (PWA install prompt)
**Trigger:** Service worker (§8.1) shipped AND 100+ organic
"add to home screen" events from analytics.
**Scope:** `beforeinstallprompt` event handler, custom install
banner UI, post-install `appinstalled` event tracking.

### 8.4 Order tracking realtime (Supabase Realtime)
**Trigger:** Customer complaint about "stale tracking" OR 1000+
daily orders (load on polling endpoint exceeds 1% of API traffic).
**Scope:** Supabase Realtime channel on `orders` table for the
customer's own row (RLS-protected via `customer_id = auth.uid()`).
8s polling retained as fallback.
**Depends on:** Supabase Realtime enabled on Production project
(currently disabled to control WebSocket connection costs).

### 8.5 Offline ordering
**Trigger:** UNLIKELY — owner explicitly decides to enable. This
is a strategic product decision, not a technical trigger.
**Scope:** IndexedDB cart persistence, deferred pricing, conflict
resolution on reconnect, out-of-stock notification queue.
**Risk:** High — stale prices, out-of-stock orders, customer
dissatisfaction if not perfectly handled. No planned timeline.

### 8.6 One-tap reorder
**Trigger:** Customer requests OR analytics shows >10% of orders
are "repeat of last order."
**Scope:** Reorder button on `MyTelepizza.tsx` order history;
calls `POST /api/v1/orders/quote` with old line items; if any
item unavailable or price changed >10%, shows modal warning.

### 8.7 Birthday reward
**Trigger:** Marketing requests birthday campaign.
**Scope:** `customers.birthday` column (nullable, month/day only);
scheduled job issues `loyalty_point_ledger` entry on birthday;
WhatsApp message via outbound outbox.

### 8.8 Tiered loyalty
**Trigger:** Active loyalty members exceed 5,000 OR marketing
requests VIP tier.
**Scope:** `loyalty_tiers` table (bronze/silver/gold/platinum);
`loyalty_point_balances.tier_id` FK; tier upgrade/downgrade job;
tier-specific rewards catalog filter.

### 8.9 Franchisee role + onboarding
**Trigger:** Owner signs first franchise agreement (Phase 15
go-live prerequisite).
**Scope:** `franchisee` role (separate from `organization_owner`);
`franchise_agreements` table (royalty %, term, territory);
franchisee self-service onboarding flow; royalty calculation job.

### 8.10 Multi-tenant SaaS isolation
**Trigger:** >5 franchisees onboarded OR compliance review
requires data isolation.
**Scope:** Per-organization Supabase project OR per-organization
schema with row-level `organization_id` enforcement. Major
migration effort; requires Phase 14 integration test rewrite.

### 8.11 Franchise agreement tracking
**Trigger:** First franchise agreement signed.
**Scope:** `franchise_agreements` table with royalty %, term
dates, territory polygon, termination clause, renewal history.

### 8.12 Royalty computation
**Trigger:** First franchisee onboarded AND franchise agreement
§8.11 shipped.
**Scope:** Monthly royalty job: per-branch gross sales × royalty
% → `franchise_royalty_statements` table; auto-post to GL as
`franchise_royalty_expense` mapping purpose.

### 8.13 Address autocomplete
**Trigger:** Google Maps Places API key provisioned by owner.
**Scope:** `AddressAutocomplete` React component; debounced
query to Places API; select fills `customer_addresses` form.

### 8.14 Reverse geocode
**Trigger:** Google Maps Geocoding API key provisioned.
**Scope:** `POST /api/v1/geocode/reverse` endpoint; branch
assignment by polygon containment (already supported in
`branches.delivery_zone_geojson`).

### 8.15 Transactional SMS
**Trigger:** WhatsApp delivery rate <90% OR owner requests SMS
fallback for order status.
**Scope:** Twilio Programmable SMS; `sms_outbox` table mirroring
`whatsapp_messages` pattern; rate-limit per customer per hour.

### 8.16 Email receipts
**Trigger:** Owner signs up transactional email provider (SendGrid
or Postmark).
**Scope:** `email_outbox` table; receipt template (PDF attachment
via ADR-022 reports framework); opt-in via customer preferences.

### 8.17 Native mobile app (iOS / Android)
**Trigger:** Owner explicitly decides to invest in native app
after Phase 15 go-live AND PWA adoption metrics show clear
ceiling.
**Scope:** React Native + Expo shared codebase with `apps/website`
(where feasible); native push, native maps, native payments
(Apple Pay / Google Pay via Stripe); app-store review cycle for
catalog updates.
**Risk:** Catalog sync latency vs web — solved via server-driven
UI (SDUI) pattern.

---

## 9. Negative consequences

1. **No native app means no app-store presence.** Customers searching
   "Telepizza app" on Google Play or Apple App Store find nothing.
   Mitigation: `site.webmanifest` + "Add to Home Screen" prompt
   (§8.3) + SEO for "Telepizza order online" queries.

2. **Polling for order tracking at 8s intervals creates API load.**
   With 1000+ concurrent customers tracking orders, that's 7500+
   requests/minute. Mitigation: §8.4 Supabase Realtime when trigger
   fires; until then, polling is acceptable at current scale
   (Multan pilot).

3. **No offline capability means poor UX in weak-signal areas**
   (basements, elevators, rural routes). Mitigation: §8.1 service
   worker for catalog cache.

4. **Franchise portal is single-tenant.** All franchisees share one
   Supabase project. Mitigation: §8.10 multi-tenant SaaS isolation
   when scale demands.

5. **No push notifications means customers miss order updates if
   they close the WhatsApp notification.** Mitigation: §8.2 Web Push.

6. **Customer identity merge (ADR-006) is irreversible.** If a
   customer uses guest checkout with phone X, then later registers
   an account with phone X, the merge is automatic but the customer
   loses access to old guest order tracking tokens. Documented in
   ADR-006 §"Negative consequences".

---

## 10. Security & RLS

### 10.1 Customer self-access
All `orders`, `customers`, `loyalty_point_balances`, `loyalty_point_ledger`,
`customer_addresses` tables have RLS policies allowing
`auth.uid() = customer_id` for SELECT/UPDATE. Customers cannot read
other customers' data. Verified in foundation schema
`20260713190000_foundation_schema.sql` and ADR-005 §4.

### 10.2 Customer forbidden permissions
The `CUSTOMER_FORBIDDEN_PERMISSIONS` set
(`backend/api/src/services/auth/principal.ts`) explicitly blocks
customers from any admin route even if a misconfiguration grants a
permission. The set includes `admin.access`, `staff.read`,
`staff.manage`, `payment.manage`, `reports.read`, and all 50+
admin permission codes.

### 10.3 Franchise portal scope enforcement
`organization_owner` role is scoped to exactly one
`organization_id`. The `scopeFrom(principal)` helper
(`backend/api/src/services/auth/scope.ts`) extracts `branchIds`
from the principal's role assignments and enforces branch-level
filtering on all analytics queries. A franchisee (future §8.9)
would be restricted to their own branches.

### 10.4 PII protection
Customer PII (phone, email, address) is stored in `users` + `customers`
+ `customer_addresses` tables with RLS. WhatsApp conversation PII
(ADR-004) is anonymized after 24 months via the PII anonymization job
shipped in Phase 2.2 (`0a447c4` PR #221). Customer order PII is
retained indefinitely for accounting compliance.

---

## 11. Migration strategy

**No new migrations in v2.7.0.** This is a closeout-only release.
The customer mobile + franchise portal surface is fully implemented
in prior migrations:

- `20260713190000_foundation_schema.sql` — users, customers, orders
- `20260713191000_seed_foundation_data.sql` — customer role seed
- `20260716010000_sprint3_customer_auth_foundation.sql` — auth
- `20260716020000_sprint3_authorization_foundation.sql` — RBAC
- `20260807100000_identity_01_tenant_owner_onboarding.sql` — organization_owner
- `20260730260000_finance_core.sql` — chart_of_accounts, journal_entries (ADR-036)

Production DB tip remains `20260821000000` (Phase 3 OTP, same as
Phase 5/6/7/8/9/10/11 closeouts).

Future migrations for §8 deferrals will be numbered per the
`YYYYMMDDHHMMSS_adr_NNN_description.sql` convention.

---

## 12. Open questions

1. **Should `organization_owner` be renamed to `franchisee` when
   franchise onboarding (§8.9) ships?** Decision deferred until
   first franchise agreement is signed.
2. **Should the customer PWA ship as `m.telepizza.pk` (mobile
   subdomain) or responsive `telepizza.pk`?** Current implementation
   is responsive single-domain. Revisit if analytics show desktop
   vs mobile conversion divergence >15%.
3. **Should customer WhatsApp number (0304-1110495) be split into
   ordering vs support?** Currently single number with conversation
   routing by ADR-004. Revisit if support load exceeds 100
   conversations/day.

---

## 13. References

- ADR-003 — Provider-Secret Boundary Architecture (WhatsApp provider)
- ADR-004 — WhatsApp Conversation Ownership & Routing
- ADR-005 — Canonical Customer Identity Strategy
- ADR-006 — Customer Account Merge & Reversal Process
- ADR-016 — OTP Verification Architecture
- ADR-017 — Phone-First Auth & Session Handoff
- ADR-018 — Order Lifecycle State Machine & Staff Transition API
- ADR-019 — RBAC Authorization Principal & Permission Model
- ADR-021 — Deals, Coupons & Loyalty Promotion Engine
- ADR-022 — Reports & Analytics Framework — Query-Time KPI Registry
- ADR-026 — Branch Sync & Offline-Safe POS Contract (offline PWA deferral)
- ADR-036 — Branch GL, P&L, Balance Sheet & Cash Flow Contract (franchise portal P&L)
- `apps/website/client/public/site.webmanifest`
- `apps/website/client/src/pages/{Home,Menu,Checkout,TrackOrder,MyTelepizza,Loyalty}.tsx`
- `apps/website/client/src/pages/admin/AdminBranchManager.tsx`
- `backend/api/src/services/analytics/engine.ts` (`getOwnerWorkspace` line 1325)
- `backend/api/src/services/analytics/registry.ts` (`branch_comparison` line 750)
- `backend/api/src/modules/admin/reports.ts` (owner-workspace route line 196)
- `supabase/migrations/20260807100000_identity_01_tenant_owner_onboarding.sql`
- Master Roadmap §Phase 12 — Customer and Staff Apps
