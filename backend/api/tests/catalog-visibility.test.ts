import { describe, expect, it } from "vitest";

import {
  deriveFamilyName,
  groupSkusIntoFamilies,
  splitMenuCatalogForCustomer,
} from "../src/services/catalog/visibility.js";
import type { MenuCatalogSku } from "../src/services/catalog/types.js";

function sku(
  partial: Partial<MenuCatalogSku> &
    Pick<MenuCatalogSku, "slug" | "productType" | "category" | "categorySlug" | "price">,
): MenuCatalogSku {
  return {
    id: partial.id ?? partial.slug,
    name: partial.name ?? partial.slug,
    productGroupSlug: partial.productGroupSlug ?? partial.slug,
    description: partial.description ?? "",
    image: partial.image ?? "/x.jpg",
    featured: partial.featured ?? false,
    available: partial.available ?? true,
    sortOrder: partial.sortOrder ?? 0,
    ...partial,
  };
}

describe("catalog visibility (canonical SKUs)", () => {
  it("keeps toppings out of customer browse categories and SKUs", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [
        { id: "1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
        { id: "2", name: "Toppings", slug: "toppings", sortOrder: 130 },
      ],
      skus: [
        sku({
          slug: "tele-special-small",
          name: "Tele Special — 6 inch Small",
          productGroupSlug: "tele-special",
          sizeLabel: "6 inch Small",
          price: 620,
          category: "Signature Pizzas",
          categorySlug: "signature-pizzas",
          productType: "pizza",
          featured: true,
        }),
        sku({
          slug: "extra-cheese-small",
          productGroupSlug: "extra-cheese",
          price: 50,
          category: "Toppings",
          categorySlug: "toppings",
          productType: "topping",
        }),
      ],
    });

    expect(split.categories).toHaveLength(1);
    expect(split.categories[0].slug).toBe("signature-pizzas");
    expect(split.skus).toHaveLength(1);
    expect(split.skus[0].slug).toBe("tele-special-small");
    expect(split.toppings).toHaveLength(1);
    expect(split.toppings[0].slug).toBe("extra-cheese-small");
  });

  it("still isolates toppings when the internal category row is missing", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [{ id: "1", name: "Specialty Pizzas", slug: "specialty-pizzas", sortOrder: 30 }],
      skus: [
        sku({
          slug: "behari-kabab-pizza",
          category: "Specialty Pizzas",
          categorySlug: "specialty-pizzas",
          productType: "pizza",
          price: 549,
        }),
        sku({
          slug: "extra-chicken-small",
          productGroupSlug: "extra-chicken",
          category: "Specialty Pizzas",
          categorySlug: "specialty-pizzas",
          productType: "topping",
          price: 50,
        }),
      ],
    });

    expect(split.categories).toHaveLength(1);
    expect(split.skus.map((entry) => entry.slug)).toEqual(["behari-kabab-pizza"]);
    expect(split.toppings.map((entry) => entry.slug)).toEqual(["extra-chicken-small"]);
  });

  it("does not duplicate toppings across SKU and topping arrays", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [
        { id: "1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
        { id: "2", name: "Toppings", slug: "toppings", sortOrder: 130 },
      ],
      skus: [
        sku({
          slug: "extra-cheese-slice",
          category: "Toppings",
          categorySlug: "toppings",
          productType: "topping",
          price: 60,
        }),
      ],
    });

    expect(split.skus).toHaveLength(0);
    expect(split.toppings).toHaveLength(1);
    expect(split.toppings[0].slug).toBe("extra-cheese-slice");
  });

  it("groups sibling SKUs into one product family with one price per option", () => {
    const families = groupSkusIntoFamilies([
      sku({
        slug: "tele-special-small",
        name: "Tele Special — 6 inch Small",
        productGroupSlug: "tele-special",
        sizeLabel: "6 inch Small",
        sortOrder: 1,
        price: 620,
        category: "Signature Pizzas",
        categorySlug: "signature-pizzas",
        productType: "pizza",
      }),
      sku({
        slug: "tele-special-large",
        name: "Tele Special — 12 inch Large",
        productGroupSlug: "tele-special",
        sizeLabel: "12 inch Large",
        sortOrder: 3,
        price: 1890,
        category: "Signature Pizzas",
        categorySlug: "signature-pizzas",
        productType: "pizza",
      }),
      sku({
        slug: "zinger-burger",
        name: "Zinger Burger",
        price: 550,
        category: "Burgers",
        categorySlug: "burgers",
        productType: "burger",
      }),
    ]);

    expect(families).toHaveLength(2);
    expect(families[0].name).toBe("Tele Special");
    expect(families[0].options.map((option) => option.price)).toEqual([620, 1890]);
    expect(families[1].options).toHaveLength(1);
    expect(families[1].options[0].price).toBe(550);
  });

  it("nests product families under their browse category", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [{ id: "1", name: "Burgers", slug: "burgers", sortOrder: 40 }],
      skus: [
        sku({
          slug: "zinger-burger",
          name: "Zinger Burger",
          price: 550,
          category: "Burgers",
          categorySlug: "burgers",
          productType: "burger",
        }),
      ],
    });

    expect(split.categories[0].items).toHaveLength(1);
    expect(split.categories[0].items[0].options[0].price).toBe(550);
  });

  it("derives the family name by stripping the size suffix", () => {
    expect(deriveFamilyName({ name: "Tele Special — 6 inch Small", sizeLabel: "6 inch Small" })).toBe(
      "Tele Special",
    );
    expect(deriveFamilyName({ name: "Zinger Burger", sizeLabel: undefined })).toBe("Zinger Burger");
  });
});
