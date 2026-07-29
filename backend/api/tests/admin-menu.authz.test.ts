import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Admin Menu workspace RBAC and contract for the canonical single-price catalog.
 *
 * Reads need `menu.read`; every write needs `menu.write`. The router must never expose a
 * variant surface, and a price change must reach the audit trail.
 */

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const SKU_ID = "22222222-2222-4222-8222-222222222222";

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

const principals: Record<string, Principal> = {
  owner: {
    authUserId: "auth-owner",
    userId: "u-owner",
    email: "owner@example.com",
    userType: "staff",
    status: "active",
    roles: ["admin"],
    permissions: ["menu.read", "menu.write", "admin.access"],
    branchIds: [],
    isSuperAdmin: false,
  },
  viewer: {
    authUserId: "auth-viewer",
    userId: "u-viewer",
    email: "viewer@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["menu.read"],
    branchIds: [],
    isSuperAdmin: false,
  },
  cashier: {
    authUserId: "auth-cashier",
    userId: "u-cashier",
    email: "cashier@example.com",
    userType: "staff",
    status: "active",
    roles: ["cashier"],
    permissions: ["order.manage"],
    branchIds: [],
    isSuperAdmin: false,
  },
};

vi.mock("../src/middleware/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/middleware/authorization.js")>(
    "../src/middleware/authorization.js",
  );
  return {
    ...actual,
    createRequireAuthenticatedUser:
      () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        const auth = req.header("authorization") ?? "";
        const key = Object.keys(principals).find((k) => auth.includes(k));
        if (!key) {
          return next(
            Object.assign(new Error("Authentication required."), {
              statusCode: 401,
              code: "UNAUTHORIZED",
            }),
          );
        }
        (req as express.Request & { principal: unknown }).principal = principals[key];
        return next();
      },
  };
});

import { createAdminMenuRouter } from "../src/modules/admin/menu.js";
import { ApiError } from "../src/common/http.js";
import type { MenuSkuRecord } from "../src/services/menu/management.js";

function sku(overrides: Partial<MenuSkuRecord> = {}): MenuSkuRecord {
  return {
    id: SKU_ID,
    categoryId: CATEGORY_ID,
    categorySlug: "signature-pizzas",
    slug: "tele-special-medium",
    name: "Tele Special — 10 inch Medium",
    productGroupSlug: "tele-special",
    sizeLabel: "10 inch Medium",
    sizeCode: "medium",
    description: null,
    price: 1250,
    isAvailable: true,
    isFeatured: false,
    imageUrl: null,
    badge: null,
    productType: "pizza",
    sortOrder: 2,
    ...overrides,
  };
}

const auditWrites: Array<{ action: string; before: unknown; after: unknown }> = [];

const menuManagement = {
  listCategories: vi.fn(async () => [
    { id: CATEGORY_ID, name: "Signature Pizzas", slug: "signature-pizzas", sortOrder: 10, isActive: true, skuCount: 3 },
  ]),
  createCategory: vi.fn(async () => ({
    id: CATEGORY_ID,
    name: "Desserts",
    slug: "desserts",
    sortOrder: 90,
    isActive: true,
    skuCount: 0,
  })),
  updateCategory: vi.fn(async () => ({
    id: CATEGORY_ID,
    name: "Signature",
    slug: "signature-pizzas",
    sortOrder: 10,
    isActive: false,
    skuCount: 3,
  })),
  listProductGroups: vi.fn(async () => [
    {
      productGroupSlug: "tele-special",
      name: "Tele Special",
      categoryId: CATEGORY_ID,
      categorySlug: "signature-pizzas",
      options: [sku({ id: SKU_ID, price: 620, sizeLabel: "6 inch Small", sortOrder: 1 }), sku()],
    },
  ]),
  createSku: vi.fn(async (_actor: unknown, input: { price: number }) => {
    if (input.price < 0) throw new ApiError(400, "VALIDATION_ERROR", "Price must be non-negative.");
    return sku({ price: input.price });
  }),
  updateSku: vi.fn(async (_actor: unknown, _id: string, input: { price?: number }) => {
    const before = sku();
    const after = sku({ price: input.price ?? before.price });
    auditWrites.push({
      action: input.price !== undefined ? "item.price_change" : "item.update",
      before: { price: before.price },
      after: { price: after.price },
    });
    return after;
  }),
  uploadSkuImage: vi.fn(async () => sku({ imageUrl: "https://example.supabase.co/storage/v1/object/public/menu-product-images/x.jpg" })),
  listAuditEvents: vi.fn(async () =>
    auditWrites.map((entry, index) => ({
      id: `audit-${index}`,
      actorUserId: "u-owner",
      resourceType: "menu_item",
      resourceId: SKU_ID,
      action: entry.action,
      scope: "global",
      beforeData: entry.before,
      afterData: entry.after,
      createdAt: new Date().toISOString(),
    })),
  ),
};

const stubDeps = {
  authTokenVerifier: { getUser: async () => ({ user: null }) } as never,
  authProfileRepository: { loadPrincipalByAuthUserId: async () => null } as never,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/admin/menu", createAdminMenuRouter({ ...stubDeps, menuManagement: menuManagement as never }));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    const anyErr = err as { statusCode?: number; code?: string; message?: string };
    return res
      .status(anyErr.statusCode ?? 500)
      .json({ ok: false, error: { code: anyErr.code ?? "INTERNAL", message: anyErr.message ?? "error" } });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  auditWrites.length = 0;
});

describe("admin menu workspace authz", () => {
  const app = buildApp();

  it("rejects unauthenticated reads", async () => {
    const res = await request(app).get("/admin/menu/categories");
    expect(res.status).toBe(401);
  });

  it("allows menu.read to list categories", async () => {
    const res = await request(app).get("/admin/menu/categories").set("Authorization", "Bearer viewer");
    expect(res.status).toBe(200);
    expect(res.body.data[0].slug).toBe("signature-pizzas");
    expect(res.body.meta.scope).toBe("global");
  });

  it("denies a cashier without menu.read", async () => {
    const res = await request(app).get("/admin/menu/categories").set("Authorization", "Bearer cashier");
    expect(res.status).toBe(403);
  });

  it("denies a price update without menu.write", async () => {
    const res = await request(app)
      .patch(`/admin/menu/products/${SKU_ID}`)
      .set("Authorization", "Bearer viewer")
      .send({ price: 1400 });
    expect(res.status).toBe(403);
    expect(menuManagement.updateSku).not.toHaveBeenCalled();
  });

  it("allows an owner with menu.write to change one price", async () => {
    const res = await request(app)
      .patch(`/admin/menu/products/${SKU_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: 1400 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(1400);
  });

  it("accepts PUT /admin/menu/skus/:id as the price/availability alias", async () => {
    const res = await request(app)
      .put(`/admin/menu/skus/${SKU_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: 1550, isAvailable: true });
    expect(res.status).toBe(200);
    expect(menuManagement.updateSku).toHaveBeenCalled();
  });

  it("records a price change in the audit trail", async () => {
    await request(app)
      .patch(`/admin/menu/products/${SKU_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: 1490 });

    const res = await request(app)
      .get(`/admin/menu/audit?resourceId=${SKU_ID}`)
      .set("Authorization", "Bearer owner");

    expect(res.status).toBe(200);
    expect(res.body.data[0].action).toBe("item.price_change");
    expect(res.body.data[0].beforeData.price).toBe(1250);
    expect(res.body.data[0].afterData.price).toBe(1490);
  });

  it("rejects a negative price before it reaches the service", async () => {
    const res = await request(app)
      .patch(`/admin/menu/products/${SKU_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ price: -1 });
    expect(res.status).toBe(400);
    expect(menuManagement.updateSku).not.toHaveBeenCalled();
  });

  it("rejects unknown fields such as a variant payload", async () => {
    const res = await request(app)
      .patch(`/admin/menu/products/${SKU_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ variants: [{ label: "Large", price: 1890 }] });
    expect(res.status).toBe(400);
    expect(menuManagement.updateSku).not.toHaveBeenCalled();
  });

  it("groups SKUs for presentation while keeping one price per option", async () => {
    const res = await request(app).get("/admin/menu/products").set("Authorization", "Bearer viewer");
    expect(res.status).toBe(200);
    expect(res.body.meta.productGroupCount).toBe(1);
    expect(res.body.meta.skuCount).toBe(2);
    for (const option of res.body.data[0].options) {
      expect(typeof option.price).toBe("number");
      expect(option).not.toHaveProperty("variants");
    }
  });

  it("creates a sized SKU as its own sellable item", async () => {
    const res = await request(app)
      .post("/admin/menu/products")
      .set("Authorization", "Bearer owner")
      .send({
        categoryId: CATEGORY_ID,
        slug: "tele-special-large",
        name: "Tele Special — 12 inch Large",
        price: 1890,
        productGroupSlug: "tele-special",
        sizeLabel: "12 inch Large",
        sizeCode: "large",
        productType: "pizza",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe(1890);
  });

  it("denies category creation without menu.write", async () => {
    const res = await request(app)
      .post("/admin/menu/categories")
      .set("Authorization", "Bearer viewer")
      .send({ name: "Desserts", slug: "desserts" });
    expect(res.status).toBe(403);
  });

  it("accepts a category rename from an owner", async () => {
    const res = await request(app)
      .patch(`/admin/menu/categories/${CATEGORY_ID}`)
      .set("Authorization", "Bearer owner")
      .send({ name: "Signature", isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Signature");
  });
});
