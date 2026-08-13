import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import { normalizePakistaniMobileE164 } from "../src/services/auth/phone.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { OrdersDataSource } from "../src/services/orders/types.js";
import { ApiError } from "../src/common/http.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
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

describe("Pakistani mobile E.164 normalization", () => {
  it("accepts 03 / +92 / 3XXXXXXXXX forms", () => {
    expect(normalizePakistaniMobileE164("03001234567")).toBe("+923001234567");
    expect(normalizePakistaniMobileE164("+923001234567")).toBe("+923001234567");
    expect(normalizePakistaniMobileE164("3001234567")).toBe("+923001234567");
  });

  it("rejects invalid numbers", () => {
    expect(() => normalizePakistaniMobileE164("0211234567")).toThrow();
    expect(() => normalizePakistaniMobileE164("123")).toThrow();
  });
});

describe("PATCH /api/v1/auth/me/profile", () => {
  it("requires Bearer auth", async () => {
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
      async updateOwnProfile() {
        throw new Error("unused");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: { async getUser() { return { user: null }; } },
      authProfileRepository,
    });

    const response = await request(app).patch("/api/v1/auth/me/profile").send({ fullName: "A" });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects spoofed privilege fields in body", async () => {
    const updateOwnProfile = vi.fn();
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-1", "a@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
      updateOwnProfile,
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .patch("/api/v1/auth/me/profile")
      .set("Authorization", "Bearer token")
      .send({
        fullName: "Safe Name",
        userId: "spoof",
        role: "super-admin",
        authUserId: "other",
        status: "active",
        branchId: "branch-x",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(updateOwnProfile).not.toHaveBeenCalled();
  });

  it("updates fullName and normalized phone for the Bearer principal only", async () => {
    const updateOwnProfile = vi.fn(async (_authUserId: string, _email: string | null, input) => ({
      id: "profile-1",
      fullName: input.fullName ?? "Customer",
      phone: input.phone ?? null,
    }));

    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-customer", "customer@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
      updateOwnProfile,
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .patch("/api/v1/auth/me/profile")
      .set("Authorization", "Bearer good")
      .set("x-telepizza-role", "super-admin")
      .send({ fullName: "Imran", phone: "03001234567" });

    expect(response.status).toBe(200);
    expect(response.body.data.fullName).toBe("Imran");
    expect(response.body.data.phone).toBe("03001234567");
    expect(response.body.meta.phoneVerified).toBe(false);
    expect(updateOwnProfile).toHaveBeenCalledWith(
      "auth-customer",
      "customer@example.com",
      { fullName: "Imran", phone: "03001234567" },
    );
  });

  it("maps duplicate phone safely without enumeration", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-customer", "customer@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
      async updateOwnProfile() {
        throw new ApiError(
          409,
          "PHONE_ALREADY_IN_USE",
          "This phone number cannot be used. Try a different number.",
        );
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .patch("/api/v1/auth/me/profile")
      .set("Authorization", "Bearer good")
      .send({ phone: "+923001112223" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PHONE_ALREADY_IN_USE");
    expect(JSON.stringify(response.body)).not.toMatch(/other|existing user|auth-/i);
  });

  it("rejects suspended users", async () => {
    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-suspended", "s@example.com") };
      },
    };
    const authProfileRepository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
      async updateOwnProfile() {
        throw new ApiError(403, "USER_ACCESS_DISABLED", "Access is disabled for this account.");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier,
      authProfileRepository,
    });

    const response = await request(app)
      .patch("/api/v1/auth/me/profile")
      .set("Authorization", "Bearer good")
      .send({ fullName: "Nope" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_ACCESS_DISABLED");
  });
});
