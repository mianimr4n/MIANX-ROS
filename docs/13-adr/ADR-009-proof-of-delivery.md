# ADR-009: Proof of Delivery (POD) Data Format & Storage

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260817000100_adr_009_proof_of_delivery.sql`)

---

## Context

When a delivery is marked `delivered`, disputes can arise:

- Customer claims they never received the order.
- Customer claims the wrong items were delivered.
- Customer claims the order was damaged.
- Rider claims they delivered but customer disputes.

Without proof, the business has no defensible position. The previous flow
relied on the rider tapping a "delivered" button — a single bit of evidence
that says nothing about WHO received the order, WHERE it was left, or
WHAT condition it was in.

Phase 2.4 (Delivery & Rider Completion) introduces Proof of Delivery (POD):
a structured record that captures photo + signature + recipient metadata
at the moment of delivery.

## Decision

Implement POD with these rules:

1. **Storage separation** — Binary assets (photos) are stored in Supabase
   Storage bucket `delivery-pod`. Database stores only:
   - `photo_url` (the Supabase Storage public/signed URL)
   - `signature_svg_path` (the storage path to an SVG signature file —
     signatures are vector paths, not raster images, to keep size small
     and crisp at any zoom)
   - `recipient_name`, `recipient_relationship` (e.g. "self", "family
     member", "neighbor", "guard")
   - `notes` (free-text rider notes, max 1000 chars)

   This keeps the database lean and avoids base64 bloat. Supabase Storage
   handles CDN, signed URLs, and bucket-level access policies.

2. **One POD per delivery** — `delivery_pod.delivery_id` is UNIQUE. A
   delivery can have at most one POD. The rider app cannot upload a
   second POD; if the first upload was wrong, the rider must contact
   support to void the delivery and re-create it (which creates a new
   `deliveries.id` and thus a fresh slot for a new POD).

3. **POD is mandatory for `delivered` transition** — The
   `validate_delivery_state_transition` SQL trigger (ADR-007) is extended:
   a transition to `delivered` is REJECTED if no `delivery_pod` row exists
   for that delivery. The rider app must capture POD BEFORE tapping
   "mark delivered".

   This is enforced at the DB layer so it cannot be bypassed by a buggy
   API call. Defense in depth: the TypeScript service layer ALSO checks
   for POD existence before attempting the transition, so riders get a
   helpful 422 error ("Capture POD first") instead of a cryptic DB error.

4. **Branch-scoped access** — RLS policies allow:
   - The rider assigned to the delivery to INSERT and SELECT their own POD.
   - Branch staff (branch-manager, customer-support, super-admin) to
     SELECT PODs for deliveries in their branch.
   - The customer who placed the order to SELECT their own POD (so they
     can verify the photo/signature if they dispute).
   - Anonymous access denied.

5. **Captured-by audit** — `captured_by_rider_id` is NOT NULL and
   references the rider who captured the POD. Even if a different rider
   completes the delivery (rare but possible during hand-off), the audit
   trail records who actually captured the proof.

6. **Timestamps are server-generated** — `captured_at` defaults to
   `timezone('utc', now())` at INSERT time. The rider app can send a
   client-side timestamp in the request body, but the database ignores
   it for the canonical `captured_at` column (it is stored only in the
   `metadata->>'client_captured_at'` field for forensic comparison if
   needed).

7. **Immutability after delivery completes** — Once the parent delivery
   reaches `delivered`, the POD row becomes immutable. UPDATE and DELETE
   are blocked by a trigger. To correct a wrong POD, the business must
   reverse the delivery to `failed` (allowed only via super-admin
   override), which unblocks POD modification.

## Consequences

### Positive

- **Disputes are resolvable.** Customer service can pull the POD photo +
  signature + recipient name within seconds of a complaint.
- **Audit trail is complete.** Every `delivered` transition has a
  defensible proof record. A delivery without POD is impossible by
  database construction.
- **Storage cost is controlled.** Photos live in Supabase Storage, not
  the database. The database row is < 1 KB.
- **Customer can self-serve.** The customer-facing API can expose their
  own POD, reducing support load for "did you actually deliver?"
  questions.

### Negative

- **Rider app complexity.** The rider app must capture photo + signature
  in a single flow BEFORE marking delivered. This is a UX requirement
  that must be trained.
- **Storage bucket must be configured.** The `delivery-pod` Supabase
  Storage bucket must exist with appropriate policies (write only for
  authenticated riders; read only for branch staff + the order's
  customer). The migration DOCUMENTS this requirement but does NOT
  create the bucket (Supabase Storage buckets are managed via the
  dashboard or Management API, not SQL migrations). A runbook step is
  added to the deployment checklist.
- **POD cannot be corrected without delivery reversal.** A rider who
  uploads the wrong photo cannot self-correct — they must escalate to
  support. This is intentional: prevents malicious riders from swapping
  POD after a dispute is filed.

## Implementation references

- Migration: `supabase/migrations/20260817000100_adr_009_proof_of_delivery.sql`
- TypeScript service: `backend/api/src/services/deliveries/pod-service.ts`
- Admin route: `backend/api/src/modules/admin/delivery-pod.ts`
- Tests: `backend/api/tests/delivery-pod-service.test.ts` (≥ 10 cases)

## Future work (out of scope for this ADR)

- **Customer-facing POD view** — Exposing the POD to the customer via
  `/api/v1/orders/{id}/pod` endpoint (read-only, customer-scoped).
- **POD OCR for recipient name** — Automatically extracting recipient
  name from a printed receipt photo. Out of scope; the rider types the
  recipient name manually for now.
- **Video POD** — Some businesses require video proof for high-value
  orders. Out of scope; ADR-009 is photo-only.
