import { describe, expect, it } from "vitest";

import { splitMenuCatalogForCustomer } from "../src/services/catalog/visibility.js";

describe("catalog visibility (Option B)", () => {
  it("keeps toppings out of customer browse categories and items", () => {
    const split = splitMenuCatalogForCustomer({
      categories: [
        { id: "1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
        { id: "2", name: "Toppings", slug: "toppings", sortOrder: 130 },
      ],
      items: [
        {
          id: "1",
          slug: "tele-special",
          name: "Tele Special",
          category: "Signature Pizzas",
          categorySlug: "signature-pizzas",
          description: "",
          image: "/x.jpg",
          productType: "pizza",
          featured: true,
        },
        {
          id: "2",
          slug: "extra-cheese",
          name: "Extra Cheese",
          category: "Toppings",
          categorySlug: "toppings",
          description: "",
          image: "/x.jpg",
          productType: "topping",
          featured: false,
        },
      ],
    });

    expect(split.categories).toHaveLength(1);
    expect(split.categories[0].slug).toBe("signature-pizzas");
    expect(split.items).toHaveLength(1);
    expect(split.items[0].slug).toBe("tele-special");
    expect(split.toppings).toHaveLength(1);
    expect(split.toppings[0].slug).toBe("extra-cheese");
  });
});
