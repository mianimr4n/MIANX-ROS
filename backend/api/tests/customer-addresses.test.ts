import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { CustomerAddressesDataSource } from "../src/services/addresses/customer-addresses.js";
import type { CustomerFavoritesDataSource } from "../src/services/favorites/customer-favorites.js";
import type { CustomerOrdersDataSource } from "../src/services/orders/customer-history.js";
import type { CustomerReviewsDataSource } from "../src/services/reviews/customer-reviews.js";
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

const customerOrders: CustomerOrdersDataSource = {
  async listOrders() {
    return { orders: [], total: 0 };
  },
  async getOrder() {
    throw new Error("not used");
  },
};

const customerFavorites: CustomerFavoritesDataSource = {
  async listFavorites() {
    return [];
  },
  async addFavorite() {
    throw new Error("not used");
  },
  async removeFavorite() {
    throw new Error("not used");
  },
};

const customerReviews: CustomerReviewsDataSource = {
  async listReviews() {
    return [];
  },
  async createReview() {
    throw new Error("not used");
  },
  async updateReview() {
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

describe("GET /api/v1/me/addresses", () => {
  it("requires Bearer auth", async () => {
    const customerAddresses: CustomerAddressesDataSource = {
      async listAddresses() {
        return [];
      },
      async createAddress() {
        throw new Error("unused");
      },
      async updateAddress() {
        throw new Error("unused");
      },
      async archiveAddress() {
        throw new Error("unused");
      },
      async importAddresses() {
        throw new Error("unused");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      customerAddresses,
      customerOrders,
      customerFavorites,
      customerReviews,
      authTokenVerifier: { async getUser() { return { user: null }; } },
      authProfileRepository: {
        async resolvePrincipal() {
          return null;
        },
        async getMe() {
          throw new Error("unused");
        },
        async updateOwnProfile() {
          throw new Error("unused");
        },
      },
    });

    const response = await request(app).get("/api/v1/me/addresses");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns owned addresses for authenticated user", async () => {
    const listAddresses = vi.fn(async () => [
      {
        id: "addr-1",
        label: "Home" as const,
        recipientName: "Ali Khan",
        phone: "+923001234567",
        line1: "House 12, Street 4",
        line2: "",
        landmark: "Near park",
        area: "Royal Orchard",
        city: "Multan",
        deliveryZone: "",
        preferredBranchId: null,
        isDefault: true,
        status: "active" as const,
        createdAt: "2026-07-19T00:00:00.000Z",
        updatedAt: "2026-07-19T00:00:00.000Z",
      },
    ]);

    const customerAddresses: CustomerAddressesDataSource = {
      listAddresses,
      async createAddress() {
        throw new Error("unused");
      },
      async updateAddress() {
        throw new Error("unused");
      },
      async archiveAddress() {
        throw new Error("unused");
      },
      async importAddresses() {
        throw new Error("unused");
      },
    };

    const authTokenVerifier: AuthTokenVerifier = {
      async getUser() {
        return { user: mockUser("user-1", "ali@example.com") };
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      customerAddresses,
      customerOrders,
      customerFavorites,
      customerReviews,
      authTokenVerifier,
      authProfileRepository: {
        async resolvePrincipal() {
          return null;
        },
        async getMe() {
          throw new Error("unused");
        },
        async updateOwnProfile() {
          throw new Error("unused");
        },
      },
    });

    const response = await request(app)
      .get("/api/v1/me/addresses")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data.addresses).toHaveLength(1);
    expect(listAddresses).toHaveBeenCalledWith("user-1");
  });
});

describe("POST /api/v1/me/addresses", () => {
  it("creates an address with normalized phone", async () => {
    const createAddress = vi.fn(async (_authUserId, input) => ({
      id: "addr-new",
      label: input.label,
      recipientName: input.recipientName,
      phone: "+923001234567",
      line1: input.line1,
      line2: input.line2 ?? "",
      landmark: input.landmark ?? "",
      area: input.area ?? "",
      city: input.city ?? "Multan",
      deliveryZone: input.deliveryZone ?? "",
      preferredBranchId: input.preferredBranchId ?? null,
      isDefault: true,
      status: "active" as const,
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const customerAddresses: CustomerAddressesDataSource = {
      async listAddresses() {
        return [];
      },
      createAddress,
      async updateAddress() {
        throw new Error("unused");
      },
      async archiveAddress() {
        throw new Error("unused");
      },
      async importAddresses() {
        throw new Error("unused");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      customerAddresses,
      customerOrders,
      customerFavorites,
      customerReviews,
      authTokenVerifier: {
        async getUser() {
          return { user: mockUser("user-1", "ali@example.com") };
        },
      },
      authProfileRepository: {
        async resolvePrincipal() {
          return null;
        },
        async getMe() {
          throw new Error("unused");
        },
        async updateOwnProfile() {
          throw new Error("unused");
        },
      },
    });

    const response = await request(app)
      .post("/api/v1/me/addresses")
      .set("Authorization", "Bearer valid-token")
      .send({
        label: "Home",
        recipientName: "Ali Khan",
        phone: "03001234567",
        line1: "House 12",
        city: "Multan",
        isDefault: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.address.id).toBe("addr-new");
    expect(createAddress).toHaveBeenCalledOnce();
  });
});

describe("POST /api/v1/me/addresses/import", () => {
  it("imports device drafts for the authenticated user", async () => {
    const importAddresses = vi.fn(async () => ({
      imported: [
        {
          id: "addr-imported",
          label: "Home" as const,
          recipientName: "Ali Khan",
          phone: "+923001234567",
          line1: "House 12",
          line2: "",
          landmark: "",
          area: "",
          city: "Multan",
          deliveryZone: "",
          preferredBranchId: null,
          isDefault: true,
          status: "active" as const,
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      ],
      skipped: 0,
    }));

    const customerAddresses: CustomerAddressesDataSource = {
      async listAddresses() {
        return [];
      },
      async createAddress() {
        throw new Error("unused");
      },
      async updateAddress() {
        throw new Error("unused");
      },
      async archiveAddress() {
        throw new Error("unused");
      },
      importAddresses,
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      customerAddresses,
      customerOrders,
      customerFavorites,
      customerReviews,
      authTokenVerifier: {
        async getUser() {
          return { user: mockUser("user-1", "ali@example.com") };
        },
      },
      authProfileRepository: {
        async resolvePrincipal() {
          return null;
        },
        async getMe() {
          throw new Error("unused");
        },
        async updateOwnProfile() {
          throw new Error("unused");
        },
      },
    });

    const response = await request(app)
      .post("/api/v1/me/addresses/import")
      .set("Authorization", "Bearer valid-token")
      .send({
        drafts: [
          {
            label: "Home",
            recipientName: "Ali Khan",
            phone: "03001234567",
            line1: "House 12",
            draftKey: "draft-1",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.importedCount).toBe(1);
    expect(importAddresses).toHaveBeenCalledWith("user-1", expect.any(Array));
  });
});
