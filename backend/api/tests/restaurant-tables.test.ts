import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { RestaurantTablesDataSource, SafeRestaurantTable } from "../src/services/tables/management.js";
import {
  generateSecureQrToken,
  hashQrToken,
  type ValidatedRestaurantTable,
} from "../src/services/tables/qr.js";
import type { QrTokenValidator } from "../src/services/tables/qr.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const B1 = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";
const B2 = "522dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

function principal(over: Partial<AuthPrincipal> & { authUserId: string; userId: string }): AuthPrincipal {
  return {
    email: `${over.userId}@example.com`,
    userType: "staff",
    status: "active",
    roles: [],
    permissions: [],
    branchIds: [],
    isSuperAdmin: false,
    ...over,
  };
}

const PRINCIPALS: Record<string, AuthPrincipal> = {
  customer: principal({ authUserId: "a-cust", userId: "u-cust", userType: "customer", roles: ["customer"] }),
  rider: principal({
    authUserId: "a-rider",
    userId: "u-rider",
    roles: ["rider"],
    permissions: ["order.read", "delivery.read"],
    branchIds: [B1],
  }),
  bm: principal({
    authUserId: "a-bm",
    userId: "u-bm",
    roles: ["branch-manager"],
    permissions: ["branch.read", "branch.manage", "order.manage"],
    branchIds: [B1],
  }),
  cashier: principal({
    authUserId: "a-cashier",
    userId: "u-cashier",
    roles: ["cashier"],
    permissions: ["order.read", "order.manage"],
    branchIds: [B1],
  }),
  superadmin: principal({ authUserId: "a-sa", userId: "u-sa", roles: ["super-admin"], isSuperAdmin: true }),
};

function mockUser(id: string): User {
  return {
    id,
    email: `${id}@example.com`,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

const verifier: AuthTokenVerifier = {
  async getUser(token) {
    const known = Object.values(PRINCIPALS).some((p) => p.authUserId === token);
    return known ? { user: mockUser(token) } : { user: null, errorMessage: "bad" };
  },
};

const authProfileRepository = {
  async resolvePrincipal(authUserId: string) {
    return Object.values(PRINCIPALS).find((p) => p.authUserId === authUserId) ?? null;
  },
  async getMe() {
    throw new Error("unused");
  },
} as unknown as AuthPrincipalRepository;

function safeTable(over: Partial<SafeRestaurantTable> = {}): SafeRestaurantTable {
  return {
    id: "table-1",
    branchId: B1,
    tableNumber: "12",
    displayName: "Patio 12",
    capacity: 4,
    floorOrZone: "patio",
    status: "available",
    qrVersion: 1,
    qrIssued: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function buildApp(tables: Partial<RestaurantTablesDataSource> = {}) {
  const restaurantTables: RestaurantTablesDataSource = {
    listTables: vi.fn(async () => ({
      tables: [safeTable()],
      pagination: { limit: 50, offset: 0, total: 1, returned: 1 },
    })),
    getTable: vi.fn(async () => safeTable()),
    createTable: vi.fn(async () => ({
      table: safeTable(),
      rawQrToken: "raw-once-token",
    })),
    ...tables,
  };

  const qrTokenValidator: QrTokenValidator = {
    validateQrToken: vi.fn(async () => null),
  };

  const { app } = createApp(readyEnv, {
    authTokenVerifier: verifier,
    authProfileRepository,
    restaurantTables,
    qrTokenValidator,
  });
  return { app, restaurantTables, qrTokenValidator };
}

const bearer = (persona: keyof typeof PRINCIPALS) => `Bearer ${PRINCIPALS[persona].authUserId}`;

describe("QR token helpers", () => {
  it("generateSecureQrToken returns raw once and SHA-256 hash", () => {
    const { rawToken, tokenHash } = generateSecureQrToken();
    expect(rawToken.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).toBe(hashQrToken(rawToken));
    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toBe(createHash("sha256").update(rawToken, "utf8").digest("hex"));
  });

  it("hashQrToken is deterministic and never equals raw", () => {
    const { rawToken, tokenHash } = generateSecureQrToken();
    expect(hashQrToken(rawToken)).toBe(tokenHash);
    expect(hashQrToken(rawToken)).not.toBe(rawToken);
  });

  it("distinct tokens produce distinct hashes", () => {
    const a = generateSecureQrToken();
    const b = generateSecureQrToken();
    expect(a.rawToken).not.toBe(b.rawToken);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });
});

describe("admin/tables authorization & QR secrecy", () => {
  it("401 without bearer", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/tables");
    expect(res.status).toBe(401);
  });

  it("customer denied (no branch.manage)", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/tables").set("Authorization", bearer("customer"));
    expect(res.status).toBe(403);
  });

  it("cashier denied (order.manage only)", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/tables").set("Authorization", bearer("cashier"));
    expect(res.status).toBe(403);
  });

  it("rider denied", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/v1/admin/tables").set("Authorization", bearer("rider"));
    expect(res.status).toBe(403);
  });

  it("branch manager lists with principal branch scope", async () => {
    const { app, restaurantTables } = buildApp();
    const res = await request(app)
      .get("/api/v1/admin/tables")
      .set("Authorization", bearer("bm"))
      .set("x-telepizza-branch-id", B2);
    expect(res.status).toBe(200);
    const scope = (restaurantTables.listTables as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.branchIds).toEqual([B1]);
    expect(JSON.stringify(res.body)).not.toMatch(/qr_token_hash|tokenHash/i);
    expect(res.body.data[0].qrIssued).toBe(true);
  });

  it("super-admin can list", async () => {
    const { app, restaurantTables } = buildApp();
    const res = await request(app).get("/api/v1/admin/tables").set("Authorization", bearer("superadmin"));
    expect(res.status).toBe(200);
    const scope = (restaurantTables.listTables as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(scope.isSuperAdmin).toBe(true);
  });

  it("detail never exposes qr_token_hash", async () => {
    const { app } = buildApp({
      getTable: vi.fn(async () => safeTable({ id: "t-detail" })),
    });
    const res = await request(app).get("/api/v1/admin/tables/t-detail").set("Authorization", bearer("bm"));
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty("qr_token_hash");
    expect(res.body.data).not.toHaveProperty("qrTokenHash");
    expect(JSON.stringify(res.body)).not.toContain("qr_token_hash");
  });

  it("create returns rawQrToken once and never returns hash", async () => {
    const { app } = buildApp();
    const res = await request(app)
      .post("/api/v1/admin/tables")
      .set("Authorization", bearer("bm"))
      .send({ branchId: B1, tableNumber: "A1", displayName: "Booth A1" });
    expect(res.status).toBe(201);
    expect(res.body.data.rawQrToken).toBe("raw-once-token");
    expect(res.body.data).not.toHaveProperty("qr_token_hash");
    expect(JSON.stringify(res.body)).not.toMatch(/qr_token_hash/);
  });
});

describe("validateQrToken contract (stubbed validator)", () => {
  it("safe miss returns null without throwing", async () => {
    const validated: ValidatedRestaurantTable = {
      id: "t1",
      branchId: B1,
      tableNumber: "1",
      displayName: null,
      capacity: null,
      floorOrZone: null,
      status: "available",
      qrVersion: 1,
      isActive: true,
    };
    const qrTokenValidator: QrTokenValidator = {
      validateQrToken: vi.fn(async (raw) => (raw === "good-token" ? validated : null)),
    };
    expect(await qrTokenValidator.validateQrToken("good-token")).toEqual(validated);
    expect(await qrTokenValidator.validateQrToken("bad-token")).toBeNull();
    expect(await qrTokenValidator.validateQrToken("")).toBeNull();
  });
});
