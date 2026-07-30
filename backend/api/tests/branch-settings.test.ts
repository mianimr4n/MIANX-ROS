import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  BranchSettingsRecord,
  BranchSettingsService,
  BranchSettingsUpdateInput,
} from "../src/services/settings/branch.js";
import { ApiError } from "../src/common/http.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const BRANCH_ID = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

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
    userId: "user-owner",
    authUserId: "auth-owner",
    email: "owner@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["branch.manage"],
    branchIds: [BRANCH_ID],
    isSuperAdmin: false,
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

function settingsRecord(overrides: Partial<BranchSettingsRecord> = {}): BranchSettingsRecord {
  return {
    branchId: BRANCH_ID,
    branchCode: "royal-orchard",
    branchName: "Royal Orchard Branch",
    opensAt: "10:00",
    closesAt: "02:30",
    hoursDaily: "10:00 - 02:30",
    deliveryRadiusKm: 5,
    minimumOrderAmount: 500,
    deliveryFee: 150,
    updatedAt: "2026-07-30T12:00:00.000Z",
    ...overrides,
  };
}

function mockBranchSettings(): BranchSettingsService {
  let current = settingsRecord();
  return {
    async get(_scope, branchId) {
      if (branchId !== BRANCH_ID) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return current;
    },
    async update(_actor, branchId, input: BranchSettingsUpdateInput) {
      if (branchId !== BRANCH_ID) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      current = settingsRecord({
        opensAt: input.opensAt !== undefined ? input.opensAt : current.opensAt,
        closesAt: input.closesAt !== undefined ? input.closesAt : current.closesAt,
        hoursDaily:
          input.opensAt !== undefined || input.closesAt !== undefined
            ? `${input.opensAt ?? current.opensAt} - ${input.closesAt ?? current.closesAt}`
            : current.hoursDaily,
        deliveryRadiusKm:
          input.deliveryRadiusKm !== undefined ? input.deliveryRadiusKm : current.deliveryRadiusKm,
        minimumOrderAmount:
          input.minimumOrderAmount !== undefined
            ? input.minimumOrderAmount
            : current.minimumOrderAmount,
        deliveryFee: input.deliveryFee !== undefined ? input.deliveryFee : current.deliveryFee,
        updatedAt: "2026-07-30T13:00:00.000Z",
      });
      return current;
    },
  };
}

describe("admin branch settings write API", () => {
  it("GET/PUT /admin/branches/:id/settings with branch.manage", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-owner", "owner@example.com"),
      authProfileRepository: authRepo(principal()),
      branchSettings: mockBranchSettings(),
    });

    const getRes = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/settings`)
      .set("Authorization", "Bearer owner");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.deliveryFee).toBe(150);
    expect(getRes.body.data.opensAt).toBe("10:00");

    const putRes = await request(app)
      .put(`/api/v1/admin/branches/${BRANCH_ID}/settings`)
      .set("Authorization", "Bearer owner")
      .send({
        opensAt: "11:00",
        closesAt: "01:00",
        deliveryRadiusKm: 7.5,
        minimumOrderAmount: 800,
        deliveryFee: 200,
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.opensAt).toBe("11:00");
    expect(putRes.body.data.deliveryRadiusKm).toBe(7.5);
    expect(putRes.body.data.deliveryFee).toBe(200);
  });

  it("allows admin.access without branch.manage", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["admin.access"],
          roles: ["branch-manager"],
          isSuperAdmin: false,
        }),
      ),
      branchSettings: mockBranchSettings(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/settings`)
      .set("Authorization", "Bearer admin");
    expect(res.status).toBe(200);
  });

  it("rejects callers without branch.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["order.manage"],
          roles: ["cashier"],
          isSuperAdmin: false,
        }),
      ),
      branchSettings: mockBranchSettings(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/settings`)
      .set("Authorization", "Bearer cashier");
    expect(res.status).toBe(403);
  });
});
