import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { OrdersDataSource } from "../src/services/orders/types.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
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
    const teleSpecialSmall = {
      id: "item-1",
      slug: "tele-special-small",
      name: "Tele Special — 6 inch Small",
      productGroupSlug: "tele-special",
      sizeLabel: "6 inch Small",
      sizeCode: "small",
      price: 499,
      available: true,
      sortOrder: 1,
      category: "Signature Pizzas",
      categorySlug: "signature-pizzas",
      description: "Signature Telepizza item.",
      image: "/images/menu-pizza_f729e710.jpg",
      productType: "pizza",
      featured: true,
    };

    return {
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
              description: "Signature Telepizza item.",
              image: "/images/menu-pizza_f729e710.jpg",
              productType: "pizza",
              featured: true,
              options: [teleSpecialSmall],
            },
          ],
        },
      ],
      skus: [teleSpecialSmall],
      toppings: [
        {
          id: "topping-1",
          slug: "extra-cheese-small",
          name: "Extra Cheese",
          productGroupSlug: "extra-cheese",
          sizeLabel: "Small",
          sizeCode: "small",
          price: 50,
          available: true,
          sortOrder: 1,
          category: "Toppings",
          categorySlug: "toppings",
          description: "Internal topping SKU.",
          image: "/images/menu-pizza.jpg",
          productType: "topping",
          featured: false,
        },
      ],
    };
  },
};

const ordersDataSource: OrdersDataSource = {
  async quoteOrder(input) {
    const subtotal = input.items.reduce((sum, item) => sum + 499 * item.quantity, 0);
    const totalAmount = subtotal;
    return {
      quoteId: "tpq1.body.sig",
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      branch: { code: input.branchCode, orderType: input.orderType },
      items: input.items.map((item) => ({
        menuItemId: item.menuItemId ?? "item-1",
        menuItemSlug: item.menuItemSlug ?? "tele-special-small",
        productName: item.productName ?? item.menuItemSlug ?? "Tele Special",
        variantName: item.variantLabel ?? null,
        quantity: item.quantity,
        foodUnitPrice: 499,
        extras: [],
        lineUnitPrice: 499,
        lineTotal: 499 * item.quantity,
      })),
      totals: {
        currency: "PKR" as const,
        subtotal,
        discountAmount: 0,
        taxAmount: 0,
        deliveryFee: 0,
        totalAmount,
      },
      warnings: [],
      pricedAt: new Date().toISOString(),
    } as const;
  },
  async createOrder(input) {
    return {
      id: "order-1",
      orderNumber: "TP-TEST-1",
      status: "pending",
      subtotal: 499,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 499,
      createdAt: new Date().toISOString(),
      idempotentReplay: input.idempotencyKey === "replay-key",
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
  async getOrder(orderNumber, contactPhone) {
    return ordersDataSource.getOrderTracking(orderNumber, contactPhone);
  },
  async cancelOrder(input) {
    if (input.orderNumber !== "TP-TEST-1") {
      throw Object.assign(new Error("Order not found."), {
        statusCode: 404,
        code: "ORDER_NOT_FOUND",
      });
    }
    return {
      orderNumber: input.orderNumber,
      status: "cancelled" as const,
      cancelledAt: new Date().toISOString(),
      cancelReasonCode: input.reasonCode ?? "customer_cancelled",
    };
  },
};

describe("Telepizza API app", () => {
  it("returns the registered modules on /healthz", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.modules).toHaveLength(13);
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("me");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("kitchen");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("dine-in");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("reservations");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("ai");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("supplier-portal");
    expect(response.body.modules.map((m: { name: string }) => m.name)).toContain("webhooks/whatsapp");
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
    expect(response.body.data.categories[0].items[0].productGroupSlug).toBe("tele-special");
    expect(response.body.data.categories[0].items[0].options[0].price).toBe(499);
    expect(response.body.data.skus[0].id).toBe("item-1");
    expect(response.body.data.toppings[0].slug).toBe("extra-cheese-small");
    expect(response.body.meta.contract).toBe("canonical-single-price-v1");
    expect(response.body.meta.toppingCount).toBe(1);
    expect(response.body.meta.productGroupCount).toBe(1);
    expect(response.body.meta.skuCount).toBe(1);
    expect(response.body.meta.variantCount).toBeUndefined();
    expect(response.body.meta.dealCount).toBe(0);
    expect(response.body.data.categories.some((category: { slug: string }) => category.slug === "toppings")).toBe(
      false,
    );
  });

  it("requires Idempotency-Key for order creation", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).post("/api/v1/orders").send({
      branchCode: "royal-orchard",
      orderType: "delivery",
      orderSource: "website",
      contactName: "Test User",
      contactPhone: "03041110495",
      deliveryAddress: "Multan",
      items: [{ menuItemSlug: "tele-special", quantity: 1 }],
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("rejects delivery orders without an address", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "test-key-1")
      .send({
        branchCode: "royal-orchard",
        orderType: "delivery",
        orderSource: "website",
        contactName: "Test User",
        contactPhone: "03041110495",
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("DELIVERY_ADDRESS_REQUIRED");
  });

  it("quotes orders through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).post("/api/v1/orders/quote").send({
      branchCode: "royal-orchard",
      orderType: "pickup",
      items: [{ menuItemSlug: "tele-special", variantLabel: "6 inch Small", quantity: 1 }],
    });

    expect(response.status).toBe(200);
    expect(response.body.data.totals.currency).toBe("PKR");
    expect(response.body.data.totals.totalAmount).toBe(499);
  });

  it("creates orders through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "test-key-create")
      .send({
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
            unitPrice: 1,
            productName: "HACKED",
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
  });

  it("replays idempotent creates with 200", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "replay-key")
      .send({
        branchCode: "royal-orchard",
        orderType: "pickup",
        orderSource: "website",
        contactName: "Test User",
        contactPhone: "03041110495",
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.idempotentReplay).toBe(true);
  });

  it("returns order tracking through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .get("/api/v1/orders/TP-TEST-1/tracking")
      .query({ phone: "03041110495" });

    expect(response.status).toBe(200);
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
  });

  it("returns guest order read through canonical GET /orders/:orderNumber", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .get("/api/v1/orders/TP-TEST-1")
      .query({ phone: "03041110495" });

    expect(response.status).toBe(200);
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
    expect(response.body.data.status).toBe("pending");
  });

  it("requires phone for canonical order read", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).get("/api/v1/orders/TP-TEST-1");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("cancels guest orders through the configured orders source", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .post("/api/v1/orders/TP-TEST-1/cancel")
      .send({ contactPhone: "03041110495", note: "Changed plans" });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("cancelled");
    expect(response.body.data.orderNumber).toBe("TP-TEST-1");
  });

  it("validates cancel payloads", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .post("/api/v1/orders/TP-TEST-1/cancel")
      .send({ contactPhone: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
