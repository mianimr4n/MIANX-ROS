import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { OrdersDataSource } from "../src/services/orders/types.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const catalogDataSource: CatalogDataSource = {
  async listBranches() {
    return [
      {
        id: "branch-1",
        code: "royal-orchard",
        name: "Royal Orchard Branch",
        shortName: "Royal Orchard",
        address: "Royal Orchard Main Business Plaza, Musa Wala, Multan, 60000",
        phone: "0304-1110495",
        city: "Multan",
        coordinates: { lat: 30.1723, lng: 71.4727 },
        hours: "10:00 AM - 2:30 AM",
        status: "operating",
      },
    ];
  },
  async getMenuCatalog() {
    return {
      categories: [
        { id: "cat-1", name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 },
      ],
      items: [
        {
          id: "item-1",
          slug: "tele-special",
          name: "Tele Special",
          category: "Signature Pizzas",
          categorySlug: "signature-pizzas",
          description: "Signature Telepizza item.",
          image: "/images/menu-pizza_f729e710.jpg",
          productType: "pizza",
          featured: true,
          variants: [
            { id: "variant-1", label: "Small", price: 499, sizeCode: "small", isDefault: true },
          ],
        },
      ],
    };
  },
};

const ordersDataSource: OrdersDataSource = {
  async createOrder(input) {
    return {
      id: "order-1",
      orderNumber: "TP-TEST-1",
      status: "pending",
      subtotal: input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      totalAmount: input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
      createdAt: new Date().toISOString(),
    };
  },
  async getOrderTracking(orderNumber, contactPhone) {
    if (orderNumber !== "TP-TEST-1") return null;
    return {
      orderNumber,
      status: "pending",
      orderType: "delivery",
      contactName: "Test User",
      contactPhone,
      subtotal: 499,
      totalAmount: 499,
      deliveryAddress: "Multan",
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        {
          productName: "Tele Special",
          variantName: "Small",
          quantity: 1,
          unitPrice: 499,
          totalPrice: 499,
          instructions: null,
        },
      ],
    };
  },
};

describe("Telepizza API app", () => {
  it("returns the registered modules on /healthz", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.modules).toHaveLength(6);
  });

  it("returns readiness issues when required variables are missing", async () => {
    const { app } = createApp({
      API_PORT: "4000",
      API_CORS_ORIGIN: "http://localhost:3000",
    });

    const response = await request(app).get("/readyz");

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(response.body.issues.length).toBeGreaterThan(0);
  });

  it("validates order creation payloads", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).post("/api/v1/orders").send({
      branchCode: "royal-orchard",
      orderType: "delivery",
      orderSource: "website",
      contactName: "A",
      contactPhone: "",
      items: [],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("guards admin routes with role checks", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/api/v1/admin/controls");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("returns branches from the configured catalog source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/api/v1/branches");

    expect(response.status).toBe(200);
    expect(response.body.meta.source).toBe("supabase");
    expect(response.body.data[0].shortName).toBe("Royal Orchard");
  });

  it("returns the menu catalog from the configured catalog source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/api/v1/menu/catalog");

    expect(response.status).toBe(200);
    expect(response.body.data.categories[0].slug).toBe("signature-pizzas");
    expect(response.body.data.items[0].variants[0].price).toBe(499);
  });

  it("creates orders through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).post("/api/v1/orders").send({
      branchCode: "royal-orchard",
      orderType: "delivery",
      orderSource: "website",
      contactName: "Test User",
      contactPhone: "03041110495",
      deliveryAddress: "Multan",
      items: [
        {
          menuItemSlug: "tele-special",
          variantLabel: "6 inch Small",
          quantity: 1,
          unitPrice: 499,
          productName: "Tele Special",
          variantName: "6 inch Small",
        },
      ],
    });

    expect(response.status).toBe(201);
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
  });

  it("returns order tracking through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .get("/api/v1/orders/TP-TEST-1/tracking")
      .query({ phone: "03041110495" });

    expect(response.status).toBe(200);
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
  });
});
