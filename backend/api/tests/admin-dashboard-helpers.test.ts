import { describe, expect, it } from "vitest";

import {
  startOfTodayKarachiIso,
} from "../src/services/orders/management.js";

describe("admin operations dashboard helpers", () => {
  it("resolves Asia/Karachi day start as ISO with +05:00 offset", () => {
    const value = startOfTodayKarachiIso(new Date("2026-07-22T10:30:00+05:00"));
    expect(value).toBe("2026-07-22T00:00:00+05:00");
  });

  it("keeps previous calendar day when UTC has already rolled forward", () => {
    // 2026-07-21 23:30 Karachi == 2026-07-21 18:30 UTC
    const value = startOfTodayKarachiIso(new Date("2026-07-21T18:30:00.000Z"));
    expect(value).toBe("2026-07-21T00:00:00+05:00");
  });
});
