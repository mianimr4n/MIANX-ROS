# ADR-007: Delivery State Machine & Transition Rules

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.8.0` (migration `20260814180000_adr_007_delivery_state_machine.sql`)

---

## Context

Phase 2.4 (Delivery & Rider Completion) requires a deterministic, auditable
state machine for delivery lifecycle transitions. The existing `deliveries`
table had a `status` column with a CHECK constraint enumerating allowed
values, but nothing prevented invalid transitions like `pending → delivered`
(skipping the assigned and picked-up steps) or transitions out of terminal
states (e.g. `delivered → pending`).

Without enforcement, the application layer alone could permit race conditions
or buggy flows that leave deliveries in invalid states. ADR-007 codifies the
allowed transitions and enforces them at the database layer.

## Decision

Implement a delivery state machine with these rules:

```
pending   → assigned | cancelled
assigned  → picked-up | cancelled | failed
picked-up → delivered | failed
delivered → (terminal)
failed    → (terminal)
cancelled → (terminal)
```

Enforcement is layered:

1. **SQL trigger** (`trg_validate_delivery_state_transition`) — blocks invalid
   `UPDATE`s on `deliveries.status` at the database layer. Defense in depth.
2. **Append-only audit table** (`delivery_state_transitions`) — every valid
   transition is recorded with actor, role, reason, and metadata. The table
   rejects UPDATE and DELETE via trigger (true append-only).
3. **TypeScript validator** (`services/deliveries/state-machine.ts`) — produces
   helpful 422 ApiErrors BEFORE the database rejects the operation. Mirrors
   the SQL rules exactly.
4. **Lifecycle timestamps** — `assigned_at`, `picked_up_at`, `delivered_at`
   are set automatically by the trigger when entering the corresponding
   state (if not already set).

## Consequences

### Positive

- **Impossible to reach invalid states.** Defense in depth at DB + app layers.
- **Full audit trail.** Every state change is recorded with who/when/why.
- **Helpful errors.** Backend returns 422 with the list of allowed next
  states before hitting the DB, giving clients actionable feedback.
- **Terminal states are truly terminal.** Once `delivered`/`failed`/
  `cancelled`, no further transitions are possible (matches business reality).

### Negative

- **No re-assignment after failure.** A `failed` delivery cannot be retried
  via state transition. The business must create a new `deliveries` row
  (with a fresh `pending` status) for re-dispatch. This is intentional —
  preserves audit integrity.
- **Two layers to keep in sync.** The TypeScript rules must mirror the SQL
  function `delivery_valid_next_states()`. A unit test
  (`delivery-state-machine.test.ts`) covers every transition cell to catch
  drift.

## Implementation references

- Migration: `supabase/migrations/20260814180000_adr_007_delivery_state_machine.sql`
- TypeScript: `backend/api/src/services/deliveries/state-machine.ts`
- Tests: `backend/api/tests/delivery-state-machine.test.ts` (82 cases)

## Future work (out of scope for this ADR)

- **ADR-008** — Rider location retention & privacy (GPS trace storage policy)
- **ADR-009** — Proof of Delivery (POD) data format & storage
- **ADR-010** — Cash on Delivery (COD) financial ownership

These remain PROPOSED pending separate ADRs.
