import { describe, expect, it } from "vitest";

import {
  assertValidIanaTimezone,
  businessDateInTimezone,
  businessDayUtcBounds,
  formatInTimezone,
  wallTimeToUtcIso,
} from "../src/services/time/branch-timezone.js";
import { ApiError } from "../src/common/http.js";

describe("D3 timezone helpers", () => {
  it("converts Asia/Karachi wall time to UTC (fixed +05:00)", () => {
    const utc = wallTimeToUtcIso("2026-07-25", "12:00:00", "Asia/Karachi");
    expect(utc).toBe("2026-07-25T07:00:00.000Z");
    expect(businessDateInTimezone(utc, "Asia/Karachi")).toBe("2026-07-25");
  });

  it("handles Europe/London DST (BST in July)", () => {
    const utc = wallTimeToUtcIso("2026-07-25", "12:00:00", "Europe/London");
    // BST = UTC+1
    expect(utc).toBe("2026-07-25T11:00:00.000Z");
    const winter = wallTimeToUtcIso("2026-01-15", "12:00:00", "Europe/London");
    // GMT = UTC+0
    expect(winter).toBe("2026-01-15T12:00:00.000Z");
  });

  it("resolves local midnight via businessDayUtcBounds", () => {
    const { startUtc, endUtc } = businessDayUtcBounds("2026-07-25", "Asia/Karachi");
    expect(startUtc).toBe("2026-07-24T19:00:00.000Z");
    expect(endUtc).toBe("2026-07-25T19:00:00.000Z");
    expect(formatInTimezone(startUtc, "Asia/Karachi").startsWith("2026-07-25T00:00:00")).toBe(true);
  });

  it("rejects invalid IANA timezones with INVALID_TIMEZONE", () => {
    expect(() => assertValidIanaTimezone("Not/AZone")).toThrow(ApiError);
    try {
      assertValidIanaTimezone("Foo/Bar");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("INVALID_TIMEZONE");
    }
    expect(() => wallTimeToUtcIso("2026-07-25", "12:00", "Invalid/Zone")).toThrow(ApiError);
  });
});
