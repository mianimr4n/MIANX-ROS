import { describe, expect, it } from "vitest";

import {
  getToppingTierFromVariantLabel,
  hashIdempotencyPayload,
  inferToppingSlugFromLabel,
  normalizePhoneE164,
  priceOrderLines,
  type CatalogMenuItem,
} from "../src/services/orders/pricing.js";
import { priceModifierSelections } from "../src/services/orders/modifiers.js";

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

  it("prices relational modifiers with size-tier deltas and ignores client prices", () => {
    const optionsByKey = new Map([
      [
        "crust::classic",
        {
          id: "opt-crust",
          code: "classic",
          name: "Classic Crust",
          price_delta: 0,
          price_delta_by_size: null,
          size_code: null,
          linked_menu_item_id: null,
          is_active: true,
          sort_order: 1,
          group: { id: "g1", code: "crust", name: "Crust", is_active: true },
        },
      ],
      [
        "extra-chicken::extra-chicken",
        {
          id: "opt-chicken",
          code: "extra-chicken",
          name: "Extra Chicken",
          price_delta: 50,
          price_delta_by_size: { small: 50, medium: 100, large: 150 },
          size_code: null,
          linked_menu_item_id: null,
          is_active: true,
          sort_order: 2,
          group: { id: "g2", code: "extra-chicken", name: "Extra chicken", is_active: true },
        },
      ],
    ]);

    const pricedModifiers = priceModifierSelections({
      selections: [
        { groupCode: "crust", optionCode: "classic" },
        { groupCode: "extra-chicken", optionCode: "extra-chicken" },
      ],
      optionsByKey,
      tier: "medium",
    });
    expect(pricedModifiers.map((entry) => entry.priceDelta)).toEqual([0, 100]);

    const priced = priceOrderLines({
      menuBySlug: new Map([["tele-special", pizza]]),
      modifiersByKey: optionsByKey,
      lines: [
        {
          menuItemSlug: "tele-special",
          variantLabel: "10 inch Medium",
          quantity: 1,
          unitPrice: 1,
          modifiers: [
            { groupCode: "crust", optionCode: "classic" },
            { groupCode: "extra-chicken", optionCode: "extra-chicken" },
          ],
          extras: [{ label: "Ignored Extra", slug: "extra-cheese", price: 9999 }],
        },
      ],
    });

    expect(priced.lines[0]?.foodUnitPrice).toBe(899);
    expect(priced.lines[0]?.modifiers).toHaveLength(2);
    expect(priced.lines[0]?.lineUnitPrice).toBe(999);
    expect(priced.lines[0]?.extras.every((extra) => extra.kind === "modifier")).toBe(true);
  });
});
