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

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

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
  bm: principal({
    authUserId: "a-bm",
    userId: "u-bm",
    roles: ["branch-manager"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  superadmin: principal({ authUserId: "a-sa", userId: "u-sa", roles: ["super-admin"], isSuperAdmin: true }),
};

function mockUser(id: string): User {
  return {
    id,
    email: `${id}@example.com`,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

const verifier: AuthTokenVerifier = {
  async getUser(token) {
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
      dayStart: "2026-07-22T00:00:00+05:00",
      branchId: null,
      kpis: {
        todayOrders: 2,
        todayGrossSales: 1500,
        activeOrders: 1,
        averageOrderValue: 750,
        kitchenWaiting: 1,
        activeDeliveries: 0,
        lowStockCount: 0,
      },
      statusCounts: { pending: 1 },
      sourceBreakdown: [{ source: "website", count: 2 }],
      recentOrders: [],
      branchPerformance: null,
      alerts: [],
      insights: ["1 pending order requires attention."],
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

const bearer = (persona: keyof typeof PRINCIPALS) => `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("admin/dashboard authorization", () => {
  it("401 without bearer", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/dashboard/operations");
    expect(res.status).toBe(401);
  });

  it("customer is forbidden", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/dashboard/operations")
      .set("Authorization", bearer("customer"));
    expect(res.status).toBe(403);
  });

  it("branch manager can load dashboard with scoped branch filter", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app)
      .get(`/api/v1/admin/dashboard/operations?branchId=${B1}`)
      .set("Authorization", bearer("bm"));
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.kpis.todayOrders).toBe(2);
    const args = (branchOrderManagement.getOperationsDashboard as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(args[0].branchIds).toEqual([B1]);
    expect(args[1]).toEqual({ branchId: B1 });
  });

  it("super-admin can query all branches", async () => {
    const { app, branchOrderManagement } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/dashboard/operations")
      .set("Authorization", bearer("superadmin"));
    expect(res.status).toBe(200);
    const scope = (branchOrderManagement.getOperationsDashboard as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.isSuperAdmin).toBe(true);
  });

  it("rejects invalid branchId", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/dashboard/operations?branchId=not-a-uuid")
      .set("Authorization", bearer("bm"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("spoofed branch header does not override principal scope", async () => {
    const { app, branchOrderManagement } = buildApp();
    await request(app)
      .get(`/api/v1/admin/dashboard/operations?branchId=${B1}`)
      .set("Authorization", bearer("bm"))
      .set("x-telepizza-branch-id", B2);
    const scope = (branchOrderManagement.getOperationsDashboard as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.branchIds).toEqual([B1]);
  });
});
