import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  InventoryItemRecord,
  InventoryService,
  StockMovementRecord,
} from "../src/services/inventory/management.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
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

function principal(overrides: Partial<AuthPrincipal> = {}): AuthPrincipal {
  return {
    userId: "user-admin",
    authUserId: "auth-admin",
    email: "admin@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["inventory.manage"],
    branchIds: ["550e8400-e29b-41d4-a716-446655440000"],
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

const item: InventoryItemRecord = {
  id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  branchId: "550e8400-e29b-41d4-a716-446655440000",
  branchCode: "royal-orchard",
  branchName: "Royal Orchard",
  sku: "FLOUR-25",
  name: "Flour 25kg",
  category: "dry",
  unit: "bag",
  currentStock: 10,
  minimumStock: 2,
  reorderLevel: 4,
  costPrice: 4500,
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const movement: StockMovementRecord = {
  id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  inventoryItemId: item.id,
  branchId: item.branchId,
  movementType: "adjustment",
  quantity: 2,
  referenceType: null,
  referenceId: null,
  reason: "Count correction",
  createdBy: "user-admin",
  createdAt: new Date().toISOString(),
  itemName: item.name,
  itemSku: item.sku,
};

const inventory: InventoryService = {
  async listItems() {
    return [item];
  },
  async createItem(_scope, input) {
    return {
      ...item,
      id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
      branchId: input.branchId,
      sku: input.sku,
      name: input.name,
      unit: input.unit ?? "unit",
      currentStock: input.currentStock ?? 0,
    };
  },
  async updateItem(_scope, id, input) {
    return { ...item, id, ...input, name: input.name ?? item.name };
  },
  async createAdjustment(_scope, _actor, input) {
    return {
      item: { ...item, currentStock: item.currentStock + input.quantityDelta },
      movement: { ...movement, quantity: input.quantityDelta, reason: input.reason ?? null },
    };
  },
  async listMovements() {
    return [movement];
  },
};

describe("Inventory admin APIs", () => {
  it("GET /api/v1/admin/inventory/items requires auth", async () => {
    const { app } = createApp(readyEnv, { inventory });
    const res = await request(app).get("/api/v1/admin/inventory/items");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/admin/inventory/items requires inventory.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["pos.access"],
          roles: ["cashier"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/inventory/items")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("lists inventory items for authorized staff", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/inventory/items")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].sku).toBe("FLOUR-25");
  });

  it("creates inventory items", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/inventory/items")
      .set("Authorization", "Bearer token")
      .send({
        branchId: item.branchId,
        sku: "CHEESE-5",
        name: "Mozzarella 5kg",
        unit: "bag",
        currentStock: 3,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe("CHEESE-5");
  });

  it("posts stock adjustments", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/inventory/adjustments")
      .set("Authorization", "Bearer token")
      .send({
        inventoryItemId: item.id,
        quantityDelta: -1,
        reason: "Waste sample",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.movement.quantity).toBe(-1);
  });

  it("lists stock movements", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/inventory/movements")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("allows admin.access without inventory.manage", async () => {
    const { app } = createApp(readyEnv, {
      inventory,
      authTokenVerifier: verifier("auth-sa", "sa@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["admin.access"],
          roles: ["super-admin"],
          isSuperAdmin: true,
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/inventory/items")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
  });
});
