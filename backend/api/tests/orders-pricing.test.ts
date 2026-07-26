import { describe, expect, it } from "vitest";

import {
  buildCatalogLookup,
  getToppingTierFromSku,
  getToppingTierFromVariantLabel,
  hashIdempotencyPayload,
  inferToppingSlugFromLabel,
  normalizePhoneE164,
  priceOrderLines,
  resolveSku,
  type CatalogMenuItem,
} from "../src/services/orders/pricing.js";
import { priceModifierSelections } from "../src/services/orders/modifiers.js";

function sku(partial: CatalogMenuItem): CatalogMenuItem {
  return { product_type: "pizza", is_available: true, ...partial };
}

const pizzaSmall = sku({
  id: "pizza-small",
  slug: "tele-special-small",
  name: "Tele Special — 6 inch Small",
  product_group_slug: "tele-special",
  size_label: "6 inch Small",
  size_code: "small",
  sort_order: 1,
  price: 499,
});

const pizzaMedium = sku({
  id: "pizza-medium",
  slug: "tele-special-medium",
  name: "Tele Special — 10 inch Medium",
  product_group_slug: "tele-special",
  size_label: "10 inch Medium",
  size_code: "medium",
  sort_order: 2,
  price: 899,
});

const cheeseSmall = sku({
  id: "cheese-small",
  slug: "extra-cheese-small",
  name: "Extra Cheese",
  product_group_slug: "extra-cheese",
  size_label: "Small",
  size_code: "small",
  sort_order: 1,
  product_type: "topping",
  price: 50,
});

const cheeseMedium = sku({
  id: "cheese-medium",
  slug: "extra-cheese-medium",
  name: "Extra Cheese",
  product_group_slug: "extra-cheese",
  size_label: "Medium",
  size_code: "medium",
  sort_order: 2,
  product_type: "topping",
  price: 100,
});

const burger = sku({
  id: "burger-1",
  slug: "zinger-burger",
  name: "Zinger Burger",
  product_group_slug: "zinger-burger",
  product_type: "burger",
  price: 550,
});

const fullCatalog = buildCatalogLookup([pizzaSmall, pizzaMedium, cheeseSmall, cheeseMedium, burger]);

describe("orders pricing engine (canonical single-price SKUs)", () => {
  it("normalizes Pakistan phones to E.164", () => {
    expect(normalizePhoneE164("0304-1110495")).toBe("+923041110495");
    expect(normalizePhoneE164("+92 304 1110495")).toBe("+923041110495");
  });

  it("maps pizza size labels to topping tiers", () => {
    expect(getToppingTierFromVariantLabel("6 inch Small")).toBe("small");
    expect(getToppingTierFromVariantLabel("10 inch Medium")).toBe("medium");
    expect(getToppingTierFromVariantLabel("12 inch Large")).toBe("large");
  });

  it("prefers the SKU size code over label heuristics for the tier", () => {
    expect(getToppingTierFromSku(pizzaMedium)).toBe("medium");
    expect(getToppingTierFromSku({ ...pizzaMedium, size_code: null })).toBe("medium");
    expect(getToppingTierFromSku(burger)).toBe("small");
  });

  it("infers topping slugs from legacy extra labels", () => {
    expect(inferToppingSlugFromLabel("Extra Cheese (6 inch Small)")).toBe("extra-cheese");
    expect(inferToppingSlugFromLabel("Extra Chicken (Medium)")).toBe("extra-chicken");
  });

  it("prices a single-price SKU by id and ignores client money fields", () => {
    const priced = priceOrderLines({
      catalog: fullCatalog,
      lines: [{ menuItemId: "burger-1", quantity: 2, unitPrice: 1, productName: "HACKED" }],
    });

    expect(priced.lines[0]?.productName).toBe("Zinger Burger");
    expect(priced.lines[0]?.menuItemSlug).toBe("zinger-burger");
    expect(priced.lines[0]?.variantId).toBeNull();
    expect(priced.lines[0]?.foodUnitPrice).toBe(550);
    expect(priced.subtotal).toBe(1100);
  });

  it("prices a size SKU by id and scales toppings from its size code", () => {
    const priced = priceOrderLines({
      catalog: fullCatalog,
      lines: [
        {
          menuItemId: "pizza-small",
          quantity: 2,
          unitPrice: 1,
          extras: [{ label: "Extra Cheese (6 inch Small)", price: 9999 }],
        },
      ],
    });

    expect(priced.lines[0]?.productName).toBe("Tele Special — 6 inch Small");
    expect(priced.lines[0]?.variantName).toBe("6 inch Small");
    expect(priced.lines[0]?.foodUnitPrice).toBe(499);
    expect(priced.lines[0]?.extras[0]?.price).toBe(50);
    expect(priced.lines[0]?.lineUnitPrice).toBe(549);
    expect(priced.subtotal).toBe(1098);
  });

  it("resolves a legacy family slug plus size label to the exact SKU", () => {
    const resolved = resolveSku(fullCatalog, {
      menuItemSlug: "tele-special",
      variantLabel: "10 inch Medium",
      quantity: 1,
    });

    expect(resolved.id).toBe("pizza-medium");
    expect(resolved.price).toBe(899);
  });

  it("requires an exact SKU when a family slug is ambiguous", () => {
    expect(() =>
      priceOrderLines({
        catalog: fullCatalog,
        lines: [{ menuItemSlug: "tele-special", quantity: 1 }],
      }),
    ).toThrow(/multiple sellable options/i);
  });

  it("rejects an unknown size label for a family slug", () => {
    expect(() =>
      priceOrderLines({
        catalog: fullCatalog,
        lines: [{ menuItemSlug: "tele-special", variantLabel: "Gone", quantity: 1 }],
      }),
    ).toThrow(/was not found/i);
  });

  it("rejects an unavailable SKU", () => {
    const catalog = buildCatalogLookup([{ ...burger, is_available: false }]);
    expect(() =>
      priceOrderLines({
        catalog,
        lines: [{ menuItemId: "burger-1", quantity: 1 }],
      }),
    ).toThrow(/currently unavailable/i);
  });

  it("rejects ordering a topping SKU as a standalone line", () => {
    expect(() =>
      priceOrderLines({
        catalog: fullCatalog,
        lines: [{ menuItemId: "cheese-small", quantity: 1 }],
      }),
    ).toThrow(/cannot be ordered as a standalone line/i);
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
      catalog: fullCatalog,
      modifiersByKey: optionsByKey,
      lines: [
        {
          menuItemId: "pizza-medium",
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
