import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { KitchenTicketsService } from "../src/services/kitchen/tickets.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const B1 = "11111111-1111-1111-1111-111111111111";

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
  cashier: principal({
    authUserId: "a-cashier",
    userId: "u-cashier",
    roles: ["cashier"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  kitchen: principal({
    authUserId: "a-kitchen",
    userId: "u-kitchen",
    roles: ["kitchen"],
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

function buildApp(kitchen: Partial<KitchenTicketsService> = {}) {
  const kitchenTickets: KitchenTicketsService = {
    listTickets: vi.fn(async () => ({
      tickets: [],
      pagination: { limit: 50, offset: 0, total: 0, returned: 0 },
    })),
    transitionTicket: vi.fn(async () => ({
      ticketId: "kt1",
      status: "preparing" as const,
      orderId: "o1",
      orderStatus: "preparing",
      idempotentReplay: false,
    })),
    ...kitchen,
  };
  const { app } = createApp(readyEnv, {
    authTokenVerifier: verifier,
    authProfileRepository,
    kitchenTickets,
  });
  return { app, kitchenTickets };
}

const bearer = (persona: keyof typeof PRINCIPALS) => `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("kitchen/tickets authorization", () => {
  it("401 without bearer", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/kitchen/tickets");
    expect(res.status).toBe(401);
  });

  it("customer and rider are denied by service role gate", async () => {
    const { app, kitchenTickets } = buildApp({
      listTickets: vi.fn(async () => {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(403, "KITCHEN_ACCESS_DENIED", "denied");
      }),
    });
    for (const persona of ["customer", "rider", "cashier"] as const) {
      const res = await request(app).get("/api/v1/kitchen/tickets").set("Authorization", bearer(persona));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("KITCHEN_ACCESS_DENIED");
    }
    expect(kitchenTickets.listTickets).toHaveBeenCalled();
  });

  it("kitchen and branch-manager can list", async () => {
    const { app, kitchenTickets } = buildApp();
    for (const persona of ["kitchen", "bm", "superadmin"] as const) {
      const res = await request(app).get("/api/v1/kitchen/tickets").set("Authorization", bearer(persona));
      expect(res.status).toBe(200);
    }
    expect(kitchenTickets.listTickets).toHaveBeenCalledTimes(3);
  });

  it("kitchen can patch ticket status", async () => {
    const { app, kitchenTickets } = buildApp();
    const res = await request(app)
      .patch("/api/v1/kitchen/tickets/kt1/status")
      .set("Authorization", bearer("kitchen"))
      .send({ status: "preparing" });
    expect(res.status).toBe(200);
    expect((kitchenTickets.transitionTicket as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
      ticketId: "kt1",
      toStatus: "preparing",
      scope: { userId: "u-kitchen" },
    });
  });
});
