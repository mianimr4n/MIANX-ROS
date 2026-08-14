# ADR-008: Rider Location Retention & Privacy Policy

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260817000000_adr_008_rider_location_retention.sql`)

---

## Context

Phase 2.4 (Delivery & Rider Completion) introduces real-time rider location
tracking so customers and dispatchers can see where a delivery is on the map.
Without explicit data-retention policy, two failure modes appear:

1. **Privacy violation** — Rider GPS pings accumulate indefinitely in the
   database. Even after a delivery completes, the rider's home address,
   routes, and personal movement remain queryable by anyone with database
   access. This violates GDPR-style data-minimisation principles and creates
   legal exposure for the company.
2. **Unbounded database growth** — A 5-second polling cadence × 50 riders ×
   8 hours of operation generates ≈ 288 000 rows per branch per day. After
   a month, this is millions of low-value rows clogging indexes and slowing
   backups.

ADR-008 codifies the policy: rider GPS data is **ephemeral by default**,
retained only while operationally useful, and purged automatically afterwards.

## Decision

Implement rider location retention with these rules:

1. **Storage scope** — `rider_locations` rows are written ONLY while the rider
   is on an active delivery (`deliveries.status IN ('assigned', 'picked-up')`).
   The rider app MUST NOT send GPS pings outside of an active assignment.
   The backend rejects pings for riders without an in-flight delivery.

2. **Automatic purge 24h after delivery completion** — A scheduled job
   (`runRiderLocationTtlJob`) deletes every `rider_locations` row whose
   associated delivery reached a terminal state (`delivered`, `failed`,
   `cancelled`) more than 24 hours ago. The 24-hour window supports
   post-delivery dispute investigation; beyond that, the data is destroyed.

3. **Branch-scoped access** — RLS policies allow:
   - The rider themselves (matched on `riders.user_id = auth.uid()`) to
     read/write their own pings.
   - Branch staff (matched on `user_roles.branch_id` for the rider's
     branch) to read pings for dispatch visibility.
   - Super-admin to read all pings.
   - Anonymous / unauthenticated access is denied.

4. **Per-ping metadata is minimal** — Only `latitude`, `longitude`,
   `heading`, `speed`, `accuracy_m`, `recorded_at`, `delivery_id`, and
   `rider_id` are stored. No reverse-geocoded address, no device IDs, no
   battery level, no app telemetry. If we need address labels, they are
   computed at read-time from the customer's saved address — never stored
   against the ping.

5. **No batch backfill** — The TTL job does not backfill; it deletes only
   rows whose delivery has already terminally completed. Pings for
   in-flight deliveries are NEVER deleted by the TTL job, even if they are
   older than 24h (e.g. a delivery that has been stuck in `assigned` for
   25 hours).

6. **Job idempotency** — The TTL job is safe to run multiple times per day.
   Each invocation deletes whatever qualifies; running it twice in a row
   simply deletes zero additional rows on the second run.

## Consequences

### Positive

- **Rider privacy is preserved.** A rider who finishes work and goes home
  leaves no permanent trace in the production database beyond 24h.
- **Database stays lean.** With the TTL job running hourly, `rider_locations`
  table size stays bounded to ~1 day of active-delivery pings per branch.
- **Legal posture is defensible.** The retention window is documented,
  enforced at the database layer, and verifiable by audit.
- **Operational visibility is preserved.** During the active delivery,
  dispatchers and customers see live updates; the 24h window covers
  post-delivery dispute investigation.

### Negative

- **Historical route analysis is impossible** beyond 24h post-delivery. If
  the business wants to compute rider route efficiency over weeks, that
  aggregation MUST be computed and persisted separately (e.g. as a daily
  summary statistic) BEFORE the TTL job deletes the raw pings. This is
  explicitly out of scope for ADR-008 — see future ADR for delivery
  analytics.
- **Rider app must be honest about scope.** The rider app's location
  permission flow must clearly state "location is collected only during
  active deliveries and is deleted within 24 hours of delivery completion."
  This is a UX/consent requirement, not a backend one.

## Implementation references

- Migration: `supabase/migrations/20260817000000_adr_008_rider_location_retention.sql`
- TypeScript service: `backend/api/src/services/deliveries/rider-location-service.ts`
- TTL job: `backend/api/src/services/deliveries/rider-location-ttl.ts`
- Admin route: `backend/api/src/modules/admin/rider-location.ts`
- Tests: `backend/api/tests/rider-location-service.test.ts` (≥ 10 cases)

## Future work (out of scope for this ADR)

- **Daily delivery summary aggregation** — A separate job that computes
  per-rider per-day statistics (delivery count, total km, avg delivery
  time) and persists them in a `rider_daily_summaries` table BEFORE the
  TTL job runs. This allows long-term performance analysis without
  retaining raw GPS data.
- **Customer-facing live map** — The WebSocket/SSE layer that streams
  rider location to customers in real time. The backend already exposes
  the data via this ADR; the customer-facing delivery is a frontend task.
