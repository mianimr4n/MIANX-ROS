import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { RestaurantBillsService } from "../src/services/bills/restaurant-bills.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const B1 = "11111111-1111-1111-1111-111111111111";
const S1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BILL1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
    permissions: ["order.read", "delivery.read"],
    branchIds: [B1],
  }),
  kitchen: principal({
    authUserId: "a-kitchen",
    userId: "u-kitchen",
    roles: ["kitchen"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  cashier: principal({
    authUserId: "a-cashier",
    userId: "u-cashier",
    roles: ["cashier"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
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

function buildApp(bills: Partial<RestaurantBillsService> = {}) {
  const restaurantBills: RestaurantBillsService = {
    listBillsBySession: vi.fn(async () => []),
    closeBill: vi.fn(async () => ({
      billId: BILL1,
      status: "paid" as const,
      closedAt: "2026-07-18T12:00:00Z",
      closedByUserId: "u-cashier",
      idempotentReplay: false,
    })),
    ...bills,
  };
  const { app } = createApp(readyEnv, {
    authTokenVerifier: verifier,
    authProfileRepository,
    restaurantBills,
  });
  return { app, restaurantBills };
}

const bearer = (persona: keyof typeof PRINCIPALS) => `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("admin/bills authorization", () => {
  it("401 without bearer", async () => {
    const { app } = buildApp();
    const res = await request(app).get(`/api/v1/admin/bills?session_id=${S1}`);
    expect(res.status).toBe(401);
  });

  it("customer/rider/kitchen denied by service role gate", async () => {
    const { app, restaurantBills } = buildApp({
      listBillsBySession: vi.fn(async () => {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(403, "BILL_ACCESS_DENIED", "denied");
      }),
    });
    for (const persona of ["customer", "rider", "kitchen"] as const) {
      const res = await request(app)
        .get(`/api/v1/admin/bills?session_id=${S1}`)
        .set("Authorization", bearer(persona));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("BILL_ACCESS_DENIED");
    }
    expect(restaurantBills.listBillsBySession).toHaveBeenCalled();
  });

  it("cashier and branch-manager can list by session_id", async () => {
    const { app, restaurantBills } = buildApp();
    for (const persona of ["cashier", "bm", "superadmin"] as const) {
      const res = await request(app)
        .get(`/api/v1/admin/bills?session_id=${S1}`)
        .set("Authorization", bearer(persona));
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    }
    expect(restaurantBills.listBillsBySession).toHaveBeenCalledTimes(3);
  });

  it("close success for cashier", async () => {
    const { app, restaurantBills } = buildApp();
    const res = await request(app)
      .post(`/api/v1/admin/bills/${BILL1}/close`)
      .set("Authorization", bearer("cashier"))
      .send({ status: "paid" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("paid");
    expect((restaurantBills.closeBill as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      billId: BILL1,
      status: "paid",
      scope: { userId: "u-cashier" },
    });
  });

  it("close rejects when orders not final", async () => {
    const { app } = buildApp({
      closeBill: vi.fn(async () => {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(409, "BILL_ORDERS_NOT_FINAL", "orders not final");
      }),
    });
    const res = await request(app)
      .post(`/api/v1/admin/bills/${BILL1}/close`)
      .set("Authorization", bearer("cashier"))
      .send({ status: "paid" });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("BILL_ORDERS_NOT_FINAL");
  });

  it("requires session_id query", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/bills").set("Authorization", bearer("cashier"));
    expect(res.status).toBe(400);
  });
});
