/**
 * Tests for ADR-007 — Delivery State Machine
 *
 * Pure unit tests for the TypeScript validator. The SQL trigger is exercised
 * in the existing `d3-payment-settlement` and `riders-delivery.authz` suites
 * (via Supabase local stack). These tests ensure the validator mirrors the
 * SQL rules exactly so the backend produces helpful 422 errors BEFORE the
 * database rejects the operation.
 */

import { describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import {
  DELIVERY_TRANSITION_RULES,
  assertValidDeliveryTransition,
  deliveryTimestampColumnForStatus,
  isTerminalDeliveryStatus,
  isValidDeliveryTransition,
  validNextDeliveryStates,
} from "../src/services/deliveries/state-machine.js";
import { DELIVERY_STATUSES } from "../src/services/deliveries/operations.js";

describe("ADR-007 — Delivery State Machine", () => {
  describe("DELIVERY_TRANSITION_RULES — rule coverage", () => {
    it("defines rules for every status in DELIVERY_STATUSES", () => {
      for (const status of DELIVERY_STATUSES) {
        expect(DELIVERY_TRANSITION_RULES).toHaveProperty(status);
      }
    });

    it("marks delivered / failed / cancelled as terminal (empty allowed list)", () => {
      expect(DELIVERY_TRANSITION_RULES.delivered).toEqual([]);
      expect(DELIVERY_TRANSITION_RULES.failed).toEqual([]);
      expect(DELIVERY_TRANSITION_RULES.cancelled).toEqual([]);
    });
  });

  describe("validNextDeliveryStates", () => {
    it("returns the documented next states for pending", () => {
      expect([...validNextDeliveryStates("pending")].sort()).toEqual(["assigned", "cancelled"].sort());
    });

    it("returns the documented next states for assigned", () => {
      expect([...validNextDeliveryStates("assigned")].sort()).toEqual(
        ["picked-up", "cancelled", "failed"].sort(),
      );
    });

    it("returns the documented next states for picked-up", () => {
      expect([...validNextDeliveryStates("picked-up")].sort()).toEqual(["delivered", "failed"].sort());
    });

    it("returns empty array for terminal statuses", () => {
      expect(validNextDeliveryStates("delivered")).toEqual([]);
      expect(validNextDeliveryStates("failed")).toEqual([]);
      expect(validNextDeliveryStates("cancelled")).toEqual([]);
    });
  });

  describe("isValidDeliveryTransition", () => {
    it("accepts pending -> assigned", () => {
      expect(isValidDeliveryTransition("pending", "assigned")).toBe(true);
    });
    it("accepts pending -> cancelled", () => {
      expect(isValidDeliveryTransition("pending", "cancelled")).toBe(true);
    });
    it("accepts assigned -> picked-up", () => {
      expect(isValidDeliveryTransition("assigned", "picked-up")).toBe(true);
    });
    it("accepts assigned -> failed", () => {
      expect(isValidDeliveryTransition("assigned", "failed")).toBe(true);
    });
    it("accepts picked-up -> delivered", () => {
      expect(isValidDeliveryTransition("picked-up", "delivered")).toBe(true);
    });
    it("accepts picked-up -> failed", () => {
      expect(isValidDeliveryTransition("picked-up", "failed")).toBe(true);
    });

    it("rejects pending -> delivered (skipping assigned + picked-up)", () => {
      expect(isValidDeliveryTransition("pending", "delivered")).toBe(false);
    });
    it("rejects pending -> picked-up (skipping assigned)", () => {
      expect(isValidDeliveryTransition("pending", "picked-up")).toBe(false);
    });
    it("rejects assigned -> delivered (skipping picked-up)", () => {
      expect(isValidDeliveryTransition("assigned", "delivered")).toBe(false);
    });
    it("rejects delivered -> pending (terminal state cannot transition)", () => {
      expect(isValidDeliveryTransition("delivered", "pending")).toBe(false);
    });
    it("rejects cancelled -> assigned (terminal state cannot transition)", () => {
      expect(isValidDeliveryTransition("cancelled", "assigned")).toBe(false);
    });
    it("rejects failed -> picked-up (terminal state cannot transition)", () => {
      expect(isValidDeliveryTransition("failed", "picked-up")).toBe(false);
    });
    it("rejects pending -> failed (must go through assigned first)", () => {
      expect(isValidDeliveryTransition("pending", "failed")).toBe(false);
    });
  });

  describe("assertValidDeliveryTransition", () => {
    it("does not throw for valid transitions", () => {
      expect(() => assertValidDeliveryTransition("pending", "assigned")).not.toThrow();
      expect(() => assertValidDeliveryTransition("assigned", "picked-up")).not.toThrow();
      expect(() => assertValidDeliveryTransition("picked-up", "delivered")).not.toThrow();
    });

    it("throws ApiError 422 for invalid forward transition", () => {
      expect(() => assertValidDeliveryTransition("pending", "delivered")).toThrowError(
        /Invalid delivery state transition: pending -> delivered/,
      );
    });

    it("throws ApiError 422 for transition out of terminal state", () => {
      expect(() => assertValidDeliveryTransition("delivered", "pending")).toThrowError(
        /terminal/,
      );
      expect(() => assertValidDeliveryTransition("cancelled", "assigned")).toThrowError(
        /terminal/,
      );
    });

    it("throws ApiError 422 for same-status no-op", () => {
      expect(() => assertValidDeliveryTransition("pending", "pending")).toThrowError(
        /already in status/,
      );
    });

    it("throws ApiError 422 for unknown current status", () => {
      expect(() => assertValidDeliveryTransition("unknown" as never, "assigned")).toThrowError(
        /Unknown current delivery status/,
      );
    });

    it("throws ApiError 422 for unknown target status", () => {
      expect(() => assertValidDeliveryTransition("pending", "unknown" as never)).toThrowError(
        /Unknown target delivery status/,
      );
    });

    it("ApiError instances carry 422 status", () => {
      try {
        assertValidDeliveryTransition("pending", "delivered");
        expect.fail("expected throw");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).statusCode).toBe(422);
        expect((err as ApiError).code).toBe("INVALID_DELIVERY_TRANSITION");
      }
    });
  });

  describe("isTerminalDeliveryStatus", () => {
    it("returns true for delivered / failed / cancelled", () => {
      expect(isTerminalDeliveryStatus("delivered")).toBe(true);
      expect(isTerminalDeliveryStatus("failed")).toBe(true);
      expect(isTerminalDeliveryStatus("cancelled")).toBe(true);
    });

    it("returns false for pending / assigned / picked-up", () => {
      expect(isTerminalDeliveryStatus("pending")).toBe(false);
      expect(isTerminalDeliveryStatus("assigned")).toBe(false);
      expect(isTerminalDeliveryStatus("picked-up")).toBe(false);
    });
  });

  describe("deliveryTimestampColumnForStatus", () => {
    it("returns assigned_at for assigned", () => {
      expect(deliveryTimestampColumnForStatus("assigned")).toBe("assigned_at");
    });
    it("returns picked_up_at for picked-up", () => {
      expect(deliveryTimestampColumnForStatus("picked-up")).toBe("picked_up_at");
    });
    it("returns delivered_at for delivered", () => {
      expect(deliveryTimestampColumnForStatus("delivered")).toBe("delivered_at");
    });
    it("returns null for pending / failed / cancelled", () => {
      expect(deliveryTimestampColumnForStatus("pending")).toBeNull();
      expect(deliveryTimestampColumnForStatus("failed")).toBeNull();
      expect(deliveryTimestampColumnForStatus("cancelled")).toBeNull();
    });
  });

  describe("ADR-007 transition table — exhaustive coverage", () => {
    // Build the complete transition matrix and assert every cell.
    const EXPECTED: Record<string, boolean> = {
      // pending
      "pending->assigned": true,
      "pending->cancelled": true,
      "pending->picked-up": false,
      "pending->delivered": false,
      "pending->failed": false,
      "pending->pending": false, // no-op handled separately
      // assigned
      "assigned->picked-up": true,
      "assigned->cancelled": true,
      "assigned->failed": true,
      "assigned->pending": false,
      "assigned->delivered": false,
      "assigned->assigned": false,
      // picked-up
      "picked-up->delivered": true,
      "picked-up->failed": true,
      "picked-up->pending": false,
      "picked-up->assigned": false,
      "picked-up->cancelled": false,
      "picked-up->picked-up": false,
      // delivered (terminal)
      "delivered->pending": false,
      "delivered->assigned": false,
      "delivered->picked-up": false,
      "delivered->failed": false,
      "delivered->cancelled": false,
      // failed (terminal)
      "failed->pending": false,
      "failed->assigned": false,
      "failed->picked-up": false,
      "failed->delivered": false,
      "failed->cancelled": false,
      // cancelled (terminal)
      "cancelled->pending": false,
      "cancelled->assigned": false,
      "cancelled->picked-up": false,
      "cancelled->delivered": false,
      "cancelled->failed": false,
    };

    for (const [key, expected] of Object.entries(EXPECTED)) {
      const [from, to] = key.split("->");
      it(`${expected ? "allows" : "rejects"} ${from} -> ${to}`, () => {
        expect(isValidDeliveryTransition(from as never, to as never)).toBe(expected);
      });
    }
  });
});
