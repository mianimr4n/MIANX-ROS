import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import { errorHandler } from "../src/common/http.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import {
  createAuthorizationHelpers,
  requireAnyPermission,
  requireBranchAccess,
  requirePermission,
  requireSuperAdmin,
} from "../src/middleware/authorization.js";
import type { AuthPrincipal, AuthPrincipalRepository } from "../src/services/auth/supabase.js";
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
  async quoteOrder() {
    throw new Error("not used");
  },
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
    app_metadata: { role: "super-admin" },
    user_metadata: { user_type: "admin", branch_id: "spoof-branch" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

function principal(overrides: Partial<AuthPrincipal>): AuthPrincipal {
  return {
    authUserId: "auth-1",
    userId: "user-1",
    email: "user@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["menu.write"],
    branchIds: ["branch-a"],
    isSuperAdmin: false,
    ...overrides,
  };
}

function createProbeApp(
  verifier: AuthTokenVerifier,
  repository: AuthPrincipalRepository,
) {
  const helpers = createAuthorizationHelpers(verifier, repository);
  const app = express();
  app.use(express.json());

  app.get(
    "/probe/permission",
    helpers.requireAuthenticatedUser,
    requirePermission("menu.write"),
    (_req, res) => res.json({ ok: true, unlocked: true }),
  );

  app.get(
    "/probe/any-permission",
    helpers.requireAuthenticatedUser,
    requireAnyPermission(["menu.write", "order.manage"]),
    (_req, res) => res.json({ ok: true, unlocked: true }),
  );

  app.get(
    "/probe/branch/:branchId",
    helpers.requireAuthenticatedUser,
    requireBranchAccess((req) => req.params.branchId),
    (_req, res) => res.json({ ok: true, unlocked: true }),
  );

  app.get(
    "/probe/super-admin",
    helpers.requireAuthenticatedUser,
    requireSuperAdmin,
    (_req, res) => res.json({ ok: true, unlocked: true }),
  );

  app.use(errorHandler);
  return app;
}

describe("authorization middleware", () => {
  it("ignores spoofed x-telepizza-role for new middleware", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-customer", "customer@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({
          authUserId: "auth-customer",
          userType: "customer",
          roles: ["customer"],
          permissions: [],
          branchIds: [],
          isSuperAdmin: false,
        });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/permission")
      .set("Authorization", "Bearer customer-token")
      .set("x-telepizza-role", "super-admin");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
    expect(response.body.unlocked).toBeUndefined();
  });

  it("ignores spoofed branch header; uses resolver branch only", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-staff", "staff@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({
          branchIds: ["branch-a"],
          permissions: ["menu.write"],
        });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const denied = await request(app)
      .get("/probe/branch/branch-b")
      .set("Authorization", "Bearer staff-token")
      .set("x-telepizza-branch-id", "branch-a")
      .set("x-telepizza-role", "super-admin");

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe("FORBIDDEN");

    const allowed = await request(app)
      .get("/probe/branch/branch-a")
      .set("Authorization", "Bearer staff-token")
      .set("x-telepizza-branch-id", "branch-b");

    expect(allowed.status).toBe(200);
    expect(allowed.body.ok).toBe(true);
  });

  it("denies suspended and inactive principals", async () => {
    for (const status of ["suspended", "inactive"] as const) {
      const verifier: AuthTokenVerifier = {
        async getUser() {
          return { user: mockUser("auth-disabled", "disabled@example.com") };
        },
      };
      const repository: AuthPrincipalRepository = {
        async resolvePrincipal() {
          return principal({ status });
        },
        async getMe() {
          throw new Error("unused");
        },
      };

      const app = createProbeApp(verifier, repository);
      const response = await request(app)
        .get("/probe/permission")
        .set("Authorization", "Bearer token")
        .set("x-telepizza-role", "super-admin");

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("USER_ACCESS_DISABLED");
    }
  });

  it("denies missing profile for protected middleware", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-missing", "missing@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return null;
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/permission")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("USER_ACCESS_DISABLED");
  });

  it("returns safe 503 when principal repository is down", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-outage", "outage@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        throw new Error('PostgREST PGRST503: connection reset / JWT secret leaked');
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/permission")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("AUTH_PROFILE_TEMPORARILY_UNAVAILABLE");
    expect(JSON.stringify(response.body)).not.toMatch(/PGRST|secret|JWT/i);
  });

  it("returns 403 when permission is missing", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-staff", "staff@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({ permissions: ["order.read"] });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/permission")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows requireAnyPermission when one code matches", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-staff", "staff@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({ permissions: ["order.manage"] });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/any-permission")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.unlocked).toBe(true);
  });

  it("allows staff with matching permission", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-staff", "staff@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({ permissions: ["menu.write"] });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/permission")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.unlocked).toBe(true);
  });

  it("allows super-admin to bypass branch checks", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-sa", "sa@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({
          roles: ["super-admin"],
          permissions: [],
          branchIds: [],
          isSuperAdmin: true,
        });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/branch/any-branch")
      .set("Authorization", "Bearer token");

    expect(response.status).toBe(200);
    expect(response.body.unlocked).toBe(true);
  });

  it("requires server-derived super-admin; spoofed JWT metadata is ignored", async () => {
    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("auth-customer", "customer@example.com") };
      },
    };
    const repository: AuthPrincipalRepository = {
      async resolvePrincipal() {
        return principal({
          userType: "customer",
          roles: ["customer"],
          permissions: [],
          isSuperAdmin: false,
        });
      },
      async getMe() {
        throw new Error("unused");
      },
    };

    const app = createProbeApp(verifier, repository);
    const response = await request(app)
      .get("/probe/super-admin")
      .set("Authorization", "Bearer token")
      .set("x-telepizza-role", "super-admin");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("does not unlock real admin stubs via new middleware (legacy header path still 501 after header role)", async () => {
    const { app } = createApp(readyEnv, { catalogDataSource, ordersDataSource });
    const response = await request(app)
      .get("/api/v1/admin/controls")
      .set("x-telepizza-role", "super-admin");

    expect(response.status).toBe(501);
    expect(response.body.error.code).toBe("NOT_IMPLEMENTED");
  });
});
