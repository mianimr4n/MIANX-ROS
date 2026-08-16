# ADR-032: Rider Location, Navigation & Performance Contract

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.4.0` (closes Phase 9 — Rider and Delivery App, ADR-032 of 3)

---

## Context

Telepizza's rider location + performance surface has been live in Production
since Phase 2.4 / v1.9.0 (ADR-008 — Rider Location Retention). The
`rider_locations` table accepts GPS pings, a TTL job purges them 24h after
delivery completion, and the admin delivery dashboard surfaces aggregate
KPIs (delivery count, average minutes, late count). ADR-008 fully specified
the data retention + privacy contract.

Despite this, the navigation + performance operational contract was never
elevated to a formal ADR. ADR-008 covers only the storage + retention
policy; it explicitly defers "daily delivery summary aggregation" and
"customer-facing live map" as future work. No ADR records the canonical
Phase 9 surface that operators actually rely on today: the GPS ingest
endpoint, the branch-scoped read access, the partial performance dashboard
(DeliveryKPIs + DeliveryInsights + DeliveryPerformance), and the explicit
deferral of per-rider KPIs + turn-by-turn navigation + customer-facing live
map.

This ADR formally accepts the as-built rider location + navigation +
performance surface as the canonical Phase 9 decision. It deliberately
scopes rider identity + dispatch to ADR-030, and the delivery lifecycle +
POD surface to ADR-031.

## Decision

### 1. Rider location storage — `rider_locations` table (ADR-008 elevation)

The `rider_locations` table (ADR-008 migration, lines 60-90) stores
ephemeral GPS pings:

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `id` | bigint PK | `generated always as identity` | Internal row ID |
| `rider_id` | uuid NOT NULL | `references riders(id) on delete cascade` | Rider who sent the ping |
| `delivery_id` | uuid nullable | `references deliveries(id) on delete cascade` | Active delivery (nullable for rider-self-tracking, but service layer requires it) |
| `latitude` | numeric(10,8) NOT NULL | `CHECK between -90 and 90` | GPS latitude |
| `longitude` | numeric(11,8) NOT NULL | `CHECK between -180 and 180` | GPS longitude |
| `heading` | numeric(5,2) nullable | `CHECK between 0 and 360` | Compass heading (degrees) |
| `speed` | numeric(6,2) nullable | `CHECK >= 0` | Speed (m/s) |
| `accuracy_m` | numeric(7,2) nullable | `CHECK >= 0` | GPS accuracy radius (meters) |
| `recorded_at` | timestamptz NOT NULL | `default timezone('utc', now())` | When the rider device captured the ping |
| `created_at` | timestamptz NOT NULL | `default timezone('utc', now())` | When the server stored it |

Three indexes (lines 91-99):

- `idx_rider_locations_rider_recorded` on `(rider_id, recorded_at DESC)` —
  supports "latest ping for rider" queries.
- `idx_rider_locations_delivery` on `(delivery_id, recorded_at DESC)` WHERE
  `delivery_id IS NOT NULL` — supports "list pings for delivery" queries
  (partial index, skips NULL delivery_id rows).
- `idx_rider_locations_created` on `(created_at)` — supports the TTL purge
  job's range scan.

### 2. Storage scope — only during active delivery

The service-layer `ingestPing` function
(`backend/api/src/services/deliveries/rider-location-service.ts`) rejects
pings from riders who do not have an active delivery. A ping is accepted
only if:

- `delivery_id` is provided AND
- `deliveries.status IN ('assigned', 'picked-up')` AND
- The rider (matching `rider_id`) is the assigned rider on that delivery
  (or is the actor themselves via `rider.user_id = scope.userId`).

This enforces ADR-008 §1: "Rider GPS pings accumulate only while the rider
is on an active delivery." Pings outside of an active assignment are
rejected at the service layer (HTTP 409 `RIDER_NOT_ON_ACTIVE_DELIVERY`),
before they reach the database.

The rider app MUST NOT send GPS pings outside of an active assignment. This
is a client-side discipline enforced by the backend rejection — even if the
rider app misbehaves, the database stays clean.

### 3. TTL purge — 24h after delivery terminal state

The `purge_expired_rider_locations(retention_hours integer)` SECURITY
DEFINER function (ADR-008 migration lines 146-194) deletes
`rider_locations` rows whose parent delivery reached a terminal state
(`delivered`, `failed`, `cancelled`) more than `retention_hours` ago
(default 24).

Key invariants:

- **Only terminal-state deliveries are purged.** Pings for in-flight
  deliveries (even if 25+ hours old) are NEVER deleted. This handles the
  edge case of a delivery stuck in `assigned` for 25 hours — the pings
  remain for dispatcher visibility.
- **Idempotent.** Running the job twice in a row deletes zero additional
  rows on the second run.
- **No backfill.** The job deletes only rows whose delivery has terminally
  completed; it does not retroactively purge historical data.

The TTL job is wired in `backend/api/src/main.ts` (line 73) via
`startRiderLocationTtlJob()` from `services/deliveries/rider-location-ttl.ts`
(104 lines). It runs hourly, but is gated by the environment variable
`TELEPIZZA_RIDER_LOCATION_TTL_JOB=1`. In Production, this env var MUST be
set on Render (or the equivalent runtime) — otherwise pings accumulate
indefinitely.

### 4. Per-ping metadata is minimal (ADR-008 §4 elevation)

Only `latitude`, `longitude`, `heading`, `speed`, `accuracy_m`,
`recorded_at`, `delivery_id`, and `rider_id` are stored. Deliberately NOT
stored:

- ❌ Reverse-geocoded address (computed at read-time from the customer's
  saved address — never stored against the ping).
- ❌ Device IDs (no `device_id` column — the rider's auth identity is the
  only linkage).
- ❌ Battery level (no `battery_level` column — not operationally useful).
- ❌ App telemetry (no `app_version`, `network_type`, etc. — telemetry
  belongs in a separate observability pipeline, not the operational DB).
- ❌ IP address (not stored — the rider's auth identity is sufficient).

This keeps each row under 200 bytes. At 5-second polling × 50 riders × 8
hours of operation × 2 branches ≈ 576,000 rows per day, the table stays
under ~120 MB/day before purge — manageable for Supabase's default storage.

### 5. GPS ingest endpoint — `POST /api/v1/admin/rider-locations`

```
POST /api/v1/admin/rider-locations
Authorization: requires permission "delivery.access"
Body: {
  "riderId": "<uuid>",
  "deliveryId": "<uuid>" | null,
  "latitude": <number>,
  "longitude": <number>,
  "heading"?: <number>,
  "speed"?: <number>,
  "accuracyM"?: <number>,
  "recordedAt"?: <ISO 8601 datetime>
}
```

The route is rate-limited at 240 requests/minute per IP
(`riderIngestRateLimiter` in `modules/admin/delivery-rider.ts` line 83) —
this accommodates a 5-second polling cadence per rider with headroom for
multiple riders behind one NAT.

`delivery.access` permission is granted to `super-admin`, `branch-manager`,
`customer-support`, `cashier`, `rider`, and `kitchen` (ADR-008/009/010
migration lines 47-50). In practice, only riders + branch staff use this
endpoint; the broader grant is for operational visibility.

Two read endpoints complement the ingest:

```
GET /api/v1/admin/rider-locations/delivery/:deliveryId?limit=100
GET /api/v1/admin/rider-locations/rider/:riderId/latest
```

Both are branch-scoped (the service layer enforces
`assertBranchInScope` for non-SA actors).

### 6. Branch-scoped access (ADR-008 §3 elevation)

RLS policies on `rider_locations` (migration lines 105-145):

| Policy | FOR | TO | Using |
|---|---|---|---|
| `rider_locations_self_read` | SELECT | `authenticated` | `EXISTS (SELECT 1 FROM riders WHERE id = rider_locations.rider_id AND user_id = auth.uid())` |
| `rider_locations_self_insert` | INSERT | `authenticated` | `EXISTS (SELECT 1 FROM riders WHERE id = rider_locations.rider_id AND user_id = auth.uid())` |
| `rider_locations_branch_read` | SELECT | `authenticated` | `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND branch_id IN (SELECT branch_id FROM riders WHERE id = rider_locations.rider_id) AND role_id IN (SELECT id FROM roles WHERE code IN ('super-admin', 'branch-manager', 'customer-support')))` |

Anonymous / unauthenticated access is denied (no `anon` policy).

The service layer adds defense-in-depth: `ingestPing`,
`listForDelivery`, and `getLatestForRider` all call `assertBranchInScope`
(or the rider-self check) before querying, so a misconfigured token still
cannot leak cross-branch data.

### 7. Performance surface — partial aggregate KPIs

The admin delivery dashboard (`AdminDelivery.tsx`, 550 lines) surfaces
aggregate delivery KPIs via three components:

| Component | Lines | What it shows |
|---|---|---|
| `DeliveryKPIs` | 141 | Total deliveries, in-flight count, delivered today, avg delivery minutes, late count (using `DELIVERY_LATE_MINUTES` threshold) |
| `DeliveryInsights` | 101 | Rule-based insights only (e.g. "3 deliveries running late", "rider X has 2 active deliveries"). NO LLM call, NO autonomous action. |
| `DeliveryPerformance` (in `DeliverySidePanels`) | 131 | Performance summary panel — aggregate on-time %, avg minutes, late % |

The `DELIVERY_LATE_MINUTES` constant is defined in
`apps/website/client/src/lib/admin-delivery.ts` (139 lines) and is a
**client-side display threshold**, NOT a server-side SLA. It is used only
to color-code deliveries as "on time" / "late" / "very late" in the UI.

`averageDeliveryMinutes` (same file) computes the mean of
`(delivered_at - created_at)` across a set of deliveries — a rough
aggregate, not a per-rider metric.

### 8. Per-rider KPIs — DEFERRED

There is NO per-rider KPI dashboard today. The system can answer "what is
the average delivery time across all deliveries?" but NOT "what is rider X's
average delivery time?" or "what is rider X's on-time %?".

To compute per-rider KPIs, the system needs:

- A `rider_daily_summaries` table (per ADR-008 future work) that
  pre-aggregates per-rider per-day statistics BEFORE the TTL job purges raw
  pings. Columns: `rider_id`, `date`, `delivery_count`,
  `total_distance_km`, `avg_delivery_minutes`, `on_time_count`,
  `late_count`, `failed_count`.
- A daily cron job that runs BEFORE `purge_expired_rider_locations` (e.g.
  at 23:00 daily) to compute and persist the summary.
- A frontend `RiderPerformanceDashboard` component with per-rider rows +
  leaderboard + trend charts.

This is deferred. The trigger to revisit is **owner request for rider
performance reviews** (typically tied to quarterly rider feedback cycles)
or **>20 active riders per branch** (at which point aggregate KPIs become
too coarse to identify under-performers).

### 9. `rider_daily_summaries` table — DEFERRED

The deferred schema (not yet created):

```sql
create table public.rider_daily_summaries (
  id bigint primary key generated always as identity,
  rider_id uuid not null references public.riders(id) on delete cascade,
  summary_date date not null,
  branch_id uuid not null references public.branches(id) on delete restrict,
  delivery_count integer not null default 0,
  delivered_count integer not null default 0,
  failed_count integer not null default 0,
  total_distance_km numeric(10,2),
  avg_delivery_minutes numeric(8,2),
  on_time_count integer not null default 0,
  late_count integer not null default 0,
  total_cod_collected numeric(14,2) default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (rider_id, summary_date)
);
```

The summary job would run daily, compute from `deliveries` +
`delivery_state_transitions` + `rider_locations` (for distance), and INSERT
ON CONFLICT UPDATE. The `rider_locations` distance computation must happen
BEFORE the TTL purge (so the summary job runs first, then the TTL job).

### 10. Rider app navigation — DEFERRED

There is NO rider mobile app today. The rider uses the admin web UI
(`AdminDelivery.tsx` or `OpsDispatch.tsx`) on a phone browser, which shows
the delivery address + customer phone + a "View" button that opens Google
Maps with the address pre-filled (via a `https://maps.google.com/?q=...`
deep link in `DeliveryDrawer.tsx`).

A proper rider app (Phase 12) would include:

- Turn-by-turn navigation (Google Maps SDK or Mapbox Navigation SDK
  embedded in the app).
- In-app customer call (via WhatsApp Business or Twilio Voice — masks the
  rider's personal number).
- One-tap status transitions (picked-up, delivered) with POD capture flow
  (photo + signature in-app).
- Offline-tolerant GPS ingest (local queue + sync when online — same
  pattern as the POS offline-safe contract in ADR-026).

This is deferred to Phase 12 (Customer and Staff Apps). The backend
contract (this ADR + ADR-030 + ADR-031) is stable and will not change when
the rider app is built — the app will consume the same
`/api/v1/riders/*` and `/api/v1/admin/rider-locations` endpoints.

### 11. Customer-facing live map — DEFERRED

ADR-008 §3 RLS allows branch staff + the rider themselves + SA to read
`rider_locations`. It does NOT currently allow the customer to read rider
locations — even for their own active delivery.

Adding customer-facing live map requires:

- A new RLS policy on `rider_locations` allowing the customer (matched via
  `deliveries.order_id → orders.customer_id → auth.uid()`) to SELECT pings
  for their own active delivery only.
- Supabase Realtime channel subscription (or WebSocket/SSE) to stream new
  pings to the customer's device.
- Map rendering on `TrackOrder.tsx` (currently 316 lines, status pills
  only — no map).

This is deferred to Phase 12. The backend data is already collected
(ADR-008); the realtime + map + customer RLS layer is the gap.

### 12. Audible alarms + push notifications — DEFERRED

The current admin UI has no audible alarm for new deliveries or late
deliveries. The kitchen has no bump-bar or recall (per ADR-029 §2.7 — RC1
accepted limitation). The rider app (when built) will need push
notifications for new assignments.

This is deferred. The trigger is the rider mobile app (Phase 12) — push
notifications require a mobile app context.

## Consequences

### Positive

- **Rider privacy is preserved.** Pings are purged 24h after delivery
  completion. No permanent location history. RLS blocks cross-branch and
  anonymous access.
- **Database stays lean.** With the TTL job running hourly,
  `rider_locations` stays bounded to ~1 day of active-delivery pings per
  branch. No manual cleanup required.
- **Ingest is fast.** The endpoint is rate-limited at 240/min (accommodates
  5-second polling × multiple riders), and the table has covering indexes
  for both ingest and read paths.
- **Branch isolation is defense-in-depth.** RLS + service-layer
  `assertBranchInScope` + rider-self check means a misconfigured token
  cannot leak cross-branch or cross-rider data.
- **Aggregate KPIs are useful.** The dashboard shows total deliveries,
  in-flight count, avg minutes, late count — enough for daily operations.
- **Backend is stable for rider app.** The endpoint contract is fixed; the
  Phase 12 rider app will consume it without backend changes.

### Negative

- **No per-rider KPIs.** Branch managers cannot identify under-performing
  riders from the dashboard. Manual SQL queries are required (§8 deferred).
- **No rider app.** Riders use the admin web UI on a phone browser, which
  is suboptimal (no turn-by-turn, no offline, no push). Affects rider
  productivity (§10 deferred).
- **No customer live map.** Customers see status pills only, not rider
  position. Reduces transparency and increases "where is my order?" support
  load (§11 deferred).
- **TTL job requires env var.** If `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` is
  not set on Render, pings accumulate indefinitely. This is an operational
  discipline issue, not a technical one — but it has no failsafe.
- **`delivery_id` is nullable in schema but required by service.** The
  column is `uuid nullable` (allows NULL at the DB level), but the service
  layer rejects pings without a `delivery_id`. This is intentional (the
  schema is permissive, the service is strict) but can confuse future
  developers.

## Implementation references

- ADR-008 migration: `supabase/migrations/20260817000000_adr_008_009_010_delivery_rider.sql` lines 60-194 (`rider_locations` table + indexes + RLS policies + `purge_expired_rider_locations` function).
- Backend route: `backend/api/src/modules/admin/delivery-rider.ts` lines 200-274 (rider-locations endpoints — POST ingest, GET by delivery, GET latest by rider).
- Backend service: `backend/api/src/services/deliveries/rider-location-service.ts` (316 lines — `ingestPing`, `listForDelivery`, `getLatestForRider`).
- TTL job: `backend/api/src/services/deliveries/rider-location-ttl.ts` (104 lines — `runOnce` + `startRiderLocationTtlJob`).
- Wiring: `backend/api/src/main.ts` line 73 (`startRiderLocationTtlJob` call), `backend/api/src/app-dependencies.ts` line 408 (`riderLocationService` factory).
- Frontend KPI components: `apps/website/client/src/components/admin/delivery/DeliveryKPIs.tsx` (141 lines), `DeliveryInsights.tsx` (101 lines), `DeliverySidePanels.tsx` (131 lines — includes `DeliveryMapFoundation` placeholder + `DeliveryPerformance`).
- Frontend helper: `apps/website/client/src/lib/admin-delivery.ts` (139 lines — `DELIVERY_LATE_MINUTES`, `averageDeliveryMinutes`, `isOnlineRiderStatus`).
- Frontend customer tracking: `apps/website/client/src/pages/TrackOrder.tsx` (316 lines — no live map).
- Tests: `backend/api/tests/rider-location-service.test.ts` (500 lines, ≥10 cases covering ingest validation + branch scope + TTL interaction).

## Future work (out of scope for this ADR)

- **`rider_daily_summaries` table** — Pre-aggregated per-rider per-day
  statistics. Daily cron job runs BEFORE TTL purge. Trigger: owner request
  for rider performance reviews OR >20 active riders per branch.
- **Per-rider KPI dashboard** — `RiderPerformanceDashboard` component with
  per-rider rows + leaderboard + trend charts. Consumes
  `rider_daily_summaries`. Trigger: same as above.
- **Rider mobile app** — Phase 12. Turn-by-turn navigation (Mapbox
  Navigation SDK), in-app customer call (WhatsApp/Twilio), one-tap status
  transitions + POD capture, offline-tolerant GPS ingest (local queue +
  sync, same pattern as ADR-026 POS offline-safe). Backend contract
  unchanged.
- **Customer-facing live map** — New RLS policy on `rider_locations`
  allowing customer to read pings for their own active delivery.
  Supabase Realtime channel subscription. Map rendering on `TrackOrder.tsx`.
  Trigger: Phase 12 customer mobile app.
- **Push notifications** — Rider app push for new assignments + customer
  app push for status changes. Requires Firebase Cloud Messaging (Android)
  + APNs (iOS) integration. Trigger: Phase 12.
- **Audible alarms** — Admin UI sound for new deliveries + late alerts.
  Kitchen bump-bar / recall (per ADR-029 §2.7). Trigger: owner sign-off
  that kitchen noise is acceptable.
- **TTL job failsafe** — If `TELEPIZZA_RIDER_LOCATION_TTL_JOB=1` is unset
  for >48h, auto-enable the job OR alert the operator. Trigger: first
  incident of unbounded `rider_locations` growth in Production.
- **Reverse geocoding at read-time** — Compute address labels from
  lat/lng using a geocoding provider (Google Maps Geocoding API, Mapbox
  Geocoding API, or Nominatim). Cached in Redis or computed on-demand.
  Trigger: when dispatchers request address labels on the live map.
