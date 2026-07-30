import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  DeliverySettingsRecord,
  DeliverySettingsService,
  DeliverySettingsUpdateInput,
} from "../src/services/settings/delivery.js";
import { ApiError } from "../src/common/http.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const RO_BRANCH = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

function mockUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: "user-founder",
    authUserId: "auth-founder",
    email: "founder@example.com",
    userType: "staff",
    status: "active",
    roles: ["super-admin"],
    permissions: ["*"],
    branchIds: [],
    isSuperAdmin: true,
    ...overrides,
  };
}

function authRepo(p: AuthPrincipal): AuthPrincipalRepository {
  return {
    async resolvePrincipal() {
      return p;
    },
    async getMe() {
      throw new Error("unused");
    },
  };
}

function verifier(authUserId: string, email: string): AuthTokenVerifier {
  return {
    async getUser() {
      return { user: mockUser(authUserId, email) };
    },
  };
}

function deliveryRecord(overrides: Partial<DeliverySettingsRecord> = {}): DeliverySettingsRecord {
  return {
    branchId: RO_BRANCH,
    branchCode: "royal-orchard",
    branchName: "Royal Orchard Branch",
    deliveryRadiusKm: 5,
    minimumOrderAmount: 800,
    deliveryFee: 150,
    updatedAt: "2026-07-29T12:00:00.000Z",
    ...overrides,
  };
}

function mockDeliveryService(store: { current: DeliverySettingsRecord }): DeliverySettingsService {
  return {
    async get(_scope, branchId) {
      if (branchId !== store.current.branchId) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return store.current;
    },
    async update(_actor, input: DeliverySettingsUpdateInput) {
      if (input.branchId !== store.current.branchId) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      store.current = {
        ...store.current,
        deliveryRadiusKm:
          input.deliveryRadiusKm !== undefined ? input.deliveryRadiusKm : store.current.deliveryRadiusKm,
        minimumOrderAmount:
          input.minimumOrderAmount !== undefined
            ? input.minimumOrderAmount
            : store.current.minimumOrderAmount,
        deliveryFee: input.deliveryFee !== undefined ? input.deliveryFee : store.current.deliveryFee,
        updatedAt: "2026-07-29T14:00:00.000Z",
      };
      return store.current;
    },
  };
}

describe("Phase 2 delivery settings API", () => {
  it("GET/PUT /admin/settings/delivery with branch.manage", async () => {
    const store = { current: deliveryRecord() };
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-bm", "bm@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["branch.manage"],
          roles: ["branch-manager"],
          isSuperAdmin: false,
          branchIds: [RO_BRANCH],
        }),
      ),
      deliverySettings: mockDeliveryService(store),
    });

    const getRes = await request(app)
      .get(`/api/v1/admin/settings/delivery?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer tok");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.deliveryFee).toBe(150);

    const putRes = await request(app)
      .put("/api/v1/admin/settings/delivery")
      .set("Authorization", "Bearer tok")
      .send({
        branchId: RO_BRANCH,
        deliveryRadiusKm: 8,
        minimumOrderAmount: 1000,
        deliveryFee: 200,
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.deliveryRadiusKm).toBe(8);
    expect(putRes.body.data.minimumOrderAmount).toBe(1000);
    expect(putRes.body.data.deliveryFee).toBe(200);
  });

  it("rejects delivery settings without branch.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["order.manage"],
          roles: ["cashier"],
          isSuperAdmin: false,
          branchIds: [RO_BRANCH],
        }),
      ),
      deliverySettings: mockDeliveryService({ current: deliveryRecord() }),
    });

    const res = await request(app)
      .get(`/api/v1/admin/settings/delivery?branchId=${RO_BRANCH}`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });
});
