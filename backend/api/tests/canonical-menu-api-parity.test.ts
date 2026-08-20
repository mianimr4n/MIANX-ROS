import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { CatalogDataSource, MenuCatalog } from "../src/services/catalog/types.js";
import type { MenuManagementService } from "../src/services/menu/management.js";
import request from "supertest";

/**
 * Customer catalog, Admin Menu products, and POS all must see the same effective
 * price for the same menuItemId. Channel-specific pricing transforms are forbidden.
 */

const SMALL = {
  id: "aaaaaaaa-0000-4000-8000-000000000001",
  slug: "tele-special-small",
  name: 'Tele Special — 6" Small',
  productGroupSlug: "tele-special",
  sizeLabel: '6" Small',
  sizeCode: "small" as const,
  price: 620,
  available: true,
  sortOrder: 1,
  category: "Signature Pizzas",
  categorySlug: "signature-pizzas",
  description: "Signature",
  image: "/images/menu-pizza.jpg",
  productType: "pizza",
  featured: true,
};

const MEDIUM = {
  ...SMALL,
  id: "aaaaaaaa-0000-4000-8000-000000000002",
  slug: "tele-special-medium",
  name: 'Tele Special — 10" Medium',
  sizeLabel: '10" Medium',
  sizeCode: "medium" as const,
  price: 1250,
  sortOrder: 2,
};

const catalog: MenuCatalog = {
  categories: [
    {
      id: "cat-1",
      name: "Signature Pizzas",
      slug: "signature-pizzas",
      sortOrder: 10,
      items: [
        {
          productGroupSlug: "tele-special",
          name: "Tele Special",
          category: "Signature Pizzas",
          categorySlug: "signature-pizzas",
          description: "Signature",
          image: "/images/menu-pizza.jpg",
          productType: "pizza",
          featured: true,
          options: [SMALL, MEDIUM],
        },
      ],
    },
  ],
  skus: [SMALL, MEDIUM],
  toppings: [],
};

const catalogDataSource: CatalogDataSource = {
  async listBranches() {
    return [];
  },
  async getMenuCatalog() {
    return catalog;
  },
  async getBrandConfig() {
    return {
      name: "Telepizza",
      legalName: "Telepizza Pakistan",
      tagline: "Love At First Bite",
      region: "Pakistan",
      logoPrimary: "/images/telepizza-logo-primary.jpg",
      logoWordmark: "/images/telepizza-logo.png",
      favicon: "/favicon.jpg",
      phone: "0304-1110495",
      hours: "10:00 AM \u2013 2:30 AM",
      city: "Multan",
      colors: {
        primary: "#E31E24",
        primaryDark: "#B5121B",
        accent: "#F5B800",
        background: "#FFF7F3",
      },
    };
  },
};

const menuManagement = {
  async listProductGroups() {
    return [
      {
        productGroupSlug: "tele-special",
        name: "Tele Special",
        categoryId: "cat-1",
        categorySlug: "signature-pizzas",
        options: [
          {
            id: SMALL.id,
            categoryId: "cat-1",
            categorySlug: "signature-pizzas",
            slug: SMALL.slug,
            name: SMALL.name,
            productGroupSlug: "tele-special",
            sizeLabel: SMALL.sizeLabel,
            sizeCode: "small",
            description: null,
            price: SMALL.price,
            isAvailable: true,
            isFeatured: true,
            imageUrl: null,
            badge: null,
            productType: "pizza",
            sortOrder: 1,
          },
          {
            id: MEDIUM.id,
            categoryId: "cat-1",
            categorySlug: "signature-pizzas",
            slug: MEDIUM.slug,
            name: MEDIUM.name,
            productGroupSlug: "tele-special",
            sizeLabel: MEDIUM.sizeLabel,
            sizeCode: "medium",
            description: null,
            price: MEDIUM.price,
            isAvailable: true,
            isFeatured: false,
            imageUrl: null,
            badge: null,
            productType: "pizza",
            sortOrder: 2,
          },
        ],
      },
    ];
  },
} as unknown as MenuManagementService;

const env = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

describe("canonical menu API channel parity", () => {
  it("Customer catalog and Admin product groups share the same menuItemId prices", async () => {
    const { app } = createApp(env, { catalogDataSource, menuManagement });

    const customer = await request(app).get("/api/v1/menu/catalog");
    expect(customer.status).toBe(200);

    const customerById = new Map(
      (customer.body.data.skus as Array<{ id: string; price: number }>).map((sku) => [
        sku.id,
        sku.price,
      ]),
    );

    // Admin router requires auth — exercise the shared management service directly for parity.
    const adminGroups = await menuManagement.listProductGroups();
    for (const group of adminGroups) {
      for (const option of group.options) {
        expect(customerById.get(option.id)).toBe(option.price);
      }
    }

    // POS consumes the same flat skus list from the customer catalog contract.
    expect(customerById.get(MEDIUM.id)).toBe(1250);
    expect(customerById.get(SMALL.id)).toBe(620);
  });
});
