import { describe, expect, it } from "vitest";

import { ApiError } from "../src/common/http.js";
import { planTransition } from "../src/services/orders/transitions.js";

const staff = { isSuperAdmin: false, roles: ["cashier"] };
const manager = { isSuperAdmin: false, roles: ["branch-manager"] };
const superAdmin = { isSuperAdmin: true, roles: ["super-admin"] };

function expectApiError(fn: () => unknown, code: string, status?: number) {
  try {
    fn();
    throw new Error("expected ApiError");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe(code);
    if (status) expect((error as ApiError).statusCode).toBe(status);
  }
}

describe("planTransition — frozen state machine", () => {
  it("confirm: pending -> confirmed", () => {
    const plan = planTransition({ action: "confirm", currentStatus: "pending", actor: staff });
    expect(plan.toStatus).toBe("confirmed");
    expect(plan.allowedFromStatuses).toEqual(["pending"]);
    expect(plan.idempotentNoop).toBe(false);
  });

  it("reject: pending -> cancelled with rejected_by_branch", () => {
    const plan = planTransition({ action: "reject", currentStatus: "pending", actor: staff });
    expect(plan.toStatus).toBe("cancelled");
    expect(plan.reasonCode).toBe("rejected_by_branch");
  });

  it("reject also allowed from confirmed (pre-kitchen)", () => {
    const plan = planTransition({ action: "reject", currentStatus: "confirmed", actor: staff });
    expect(plan.toStatus).toBe("cancelled");
  });

  it("reject rejects a non rejected_by_branch reason", () => {
    expectApiError(
      () => planTransition({ action: "reject", currentStatus: "pending", actor: staff, reasonCode: "duplicate" }),
      "VALIDATION_ERROR",
      400,
    );
  });

  it("confirmed -> preparing", () => {
    expect(planTransition({ action: "preparing", currentStatus: "confirmed", actor: staff }).toStatus).toBe(
      "preparing",
    );
  });

  it("preparing -> ready", () => {
    expect(planTransition({ action: "ready", currentStatus: "preparing", actor: staff }).toStatus).toBe("ready");
  });

  it("cancel requires a reason code", () => {
    expectApiError(
      () => planTransition({ action: "cancel", currentStatus: "pending", actor: staff }),
      "VALIDATION_ERROR",
      400,
    );
  });

  it("cancel rejects an unknown reason code", () => {
    expectApiError(
      () => planTransition({ action: "cancel", currentStatus: "pending", actor: staff, reasonCode: "nope" }),
      "VALIDATION_ERROR",
    );
  });

  it("cancel pending allowed for any staff with reason", () => {
    const plan = planTransition({ action: "cancel", currentStatus: "pending", actor: staff, reasonCode: "staff_cancelled" });
    expect(plan.toStatus).toBe("cancelled");
    expect(plan.reasonCode).toBe("staff_cancelled");
  });

  it("cancel from preparing is BM/SA only — cashier denied", () => {
    expectApiError(
      () => planTransition({ action: "cancel", currentStatus: "preparing", actor: staff, reasonCode: "staff_cancelled" }),
      "ORDER_ACCESS_DENIED",
      403,
    );
  });

  it("cancel from ready allowed for branch-manager", () => {
    const plan = planTransition({ action: "cancel", currentStatus: "ready", actor: manager, reasonCode: "staff_cancelled" });
    expect(plan.toStatus).toBe("cancelled");
  });

  it("cancel from preparing allowed for super-admin", () => {
    const plan = planTransition({ action: "cancel", currentStatus: "preparing", actor: superAdmin, reasonCode: "test" });
    expect(plan.toStatus).toBe("cancelled");
  });

  it("invalid transition: confirm a preparing order", () => {
    expectApiError(
      () => planTransition({ action: "confirm", currentStatus: "preparing", actor: staff }),
      "INVALID_ORDER_TRANSITION",
      409,
    );
  });

  it("final state protected: confirm a completed order", () => {
    expectApiError(
      () => planTransition({ action: "confirm", currentStatus: "completed", actor: staff }),
      "ORDER_ALREADY_FINAL",
      409,
    );
  });

  it("idempotent no-op: confirm an already-confirmed order", () => {
    const plan = planTransition({ action: "confirm", currentStatus: "confirmed", actor: staff });
    expect(plan.idempotentNoop).toBe(true);
    expect(plan.toStatus).toBe("confirmed");
  });

  it("idempotent no-op: cancel an already-cancelled order (no reason needed)", () => {
    const plan = planTransition({ action: "cancel", currentStatus: "cancelled", actor: staff });
    expect(plan.idempotentNoop).toBe(true);
  });
});
