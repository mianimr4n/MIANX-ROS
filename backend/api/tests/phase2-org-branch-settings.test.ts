import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  BranchProfileRecord,
  BranchProfileService,
  BranchProfileUpdateInput,
} from "../src/services/branches/profile.js";
import type {
  OrganizationSettingsRecord,
  OrganizationSettingsService,
  OrganizationSettingsUpdateInput,
} from "../src/services/settings/organization.js";
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

function orgRecord(overrides: Partial<OrganizationSettingsRecord> = {}): OrganizationSettingsRecord {
  return {
    companyName: "Telepizza",
    phone: "0304-1110495",
    email: null,
    address: null,
    updatedAt: "2026-07-29T12:00:00.000Z",
    updatedBy: null,
    ...overrides,
  };
}

function branchRecord(overrides: Partial<BranchProfileRecord> = {}): BranchProfileRecord {
  return {
    id: RO_BRANCH,
    branchCode: "royal-orchard",
    name: "Royal Orchard Branch",
    city: "Multan",
    area: "Musa Wala",
    address: "Royal Orchard Main Business Plaza",
    phone: "0304-1110495",
    email: null,
    status: "operating",
    timezone: "Asia/Karachi",
    opensAt: "10:00",
    closesAt: "02:30",
    hoursDaily: "10:00 - 02:30",
    deliveryRadiusKm: 5,
    updatedAt: "2026-07-29T12:00:00.000Z",
    ...overrides,
  };
}

function mockOrgService(
  store: { current: OrganizationSettingsRecord },
): OrganizationSettingsService {
  return {
    async get() {
      return store.current;
    },
    async update(_actor, input: OrganizationSettingsUpdateInput) {
      store.current = {
        ...store.current,
        ...input,
        companyName: input.companyName ?? store.current.companyName,
        phone: input.phone !== undefined ? input.phone : store.current.phone,
        email: input.email !== undefined ? input.email : store.current.email,
        address: input.address !== undefined ? input.address : store.current.address,
        updatedAt: "2026-07-29T13:00:00.000Z",
        updatedBy: "user-founder",
      };
      return store.current;
    },
  };
}

function mockBranchService(store: { current: BranchProfileRecord }): BranchProfileService {
  return {
    async get(_scope, branchId) {
      if (branchId !== store.current.id) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      return store.current;
    },
    async update(_actor, branchId, input: BranchProfileUpdateInput) {
      if (branchId !== store.current.id) {
        throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
      }
      store.current = {
        ...store.current,
        phone: input.phone !== undefined ? input.phone : store.current.phone,
        email: input.email !== undefined ? input.email : store.current.email,
        address: input.address ?? store.current.address,
        opensAt: input.opensAt !== undefined ? input.opensAt : store.current.opensAt,
        closesAt: input.closesAt !== undefined ? input.closesAt : store.current.closesAt,
        deliveryRadiusKm:
          input.deliveryRadiusKm !== undefined ? input.deliveryRadiusKm : store.current.deliveryRadiusKm,
        hoursDaily:
          input.opensAt && input.closesAt
            ? `${input.opensAt} - ${input.closesAt}`
            : store.current.hoursDaily,
        updatedAt: "2026-07-29T13:00:00.000Z",
      };
      return store.current;
    },
  };
}

describe("Phase 2 organization + branch settings APIs", () => {
  it("GET/PUT /admin/settings/organization with admin.access", async () => {
    const store = { current: orgRecord() };
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(
        principal({ permissions: ["admin.access"], roles: ["branch-manager"], isSuperAdmin: false }),
      ),
      organizationSettings: mockOrgService(store),
    });

    const getRes = await request(app)
      .get("/api/v1/admin/settings/organization")
      .set("Authorization", "Bearer tok");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.companyName).toBe("Telepizza");

    const putRes = await request(app)
      .put("/api/v1/admin/settings/organization")
      .set("Authorization", "Bearer tok")
      .send({ companyName: "Telepizza Multan", phone: "0300-0000000", email: "hello@telepizza.pk" });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.companyName).toBe("Telepizza Multan");
    expect(putRes.body.data.email).toBe("hello@telepizza.pk");
  });

  it("rejects organization settings without admin.access", async () => {
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
      organizationSettings: mockOrgService({ current: orgRecord() }),
    });

    const res = await request(app)
      .get("/api/v1/admin/settings/organization")
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("GET/PUT /admin/branches/:id with branch.manage", async () => {
    const store = { current: branchRecord() };
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
      branchProfile: mockBranchService(store),
    });

    const getRes = await request(app)
      .get(`/api/v1/admin/branches/${RO_BRANCH}`)
      .set("Authorization", "Bearer tok");
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.branchCode).toBe("royal-orchard");

    const putRes = await request(app)
      .put(`/api/v1/admin/branches/${RO_BRANCH}`)
      .set("Authorization", "Bearer tok")
      .send({
        phone: "0301-9999999",
        opensAt: "11:00",
        closesAt: "01:00",
        deliveryRadiusKm: 7.5,
      });
    expect(putRes.status).toBe(200);
    expect(putRes.body.data.phone).toBe("0301-9999999");
    expect(putRes.body.data.opensAt).toBe("11:00");
    expect(putRes.body.data.deliveryRadiusKm).toBe(7.5);
  });

  it("rejects invalid opensAt on branch profile PUT", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-founder", "founder@example.com"),
      authProfileRepository: authRepo(principal()),
      branchProfile: mockBranchService({ current: branchRecord() }),
    });

    const res = await request(app)
      .put(`/api/v1/admin/branches/${RO_BRANCH}`)
      .set("Authorization", "Bearer tok")
      .send({ opensAt: "10 AM" });
    expect(res.status).toBe(400);
  });
});
