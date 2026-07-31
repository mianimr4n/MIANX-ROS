import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import request from "supertest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { InventoryService } from "../src/services/inventory/management.js";
import type { InventoryRecipeService, RecipeRecord } from "../src/services/inventory/recipes.js";

const here = dirname(fileURLToPath(import.meta.url));
const migration = readFileSync(
  join(here, "../../../supabase/migrations/20260731180000_rc4_inventory_recipes_cogs.sql"),
  "utf8",
);
const kitchenSrc = readFileSync(join(here, "../src/services/kitchen/tickets.ts"), "utf8");

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

const sampleRecipe: RecipeRecord = {
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  branchId: "550e8400-e29b-41d4-a716-446655440000",
  branchCode: "royal-orchard",
  branchName: "Royal Orchard",
  menuItemId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  menuItemName: "Margherita",
  name: "Margherita dough",
  version: 1,
  status: "draft",
  yieldFactor: 1,
  notes: null,
  createdBy: "user-admin",
  updatedBy: "user-admin",
  activatedAt: null,
  deactivatedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lines: [],
  estimatedCost: null,
  estimatedCostState: "UNAVAILABLE",
  estimatedCostSource: "inventory_items.cost_price (last purchase / standard cost field)",
  estimatedCostAsOf: null,
  estimatedCostFormula: "sum(...)",
};

describe("RC4-9 inventory recipes", () => {
  it("migration defines recipes, consume events, reverse RPC, COGS seam", () => {
    expect(migration).toMatch(/inventory_recipes/);
    expect(migration).toMatch(/inventory_consumption_events/);
    expect(migration).toMatch(/inventory_reverse_kitchen_consumption_atomic/);
    expect(migration).toMatch(/inventory_cogs_events/);
    expect(migration).toMatch(/posting_deferred_reason/);
    expect(migration).toMatch(/kitchen_ticket_set_preparing_atomic/);
  });

  it("order cancel reverses kitchen consumption", () => {
    expect(kitchenSrc).toMatch(/inventory_reverse_kitchen_consumption_atomic/);
  });

  it("rejects unauthenticated and unauthorized recipe list", async () => {
    const inventoryRecipes: InventoryRecipeService = {
      async listRecipes() {
        return [];
      },
      async getRecipe() {
        return sampleRecipe;
      },
      async createRecipe() {
        return sampleRecipe;
      },
      async updateRecipe() {
        return sampleRecipe;
      },
      async activateRecipe() {
        return { ...sampleRecipe, status: "active" };
      },
      async deactivateRecipe() {
        return { ...sampleRecipe, status: "inactive" };
      },
      async duplicateRecipe() {
        return sampleRecipe;
      },
      async listMissingRecipeMenuItems() {
        return [];
      },
    };

    const inventory = {
      async listItems() {
        return [];
      },
      async createItem() {
        throw new Error("unused");
      },
      async updateItem() {
        throw new Error("unused");
      },
      async createAdjustment() {
        throw new Error("unused");
      },
      async listMovements() {
        return [];
      },
    } as unknown as InventoryService;

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
      inventory,
      inventoryRecipes,
    });

    const unauth = await request(app).get("/api/v1/admin/inventory/recipes");
    expect(unauth.status).toBe(401);

    const { app: deniedApp } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-x", "x@example.com"),
      authProfileRepository: authRepo(
        principal({ permissions: ["order.manage"], roles: ["cashier"] }),
      ),
      inventory,
      inventoryRecipes,
    });

    const res = await request(deniedApp)
      .get("/api/v1/admin/inventory/recipes")
      .set("Authorization", "Bearer token");
    expect([401, 403]).toContain(res.status);
  });

  it("lists recipes for inventory.manage principal", async () => {
    const inventoryRecipes: InventoryRecipeService = {
      async listRecipes() {
        return [sampleRecipe];
      },
      async getRecipe() {
        return sampleRecipe;
      },
      async createRecipe() {
        return sampleRecipe;
      },
      async updateRecipe() {
        return sampleRecipe;
      },
      async activateRecipe() {
        return { ...sampleRecipe, status: "active" };
      },
      async deactivateRecipe() {
        return sampleRecipe;
      },
      async duplicateRecipe() {
        return sampleRecipe;
      },
      async listMissingRecipeMenuItems() {
        return [];
      },
    };

    const inventory = {
      async listItems() {
        return [];
      },
      async createItem() {
        throw new Error("unused");
      },
      async updateItem() {
        throw new Error("unused");
      },
      async createAdjustment() {
        throw new Error("unused");
      },
      async listMovements() {
        return [];
      },
    } as unknown as InventoryService;

    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
      inventory,
      inventoryRecipes,
    });

    const res = await request(app)
      .get("/api/v1/admin/inventory/recipes")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
