import { describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import { planKitchenTicketTransition } from "../src/services/kitchen/transitions.js";

describe("planKitchenTicketTransition", () => {
  it("allows queued -> accepted -> preparing -> ready -> completed", () => {
    expect(planKitchenTicketTransition({ currentStatus: "queued", toStatus: "accepted" }).toStatus).toBe(
      "accepted",
    );
    expect(planKitchenTicketTransition({ currentStatus: "accepted", toStatus: "preparing" }).orderMirrorStatus).toBe(
      "preparing",
    );
    expect(planKitchenTicketTransition({ currentStatus: "preparing", toStatus: "ready" }).orderMirrorStatus).toBe(
      "ready",
    );
    expect(
      planKitchenTicketTransition({ currentStatus: "ready", toStatus: "completed" }).orderMirrorStatus,
    ).toBeNull();
  });

  it("allows skip queued -> preparing", () => {
    const plan = planKitchenTicketTransition({ currentStatus: "queued", toStatus: "preparing" });
    expect(plan.idempotentNoop).toBe(false);
    expect(plan.orderMirrorStatus).toBe("preparing");
  });

  it("idempotent same status is a no-op", () => {
    const plan = planKitchenTicketTransition({ currentStatus: "preparing", toStatus: "preparing" });
    expect(plan.idempotentNoop).toBe(true);
  });

  it("rejects invalid jumps and final-state changes", () => {
    expect(() =>
      planKitchenTicketTransition({ currentStatus: "queued", toStatus: "ready" }),
    ).toThrow(ApiError);
    expect(() =>
      planKitchenTicketTransition({ currentStatus: "completed", toStatus: "preparing" }),
    ).toThrow(ApiError);
    expect(() =>
      planKitchenTicketTransition({ currentStatus: "cancelled", toStatus: "queued" }),
    ).toThrow(ApiError);
  });
});
