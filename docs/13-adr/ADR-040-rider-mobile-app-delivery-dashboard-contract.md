# ADR-040: Rider Mobile App & Delivery Dashboard Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.7.0` (closes Phase 12 — Customer and Staff Apps, ADR-040 of 3)

---

## Context

Telepizza's rider-facing surface and the admin-side delivery dashboard
have been live in Production across multiple prior waves, but the
mobile-app + live-map + per-rider KPI layer was explicitly DEFERRED
from Phase 9 (ADR-030/031/032) to Phase 12:

1. **Rider identity + dispatch** (Phase 9, v2.4.0, ADR-030) — `rider`
   role + 1:1 `user_id` + 1:1 `branch_id`; manual dispatch via
   `POST /api/v1/riders/deliveries/:id/assign` with 8 invariants.
   Auto-dispatch engine DEFERRED.
2. **Delivery lifecycle + pickup + POD** (Phase 9, v2.4.0, ADR-031) —
   6-state machine (assigned→picked-up→delivered, with failed +
   cancelled terminals); POD mandatory for `delivered` via trigger +
   service + UI; `picked-up` IS the out-for-delivery state.
   Failed-delivery capture + redelivery flow DEFERRED.
3. **Rider location + navigation + performance** (Phase 9, v2.4.0,
   ADR-032) — `rider_locations` ephemeral table with 24h TTL purge;
   GPS ingest endpoint `POST /api/v1/riders/deliveries/:id/location`;
   aggregate KPIs in admin dashboard. **Explicitly DEFERRED to Phase
   12**: per-rider KPI dashboard, `rider_daily_summaries` table, rider
   mobile app (turn-by-turn, in-app call, offline-tolerant), customer-
   facing live map, push notifications, audible alarms.
4. **Admin delivery dashboard** (Phase 5/9, v2.0.0/v2.4.0) —
   `AdminDelivery.tsx` (550 lines) + 8 sub-components
   (DeliveryCards, DeliveryDrawer, DeliveryFilters, DeliveryInsights,
   DeliveryKPIs, DeliverySidePanels, DeliveryTimeline, DispatchQueue)
   mounted under `/admin/delivery`. 10 admin routes in
   `backend/api/src/modules/admin/delivery-rider.ts` covering
   deliveries list, assign, status transition, POD capture, rider
   roster, location ingest.
5. **Rider mobile web** (Phase 9, v2.4.0) — Riders authenticate via
   `/staff/login` (ADR-017) with `rider` role; access delivery
   assignments via `GET /api/v1/riders/assignments`; transition
   status via `POST /api/v1/riders/deliveries/:id/status`. **NO
   dedicated mobile UI** — riders use the same admin web app
   (`AdminDeliveryHome.tsx`) on a phone browser.

Despite this, the rider mobile + live map + per-rider KPI contract
was never elevated to a formal ADR. Phase 9 ADR-032 §8-12 lists 11
specific deferrals with placeholder triggers; this ADR consolidates
them into a single accepted decision with explicit trigger conditions.

This ADR formally accepts the as-built rider mobile + delivery
dashboard surface as the canonical Phase 12 contract. It deliberately
scopes rider identity + dispatch to ADR-030, delivery lifecycle +
POD to ADR-031, and rider location storage to ADR-032 (which remains
the canonical location-storage + retention contract).

---

## Decision

### 1. Rider surface — admin web on mobile browser, NOT native mobile app

The rider-facing surface is `apps/website` (the same React + Vite SPA
used by customers and admins) with role-based routing. There is **no**
native iOS rider app, **no** native Android rider app, and **no**
React Native / Expo codebase.

| Surface | As-built | Location |
|---|---|---|
| Rider login | ✅ Live — `/staff/login` (ADR-017), `rider` role + `isRiderOnly` scope check | `apps/website/client/src/pages/StaffLogin.tsx` |
| Rider assignment list | ✅ Live — `GET /api/v1/riders/assignments` | `backend/api/src/modules/riders/routes.ts:64` |
| Rider roster (admin) | ✅ Live — `GET /api/v1/riders/roster` with `delivery.assign` perm | `backend/api/src/modules/riders/routes.ts:91` |
| Assign rider (admin) | ✅ Live — `POST /api/v1/riders/deliveries/:id/assign` with 8 invariants | `backend/api/src/modules/riders/routes.ts:113` |
| Status transition | ✅ Live — `POST /api/v1/riders/deliveries/:id/status` (rider or admin) | `backend/api/src/modules/riders/routes.ts:134` |
| POD capture | ✅ Live — `POST /api/v1/admin/delivery-pod` (ADR-009) | `backend/api/src/modules/admin/delivery-rider.ts` |
| GPS ingest | ✅ Live — `POST /api/v1/riders/deliveries/:id/location` (ADR-008) | `backend/api/src/modules/admin/delivery-rider.ts` |
| Rider home UI | 🟡 Uses `AdminDeliveryHome.tsx` (admin page) — NO rider-specific UI | DEFERRED §8.1 |
| Turn-by-turn nav | 🟡 NOT implemented — no maps SDK, no OSRM, no Mapbox | DEFERRED §8.2 |
| In-app call masking | 🟡 NOT implemented — no masked phone number service | DEFERRED §8.3 |
| Push notifications | 🟡 NOT implemented — no FCM/APNs | DEFERRED §8.4 |
| Offline-tolerant queue | 🟡 NOT implemented — Idempotency-Key only, no local action queue | DEFERRED §8.5 |
| Rider mobile app (native) | 🟡 NOT implemented | DEFERRED §8.6 |
| Rider shift scheduling | 🟡 NOT implemented — no rider shift calendar | DEFERRED §8.7 |
| Auto-dispatch | 🟡 NOT implemented — manual assign only (ADR-030 §6) | DEFERRED §8.8 |

**Why admin web on mobile instead of native app?** Telepizza's rider
roster is small (5-15 riders per branch, ~3 branches = 15-45 total).
A native app would require device management, MDM, app-store
distribution, and binary updates for workflow changes. The admin web
on mobile browser approach lets us ship rider-facing changes via
the same deploy pipeline as the customer website. Trade-off: riders
need a stable internet connection (mitigated by §8.5 offline-tolerant
queue when shipped).

### 2. Rider home surface — AdminDeliveryHome.tsx (shared with admin)

The rider's home page after login is `AdminDeliveryHome.tsx`, the
same surface used by admin staff. The `isRiderOnly` scope check
(ADR-030 §3) filters the view to show only the rider's own
assignments.

| UI element | As-built | Visibility |
|---|---|---|
| My active deliveries | ✅ Live — filtered by `rider_id = auth.uid()` via ADR-030 scope | Rider + admin |
| My delivery history | ✅ Live — `GET /api/v1/riders/assignments?status=delivered` | Rider + admin |
| Pickup button | ✅ Live — `POST /api/v1/riders/deliveries/:id/status` body `{status:'picked-up'}` | Rider + admin |
| Delivered + POD button | ✅ Live — opens POD capture form, requires photo + signature | Rider + admin |
| Customer address | ✅ Live — read from `orders.delivery_address` | Rider + admin |
| Customer phone (raw) | ✅ Live — `orders.contact_phone` shown directly | Rider + admin |
| Customer phone (masked) | 🟡 NOT implemented | DEFERRED §8.3 |
| Turn-by-turn directions | 🟡 NOT implemented — only address text, no map | DEFERRED §8.2 |
| In-app call button | 🟡 NOT implemented — rider dials raw phone | DEFERRED §8.3 |
| Earnings summary | 🟡 NOT implemented — no `rider_daily_summaries` table | DEFERRED §8.9 |
| Performance KPIs | 🟡 NOT implemented — no per-rider dashboard | DEFERRED §8.9 |
| Shift start/end | 🟡 NOT implemented — no rider shift schedule | DEFERRED §8.7 |

### 3. Delivery dashboard — admin surface (AdminDelivery.tsx + 8 sub-components)

The admin delivery dashboard is mounted at `/admin/delivery` and
comprises 9 React components totaling ~3,500 lines:

| Component | Lines | Purpose |
|---|---|---|
| `AdminDelivery.tsx` | 550 | Main page; orchestrates filter state + child components |
| `DeliveryCards.tsx` | ~250 | Card grid view of active deliveries |
| `DeliveryDrawer.tsx` | ~300 | Slide-out detail drawer for a single delivery |
| `DeliveryFilters.tsx` | ~200 | Filter bar (status, branch, rider, date range) |
| `DeliveryInsights.tsx` | ~350 | Aggregate insights panel (avg time, late count, on-time %) |
| `DeliveryKPIs.tsx` | ~280 | KPI tiles (total deliveries, active, completed, failed) |
| `DeliverySidePanels.tsx` | ~400 | Right-side context panel (rider roster + recent activity) |
| `DeliveryTimeline.tsx` | ~250 | Per-delivery event timeline (assigned→picked-up→delivered) |
| `DispatchQueue.tsx` | ~350 | Queue of unassigned deliveries awaiting rider assignment |

All components are branch-scoped via `scopeFrom(principal)` and
respect `principal.branchIds`. Super-admin sees all branches.

### 4. Admin delivery routes (10 routes)

`backend/api/src/modules/admin/delivery-rider.ts` (mounted under
`/api/v1/admin/delivery-rider/*`) exposes 10 routes for the admin
delivery dashboard:

| Route | Method | Permission | Purpose |
|---|---|---|---|
| `/` | GET | `delivery.read` | List deliveries with filters |
| `/:id` | GET | `delivery.read` | Get single delivery detail |
| `/:id/assign` | POST | `delivery.assign` | Assign rider (admin path; mirror of `/riders/`) |
| `/:id/status` | POST | `delivery.update` | Transition status (admin path) |
| `/:id/pod` | POST | `delivery.update` | Capture POD (ADR-009) |
| `/:id/location` | POST | `delivery.update` | Ingest GPS ping (rider self-report) |
| `/:id/locations` | GET | `delivery.read` | List GPS pings for a delivery |
| `/riders/roster` | GET | `delivery.assign` | List riders (admin path) |
| `/kpis` | GET | `delivery.read` | Aggregate KPIs for dashboard |
| `/insights` | GET | `delivery.read` | Insights panel data |

All routes use `requireAuthenticatedUser` + `requirePermission` +
`scopeFrom(principal)` for branch enforcement. Rate-limited at
60/min/IP via `adminRateLimiter`.

### 5. Rider location ingest + 24h TTL purge (ADR-008 elevation)

The rider location surface (ADR-008 + ADR-032) is the canonical
GPS ingest + retention contract:

| Surface | As-built | Location |
|---|---|---|
| GPS ingest endpoint | ✅ Live — `POST /api/v1/riders/deliveries/:id/location` | `backend/api/src/modules/admin/delivery-rider.ts` |
| Storage | ✅ Live — `rider_locations` table (ADR-008 §1) | `supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql` |
| Active-delivery-only enforcement | ✅ Live — service layer rejects pings outside active delivery (ADR-032 §2) | `backend/api/src/services/deliveries/rider-location-service.ts` |
| 24h TTL purge | ✅ Live — scheduled job deletes pings where `created_at < now() - interval '24 hours'` | Same service |
| Latest-ping query | ✅ Live — `idx_rider_locations_rider_recorded` index supports `ORDER BY recorded_at DESC LIMIT 1` | ADR-008 §1 |
| Per-delivery ping list | ✅ Live — `idx_rider_locations_delivery` partial index | Same |
| Live rider map (admin) | 🟡 NOT implemented — `DeliveryMapFoundation` placeholder only | DEFERRED §8.10 |
| Customer live map | 🟡 NOT implemented — no Supabase Realtime channel | DEFERRED §8.11 |
| Reverse geocode at read-time | 🟡 NOT implemented — raw lat/lng shown | DEFERRED §8.12 |

### 6. Aggregate KPIs (admin dashboard)

The admin delivery dashboard surfaces aggregate KPIs via the
`DeliveryKPIs` + `DeliveryInsights` components, backed by:

| KPI | As-built | Source |
|---|---|---|
| Total deliveries (today) | ✅ Live — `COUNT(*) FROM deliveries WHERE date_trunc('day', created_at) = today` | `delivery-kpi-service.ts` |
| Active deliveries | ✅ Live — `COUNT(*) WHERE status IN ('assigned','picked-up')` | Same |
| Completed deliveries | ✅ Live — `COUNT(*) WHERE status = 'delivered'` | Same |
| Failed deliveries | ✅ Live — `COUNT(*) WHERE status = 'failed'` | Same |
| Average delivery time (min) | ✅ Live — `AVG(EXTRACT(EPOCH FROM (delivered_at - assigned_at))/60)` | Same |
| Late count (>45 min) | ✅ Live — `COUNT(*) WHERE EXTRACT(EPOCH FROM (delivered_at - assigned_at))/60 > 45` | Same |
| On-time % | ✅ Live — `(completed - late) / completed * 100` | Same |
| Average distance (km) | 🟡 NOT implemented — no distance computation (requires route API) | DEFERRED §8.13 |

### 7. Per-rider KPIs

| Surface | As-built | Location |
|---|---|---|
| Per-rider delivery count | 🟡 NOT implemented — `DeliveryKPIs` shows aggregate only | DEFERRED §8.9 |
| Per-rider avg time | 🟡 NOT implemented | DEFERRED §8.9 |
| Per-rider on-time % | 🟡 NOT implemented | DEFERRED §8.9 |
| Per-rider earnings | 🟡 NOT implemented | DEFERRED §8.9 |
| `rider_daily_summaries` table | 🟡 NOT implemented | DEFERRED §8.9 |
| Per-rider KPI dashboard UI | 🟡 NOT implemented | DEFERRED §8.9 |

---

## 8. DEFERRED items with explicit trigger conditions

### 8.1 Rider-specific mobile UI
**Trigger:** Rider complaint about admin UI density on mobile OR
rider turnover rate >20% in a quarter.
**Scope:** Dedicated `RiderHome.tsx` page with: today's assignments
list, big-tap pickup/delivered buttons, GPS-permission prompt,
customer address with map link (Google Maps URL intent).
**Depends on:** Nothing — can ship immediately.

### 8.2 Turn-by-turn navigation
**Trigger:** Average delivery time exceeds 30 minutes OR rider
complaint about getting lost.
**Scope:** Mapbox SDK (or OSRM self-hosted) integration; route
polyline from rider's current GPS to customer address; voice
prompts via Web Speech API (PWA) or native SDK (future §8.6).
**Depends on:** Mapbox API key provisioned by owner.

### 8.3 In-app call masking
**Trigger:** Customer complaint about rider having their real phone
number OR privacy compliance review.
**Scope:** Twilio Programmable Voice; `rider_customer_calls` table
recording call metadata; masked number pair (rider ↔ customer)
provisioned per delivery; call recording with consent.
**Depends on:** Twilio account upgrade + Pakistan phone number
provisioning.

### 8.4 Push notifications (rider)
**Trigger:** §8.1 rider mobile UI shipped AND rider adoption >80%.
**Scope:** FCM for Android; APNs via FCM for iOS; notifications
for: new assignment, customer cancellation, prep-time-ready
reminder, end-of-shift summary.
**Depends on:** Phase 13 marketing automation OR dedicated rider
notification service.

### 8.5 Offline-tolerant action queue
**Trigger:** Rider complaint about lost actions in dead zones OR
GPS ping drop rate >5%.
**Scope:** IndexedDB action queue in `apps/website/client/src/lib/rider-offline-queue.ts`;
actions queued when offline; flushed on reconnect with
Idempotency-Key (already supported by all rider endpoints); conflict
resolution: server-side state wins, rider notified via toast.
**Depends on:** §8.1 rider mobile UI (separate rider surface makes
this cleaner).

### 8.6 Rider native mobile app (iOS / Android)
**Trigger:** Owner explicitly decides to invest in native rider
app after Phase 15 go-live AND §8.1-§8.5 shipped.
**Scope:** React Native + Expo; shared business logic with web
via `apps/website/shared/const.ts` extraction; native push (§8.4),
native maps (§8.2), native offline queue (§8.5); MDM distribution
via Apple Business Manager + Android Enterprise.
**Risk:** High — device management overhead, app-store review for
rider-facing changes, binary signing. Defer as long as possible.

### 8.7 Rider shift scheduling
**Trigger:** Rider count >20 OR branch manager requests shift
planning.
**Scope:** `rider_shifts` table (rider_id, branch_id, start, end,
status); integration with ADR-019 RBAC for active-rider-only
assignment invariant (ADR-030 §3); shift calendar UI in admin.

### 8.8 Auto-dispatch engine
**Trigger:** Manual assignment workload >50 actions/day OR branch
manager requests automation.
**Scope:** Auto-assign on `orders.status='confirmed'` if delivery
zone matches an active rider with capacity <3; rider scoring by
proximity + load + last-assignment-time; rider self-assign queue
(riders claim unassigned deliveries within their zone).
**Depends on:** §8.7 rider shift scheduling (to know who is active).

### 8.9 Per-rider KPIs + `rider_daily_summaries` table
**Trigger:** Branch manager requests per-rider performance review
OR §8.7 rider shift scheduling shipped.
**Scope:** `rider_daily_summaries` table (rider_id, date, branch_id,
total_deliveries, completed, failed, avg_time_min, on_time_pct,
total_earnings, distance_km); nightly materialization job; per-rider
KPI dashboard UI at `/admin/riders/:id/performance`; earnings
report export.
**Depends on:** §8.13 average distance computation for full KPI set.

### 8.10 Live rider map (admin)
**Trigger:** Branch manager requests live ops view OR §8.4 push
notifications shipped (realtime infra ready).
**Scope:** `DeliveryMapFoundation.tsx` (placeholder) →
`DeliveryLiveMap.tsx`; Supabase Realtime channel on
`rider_locations` table; marker per active rider with status color;
click marker → delivery detail drawer.
**Depends on:** Supabase Realtime enabled on Production (currently
disabled to control WebSocket connection costs).

### 8.11 Customer-facing live map
**Trigger:** Customer complaint about "where is my rider" OR
competitor offers live map.
**Scope:** Supabase Realtime channel on `rider_locations` filtered
to the customer's own delivery (RLS: `delivery_id IN (SELECT id
FROM deliveries WHERE order_id IN (SELECT id FROM orders WHERE
customer_id = auth.uid()))`); map tile via Mapbox; rider marker
updates every 5s; auto-zoom to fit rider + customer address.
**Depends on:** §8.10 live rider map (shared infra).

### 8.12 Reverse geocode at read-time
**Trigger:** Branch manager requests "rider current location address"
in dashboard.
**Scope:** `POST /api/v1/geocode/reverse` endpoint; Mapbox or Google
Geocoding API; cached in `rider_locations.reverse_geocoded_address`
column (TTL 5 min).

### 8.13 Average distance computation
**Trigger:** §8.9 per-rider KPIs shipped.
**Scope:** Distance per delivery = haversine(pickup_lat, pickup_lng,
delivery_lat, delivery_lng); stored on `deliveries.distance_km`
column at delivery creation; aggregated in `rider_daily_summaries`.
**Depends on:** `orders.delivery_lat/lng` columns (currently only
`delivery_address` text).

### 8.14 Failed-delivery capture + redelivery
**Trigger:** Failed-delivery rate >5% OR branch manager requests
structured failure tracking.
**Scope:** `delivery_failures` table (delivery_id, failure_reason,
failure_category, photo, captured_by, captured_at); rider-triggered
`POST /api/v1/riders/deliveries/:id/fail` endpoint; redelivery
flow via `original_delivery_id` FK on new `deliveries` row.
**Depends on:** ADR-031 §6-10 deferral resolution.

### 8.15 Single-transaction delivery+order mirror
**Trigger:** Bug report of mirror drift between `deliveries.status`
and `orders.status`.
**Scope:** Refactor `transitionDelivery` to use a single
`SECURITY DEFINER` RPC that updates both tables in one transaction;
removes compensating rollback (ADR-031 §3).
**Risk:** Medium — refactor of working code; defer until drift
observed.

### 8.16 Delivery SLA tracking
**Trigger:** Branch manager requests SLA breach alerts.
**Scope:** `delivery_sla_thresholds` per branch (e.g., 30 min city /
45 min suburbs); `deliveries.sla_due_at` column computed at
assignment; late-alert event inserted when `now() > sla_due_at AND
status NOT IN ('delivered','cancelled','failed')`.

### 8.17 Audible alarms + bump-bar + recall (kitchen-side)
**Trigger:** Kitchen staff complaint about missed tickets during
rush hour.
**Scope:** Web Audio API alarm on new ticket; bump-bar keyboard
shortcut (Space = next ticket); recall modal for last-5-min
completed tickets.
**Note:** This is a kitchen (Phase 8) deferral, listed here because
it shares the realtime + alarm infra with rider push (§8.4).

---

## 9. Negative consequences

1. **No native rider app means riders must use browser.** Battery
   drain from screen-on + GPS is significant. Mitigation: §8.1
   rider-specific UI with wake-lock API; §8.5 offline-tolerant
   queue reduces re-fetch traffic.

2. **No turn-by-turn means riders switch to Google Maps manually.**
   This loses the live GPS ingest (rider closes our app to open
   Maps). Mitigation: §8.2 turn-by-turn; until then, the
   `POST /api/v1/riders/deliveries/:id/location` endpoint continues
   to ingest pings via the `navigator.geolocation.watchPosition`
   background task.

3. **No in-app call masking means riders have customer's real phone.**
   Privacy risk. Mitigation: §8.3 in-app call masking; until then,
   customer phone is shown in full and riders are trained to use
   it responsibly.

4. **Aggregate KPIs only — no per-rider accountability.** Branch
   managers cannot identify underperforming riders. Mitigation:
   §8.9 per-rider KPIs.

5. **No live rider map means branch managers call riders to ask
   "where are you."** Operational friction. Mitigation: §8.10 live
   rider map.

6. **Manual dispatch is slow at peak.** Branch manager spends
   5-10 minutes per delivery assigning riders. Mitigation: §8.8
   auto-dispatch.

---

## 10. Security & RLS

### 10.1 Rider self-access
`riders`, `deliveries`, `rider_locations` tables have RLS policies
allowing `auth.uid() = rider.user_id` for SELECT on their own rows.
Riders can transition their own delivery status but cannot assign
(other riders' assignments are hidden).

### 10.2 Rider forbidden actions
The `rider` role (seeded in `20260713191000_seed_foundation_data.sql`)
has explicit permissions: `delivery.read`, `delivery.assign`,
`delivery.update`. It does NOT have `admin.access`, `staff.read`,
`payment.read`, `reports.read`, or any inventory/menu/finance
permissions. The `isRiderOnly` scope check (ADR-030 §3) further
restricts rider access to delivery-only endpoints.

### 10.3 GPS ping privacy
`rider_locations` is ephemeral (24h TTL purge per ADR-008). RLS
allows: rider self-read+insert, branch staff read (via
`current_user_has_branch_access`), super-admin read. Customers
do NOT have direct read access — they see only the live map
(§8.11) via a dedicated RLS policy that filters to their own
active delivery.

### 10.4 POD immutability
POD photos + signatures (ADR-009) are immutable after `delivered`
status. The `enforce_pod_immutability` trigger blocks UPDATE/DELETE
on `delivery_proofs` once `deliveries.status='delivered'`.

---

## 11. Migration strategy

**No new migrations in v2.7.0.** This is a closeout-only release.
The rider mobile + delivery dashboard surface is fully implemented
in prior migrations:

- `20260817000000_adr_008_009_010_delivery_rider.sql` — rider_locations,
  delivery_proofs, cod_collections (ADR-008/009/010)
- `20260713190000_foundation_schema.sql` — deliveries, riders
- `20260713191000_seed_foundation_data.sql` — rider role seed
- `20260807100000_identity_01_tenant_owner_onboarding.sql` — rider
  role elevation (legacy `rider` → canonical `rider`)

Production DB tip remains `20260821000000` (Phase 3 OTP, same as
Phase 5/6/7/8/9/10/11 closeouts).

Future migrations for §8 deferrals will be numbered per the
`YYYYMMDDHHMMSS_adr_NNN_description.sql` convention.

---

## 12. Open questions

1. **Should the rider mobile UI (§8.1) be a separate route
   (`/rider/home`) or a re-skin of `AdminDeliveryHome.tsx`?**
   Decision: separate route — cleaner scope, easier to A/B test,
   and lets us ship rider-only features (earnings, shift) without
   polluting admin UI.
2. **Mapbox vs Google Maps SDK for §8.2 turn-by-turn?** Mapbox is
   cheaper at scale but Google has better Pakistan coverage.
   Defer until §8.2 trigger fires.
3. **Should `rider_daily_summaries` (§8.9) be a materialized view
   or a physical table?** Materialized view is simpler but requires
   refresh job. Physical table requires nightly materialization.
   Decision: physical table (better for historical queries + index
   optimization).

---

## 13. References

- ADR-007 — Delivery State Machine & Transition Rules
- ADR-008 — Rider Location Retention & Privacy Policy
- ADR-009 — Proof of Delivery (POD) Data Format & Storage
- ADR-010 — Cash on Delivery (COD) Financial Ownership
- ADR-017 — Phone-First Auth & Session Handoff (rider uses `/staff/login`)
- ADR-019 — RBAC Authorization Principal & Permission Model
- ADR-030 — Rider Identity, Dispatch & Assignment Contract
- ADR-031 — Delivery Lifecycle, Pickup & POD Surface
- ADR-032 — Rider Location, Navigation & Performance Contract
- `apps/website/client/src/pages/admin/AdminDelivery.tsx`
- `apps/website/client/src/pages/admin/AdminDeliveryHome.tsx`
- `apps/website/client/src/components/admin/delivery/{DeliveryCards,DeliveryDrawer,DeliveryFilters,DeliveryInsights,DeliveryKPIs,DeliverySidePanels,DeliveryTimeline,DispatchQueue}.tsx`
- `backend/api/src/modules/riders/routes.ts` (4 rider-facing routes)
- `backend/api/src/modules/admin/delivery-rider.ts` (10 admin delivery routes)
- `backend/api/src/services/deliveries/rider-location-service.ts`
- `supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql`
- Master Roadmap §Phase 12 — Customer and Staff Apps
- Master Roadmap §Phase 9 — Rider and Delivery App (deferrals to Phase 12)
