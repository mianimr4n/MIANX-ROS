import { describe, expect, it } from "vitest";

import {
  getToppingTierFromVariantLabel,
  hashIdempotencyPayload,
  inferToppingSlugFromLabel,
  normalizePhoneE164,
  priceOrderLines,
  type CatalogMenuItem,
} from "../src/services/orders/pricing.js";

const pizza: CatalogMenuItem = {
  id: "pizza-1",
  slug: "tele-special",
  name: "Tele Special",
  base_price: null,
  product_type: "pizza",
  is_available: true,
  variants: [
    { id: "v-s", label: "6 inch Small", price: 499, is_available: true, size_code: "small" },
    { id: "v-m", label: "10 inch Medium", price: 899, is_available: true, size_code: "medium" },
  ],
};

const cheese: CatalogMenuItem = {
  id: "top-1",
  slug: "extra-cheese",
  name: "Extra Cheese",
  base_price: null,
  product_type: "topping",
  is_available: true,
  variants: [
    { id: "tc-s", label: "Small", price: 50, is_available: true, size_code: "small" },
    { id: "tc-m", label: "Medium", price: 100, is_available: true, size_code: "medium" },
  ],
};

describe("orders pricing engine (Sprint 4.1)", () => {
  it("normalizes Pakistan phones to E.164", () => {
    expect(normalizePhoneE164("0304-1110495")).toBe("+923041110495");
    expect(normalizePhoneE164("+92 304 1110495")).toBe("+923041110495");
  });

  it("maps pizza size labels to topping tiers", () => {
    expect(getToppingTierFromVariantLabel("6 inch Small")).toBe("small");
    expect(getToppingTierFromVariantLabel("10 inch Medium")).toBe("medium");
    expect(getToppingTierFromVariantLabel("12 inch Large")).toBe("large");
  });

  it("infers topping slugs from legacy extra labels", () => {
    expect(inferToppingSlugFromLabel("Extra Cheese (6 inch Small)")).toBe("extra-cheese");
    expect(inferToppingSlugFromLabel("Extra Chicken (Medium)")).toBe("extra-chicken");
  });

  it("prices from catalog and ignores client money fields", () => {
    const menuBySlug = new Map([
      ["tele-special", pizza],
      ["extra-cheese", cheese],
    ]);

    const priced = priceOrderLines({
      menuBySlug,
      lines: [
        {
          menuItemSlug: "tele-special",
          variantLabel: "6 inch Small",
          quantity: 2,
          unitPrice: 1,
          productName: "HACKED",
          extras: [{ label: "Extra Cheese (6 inch Small)", price: 9999 }],
        },
      ],
    });

    expect(priced.lines[0]?.productName).toBe("Tele Special");
    expect(priced.lines[0]?.foodUnitPrice).toBe(499);
    expect(priced.lines[0]?.extras[0]?.price).toBe(50);
    expect(priced.lines[0]?.lineUnitPrice).toBe(549);
    expect(priced.subtotal).toBe(1098);
    expect(priced.totalAmount).toBe(1098);
  });

  it("rejects unavailable variants", () => {
    const unavailable = {
      ...pizza,
      variants: [{ id: "v-x", label: "Gone", price: 100, is_available: false, size_code: "small" }],
    };
    expect(() =>
      priceOrderLines({
        menuBySlug: new Map([["tele-special", unavailable]]),
        lines: [{ menuItemSlug: "tele-special", variantLabel: "Gone", quantity: 1 }],
      }),
    ).toThrow(/not available/i);
  });

  it("hashes idempotency payloads stably", () => {
    expect(hashIdempotencyPayload({ a: 1 })).toBe(hashIdempotencyPayload({ a: 1 }));
    expect(hashIdempotencyPayload({ a: 1 })).not.toBe(hashIdempotencyPayload({ a: 2 }));
  });
});
