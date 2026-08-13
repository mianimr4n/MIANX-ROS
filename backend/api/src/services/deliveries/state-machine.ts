/**
 * Phase 2.4 (ADR-007) — Delivery State Machine Validator
 *
 * Mirrors the SQL trigger `validate_delivery_state_transition()` so the backend
 * can produce helpful 422 ApiErrors BEFORE the database rejects the operation.
 *
 * Valid transitions (single source of truth — also enforced at DB layer):
 *   pending   -> assigned | cancelled
 *   assigned  -> picked-up | cancelled | failed
 *   picked-up -> delivered | failed
 *   delivered -> (terminal)
 *   failed    -> (terminal)
 *   cancelled -> (terminal)
 *
 * Authority: ADR-007 "Delivery State Machine & Transition Rules"
 * Migration: supabase/migrations/20260814180000_phase2_04_delivery_state_machine.sql
 */

import { ApiError } from "../../common/http.js";
import { DELIVERY_STATUSES, type DeliveryStatus } from "./operations.js";

/**
 * Immutable map of valid next states for each delivery status.
 * Must stay in sync with `public.delivery_valid_next_states()` SQL function.
 *
 * `as const` on each tuple preserves literal types so callers get
 * `readonly DeliveryStatus[]` instead of `readonly string[]`.
 */
export const DELIVERY_TRANSITION_RULES = Object.freeze({
  pending: ["assigned", "cancelled"] as readonly DeliveryStatus[],
  assigned: ["picked-up", "cancelled", "failed"] as readonly DeliveryStatus[],
  "picked-up": ["delivered", "failed"] as readonly DeliveryStatus[],
  delivered: [] as readonly DeliveryStatus[],
  failed: [] as readonly DeliveryStatus[],
  cancelled: [] as readonly DeliveryStatus[],
});

/** Terminal delivery statuses (no further transitions allowed). */
export const TERMINAL_DELIVERY_STATUSES: ReadonlySet<DeliveryStatus> = new Set([
  "delivered",
  "failed",
  "cancelled",
]);

/**
 * Returns the list of statuses the delivery can transition to from `from`.
 * Empty array = terminal state.
 */
export function validNextDeliveryStates(from: DeliveryStatus): readonly DeliveryStatus[] {
  return DELIVERY_TRANSITION_RULES[from] ?? [];
}

/**
 * Returns true if `from -> to` is a valid transition per ADR-007.
 */
export function isValidDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  const allowed = validNextDeliveryStates(from);
  return allowed.includes(to);
}

/**
 * Asserts that `from -> to` is valid. Throws ApiError(422) on violation with a
 * message that mirrors the DB trigger's error so clients get consistent feedback.
 */
export function assertValidDeliveryTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!DELIVERY_STATUSES.includes(from)) {
    throw new ApiError(
      422,
      "INVALID_DELIVERY_STATUS",
      `Unknown current delivery status: ${from}`,
    );
  }
  if (!DELIVERY_STATUSES.includes(to)) {
    throw new ApiError(
      422,
      "INVALID_DELIVERY_STATUS",
      `Unknown target delivery status: ${to}`,
    );
  }
  if (from === to) {
    throw new ApiError(
      422,
      "NO_TRANSITION",
      `Delivery is already in status "${to}" — no transition performed.`,
    );
  }
  if (!isValidDeliveryTransition(from, to)) {
    const allowed = validNextDeliveryStates(from);
    const allowedStr = allowed.length === 0 ? "(terminal — no further transitions)" : `[${allowed.join(", ")}]`;
    throw new ApiError(
      422,
      "INVALID_DELIVERY_TRANSITION",
      `Invalid delivery state transition: ${from} -> ${to}. Allowed next states: ${allowedStr}`,
    );
  }
}

/**
 * Returns true if the status is terminal (no further transitions possible).
 */
export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return TERMINAL_DELIVERY_STATUSES.has(status);
}

/**
 * Returns the timestamp column that should be set when entering `to` status.
 * Used by callers that want to set lifecycle timestamps in the same UPDATE.
 *
 * - assigned  -> assigned_at
 * - picked-up -> picked_up_at
 * - delivered -> delivered_at
 * - (others)  -> null (no specific timestamp column)
 */
export function deliveryTimestampColumnForStatus(
  to: DeliveryStatus,
): "assigned_at" | "picked_up_at" | "delivered_at" | null {
  switch (to) {
    case "assigned":
      return "assigned_at";
    case "picked-up":
      return "picked_up_at";
    case "delivered":
      return "delivered_at";
    default:
      return null;
  }
}
