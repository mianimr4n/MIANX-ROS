import { describe, expect, it } from "vitest";

import {
  assertGuestOrderAccessRateLimit,
  resetGuestOrderAccessRateLimitBuckets,
} from "../src/services/orders/guest-access-rate-limit.js";
import { ApiError } from "../src/common/http.js";

describe("guest order access rate limit", () => {
  it("allows requests under the per-order track cap", () => {
    resetGuestOrderAccessRateLimitBuckets();
    for (let i = 0; i < 30; i += 1) {
      expect(() => assertGuestOrderAccessRateLimit("track", "1.2.3.4", "TP-TEST-1")).not.toThrow();
    }
  });

  it("blocks excessive track requests for the same order", () => {
    resetGuestOrderAccessRateLimitBuckets();
    for (let i = 0; i < 30; i += 1) {
      assertGuestOrderAccessRateLimit("track", "1.2.3.4", "TP-TEST-1");
    }
    try {
      assertGuestOrderAccessRateLimit("track", "1.2.3.4", "TP-TEST-1");
      expect.fail("expected rate limit");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).code).toBe("RATE_LIMITED");
    }
  });

  it("isolates buckets by order number", () => {
    resetGuestOrderAccessRateLimitBuckets();
    for (let i = 0; i < 30; i += 1) {
      assertGuestOrderAccessRateLimit("track", "1.2.3.4", "TP-A");
    }
    expect(() => assertGuestOrderAccessRateLimit("track", "1.2.3.4", "TP-B")).not.toThrow();
  });
});
