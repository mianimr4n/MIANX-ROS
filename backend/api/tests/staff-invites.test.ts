import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { StaffInviteRepository, StaffInviteRecord } from "../src/services/staff/invites.js";
import {
  generateInviteToken,
  hashInviteToken,
  resolveExpiryHours,
  buildInviteUrl,
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

function inviteRecord(overrides: Partial<StaffInviteRecord> = {}): StaffInviteRecord {
  return {
    id: "invite-1",
    email: "cashier@example.com",
    fullName: "Ali Cashier",
    phone: null,
    roleId: "role-cashier",
    roleCode: "cashier",
    branchId: "branch-a",
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

describe("staff invite helpers", () => {
  it("hashes tokens deterministically and builds accept URLs", () => {
    const { rawToken, tokenHash } = generateInviteToken();
    expect(tokenHash).toBe(hashInviteToken(rawToken));
    expect(buildInviteUrl("http://localhost:3000/", rawToken)).toContain("/staff/accept?token=");
    expect(resolveExpiryHours(72)).toBe(72);
    expect(() => resolveExpiryHours(999)).toThrow();
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

  it("allows super-admin to create invites and returns token once", async () => {
    const staffInviteRepository: StaffInviteRepository = {
      async createInvite() {
        return {
          invite: inviteRecord(),
          inviteUrl: "http://localhost:3000/staff/accept?token=abc",
          rawToken: "abc",
        };
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
      async acceptInvite() {
        throw new Error("unused");
      },
    };

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
    expect(response.body.data.token).toBe("abc");
    expect(response.body.data.inviteUrl).toContain("/staff/accept");
    expect(JSON.stringify(response.body)).not.toMatch(/token_hash|service_role/i);
  });

  it("rejects customer and spoofed role header on invite create", async () => {
    const staffInviteRepository: StaffInviteRepository = {
      async createInvite() {
        throw new Error("should not create");
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
      async acceptInvite() {
        throw new Error("unused");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      authTokenVerifier: customerVerifier,
      authProfileRepository: customerRepo,
      staffInviteRepository,
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

  it("accepts invite without JWT privilege and ignores role spoof headers", async () => {
    const staffInviteRepository: StaffInviteRepository = {
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
      async acceptInvite(input) {
        expect(input.token.length).toBeGreaterThan(10);
        return {
          authUserId: "auth-new-staff",
          email: "cashier@example.com",
          profileReady: true,
        };
      },
    };

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
      });

    expect(response.status).toBe(201);
    expect(response.body.data.email).toBe("cashier@example.com");
    expect(response.body.meta.next).toBe("sign_in_with_email_password");
  });

  it("revokes pending invites for super-admin", async () => {
    const staffInviteRepository: StaffInviteRepository = {
      async createInvite() {
        throw new Error("unused");
      },
      async listInvites() {
        return [];
      },
      async getInvite() {
        return inviteRecord();
      },
      async sendInvite() {
        throw new Error("unused");
      },
      async resendInvite() {
        throw new Error("unused");
      },
      async revokeInvite() {
        return inviteRecord({ status: "revoked", sendCount: 1 });
      },
      async acceptInvite() {
        throw new Error("unused");
      },
    };

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
  });
});
