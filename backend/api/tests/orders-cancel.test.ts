import { describe, expect, it } from "vitest";

import {
  assertCustomerCancelAllowed,
  CUSTOMER_CANCEL_WINDOW_MS,
  CustomerCancelNotAllowedError,
} from "../src/services/orders/cancel-rules.js";
import { contactPhoneMatchesOrder } from "../src/services/orders/phone-access.js";

describe("customer cancel rules", () => {
  const now = Date.parse("2026-07-16T12:00:00.000Z");
  const recentCreated = new Date(now - 5 * 60 * 1000).toISOString();

  it("allows pending orders inside the 15-minute window", () => {
    expect(() =>
      assertCustomerCancelAllowed({
        status: "pending",
        createdAt: recentCreated,
        nowMs: now,
      }),
    ).not.toThrow();
  });

  it("rejects non-pending statuses", () => {
    expect(() =>
      assertCustomerCancelAllowed({
        status: "confirmed",
        createdAt: recentCreated,
        nowMs: now,
      }),
    ).toThrow(CustomerCancelNotAllowedError);
  });

  it("rejects pending orders after the cancellation window", () => {
    const oldCreated = new Date(now - CUSTOMER_CANCEL_WINDOW_MS - 1).toISOString();
    try {
      assertCustomerCancelAllowed({
        status: "pending",
        createdAt: oldCreated,
        nowMs: now,
      });
      expect.fail("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(CustomerCancelNotAllowedError);
      expect((error as CustomerCancelNotAllowedError).code).toBe("ORDER_CANCEL_WINDOW_EXPIRED");
    }
  });

  it("rejects terminal statuses", () => {
    expect(() =>
      assertCustomerCancelAllowed({
        status: "cancelled",
        createdAt: recentCreated,
        nowMs: now,
      }),
    ).toThrow(CustomerCancelNotAllowedError);
  });
});

describe("contactPhoneMatchesOrder", () => {
  it("matches Pakistan local and E.164 formats", () => {
    expect(
      contactPhoneMatchesOrder("03041110495", "+923041110495", "0304-1110495"),
    ).toBe(true);
    expect(contactPhoneMatchesOrder("03451234567", "+923451234567", "923451234567")).toBe(
      true,
    );
    expect(contactPhoneMatchesOrder("03041110495", "+923041110495", "03459999999")).toBe(
      false,
    );
  });
});
