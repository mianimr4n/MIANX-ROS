import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { DeliveryOperationsDataSource } from "../src/services/deliveries/operations.js";

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
const D1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const R1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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

/** Seeded permission matrix fixtures (foundation seed). */
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
    permissions: ["order.read", "order.manage", "delivery.read", "delivery.assign"],
    branchIds: [B1],
  }),
  bmOtherBranch: principal({
    authUserId: "a-bm2",
    userId: "u-bm2",
    roles: ["branch-manager"],
    permissions: ["order.read", "order.manage", "delivery.read", "delivery.assign"],
    branchIds: [B2],
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
    permissions: ["order.read", "order.manage", "payment.read"],
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

function buildApp(ops: Partial<DeliveryOperationsDataSource> = {}) {
  const deliveryOperations: DeliveryOperationsDataSource = {
    listRiders: vi.fn(async () => []),
    listAssignments: vi.fn(async () => ({
      assignments: [],
      pagination: { limit: 50, offset: 0, total: 0, returned: 0 },
    })),
    assignRider: vi.fn(async () => ({
      deliveryId: D1,
      status: "assigned",
      orderId: "o1",
      orderStatus: "ready",
      idempotentReplay: false,
    })),
    transitionDelivery: vi.fn(async () => ({
      deliveryId: D1,
      status: "picked-up",
      orderId: "o1",
      orderStatus: "dispatched",
      idempotentReplay: false,
    })),
    ...ops,
  };
  const { app } = createApp(readyEnv, {
    authTokenVerifier: verifier,
    authProfileRepository,
    deliveryOperations,
  });
  return { app, deliveryOperations };
}

const bearer = (persona: keyof typeof PRINCIPALS) => `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("Sprint 4.6 riders/delivery authorization matrix", () => {
  it("401 without bearer on assign and status", async () => {
    const { app } = buildApp();
    const assign = await request(app).post(`/api/v1/riders/deliveries/${D1}/assign`).send({ riderId: R1 });
    const status = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/status`)
      .send({ status: "picked-up" });
    expect(assign.status).toBe(401);
    expect(status.status).toBe(401);
  });

  it("kitchen and cashier cannot assign (no delivery.assign; order.manage is not a shortcut)", async () => {
    const { app, deliveryOperations } = buildApp();
    for (const persona of ["kitchen", "cashier"] as const) {
      const res = await request(app)
        .post(`/api/v1/riders/deliveries/${D1}/assign`)
        .set("Authorization", bearer(persona))
        .send({ riderId: R1 });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
    expect(deliveryOperations.assignRider).not.toHaveBeenCalled();
  });

  it("kitchen and cashier cannot update delivery status (no delivery.update)", async () => {
    const { app, deliveryOperations } = buildApp();
    for (const persona of ["kitchen", "cashier"] as const) {
      const res = await request(app)
        .post(`/api/v1/riders/deliveries/${D1}/status`)
        .set("Authorization", bearer(persona))
        .send({ status: "picked-up" });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    }
    expect(deliveryOperations.transitionDelivery).not.toHaveBeenCalled();
  });

  it("branch-manager can assign (delivery.assign); status requires delivery.update at service", async () => {
    const { ApiError } = await import("../src/common/http.js");
    const { app, deliveryOperations } = buildApp({
      transitionDelivery: vi.fn(async ({ scope }) => {
        if (!scope.isSuperAdmin && !scope.permissions.includes("delivery.update")) {
          throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to update delivery status.");
        }
        return {
          deliveryId: D1,
          status: "picked-up",
          orderId: "o1",
          orderStatus: "dispatched",
          idempotentReplay: false,
        };
      }),
    });
    const assign = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/assign`)
      .set("Authorization", bearer("bm"))
      .send({ riderId: R1 });
    expect(assign.status).toBe(200);
    expect(deliveryOperations.assignRider).toHaveBeenCalledOnce();

    const status = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/status`)
      .set("Authorization", bearer("bm"))
      .send({ status: "picked-up" });
    expect(status.status).toBe(403);
    expect(status.body.error.code).toBe("AUTHZ_FORBIDDEN");
  });

  it("rider can update status (delivery.update) but cannot assign", async () => {
    const { app, deliveryOperations } = buildApp();
    const assign = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/assign`)
      .set("Authorization", bearer("rider"))
      .send({ riderId: R1 });
    expect(assign.status).toBe(403);

    const status = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/status`)
      .set("Authorization", bearer("rider"))
      .send({ status: "picked-up" });
    expect(status.status).toBe(200);
    expect(deliveryOperations.transitionDelivery).toHaveBeenCalledOnce();
  });

  it("service rejects other-branch access (DELIVERY_ACCESS_DENIED)", async () => {
    const { ApiError } = await import("../src/common/http.js");
    const { app } = buildApp({
      assignRider: vi.fn(async () => {
        throw new ApiError(403, "DELIVERY_ACCESS_DENIED", "Delivery belongs to another branch.");
      }),
    });
    const res = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/assign`)
      .set("Authorization", bearer("bmOtherBranch"))
      .send({ riderId: R1 });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("DELIVERY_ACCESS_DENIED");
  });

  it("idempotent status replay returns 200 with idempotentReplay", async () => {
    const { app, deliveryOperations } = buildApp({
      transitionDelivery: vi.fn(async () => ({
        deliveryId: D1,
        status: "picked-up",
        orderId: "o1",
        orderStatus: "dispatched",
        idempotentReplay: true,
      })),
    });
    const res = await request(app)
      .post(`/api/v1/riders/deliveries/${D1}/status`)
      .set("Authorization", bearer("rider"))
      .send({ status: "picked-up" });
    expect(res.status).toBe(200);
    expect(res.body.data.idempotentReplay).toBe(true);
    expect(deliveryOperations.transitionDelivery).toHaveBeenCalledOnce();
  });

  it("customer is denied assignments list by service (no delivery.read)", async () => {
    const { ApiError } = await import("../src/common/http.js");
    const { app } = buildApp({
      listAssignments: vi.fn(async () => {
        throw new ApiError(403, "AUTHZ_FORBIDDEN", "Missing permission to list deliveries.");
      }),
    });
    const res = await request(app).get("/api/v1/riders/assignments").set("Authorization", bearer("customer"));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("AUTHZ_FORBIDDEN");
  });
});
