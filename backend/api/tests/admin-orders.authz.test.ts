import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { BranchOrderManagementDataSource } from "../src/services/orders/management.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const B1 = "11111111-1111-1111-1111-111111111111";
const B2 = "22222222-2222-2222-2222-222222222222";

function principal(over: Partial<AuthPrincipal> & { authUserId: string; userId: string }): AuthPrincipal {
  return {
    email: `${over.userId}@example.com`,
    userType: "staff",
    status: "active",
    roles: [],
    permissions: [],
    branchIds: [],
    isSuperAdmin: false,
    ...over,
  };
}

const PRINCIPALS: Record<string, AuthPrincipal> = {
  customer: principal({ authUserId: "a-cust", userId: "u-cust", userType: "customer", roles: ["customer"] }),
  rider: principal({
    authUserId: "a-rider",
    userId: "u-rider",
    roles: ["rider"],
    permissions: ["order.read", "delivery.read", "delivery.update"],
    branchIds: [B1],
  }),
  bm: principal({
    authUserId: "a-bm",
    userId: "u-bm",
    roles: ["branch-manager"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  cashier: principal({
    authUserId: "a-cashier",
    userId: "u-cashier",
    roles: ["cashier"],
    permissions: ["order.read", "order.manage", "payment.read"],
    branchIds: [B1],
  }),
  kitchen: principal({
    authUserId: "a-kitchen",
    userId: "u-kitchen",
    roles: ["kitchen"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  superadmin: principal({ authUserId: "a-sa", userId: "u-sa", roles: ["super-admin"], isSuperAdmin: true }),
  suspended: principal({
    authUserId: "a-susp",
    userId: "u-susp",
    roles: ["branch-manager"],
    permissions: ["order.manage"],
    branchIds: [B1],
    status: "suspended",
  }),
};

function mockUser(id: string): User {
  return {
    id,
    email: `${id}@example.com`,
    app_metadata: { role: "super-admin" },
    user_metadata: { branch_id: "spoof" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

const verifier: AuthTokenVerifier = {
  async getUser(token) {
    // token === persona authUserId
    const known = Object.values(PRINCIPALS).some((p) => p.authUserId === token);
    return known ? { user: mockUser(token) } : { user: null, errorMessage: "bad" };
  },
};

const authProfileRepository = {
  async resolvePrincipal(authUserId: string) {
    return Object.values(PRINCIPALS).find((p) => p.authUserId === authUserId) ?? null;
  },
  async getMe() {
    throw new Error("unused");
  },
} as unknown as AuthPrincipalRepository;

function buildApp(management: Partial<BranchOrderManagementDataSource> = {}) {
  const branchOrderManagement: BranchOrderManagementDataSource = {
    listBranchOrders: vi.fn(async () => ({
      orders: [],
      pagination: { limit: 20, offset: 0, total: 0, returned: 0 },
    })),
    getBranchOrderDetail: vi.fn(async () => ({}) as never),
    getOperationsDashboard: vi.fn(async () => ({
      generatedAt: new Date().toISOString(),
      timezone: "Asia/Karachi" as const,
      dayStart: new Date().toISOString(),
      branchId: null,
      kpis: {
        todayOrders: 0,
        todayGrossSales: 0,
        activeOrders: 0,
        averageOrderValue: null,
        kitchenWaiting: 0,
        activeDeliveries: 0,
        lowStockCount: 0,
      },
      statusCounts: {},
      sourceBreakdown: [],
      recentOrders: [],
      branchPerformance: null,
      alerts: [],
      insights: [],
    })),
    transitionOrder: vi.fn(async () => ({
      orderId: "o1",
      orderNumber: "TP-1",
      status: "confirmed",
      action: "confirm" as const,
      reasonCode: null,
      idempotentReplay: false,
    })),
    ...management,
  };
  const { app } = createApp(readyEnv, { authTokenVerifier: verifier, authProfileRepository, branchOrderManagement });
  return { app, branchOrderManagement };
}

const bearer = (persona: keyof typeof PRINCIPALS) =>
  `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("admin/orders authorization", () => {
  it("401 without bearer", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/orders");
    expect(res.status).toBe(401);
  });

  it("customer is denied (no order.manage)", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/orders").set("Authorization", bearer("customer"));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("rider is denied branch management (order.read only)", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/orders").set("Authorization", bearer("rider"));
    expect(res.status).toBe(403);
  });

  it("suspended staff denied with USER_ACCESS_DISABLED", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/orders").set("Authorization", bearer("suspended"));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("USER_ACCESS_DISABLED");
  });

  it("spoofed x-telepizza-role/branch headers are ignored (customer stays denied)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", bearer("customer"))
      .set("x-telepizza-role", "super-admin")
      .set("x-telepizza-branch-id", B1);
    expect(res.status).toBe(403);
  });

  it("branch manager lists only their branch scope (from principal, not headers)", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/orders")
      .set("Authorization", bearer("bm"))
      .set("x-telepizza-branch-id", B2);
    expect(res.status).toBe(200);
    const scope = (branchOrderManagement.listBranchOrders as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.branchIds).toEqual([B1]);
    expect(scope.isSuperAdmin).toBe(false);
  });

  it("super-admin lists with super-admin scope", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app).get("/api/v1/admin/orders").set("Authorization", bearer("superadmin"));
    expect(res.status).toBe(200);
    const scope = (branchOrderManagement.listBranchOrders as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.isSuperAdmin).toBe(true);
  });

  it("cashier can confirm (order.manage) and body passes through", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app)
      .post("/api/v1/admin/orders/o1/confirm")
      .set("Authorization", bearer("cashier"))
      .send({});
    expect(res.status).toBe(200);
    const args = (branchOrderManagement.transitionOrder as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(args.action).toBe("confirm");
    expect(args.scope.userId).toBe("u-cashier");
  });

  it("kitchen can move to preparing", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app)
      .post("/api/v1/admin/orders/o1/preparing")
      .set("Authorization", bearer("kitchen"))
      .send({});
    expect(res.status).toBe(200);
    expect((branchOrderManagement.transitionOrder as ReturnType<typeof vi.fn>).mock.calls[0][0].action).toBe("preparing");
  });

  it("customer cannot confirm", async () => {
    const { app } = buildApp();
    const res = await request(app).post("/api/v1/admin/orders/o1/confirm").set("Authorization", bearer("customer")).send({});
    expect(res.status).toBe(403);
  });

  it("invalid status filter is rejected", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/orders?status=bogus")
      .set("Authorization", bearer("bm"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("unknown transition body field is rejected (strict schema)", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/v1/admin/orders/o1/cancel")
      .set("Authorization", bearer("bm"))
      .send({ reasonCode: "staff_cancelled", branchId: B2, role: "super-admin" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
