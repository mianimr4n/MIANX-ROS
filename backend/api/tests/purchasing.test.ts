import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type {
  PurchaseOrderRecord,
  PurchasingService,
  SupplierRecord,
} from "../src/services/purchasing/management.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const BRANCH_ID = "550e8400-e29b-41d4-a716-446655440000";
const SUPPLIER_ID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

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
    permissions: ["purchasing.manage"],
    branchIds: [BRANCH_ID],
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

const supplier: SupplierRecord = {
  id: SUPPLIER_ID,
  branchId: BRANCH_ID,
  branchCode: "royal-orchard",
  branchName: "Royal Orchard",
  name: "Dairy Co",
  contactPerson: "Ayesha",
  phone: "03001112222",
  email: "orders@dairy.example",
  address: "Lahore",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const order: PurchaseOrderRecord = {
  id: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  branchId: BRANCH_ID,
  branchCode: "royal-orchard",
  branchName: "Royal Orchard",
  supplierId: SUPPLIER_ID,
  supplierName: "Dairy Co",
  poNumber: "PO-20260730-1001",
  status: "draft",
  totalAmount: 15000,
  expectedDeliveryDate: "2026-08-05",
  createdBy: "user-admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const purchasing: PurchasingService = {
  async listSuppliers() {
    return [supplier];
  },
  async createSupplier(_scope, input) {
    return {
      ...supplier,
      id: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
      branchId: input.branchId,
      name: input.name,
      contactPerson: input.contactPerson ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
    };
  },
  async listOrders() {
    return [order];
  },
  async createOrder(_scope, _actor, input) {
    return {
      ...order,
      id: "6ba7b813-9dad-11d1-80b4-00c04fd430c8",
      branchId: input.branchId,
      supplierId: input.supplierId,
      totalAmount: input.totalAmount ?? 0,
      expectedDeliveryDate: input.expectedDeliveryDate ?? null,
      status: input.status ?? "draft",
    };
  },
};

describe("Purchasing admin APIs", () => {
  it("GET /api/v1/admin/purchasing/suppliers requires auth", async () => {
    const { app } = createApp(readyEnv, { purchasing });
    const res = await request(app).get("/api/v1/admin/purchasing/suppliers");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/admin/purchasing/suppliers requires purchasing.manage or admin.access", async () => {
    const { app } = createApp(readyEnv, {
      purchasing,
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["pos.access"],
          roles: ["cashier"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/purchasing/suppliers")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("lists suppliers for authorized staff", async () => {
    const { app } = createApp(readyEnv, {
      purchasing,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/purchasing/suppliers")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Dairy Co");
  });

  it("creates a supplier", async () => {
    const { app } = createApp(readyEnv, {
      purchasing,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/purchasing/suppliers")
      .set("Authorization", "Bearer token")
      .send({
        branchId: BRANCH_ID,
        name: "Flour Mills",
        phone: "03003334444",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Flour Mills");
  });

  it("lists and creates purchase orders", async () => {
    const { app } = createApp(readyEnv, {
      purchasing,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const list = await request(app)
      .get("/api/v1/admin/purchasing/orders")
      .set("Authorization", "Bearer token");
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const create = await request(app)
      .post("/api/v1/admin/purchasing/orders")
      .set("Authorization", "Bearer token")
      .send({
        branchId: BRANCH_ID,
        supplierId: SUPPLIER_ID,
        totalAmount: 2500,
        expectedDeliveryDate: "2026-08-10",
      });
    expect(create.status).toBe(201);
    expect(create.body.data.totalAmount).toBe(2500);
  });

  it("allows admin.access without purchasing.manage", async () => {
    const { app } = createApp(readyEnv, {
      purchasing,
      authTokenVerifier: verifier("auth-sa", "sa@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["admin.access"],
          isSuperAdmin: true,
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/purchasing/orders")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
  });
});
