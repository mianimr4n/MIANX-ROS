import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthProfileRepository } from "../src/services/auth/supabase.js";
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
    return { categories: [], items: [], toppings: [] };
  },
};

const ordersDataSource: OrdersDataSource = {
  async createOrder() {
    throw new Error("not used");
  },
  async getOrderTracking() {
    return null;
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
    const authProfileRepository: AuthProfileRepository = {
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
    const authProfileRepository: AuthProfileRepository = {
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

  it("returns safe profile data for a valid controlled token", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser(accessToken: string) {
        if (accessToken !== "valid-access-token") {
          return { user: null };
        }
        return { user: mockUser("auth-user-1", "customer@example.com") };
      },
    };
    const authProfileRepository: AuthProfileRepository = {
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
      .set("x-telepizza-role", "super-admin");

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
    });
    expect(response.body.meta.deprecatedRoleHeaderIgnored).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/password_hash|service_role|secret/i);
    // Spoofed privileged header must not alter roles from repository
    expect(response.body.data.roles).toEqual(["customer"]);
  });

  it("handles profile-not-ready safely", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-user-2", "pending@example.com") };
      },
    };
    const authProfileRepository: AuthProfileRepository = {
      async getMe(authUserId, email) {
        return {
          authUserId,
          email,
          profile: null,
          roles: [],
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
    expect(response.body.meta.profileReady).toBe(false);
  });

  it("returns safe 503 when profile load throws a vendor-style error", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-user-3", "ready@example.com") };
      },
    };
    const authProfileRepository: AuthProfileRepository = {
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
    // Valid session is not downgraded to UNAUTHORIZED
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
