import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminConfigurationRouter } from "../../backend/api/src/modules/admin/configuration.js";
import type { AuthPrincipal } from "../../backend/api/src/services/auth/principal.js";
import type { AuthPrincipalRepository } from "../../backend/api/src/services/auth/supabase.js";
import type { AuthTokenVerifier } from "../../backend/api/src/middleware/auth.js";

const READY_ENV = {
  port: 4000,
  corsOrigin: "http://localhost:3000",
  jwtSecret: "super-secret-token-123",
  supabaseUrl: "https://example.supabase.co",
  supabaseAnonKey: "anon-key",
  supabaseServiceRoleKey: "service-role-key",
};

const BRANCH_ID = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";
const FOREIGN_BRANCH = "00000000-0000-4000-8000-000000000099";

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    authUserId: "auth-founder",
    userId: "user-founder",
    email: "founder@example.com",
    userType: "staff",
    status: "active",
    roles: ["super-admin"],
    permissions: ["admin.access"],
    branchIds: [],
    isSuperAdmin: true,
    ...overrides,
  };
}

function authRepo(user: AuthPrincipal): AuthPrincipalRepository {
  return {
    async resolvePrincipal() {
      return user;
    },
    async getMe() {
      throw new Error("unused");
    },
  };
}

function verifier(): AuthTokenVerifier {
  return {
    async getUser() {
      return { user: { id: "auth-founder", email: "founder@example.com" } } as any };
  };
}

const fromMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ from: fromMock })),
}));

function buildQuery(table: string, stateOverrides: any = {}) {
  const conditions: Array<[string, unknown]> = [];
  const evaluate = () => {
    // default behaviors for tables used in router
    if (table === "configuration_schemas") {
      const key = conditions.find(([name]) => name === "key")?.[1];
      if (!key || key === "delivery_radius") {
        return {
          data: [
            {
              id: "schema-delivery-radius",
              scope_type: "branch",
              key: "delivery_radius",
              label: "Delivery radius",
              data_type: "number",
              default_value: 5,
              validation_rules: null,
              is_required: false,
              requires_approval: false,
              created_at: "2026-01-01T00:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    }

    if (table === "configuration_versions") {
      const scopeType = conditions.find(([name]) => name === "scope_type")?.[1];
      const scopeId = conditions.find(([name]) => name === "scope_id")?.[1];
      // branch override
      if (scopeType === "branch" && scopeId === BRANCH_ID) {
        return { data: [{ id: "version-branch", value: 10 }], error: null };
      }
      // organization default
      if (scopeType === "organization") {
        return { data: [{ id: "version-org", value: 7 }], error: null };
      }
      return { data: [], error: null };
    }

    if (table === "organization_settings") {
      return { data: [{ id: "org-1" }], error: null };
    }

    return { data: [], error: null };
  };

  const query = {
    eq(key: string, value: unknown) {
      conditions.push([key, value]);
      return query;
    },
    is(key: string, value: unknown) {
      conditions.push([key, value]);
      return query;
    },
    order() {
      return query;
    },
    limit: async () => evaluate(),
    then(resolve: (value: object) => unknown, reject?: (reason?: unknown) => unknown) {
      try {
        return Promise.resolve(resolve(evaluate()));
      } catch (error) {
        return reject ? Promise.reject(reject(error)) : Promise.reject(error);
      }
    },
  };

  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  fromMock.mockImplementation((table: string) => ({ select: buildQuery.bind(null, table) }));
});

function createTestApp(user: AuthPrincipal) {
  const app = express();
  app.use(
    "/api/v1/admin",
    createAdminConfigurationRouter({
      authTokenVerifier: verifier(),
      authProfileRepository: authRepo(user),
      envStatus: { isReady: true, issues: [], config: READY_ENV } as never,
    }),
  );
  return app;
}

describe("admin configuration router - behavioral", () => {
  it("rejects unauthenticated requests", async () => {
    const app = createTestApp(principal());
    const res = await request(app).get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`);
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized permission", async () => {
    const app = createTestApp(principal({ permissions: ["order.manage"], isSuperAdmin: false }));
    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("rejects invalid branch id", async () => {
    const app = createTestApp(principal());
    const res = await request(app)
      .get(`/api/v1/admin/branches/not-a-uuid/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(400);
  });

  it("rejects cross-organization / branch access when not in principal.branchIds", async () => {
    const app = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: false, branchIds: ["other"] }));
    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });

  it("returns branch override precedence", async () => {
    const app = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: true, branchIds: [BRANCH_ID] }));
    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("branch");
    expect(res.body.data.value).toBe(10);
  });

  it("returns organization default when branch missing", async () => {
    // override fromMock for this spec: no branch versions
    fromMock.mockImplementation((table: string) => {
      if (table === "configuration_schemas") return { select: buildQuery.bind(null, table) };
      if (table === "configuration_versions") {
        const state = { branchRequested: false, organizationRequested: false };
        return {
          select: () => ({
            eq(key: string, value: unknown) {
              if (key === "scope_type" && value === "branch") state.branchRequested = true;
              if (key === "scope_type" && value === "organization") state.organizationRequested = true;
              return this;
            },
            is() {
              return this;
            },
            order() {
              return {
                limit: async () => {
                  if (state.branchRequested) return { data: [], error: null };
                  if (state.organizationRequested) return { data: [{ id: "version-org", value: 7 }], error: null };
                  return { data: [], error: null };
                },
              };
            },
          }),
        };
      }
      if (table === "organization_settings") return { select: () => ({ limit: async () => ({ data: [{ id: "org-1" }], error: null }) }) };
      return { select: buildQuery.bind(null, table) };
    });

    const app = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: true }));
    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("organization");
    expect(res.body.data.value).toBe(7);
  });

  it("returns default when neither branch nor org present", async () => {
    fromMock.mockImplementation((table: string) => ({ select: () => ({ eq() { return this; }, limit: async () => ({ data: [], error: null }) }) }));
    const app = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: true }));
    const res = await request(app)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/delivery_radius/effective`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("default");
    expect(res.body.data.value).toBeDefined();
  });

  it("redacts secret values for non-super-admins and reveals for super-admins", async () => {
    // make schema a secret_ref and branch override present
    fromMock.mockImplementation((table: string) => ({
      select: () => ({
        eq(key: string, value: unknown) {
          return this;
        },
        limit: async () => {
          if (table === "configuration_schemas") {
            return {
              data: [
                { id: "s1", key: "secret_key", data_type: "secret_ref", default_value: "def-secret" },
              ],
              error: null,
            };
          }
          if (table === "configuration_versions") {
            return { data: [{ id: "v1", value: "branch-secret" }], error: null };
          }
          if (table === "organization_settings") return { data: [{ id: "org-1" }], error: null };
          return { data: [], error: null };
        },
      }),
    }));

    const appNon = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: false, branchIds: [BRANCH_ID] }));
    const resNon = await request(appNon)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/secret_key/effective`)
      .set("Authorization", "Bearer tok");
    expect(resNon.status).toBe(200);
    expect(resNon.body.data.value).toBe("<REDACTED>");

    const appSuper = createTestApp(principal({ permissions: ["admin.access"], isSuperAdmin: true, branchIds: [BRANCH_ID] }));
    const resSuper = await request(appSuper)
      .get(`/api/v1/admin/branches/${BRANCH_ID}/configuration/secret_key/effective`)
      .set("Authorization", "Bearer tok");
    expect(resSuper.status).toBe(200);
    expect(resSuper.body.data.value).toBe("branch-secret");
  });
});
