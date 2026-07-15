import { describe, expect, it } from "vitest";

import { splitMenuCatalogForCustomer } from "../src/services/catalog/visibility.js";
import type { MenuCatalogItem } from "../src/services/catalog/types.js";

function item(partial: Partial<MenuCatalogItem> & Pick<MenuCatalogItem, "slug" | "productType" | "category" | "categorySlug">): MenuCatalogItem {
  return {
    id: partial.id ?? partial.slug,
    name: partial.name ?? partial.slug,
    description: partial.description ?? "",
    image: partial.image ?? "/x.jpg",
    featured: partial.featured ?? false,
    ...partial,
  };
}

describe("catalog visibility (Option B)", () => {
  it("keeps toppings out of customer browse categories and items", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [
        { id: "1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
        { id: "2", name: "Toppings", slug: "toppings", sortOrder: 130 },
      ],
      items: [
        item({
          slug: "tele-special",
          category: "Signature Pizzas",
          categorySlug: "signature-pizzas",
          productType: "pizza",
          featured: true,
          variants: [
            { id: "v1", label: "Small", price: 499, sizeCode: "small", isDefault: true },
          ],
        }),
        item({
          slug: "extra-cheese",
          category: "Toppings",
          categorySlug: "toppings",
          productType: "topping",
          variants: [
            { id: "tv1", label: "Small", price: 50, sizeCode: "small", isDefault: true },
          ],
        }),
      ],
    });

    expect(split.categories).toHaveLength(1);
    expect(split.categories[0].slug).toBe("signature-pizzas");
    expect(split.items).toHaveLength(1);
    expect(split.items[0].slug).toBe("tele-special");
    expect(split.toppings).toHaveLength(1);
    expect(split.toppings[0].slug).toBe("extra-cheese");
  });

  it("still isolates toppings when the internal category row is missing", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [{ id: "1", name: "Specialty Pizzas", slug: "specialty-pizzas", sortOrder: 30 }],
      items: [
        item({
          slug: "behari-kabab-pizza",
          category: "Specialty Pizzas",
          categorySlug: "specialty-pizzas",
          productType: "pizza",
          price: 549,
        }),
        item({
          slug: "extra-chicken",
          category: "Specialty Pizzas",
          categorySlug: "specialty-pizzas",
          productType: "topping",
          variants: [
            { id: "a", label: "Small", price: 50, sizeCode: "small", isDefault: true },
          ],
        }),
      ],
    });

    expect(split.categories).toHaveLength(1);
    expect(split.items.map((entry) => entry.slug)).toEqual(["behari-kabab-pizza"]);
    expect(split.toppings.map((entry) => entry.slug)).toEqual(["extra-chicken"]);
  });

  it("does not duplicate toppings across items and toppings arrays", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [
        { id: "1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
        { id: "2", name: "Toppings", slug: "toppings", sortOrder: 130 },
      ],
      items: [
        item({
          slug: "extra-cheese-slice",
          category: "Toppings",
          categorySlug: "toppings",
          productType: "topping",
          price: 60,
        }),
      ],
    });

    expect(split.items).toHaveLength(0);
    expect(split.toppings).toHaveLength(1);
    expect(split.toppings[0].slug).toBe("extra-cheese-slice");
  });
});
