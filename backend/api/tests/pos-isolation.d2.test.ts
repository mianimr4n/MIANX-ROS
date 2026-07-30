import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D2 — Authenticated POS isolation suite.
 * Proves staff POS create enforces membership + operating status,
 * and public /orders rejects orderSource=pos.
 */

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

const principals = {
  cashierA: {
    authUserId: "auth-a",
    userId: "u-a",
    email: "a@example.com",
    userType: "staff",
    status: "active",
    roles: ["cashier"],
    permissions: ["order.manage", "order.create", "order.read"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  cashierB: {
    authUserId: "auth-b",
    userId: "u-b",
    email: "b@example.com",
    userType: "staff",
    status: "active",
    roles: ["cashier"],
    permissions: ["order.manage", "order.create", "order.read"],
    branchIds: [B2],
    isSuperAdmin: false,
  },
};

vi.mock("@supabase/supabase-js", () => {
  const branches: Record<string, { id: string; branch_code: string; status: string; name: string }> = {
    "royal-orchard": {
      id: "11111111-1111-4111-8111-111111111111",
      branch_code: "royal-orchard",
      status: "operating",
      name: "Royal Orchard",
    },
    "northern-bypass": {
      id: "22222222-2222-4222-8222-222222222222",
      branch_code: "northern-bypass",
      status: "coming-soon",
      name: "Northern Bypass",
    },
    "inactive-branch": {
      id: "33333333-3333-4333-8333-333333333333",
      branch_code: "inactive-branch",
      status: "inactive",
      name: "Inactive",
    },
  };

  return {
    createClient: () => ({
      from: (table: string) => {
        if (table !== "branches") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: (_col: string, value: string) => ({
              maybeSingle: async () => {
                const byCode = Object.values(branches).find((b) => b.branch_code === value);
                const byId = Object.values(branches).find((b) => b.id === value);
                return { data: byCode ?? byId ?? null, error: null };
              },
            }),
          }),
        };
      },
    }),
  };
});

const createOrder = vi.fn();

vi.mock("../src/middleware/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/middleware/authorization.js")>(
    "../src/middleware/authorization.js",
  );
  return {
    ...actual,
    createRequireAuthenticatedUser: () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      const auth = req.header("authorization") ?? "";
      const key = auth.includes("cashier-b") ? "cashierB" : auth.includes("cashier-a") ? "cashierA" : null;
      if (!key) {
        return next(Object.assign(new Error("Authentication required."), { statusCode: 401, code: "UNAUTHORIZED" }));
      }
      (req as express.Request & { principal: unknown }).principal = principals[key];
      return next();
    },
  };
});

import { createAdminPosRouter } from "../src/modules/admin/pos.js";
import { createOrdersRouter } from "../src/modules/orders/routes.js";
import { ApiError } from "../src/common/http.js";

function buildPosApp() {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/admin/pos",
    createAdminPosRouter({
      authTokenVerifier: { getUser: async () => ({ user: null }) } as never,
      authProfileRepository: {
        loadPrincipalByAuthUserId: async () => null,
      } as never,
      ordersDataSource: { createOrder, quoteOrder: vi.fn(), getOrder: vi.fn(), getOrderTracking: vi.fn(), cancelOrder: vi.fn() },
      posZReport: {
        getReport: vi.fn(async () => ({
          timezone: "Asia/Karachi" as const,
          businessDate: "2026-07-30",
          dayStart: "2026-07-30T00:00:00+05:00",
          branchId: "00000000-0000-4000-8000-000000000001",
          totalOrders: 0,
          totalCashSales: 0,
          expectedCashInDrawer: 0,
          generatedAt: new Date().toISOString(),
        })),
        confirmClose: vi.fn(async () => ({
          timezone: "Asia/Karachi" as const,
          businessDate: "2026-07-30",
          dayStart: "2026-07-30T00:00:00+05:00",
          branchId: "00000000-0000-4000-8000-000000000001",
          totalOrders: 0,
          totalCashSales: 0,
          expectedCashInDrawer: 0,
          generatedAt: new Date().toISOString(),
          confirmed: true as const,
          confirmedAt: new Date().toISOString(),
          eventId: "evt-test",
        })),
      },
      envStatus: {
        isReady: true,
        issues: [],
        config: {
          port: 4000,
          corsOrigin: "http://localhost:3000",
          jwtSecret: "x".repeat(20),
          supabaseUrl: "https://example.supabase.co",
          supabaseAnonKey: "anon",
          supabaseServiceRoleKey: "service",
        },
      } as never,
    }),
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    const anyErr = err as { statusCode?: number; code?: string; message?: string };
    return res.status(anyErr.statusCode ?? 500).json({
      ok: false,
      error: { code: anyErr.code ?? "INTERNAL", message: anyErr.message ?? "error" },
    });
  });
  return app;
}

function buildPublicOrdersApp() {
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/orders",
    createOrdersRouter({
      createOrder,
      quoteOrder: vi.fn(),
      getOrder: vi.fn(),
      getOrderTracking: vi.fn(),
      cancelOrder: vi.fn(),
    }),
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "error" } });
  });
  return app;
}

const validBody = {
  branchCode: "royal-orchard",
  orderType: "pickup",
  contactName: "Walk-in Guest",
  contactPhone: "+923001234567",
  items: [{ menuItemSlug: "margherita-pizza", quantity: 1 }],
};

beforeEach(() => {
  createOrder.mockReset();
  createOrder.mockResolvedValue({
    id: "ord-1",
    orderNumber: "TP-100",
    status: "pending",
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 0,
    deliveryFee: 0,
    totalAmount: 1000,
    createdAt: new Date().toISOString(),
  });
});

describe("D2 — POS isolation", () => {
  it("valid Branch A cashier POS create succeeds", async () => {
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-a")
      .set("Idempotency-Key", "idem-a-1")
      .send(validBody);
    expect(res.status).toBe(201);
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ orderSource: "pos", branchCode: "royal-orchard", authUserId: "auth-a" }),
    );
  });

  it("Branch A cashier cannot create for Branch B (forged branch code)", async () => {
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-a")
      .set("Idempotency-Key", "idem-forge")
      .send({ ...validBody, branchCode: "northern-bypass" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("BRANCH_ACCESS_DENIED");
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("coming-soon branch rejects live POS create", async () => {
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-b")
      .set("Idempotency-Key", "idem-cs")
      .send({ ...validBody, branchCode: "northern-bypass" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BRANCH_NOT_OPERATIONAL");
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("unknown branch returns BRANCH_NOT_FOUND", async () => {
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-a")
      .set("Idempotency-Key", "idem-unk")
      .send({ ...validBody, branchCode: "does-not-exist" });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("BRANCH_NOT_FOUND");
  });

  it("duplicate idempotency key replays without second create side-effect when datasource returns replay", async () => {
    createOrder.mockResolvedValueOnce({
      id: "ord-1",
      orderNumber: "TP-100",
      status: "pending",
      subtotal: 1000,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 1000,
      createdAt: new Date().toISOString(),
      idempotentReplay: true,
    });
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-a")
      .set("Idempotency-Key", "idem-dup")
      .send(validBody);
    expect(res.status).toBe(200);
    expect(res.body.data.idempotentReplay).toBe(true);
  });

  it("successful zero tax/fee is returned as valid zeros", async () => {
    const app = buildPosApp();
    const res = await request(app)
      .post("/api/v1/admin/pos/orders")
      .set("Authorization", "Bearer cashier-a")
      .set("Idempotency-Key", "idem-zero")
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.data.taxAmount).toBe(0);
    expect(res.body.data.deliveryFee).toBe(0);
  });

  it("public POST /orders rejects orderSource=pos", async () => {
    const app = buildPublicOrdersApp();
    const res = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "guest-pos")
      .send({ ...validBody, orderSource: "pos" });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("POS_AUTH_REQUIRED");
    expect(createOrder).not.toHaveBeenCalled();
  });
});
