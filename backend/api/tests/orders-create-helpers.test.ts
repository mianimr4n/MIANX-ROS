import { describe, expect, it } from "vitest";

import {
  buildOrderNotes,
  formatExtrasInstructions,
  normalizeContactPhone,
  requireDeliveryAddress,
} from "../src/services/orders/create-helpers.js";

describe("orders create helpers (Sprint 4.1)", () => {
  it("normalizes contact phones to digits", () => {
    expect(normalizeContactPhone("0304-1110495")).toBe("03041110495");
    expect(normalizeContactPhone("+92 304 1110495")).toBe("923041110495");
  });

  it("requires delivery address only for delivery orders", () => {
    expect(requireDeliveryAddress("delivery", "  Multan  ")).toBe("Multan");
    expect(requireDeliveryAddress("delivery", "   ")).toBeUndefined();
    expect(requireDeliveryAddress("pickup", undefined)).toBeUndefined();
  });

  it("folds extras into instructions for auditability", () => {
    expect(
      formatExtrasInstructions("No onion", [
        { label: "Extra Cheese", price: 100 },
        { label: "Olives", price: 80 },
      ]),
    ).toBe("No onion | Extras: Extra Cheese (+100), Olives (+80)");
    expect(formatExtrasInstructions(undefined, undefined)).toBeNull();
  });

  it("builds order notes with optional promo code", () => {
    expect(buildOrderNotes("Ring bell", "SAVE50")).toBe("Ring bell\nPromo code: SAVE50");
    expect(buildOrderNotes(undefined, undefined)).toBeNull();
  });
});
