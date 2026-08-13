import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { ApiError } from "../src/common/http.js";
import { createApp } from "../src/app.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { CustomerAddressesDataSource } from "../src/services/addresses/customer-addresses.js";
import type { CustomerFavoritesDataSource } from "../src/services/favorites/customer-favorites.js";
import type { CustomerOrdersDataSource } from "../src/services/orders/customer-history.js";
import type { CustomerReviewsDataSource } from "../src/services/reviews/customer-reviews.js";
import type { OrdersDataSource } from "../src/services/orders/types.js";

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

const customerAddresses: CustomerAddressesDataSource = {
  async listAddresses() {
    return [];
  },
  async createAddress() {
    throw new Error("not used");
  },
  async updateAddress() {
    throw new Error("not used");
  },
  async archiveAddress() {
    throw new Error("not used");
  },
  async importAddresses() {
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

function authDeps(authUserId = "user-1") {
  const authTokenVerifier: AuthTokenVerifier = {
    async getUser() {
      return { user: mockUser(authUserId, "ali@example.com") };
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
      throw new Error("unused");
    },
  };
  return { authTokenVerifier, authProfileRepository };
}

describe("CP-2 /me/orders", () => {
  it("lists paginated orders for the authenticated customer", async () => {
    const listOrders = vi.fn(async () => ({
      orders: [
        {
          id: "order-1",
          orderNumber: "TP-1001",
          status: "preparing",
          orderType: "delivery",
          branchId: "branch-1",
          branchCode: "royal-orchard",
          contactName: "Ali",
          contactPhone: "+923001234567",
          totalAmount: 999,
          itemCount: 2,
          createdAt: "2026-07-19T00:00:00.000Z",
          updatedAt: "2026-07-19T00:00:00.000Z",
        },
      ],
      total: 1,
    }));

    const customerOrders: CustomerOrdersDataSource = {
      listOrders,
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
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
      ...authDeps(),
    });

    const response = await request(app)
      .get("/api/v1/me/orders?limit=20&offset=0")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data.orders).toHaveLength(1);
    expect(response.body.data.pagination.total).toBe(1);
    expect(listOrders).toHaveBeenCalledWith("user-1", { limit: 20, offset: 0, status: undefined });
  });

  it("returns 404 when a customer requests another user's order detail", async () => {
    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
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
      ...authDeps("user-2"),
    });

    const response = await request(app)
      .get("/api/v1/me/orders/TP-9999")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("passes pagination params through to the orders data source", async () => {
    const listOrders = vi.fn(async () => ({ orders: [], total: 42 }));

    const customerOrders: CustomerOrdersDataSource = {
      listOrders,
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
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
      ...authDeps(),
    });

    const response = await request(app)
      .get("/api/v1/me/orders?limit=10&offset=20&status=completed")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toEqual({
      limit: 10,
      offset: 20,
      total: 42,
      returned: 0,
    });
    expect(listOrders).toHaveBeenCalledWith("user-1", {
      limit: 10,
      offset: 20,
      status: "completed",
    });
  });
});

describe("CP-4 /me/favorites", () => {
  it("adds a favorite by menu item code", async () => {
    const addFavorite = vi.fn(async () => ({
      id: "fav-1",
      menuItemCode: "tele-special",
      createdAt: "2026-07-19T00:00:00.000Z",
    }));

    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      addFavorite,
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
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
      ...authDeps(),
    });

    const response = await request(app)
      .put("/api/v1/me/favorites/tele-special")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data.favorite.menuItemCode).toBe("tele-special");
    expect(addFavorite).toHaveBeenCalledWith("user-1", "tele-special");
  });

  it("lists favorites scoped to the authenticated user only", async () => {
    const listFavorites = vi.fn(async () => [
      {
        id: "fav-1",
        menuItemCode: "tele-special",
        createdAt: "2026-07-19T00:00:00.000Z",
      },
    ]);

    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      listFavorites,
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
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
      ...authDeps("user-9"),
    });

    const response = await request(app)
      .get("/api/v1/me/favorites")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.data.favorites).toHaveLength(1);
    expect(listFavorites).toHaveBeenCalledWith("user-9");
  });
});

describe("CP-6 /me/reviews", () => {
  it("creates a review for a completed owned order", async () => {
    const createReview = vi.fn(async () => ({
      id: "rev-1",
      orderId: "order-1",
      orderNumber: "TP-1001",
      rating: 5,
      comment: "Great pizza",
      status: "visible",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      createReview,
      async updateReview() {
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
      ...authDeps(),
    });

    const response = await request(app)
      .post("/api/v1/me/orders/TP-1001/review")
      .set("Authorization", "Bearer valid-token")
      .send({ rating: 5, comment: "Great pizza" });

    expect(response.status).toBe(201);
    expect(response.body.data.review.rating).toBe(5);
    expect(createReview).toHaveBeenCalledWith("user-1", "TP-1001", {
      rating: 5,
      comment: "Great pizza",
    });
  });

  it("returns REVIEW_EXISTS when the order already has a review", async () => {
    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new ApiError(409, "REVIEW_EXISTS", "This order already has a review.");
      },
      async updateReview() {
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
      ...authDeps(),
    });

    const response = await request(app)
      .post("/api/v1/me/orders/TP-1001/review")
      .set("Authorization", "Bearer valid-token")
      .send({ rating: 4, comment: "Duplicate" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REVIEW_EXISTS");
  });

  it("returns REVIEW_LOCKED when the edit window has expired", async () => {
    const customerOrders: CustomerOrdersDataSource = {
      async listOrders() {
        return { orders: [], total: 0 };
      },
      async getOrder() {
        throw new Error("unused");
      },
    };

    const customerFavorites: CustomerFavoritesDataSource = {
      async listFavorites() {
        return [];
      },
      async addFavorite() {
        throw new Error("unused");
      },
      async removeFavorite() {
        throw new Error("unused");
      },
    };

    const customerReviews: CustomerReviewsDataSource = {
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("unused");
      },
      async updateReview() {
        throw new ApiError(409, "REVIEW_LOCKED", "Reviews can only be edited within 24 hours.");
      },
    };

    const { app } = createApp(readyEnv, {
      catalogDataSource,
      ordersDataSource,
      customerAddresses,
      customerOrders,
      customerFavorites,
      customerReviews,
      ...authDeps(),
    });

    const response = await request(app)
      .patch("/api/v1/me/orders/TP-1001/review")
      .set("Authorization", "Bearer valid-token")
      .send({ rating: 3, comment: "Too late" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REVIEW_LOCKED");
  });
});
