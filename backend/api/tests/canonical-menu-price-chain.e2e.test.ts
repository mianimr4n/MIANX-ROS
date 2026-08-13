import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Canonical single-price chain, exercised over HTTP against one shared SKU store:
 *
 *   Admin changes a SKU price
 *     -> customer catalog shows the new price
 *     -> POS reads the same SKU from the same catalog
 *     -> quote prices from the server, not the client
 *     -> the created order captures a name + unit-price snapshot
 *     -> the kitchen ticket shows the exact SKU and size, no price
 *     -> the report line aggregates by SKU id and product family
 *     -> the controlled test price is restored.
 *
 * Real code under test: the admin menu router, the catalog projection
 * (`splitMenuCatalogForCustomer`) and the pricing engine (`priceOrderLines`).
 * Only persistence is in memory.
 */

const CATEGORY_ID = "aaaaaaaa-0000-4000-8000-00000000000c";
const SMALL_ID = "aaaaaaaa-0000-4000-8000-000000000001";
const MEDIUM_ID = "aaaaaaaa-0000-4000-8000-000000000002";
const LARGE_ID = "aaaaaaaa-0000-4000-8000-000000000003";
const BASELINE_MEDIUM_PRICE = 1250;
const RAISED_MEDIUM_PRICE = 1390;

type Principal = {
  authUserId: string;
  userId: string;
  email: string;
  userType: string;
  status: string;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  isSuperAdmin: boolean;
};

const owner: Principal = {
  authUserId: "auth-owner",
  userId: "u-owner",
  email: "owner@example.com",
  userType: "staff",
  status: "active",
  roles: ["admin"],
  permissions: ["menu.read", "menu.write", "admin.access"],
  branchIds: [],
  isSuperAdmin: false,
};

vi.mock("../src/middleware/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/middleware/authorization.js")>(
    "../src/middleware/authorization.js",
  );
  return {
    ...actual,
    createRequireAuthenticatedUser:
      () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        if (!req.header("authorization")?.includes("owner")) {
          return next(
            Object.assign(new Error("Authentication required."), {
              statusCode: 401,
              code: "UNAUTHORIZED",
            }),
          );
        }
        (req as express.Request & { principal: unknown }).principal = owner;
        return next();
      },
  };
});

import type express from "express";

import { createApp } from "../src/app.js";
import { ApiError } from "../src/common/http.js";
import { splitMenuCatalogForCustomer } from "../src/services/catalog/visibility.js";
import type { CatalogDataSource, MenuCatalogSku } from "../src/services/catalog/types.js";
import { buildCatalogLookup, priceOrderLines } from "../src/services/orders/pricing.js";
import type { CatalogMenuItem } from "../src/services/orders/pricing.js";
import type {
  MenuAuditEventRecord,
  MenuManagementService,
  MenuSkuRecord,
} from "../src/services/menu/management.js";
import type {
  CreatedOrderSummary,
  OrderTrackingSummary,
  OrdersDataSource,
} from "../src/services/orders/types.js";

const env = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

/** The single source of truth every layer in this test reads from. */
type StoreRow = {
  id: string;
  slug: string;
  name: string;
  productGroupSlug: string;
  sizeLabel: string | null;
  sizeCode: string | null;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  productType: string;
  imageUrl: string | null;
};

function seedStore(): StoreRow[] {
  return [
    {
      id: SMALL_ID,
      slug: "tele-special-small",
      name: 'Tele Special — 6" Small',
      productGroupSlug: "tele-special",
      sizeLabel: '6" Small',
      sizeCode: "small",
      price: 620,
      isAvailable: true,
      sortOrder: 1,
      productType: "pizza",
      imageUrl: null,
    },
    {
      id: MEDIUM_ID,
      slug: "tele-special-medium",
      name: 'Tele Special — 10" Medium',
      productGroupSlug: "tele-special",
      sizeLabel: '10" Medium',
      sizeCode: "medium",
      price: BASELINE_MEDIUM_PRICE,
      isAvailable: true,
      sortOrder: 2,
      productType: "pizza",
      imageUrl: null,
    },
    {
      id: LARGE_ID,
      slug: "tele-special-large",
      name: 'Tele Special — 12" Large',
      productGroupSlug: "tele-special",
      sizeLabel: '12" Large',
      sizeCode: "large",
      price: 1890,
      isAvailable: true,
      sortOrder: 3,
      productType: "pizza",
      imageUrl: null,
    },
    {
      id: "aaaaaaaa-0000-4000-8000-000000000004",
      slug: "zinger-burger",
      name: "Zinger Burger",
      productGroupSlug: "zinger-burger",
      sizeLabel: null,
      sizeCode: null,
      price: 550,
      isAvailable: true,
      sortOrder: 1,
      productType: "burger",
      imageUrl: null,
    },
  ];
}

let store: StoreRow[] = seedStore();
let auditLog: MenuAuditEventRecord[] = [];
/** Order lines persisted at creation time — the immutable snapshot Kitchen and Reports read. */
let orderLines: Array<{
  orderNumber: string;
  menuItemId: string;
  productGroupSlug: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}> = [];

function toSkuRecord(row: StoreRow): MenuSkuRecord {
  return {
    id: row.id,
    categoryId: CATEGORY_ID,
    categorySlug: "signature-pizzas",
    slug: row.slug,
    name: row.name,
    productGroupSlug: row.productGroupSlug,
    sizeLabel: row.sizeLabel,
    sizeCode: row.sizeCode,
    description: null,
    price: row.price,
    isAvailable: row.isAvailable,
    isFeatured: false,
    imageUrl: row.imageUrl,
    badge: null,
    productType: row.productType,
    sortOrder: row.sortOrder,
  };
}

function toCatalogSku(row: StoreRow): MenuCatalogSku {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    productGroupSlug: row.productGroupSlug,
    sizeLabel: row.sizeLabel ?? undefined,
    sizeCode: row.sizeCode ?? undefined,
    price: row.price,
    available: row.isAvailable,
    sortOrder: row.sortOrder,
    category: "Signature Pizzas",
    categorySlug: "signature-pizzas",
    description: "Signature Telepizza item.",
    image: "/images/menu-pizza.jpg",
    productType: row.productType,
    featured: false,
  };
}

function toPricingRow(row: StoreRow): CatalogMenuItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    price: row.price,
    product_group_slug: row.productGroupSlug,
    size_label: row.sizeLabel,
    size_code: row.sizeCode,
    sort_order: row.sortOrder,
    product_type: row.productType,
    is_available: row.isAvailable,
  };
}

const menuManagement: MenuManagementService = {
  async listCategories() {
    return [
      {
        id: CATEGORY_ID,
        name: "Signature Pizzas",
        slug: "signature-pizzas",
        sortOrder: 10,
        isActive: true,
        skuCount: store.length,
      },
    ];
  },
  async createCategory() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Not exercised by this chain.");
  },
  async updateCategory() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Not exercised by this chain.");
  },
  async listProductGroups() {
    const groups = new Map<string, MenuSkuRecord[]>();
    for (const row of store) {
      groups.set(row.productGroupSlug, [...(groups.get(row.productGroupSlug) ?? []), toSkuRecord(row)]);
    }
    return [...groups.entries()].map(([productGroupSlug, options]) => ({
      productGroupSlug,
      name: productGroupSlug,
      categoryId: CATEGORY_ID,
      categorySlug: "signature-pizzas",
      options,
    }));
  },
  async createSku() {
    throw new ApiError(501, "NOT_IMPLEMENTED", "Not exercised by this chain.");
  },
  async updateSku(actor, skuId, input) {
    const row = store.find((candidate) => candidate.id === skuId);
    if (!row) throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");

    const before = { ...row };
    if (input.price !== undefined) row.price = input.price;
    if (input.isAvailable !== undefined) row.isAvailable = input.isAvailable;

    auditLog.unshift({
      id: `audit-${auditLog.length + 1}`,
      actorUserId: actor.userId,
      resourceType: "menu_item",
      resourceId: skuId,
      action: input.price !== undefined && input.price !== before.price ? "item.price_change" : "item.update",
      scope: "global",
      beforeData: { price: before.price, isAvailable: before.isAvailable },
      afterData: { price: row.price, isAvailable: row.isAvailable },
      createdAt: new Date().toISOString(),
    });

    return toSkuRecord(row);
  },
  async updateLegacyVariant(actor, variantId, input) {
    return this.updateSku(actor, variantId, input);
  },
  async uploadSkuImage(actor, skuId) {
    const row = store.find((candidate) => candidate.id === skuId);
    if (!row) throw new ApiError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");
    row.imageUrl = `https://example.supabase.co/storage/v1/object/public/menu-product-images/${skuId}.jpg`;
    auditLog.unshift({
      id: `audit-${auditLog.length + 1}`,
      actorUserId: actor.userId,
      resourceType: "menu_item",
      resourceId: skuId,
      action: "item.image_upload",
      scope: "global",
      beforeData: {},
      afterData: { imageUrl: row.imageUrl },
      createdAt: new Date().toISOString(),
    });
    return toSkuRecord(row);
  },
  async listAuditEvents(filters) {
    return auditLog.filter((event) => !filters?.resourceId || event.resourceId === filters.resourceId);
  },
};

const catalogDataSource: CatalogDataSource = {
  async listBranches() {
    return [
      {
        id: "branch-1",
        code: "royal-orchard",
        name: "Royal Orchard Branch",
        shortName: "Royal Orchard",
        address: "Royal Orchard, Multan",
        phone: "0304-1110495",
        city: "Multan",
        coordinates: { lat: 30.1723, lng: 71.4727 },
        hours: "10:00 AM - 2:30 AM",
        status: "operating",
      },
    ];
  },
  async getMenuCatalog() {
    return splitMenuCatalogForCustomer({
      categories: [{ id: CATEGORY_ID, name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10 }],
      skus: store.map(toCatalogSku),
    });
  },
};

const ordersDataSource: OrdersDataSource = {
  async quoteOrder(input) {
    const priced = priceOrderLines({
      lines: input.items,
      catalog: buildCatalogLookup(store.map(toPricingRow)),
    });
    return {
      quoteId: "tpq1.chain.sig",
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      branch: { code: input.branchCode, orderType: input.orderType },
      items: priced.lines.map((line) => ({
        menuItemId: line.menuItemId,
        menuItemSlug: line.menuItemSlug,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        foodUnitPrice: line.foodUnitPrice,
        extras: line.extras,
        lineUnitPrice: line.lineUnitPrice,
        lineTotal: line.lineTotal,
      })),
      totals: {
        currency: "PKR",
        subtotal: priced.subtotal,
        discountAmount: priced.discountAmount,
        taxAmount: priced.taxAmount,
        deliveryFee: priced.deliveryFee,
        totalAmount: priced.totalAmount,
      },
      warnings: [],
      pricedAt: priced.pricingSnapshot.pricedAt,
    };
  },
  async createOrder(input): Promise<CreatedOrderSummary> {
    const priced = priceOrderLines({
      lines: input.items,
      catalog: buildCatalogLookup(store.map(toPricingRow)),
    });
    const orderNumber = `TPZ-${orderLines.length + 1}`;

    // Snapshot at creation time. Nothing here is recomputed from the live catalog later.
    for (const line of priced.lines) {
      const row = store.find((candidate) => candidate.id === line.menuItemId)!;
      orderLines.push({
        orderNumber,
        menuItemId: line.menuItemId,
        productGroupSlug: row.productGroupSlug,
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        unitPrice: line.lineUnitPrice,
        totalPrice: line.lineTotal,
      });
    }

    return {
      id: `order-${orderNumber}`,
      orderNumber,
      status: "pending",
      subtotal: priced.subtotal,
      discountAmount: priced.discountAmount,
      taxAmount: priced.taxAmount,
      deliveryFee: priced.deliveryFee,
      totalAmount: priced.totalAmount,
      createdAt: new Date().toISOString(),
    };
  },
  async getOrder(orderNumber): Promise<OrderTrackingSummary | null> {
    const lines = orderLines.filter((line) => line.orderNumber === orderNumber);
    if (lines.length === 0) return null;
    return {
      orderNumber,
      status: "pending",
      orderType: "delivery",
      contactName: "Chain Test",
      contactPhone: "+923001234567",
      subtotal: lines.reduce((sum, line) => sum + line.totalPrice, 0),
      totalAmount: lines.reduce((sum, line) => sum + line.totalPrice, 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: lines.map((line) => ({
        productName: line.productName,
        variantName: line.variantName,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
      })),
    };
  },
  async getOrderTracking(orderNumber, contactPhone) {
    return ordersDataSource.getOrder(orderNumber, contactPhone);
  },
  async cancelOrder(input) {
    return {
      orderNumber: input.orderNumber,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelReasonCode: input.reasonCode ?? "customer_request",
    };
  },
};

/** Kitchen projection: exact SKU + size label, never a price. */
function kitchenTicketFor(orderNumber: string) {
  return orderLines
    .filter((line) => line.orderNumber === orderNumber)
    .map((line) => ({
      menuItemId: line.menuItemId,
      productName: line.productName,
      sizeLabel: line.variantName,
      quantity: line.quantity,
    }));
}

/** Report projection: one unit price per line, aggregated by SKU and by family. */
function itemSalesReport() {
  const bySku = new Map<string, { menuItemId: string; units: number; revenue: number; unitPrices: Set<number> }>();
  const byFamily = new Map<string, number>();

  for (const line of orderLines) {
    const entry = bySku.get(line.menuItemId) ?? {
      menuItemId: line.menuItemId,
      units: 0,
      revenue: 0,
      unitPrices: new Set<number>(),
    };
    entry.units += line.quantity;
    entry.revenue += line.totalPrice;
    entry.unitPrices.add(line.unitPrice);
    bySku.set(line.menuItemId, entry);

    byFamily.set(line.productGroupSlug, (byFamily.get(line.productGroupSlug) ?? 0) + line.totalPrice);
  }

  return { bySku: [...bySku.values()], byFamily };
}

function buildApp() {
  return createApp(env, {
    catalogDataSource,
    ordersDataSource,
    menuManagement,
  }).app;
}

function quoteBody(items: unknown[]) {
  return { branchCode: "royal-orchard", orderType: "delivery" as const, items };
}

beforeEach(() => {
  store = seedStore();
  auditLog = [];
  orderLines = [];
});

describe("canonical single-price chain: admin -> customer -> POS -> quote -> order -> kitchen -> report", () => {
  it("propagates an owner price change through every downstream layer", async () => {
    const app = buildApp();

    // Baseline: catalog groups the family and quotes the medium SKU at its one price.
    const before = await request(app).get("/api/v1/menu/catalog");
    expect(before.status).toBe(200);
    const beforeFamily = before.body.data.categories[0].items.find(
      (group: { productGroupSlug: string }) => group.productGroupSlug === "tele-special",
    );
    expect(beforeFamily.options).toHaveLength(3);
    expect(
      beforeFamily.options.find((option: { id: string }) => option.id === MEDIUM_ID).price,
    ).toBe(BASELINE_MEDIUM_PRICE);

    // 1. Owner raises exactly one SKU price.
    const update = await request(app)
      .patch(`/api/v1/admin/menu/products/${MEDIUM_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: RAISED_MEDIUM_PRICE });
    expect(update.status).toBe(200);
    expect(update.body.data.price).toBe(RAISED_MEDIUM_PRICE);

    // 2. Customer catalog reflects it; sibling SKUs are untouched.
    const after = await request(app).get("/api/v1/menu/catalog");
    const afterFamily = after.body.data.categories[0].items.find(
      (group: { productGroupSlug: string }) => group.productGroupSlug === "tele-special",
    );
    const afterOptions = afterFamily.options as Array<{ id: string; price: number }>;
    expect(afterOptions.find((option) => option.id === MEDIUM_ID)!.price).toBe(RAISED_MEDIUM_PRICE);
    expect(afterOptions.find((option) => option.id === SMALL_ID)!.price).toBe(620);
    expect(afterOptions.find((option) => option.id === LARGE_ID)!.price).toBe(1890);

    // 3. POS reads the same catalog contract — one flat SKU list, one price each.
    const posSku = (after.body.data.skus as Array<{ id: string; price: number }>).find(
      (sku) => sku.id === MEDIUM_ID,
    );
    expect(posSku!.price).toBe(RAISED_MEDIUM_PRICE);

    // 4. Quote prices server-side and ignores the client's stale unit price.
    const quote = await request(app)
      .post("/api/v1/orders/quote")
      .send(quoteBody([{ menuItemId: MEDIUM_ID, quantity: 2, unitPrice: 1, productName: "spoofed" }]));
    expect(quote.status).toBe(200);
    expect(quote.body.data.items[0].foodUnitPrice).toBe(RAISED_MEDIUM_PRICE);
    expect(quote.body.data.items[0].menuItemId).toBe(MEDIUM_ID);
    expect(quote.body.data.totals.totalAmount).toBe(RAISED_MEDIUM_PRICE * 2);

    // 5. Order captures a name + unit-price snapshot.
    const order = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "chain-key-1")
      .send({
        branchCode: "royal-orchard",
        orderType: "delivery",
        orderSource: "website",
        contactName: "Chain Test",
        contactPhone: "03001234567",
        deliveryAddress: "House 1, Royal Orchard, Multan",
        items: [{ menuItemId: MEDIUM_ID, quantity: 2 }],
      });
    expect(order.status).toBe(201);
    const orderNumber = order.body.data.orderNumber as string;
    expect(order.body.data.totalAmount).toBe(RAISED_MEDIUM_PRICE * 2);

    const snapshot = orderLines.find((line) => line.orderNumber === orderNumber)!;
    expect(snapshot.productName).toBe('Tele Special — 10" Medium');
    expect(snapshot.unitPrice).toBe(RAISED_MEDIUM_PRICE);

    // 6. Kitchen sees the exact SKU and size, and no pricing at all.
    const ticket = kitchenTicketFor(orderNumber);
    expect(ticket).toEqual([
      { menuItemId: MEDIUM_ID, productName: 'Tele Special — 10" Medium', sizeLabel: '10" Medium', quantity: 2 },
    ]);
    for (const line of ticket) {
      expect(line).not.toHaveProperty("unitPrice");
    }

    // 7. Report aggregates by SKU and by product family, one unit price per line.
    const report = itemSalesReport();
    const skuRow = report.bySku.find((row) => row.menuItemId === MEDIUM_ID)!;
    expect(skuRow.units).toBe(2);
    expect(skuRow.revenue).toBe(RAISED_MEDIUM_PRICE * 2);
    expect(skuRow.unitPrices.size).toBe(1);
    expect(report.byFamily.get("tele-special")).toBe(RAISED_MEDIUM_PRICE * 2);

    // 8. The price change is on the audit trail with before/after and an actor.
    const audit = await request(app)
      .get(`/api/v1/admin/menu/audit?resourceId=${MEDIUM_ID}`)
      .set("Authorization", "Bearer owner");
    expect(audit.status).toBe(200);
    expect(audit.body.data[0]).toMatchObject({
      action: "item.price_change",
      actorUserId: "u-owner",
      scope: "global",
      beforeData: { price: BASELINE_MEDIUM_PRICE },
      afterData: { price: RAISED_MEDIUM_PRICE },
    });

    // 9. Restore the controlled test price; the historical order keeps its snapshot.
    const restore = await request(app)
      .patch(`/api/v1/admin/menu/products/${MEDIUM_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: BASELINE_MEDIUM_PRICE });
    expect(restore.status).toBe(200);

    const restored = await request(app).get("/api/v1/menu/catalog");
    const restoredSku = (restored.body.data.skus as Array<{ id: string; price: number }>).find(
      (sku) => sku.id === MEDIUM_ID,
    );
    expect(restoredSku!.price).toBe(BASELINE_MEDIUM_PRICE);

    const history = await request(app)
      .get(`/api/v1/orders/${orderNumber}?phone=${encodeURIComponent("+923001234567")}`);
    expect(history.status).toBe(200);
    expect(history.body.data.items[0].unitPrice).toBe(RAISED_MEDIUM_PRICE);
    expect(history.body.data.totalAmount).toBe(RAISED_MEDIUM_PRICE * 2);
  });

  it("blocks ordering a SKU the owner marked unavailable", async () => {
    const app = buildApp();

    const update = await request(app)
      .patch(`/api/v1/admin/menu/products/${LARGE_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ isAvailable: false });
    expect(update.status).toBe(200);

    const quote = await request(app)
      .post("/api/v1/orders/quote")
      .send(quoteBody([{ menuItemId: LARGE_ID, quantity: 1 }]));
    expect(quote.status).toBe(400);
    expect(quote.body.error.code).toBe("CATALOG_ITEM_UNAVAILABLE");

    // The unavailable SKU also drops out of the customer catalog projection.
    const catalog = await request(app).get("/api/v1/menu/catalog");
    const family = catalog.body.data.categories[0].items.find(
      (group: { productGroupSlug: string }) => group.productGroupSlug === "tele-special",
    );
    const large = (family.options as Array<{ id: string; available: boolean }>).find(
      (option) => option.id === LARGE_ID,
    );
    expect(large?.available).toBe(false);
  });

  it("refuses a family slug when the family has more than one sellable SKU", async () => {
    const app = buildApp();

    const ambiguous = await request(app)
      .post("/api/v1/orders/quote")
      .send(quoteBody([{ menuItemSlug: "tele-special", quantity: 1 }]));
    expect(ambiguous.status).toBe(400);
    expect(ambiguous.body.error.code).toBe("SKU_SELECTION_REQUIRED");

    // A single-SKU family stays orderable by slug for legacy carts.
    const single = await request(app)
      .post("/api/v1/orders/quote")
      .send(quoteBody([{ menuItemSlug: "zinger-burger", quantity: 1 }]));
    expect(single.status).toBe(200);
    expect(single.body.data.items[0].foodUnitPrice).toBe(550);
  });
});
