import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type {
  StaffInviteRepository,
  StaffInviteRecord,
} from "../src/services/staff/invites.js";
import {
  generateInviteToken,
  hashInviteToken,
  resolveExpiryHours,
  buildInviteUrl,
  sanitizeIp,
  sanitizeUserAgent,
  isInviteableRoleCode,
} from "../src/services/staff/invites.js";
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

function inviteRecord(overrides: Partial<StaffInviteRecord> = {}): StaffInviteRecord {
  return {
    id: "invite-1",
    email: "cashier@example.com",
    fullName: "Ali Cashier",
    phone: null,
    roleId: "role-cashier",
    roleCode: "cashier",
    branchId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f",
    status: "pending",
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    invitedBy: "user-sa",
    acceptedUserId: null,
    sendCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function unusedRepo(overrides: Partial<StaffInviteRepository> = {}): StaffInviteRepository {
  return {
    async createInvite() {
      throw new Error("unused");
    },
    async listInvites() {
      return [];
    },
    async getInvite() {
      return null;
    },
    async sendInvite() {
      throw new Error("unused");
    },
    async resendInvite() {
      throw new Error("unused");
    },
    async revokeInvite() {
      throw new Error("unused");
    },
    async previewInvite() {
      throw new Error("unused");
    },
    async acceptInvite() {
      throw new Error("unused");
    },
    ...overrides,
  };
}

describe("staff invite helpers", () => {
  it("hashes tokens deterministically and builds accept URLs", () => {
    const { rawToken, tokenHash } = generateInviteToken();
    expect(tokenHash).toBe(hashInviteToken(rawToken));
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(buildInviteUrl("http://localhost:3000/", rawToken)).toContain("/staff/accept?token=");
    expect(resolveExpiryHours(72)).toBe(72);
    expect(() => resolveExpiryHours(999)).toThrow();
    expect(() => resolveExpiryHours(0)).toThrow();
  });

  it("sanitizes audit ip and user-agent", () => {
    expect(sanitizeIp(" 1.2.3.4 ")).toBe("1.2.3.4");
    expect(sanitizeIp("bad\nip")).toBeNull();
    expect(sanitizeUserAgent("Mozilla/5.0\x00evil")).toBe("Mozilla/5.0 evil");
    expect(sanitizeUserAgent("x".repeat(500))?.length).toBe(300);
  });

  it("allows only locked inviteable roles", () => {
    expect(isInviteableRoleCode("cashier")).toBe(true);
    expect(isInviteableRoleCode("branch-manager")).toBe(true);
    expect(isInviteableRoleCode("kitchen")).toBe(true);
    expect(isInviteableRoleCode("rider")).toBe(true);
    expect(isInviteableRoleCode("customer-support")).toBe(true);
    expect(isInviteableRoleCode("super-admin")).toBe(false);
    expect(isInviteableRoleCode("customer")).toBe(false);
  });
});

describe("admin staff invites", () => {
  const superAdminVerifier: AuthTokenVerifier = {
    async getUser(token) {
      if (token !== "sa-token") return { user: null };
      return { user: mockUser("auth-sa", "sa@example.com") };
    },
  };

  const customerVerifier: AuthTokenVerifier = {
    async getUser(token) {
      if (token !== "customer-token") return { user: null };
      return { user: mockUser("auth-customer", "customer@example.com") };
    },
  };

  const branchManagerVerifier: AuthTokenVerifier = {
    async getUser(token) {
      if (token !== "bm-token") return { user: null };
      return { user: mockUser("auth-bm", "bm@example.com") };
    },
  };

  const superAdminRepo: AuthPrincipalRepository = {
    async resolvePrincipal() {
      return {
        authUserId: "auth-sa",
        userId: "user-sa",
        email: "sa@example.com",
        userType: "admin",
        status: "active",
        roles: ["super-admin"],
        permissions: ["staff.create", "staff.assign_role", "staff.read"],
        branchIds: [],
        isSuperAdmin: true,
      };
    },
    async getMe() {
      throw new Error("unused");
    },
  };

  const customerRepo: AuthPrincipalRepository = {
    async resolvePrincipal() {
      return {
        authUserId: "auth-customer",
        userId: "user-customer",
        email: "customer@example.com",
        userType: "customer",
        status: "active",
        roles: ["customer"],
        permissions: [],
        branchIds: [],
        isSuperAdmin: false,
      };
    },
    async getMe() {
      throw new Error("unused");
    },
  };

  const branchManagerRepo: AuthPrincipalRepository = {
    async resolvePrincipal() {
      return {
        authUserId: "auth-bm",
        userId: "user-bm",
        email: "bm@example.com",
        userType: "staff",
        status: "active",
        roles: ["branch-manager"],
        permissions: ["staff.read", "order.read", "order.update"],
        branchIds: ["411dbfff-0db2-49b8-bbe9-08b0ffd76d3f"],
        isSuperAdmin: false,
      };
    },
    async getMe() {
      throw new Error("unused");
    },
  };

  it("allows super-admin to create invites and returns inviteUrl once without raw token", async () => {
    const staffInviteRepository = unusedRepo({
      async createInvite() {
        return {
          invite: inviteRecord(),
          inviteUrl: "http://localhost:3000/staff/accept?token=abc",
        };
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: superAdminVerifier,
      authProfileRepository: superAdminRepo,
      staffInviteRepository,
    });

    const response = await request(app)
      .post("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer sa-token")
      .send({
        email: "cashier@example.com",
        fullName: "Ali Cashier",
        roleCode: "cashier",
        branchId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.roleCode).toBe("cashier");
    expect(response.body.data.inviteUrl).toContain("/staff/accept");
    expect(response.body.data.token).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/token_hash|service_role/i);
  });

  it("rejects customer and spoofed role header on invite create", async () => {
    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: customerVerifier,
      authProfileRepository: customerRepo,
      staffInviteRepository: unusedRepo(),
    });

    const response = await request(app)
      .post("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer customer-token")
      .set("x-telepizza-role", "super-admin")
      .send({
        email: "cashier@example.com",
        fullName: "Ali Cashier",
        roleCode: "cashier",
        branchId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f",
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects branch-manager list and create even with staff.read", async () => {
    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: branchManagerVerifier,
      authProfileRepository: branchManagerRepo,
      staffInviteRepository: unusedRepo({
        async createInvite() {
          throw new Error("should not create");
        },
        async listInvites() {
          throw new Error("should not list");
        },
      }),
    });

    const create = await request(app)
      .post("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer bm-token")
      .set("x-telepizza-role", "super-admin")
      .send({
        email: "cashier@example.com",
        fullName: "Ali Cashier",
        roleCode: "cashier",
        branchId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f",
      });
    expect(create.status).toBe(403);

    const list = await request(app)
      .get("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer bm-token")
      .set("x-telepizza-role", "super-admin");
    expect(list.status).toBe(403);
  });

  it("requires branchId on create", async () => {
    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: superAdminVerifier,
      authProfileRepository: superAdminRepo,
      staffInviteRepository: unusedRepo(),
    });

    const response = await request(app)
      .post("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer sa-token")
      .send({
        email: "cashier@example.com",
        fullName: "Ali Cashier",
        roleCode: "cashier",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET responses never include token or inviteUrl", async () => {
    const staffInviteRepository = unusedRepo({
      async listInvites() {
        return [inviteRecord()];
      },
      async getInvite() {
        return inviteRecord();
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: superAdminVerifier,
      authProfileRepository: superAdminRepo,
      staffInviteRepository,
    });

    const list = await request(app)
      .get("/api/v1/admin/staff/invites")
      .set("Authorization", "Bearer sa-token");
    expect(list.status).toBe(200);
    expect(list.body.data[0].token).toBeUndefined();
    expect(list.body.data[0].inviteUrl).toBeUndefined();
    expect(JSON.stringify(list.body)).not.toMatch(/token_hash/i);

    const one = await request(app)
      .get("/api/v1/admin/staff/invites/invite-1")
      .set("Authorization", "Bearer sa-token");
    expect(one.status).toBe(200);
    expect(one.body.data.token).toBeUndefined();
    expect(one.body.data.inviteUrl).toBeUndefined();
  });

  it("previews invite for accept UI without secrets", async () => {
    const staffInviteRepository = unusedRepo({
      async previewInvite() {
        return {
          email: "cashier@example.com",
          fullName: "Ali Cashier",
          roleCode: "cashier",
          branchId: "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f",
          branchName: "Royal Orchard Branch",
          status: "pending" as const,
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        };
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      staffInviteRepository,
    });

    const response = await request(app)
      .get("/api/v1/auth/staff/invites/preview")
      .query({ token: "a".repeat(40) });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("cashier@example.com");
    expect(response.body.data.roleCode).toBe("cashier");
    expect(response.body.data.branchName).toBe("Royal Orchard Branch");
    expect(response.body.data.token).toBeUndefined();
    expect(response.body.data.inviteUrl).toBeUndefined();
  });

  it("accepts invite without JWT privilege and ignores role spoof headers/body", async () => {
    const staffInviteRepository = unusedRepo({
      async acceptInvite(input) {
        expect(input.token.length).toBeGreaterThan(10);
        expect((input as { roleCode?: string }).roleCode).toBeUndefined();
        return {
          authUserId: "auth-new-staff",
          email: "cashier@example.com",
          profileReady: true,
        };
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      staffInviteRepository,
    });

    const response = await request(app)
      .post("/api/v1/auth/staff/invites/accept")
      .set("x-telepizza-role", "super-admin")
      .set("x-telepizza-branch-id", "hijack")
      .send({
        token: "a".repeat(40),
        password: "password123",
        fullName: "Ali Cashier",
        roleCode: "super-admin",
        branchId: "should-be-ignored",
        email: "hijack@example.com",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe("cashier@example.com");
    expect(response.body.meta.next).toBe("sign_in_with_email_password");
  });

  it("revokes pending invites for super-admin", async () => {
    const staffInviteRepository = unusedRepo({
      async revokeInvite() {
        return inviteRecord({ status: "revoked", sendCount: 1 });
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: superAdminVerifier,
      authProfileRepository: superAdminRepo,
      staffInviteRepository,
    });

    const response = await request(app)
      .post("/api/v1/admin/staff/invites/invite-1/revoke")
      .set("Authorization", "Bearer sa-token");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("revoked");
    expect(response.body.data.token).toBeUndefined();
    expect(response.body.data.inviteUrl).toBeUndefined();
  });

  it("surfaces INVITE_ACCOUNT_CONFLICT from accept repository", async () => {
    const { ApiError } = await import("../src/common/http.js");
    const staffInviteRepository = unusedRepo({
      async acceptInvite() {
        throw new ApiError(
          409,
          "INVITE_ACCOUNT_CONFLICT",
          "An account already exists for this email. Linking requires a future approved flow.",
        );
      },
    });

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      staffInviteRepository,
    });

    const response = await request(app)
      .post("/api/v1/auth/staff/invites/accept")
      .send({
        token: "a".repeat(40),
        password: "password123",
      });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVITE_ACCOUNT_CONFLICT");
  });
});
