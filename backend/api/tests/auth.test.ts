import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { OrdersDataSource } from "../src/services/orders/types.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const catalogDataSource: CatalogDataSource = {
  async listBranches() {
    return [];
  },
  async getMenuCatalog() {
    return { categories: [], items: [], skus: [], toppings: [] };
  },
};

const ordersDataSource: OrdersDataSource = {
  async quoteOrder() {
    throw new Error("not used");
  },
  async createOrder() {
    throw new Error("not used");
  },
  async getOrderTracking() {
    return null;
  },
  async getOrder() {
    return null;
  },
  async cancelOrder() {
    throw new Error("not used");
  },
};

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

describe("GET /api/v1/auth/me", () => {
  it("rejects missing bearer token with 401", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: null };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("should not load principal without auth");
      },
      async getMe() {
        throw new Error("should not load profile without auth");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects invalid bearer token with 401", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: null, errorMessage: "invalid" };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("should not load principal for invalid token");
      },
      async getMe() {
        throw new Error("should not load profile for invalid token");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer bad-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns enriched principal fields for a valid customer", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser(accessToken: string) {
        if (accessToken !== "valid-access-token") {
          return { user: null };
        }
        return { user: mockUser("auth-user-1", "customer@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: {
            id: "profile-1",
            fullName: "Test Customer",
            phone: null,
          },
          roles: ["customer"],
          permissions: [],
          branchIds: [],
          isSuperAdmin: false,
          status: "active",
          profileReady: true,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-access-token")
      .set("x-telepizza-role", "super-admin")
      .set("x-telepizza-branch-id", "branch-hijack");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.data).toEqual({
      authUserId: "auth-user-1",
      email: "customer@example.com",
      profile: {
        id: "profile-1",
        fullName: "Test Customer",
        phone: null,
      },
      roles: ["customer"],
      permissions: [],
      branchIds: [],
      organizationIds: [],
      ownedOrganizationIds: [],
      isPlatformSuperAdmin: false,
      isSuperAdmin: false,
    });
    expect(response.body.meta.profileReady).toBe(true);
    expect(response.body.meta.deprecatedRoleHeaderIgnored).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|service_role|secret|invite/i);
    expect(response.body.data.permissions).not.toEqual(
      expect.arrayContaining([
        "menu.update",
        "staff.create",
        "staff.assign_role",
        "reports.read",
        "payment.manage",
      ]),
    );
  });

  it("returns branch-scoped staff principal fields", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-staff", "manager@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: {
            id: "staff-1",
            fullName: "Branch Manager",
            phone: null,
          },
          roles: ["branch-manager"],
          permissions: ["menu.write", "order.manage"],
          branchIds: ["branch-a"],
          isSuperAdmin: false,
          status: "active",
          profileReady: true,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer staff-token");

    expect(response.status).toBe(200);
    expect(response.body.data.branchIds).toEqual(["branch-a"]);
    expect(response.body.data.isSuperAdmin).toBe(false);
    expect(response.body.data.permissions).toContain("menu.write");
  });

  it("returns super-admin principal fields", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-sa", "admin@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: {
            id: "sa-1",
            fullName: "Super Admin",
            phone: null,
          },
          roles: ["super-admin"],
          permissions: ["admin.access", "menu.write"],
          branchIds: [],
          isSuperAdmin: true,
          status: "active",
          profileReady: true,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer sa-token");

    expect(response.status).toBe(200);
    expect(response.body.data.isSuperAdmin).toBe(true);
    expect(response.body.data.roles).toEqual(["super-admin"]);
  });

  it("handles profile-not-ready safely", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-user-2", "pending@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: null,
          roles: [],
          permissions: [],
          branchIds: [],
          isSuperAdmin: false,
          status: null,
          profileReady: false,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer pending-token");

    expect(response.status).toBe(200);
    expect(response.body.data.authUserId).toBe("auth-user-2");
    expect(response.body.data.profile).toBeNull();
    expect(response.body.data.roles).toEqual([]);
    expect(response.body.data.permissions).toEqual([]);
    expect(response.body.data.branchIds).toEqual([]);
    expect(response.body.data.isSuperAdmin).toBe(false);
    expect(response.body.meta.profileReady).toBe(false);
  });

  it("denies suspended users on /me with USER_ACCESS_DISABLED", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-suspended", "suspended@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: { id: "p1", fullName: "Suspended", phone: null },
          roles: ["customer"],
          permissions: [],
          branchIds: [],
          isSuperAdmin: false,
          status: "suspended",
          profileReady: true,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer suspended-token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_ACCESS_DISABLED");
  });

  it("denies inactive users on /me with USER_ACCESS_DISABLED", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-inactive", "inactive@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: { id: "p2", fullName: "Inactive", phone: null },
          roles: ["customer"],
          permissions: [],
          branchIds: [],
          isSuperAdmin: false,
          status: "inactive",
          profileReady: true,
        };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer inactive-token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_ACCESS_DISABLED");
  });

  it("returns safe 503 when profile load throws a vendor-style error", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-user-3", "ready@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error("unused");
      },
      async getMe() {
        throw new Error('PostgREST PGRST116: relation "users" timeout / JWT secret leaked-should-not-appear');
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer still-valid-token")
      .set("x-telepizza-role", "super-admin");

    expect(response.status).toBe(503);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe("AUTH_PROFILE_TEMPORARILY_UNAVAILABLE");
    expect(response.body.error.message).toBe(
      "Your profile is temporarily unavailable. Please try again.",
    );
    expect(JSON.stringify(response.body)).not.toMatch(/PGRST|PostgREST|timeout|secret|JWT/i);
    expect(response.body.error.code).not.toBe("UNAUTHORIZED");
  });

  it("keeps deprecated login stub as non-implemented", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "customer@example.com",
      password: "password123",
    });

    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe("NOT_IMPLEMENTED");
  });
});
