import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import { ApiError } from "../src/common/http.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { CatalogDataSource } from "../src/services/catalog/types.js";
import type { CustomerAddressesDataSource } from "../src/services/addresses/customer-addresses.js";
import type { CustomerFavoritesDataSource } from "../src/services/favorites/customer-favorites.js";
import type { CustomerOrdersDataSource } from "../src/services/orders/customer-history.js";
import {
  createCustomerReviewsDataSource,
  type CustomerReviewsDataSource,
} from "../src/services/reviews/customer-reviews.js";
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

function buildApp(customerReviews: CustomerReviewsDataSource) {
  return createApp(readyEnv, {
    catalogDataSource,
    ordersDataSource,
    customerAddresses,
    customerOrders,
    customerFavorites,
    customerReviews,
    ...authDeps(),
  }).app;
}

type QueryResult = { data: unknown; error: { message: string } | null };

function mockSupabaseClient(handlers: {
  orders?: Record<string, QueryResult>;
  orderReviews?: {
    selectExisting?: QueryResult;
    insert?: QueryResult;
    update?: QueryResult;
    lookup?: QueryResult;
  };
}) {
  const ordersTable = {
    select: vi.fn(() => ordersTable),
    eq: vi.fn(function eq(this: typeof ordersTable, column: string, value: string) {
      if (column === "order_number" && handlers.orders?.[value]) {
        return {
          eq: () => ({
            maybeSingle: async () => handlers.orders![value],
          }),
        };
      }
      return ordersTable;
    }),
  };

  const reviewsTable = {
    select: vi.fn(() => reviewsTable),
    eq: vi.fn(() => reviewsTable),
    order: vi.fn(() => reviewsTable),
    insert: vi.fn(() => reviewsTable),
    update: vi.fn(() => reviewsTable),
    maybeSingle: vi.fn(async () => handlers.orderReviews?.selectExisting ?? { data: null, error: null }),
    single: vi.fn(async () => handlers.orderReviews?.insert ?? { data: null, error: null }),
  };

  reviewsTable.eq.mockImplementation(() =>
    ({
      eq: () => ({
        maybeSingle: async () => handlers.orderReviews?.lookup ?? { data: null, error: null },
      }),
      maybeSingle: async () => handlers.orderReviews?.selectExisting ?? { data: null, error: null },
      select: () => ({
        maybeSingle: async () => handlers.orderReviews?.update ?? { data: null, error: null },
      }),
    }) as typeof reviewsTable,
  );

  return {
    from(table: string) {
      if (table === "orders") return ordersTable;
      if (table === "order_reviews") return reviewsTable;
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("SEC-01 review routes require Bearer auth", () => {
  it("rejects unauthenticated GET /me/reviews", async () => {
    const app = buildApp({
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("not used");
      },
      async updateReview() {
        throw new Error("not used");
      },
    });

    const response = await request(app).get("/api/v1/me/reviews");
    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated POST /me/orders/:orderNumber/review", async () => {
    const app = buildApp({
      async listReviews() {
        return [];
      },
      async createReview() {
        throw new Error("not used");
      },
      async updateReview() {
        throw new Error("not used");
      },
    });

    const response = await request(app)
      .post("/api/v1/me/orders/TP-1001/review")
      .send({ rating: 5 });
    expect(response.status).toBe(401);
  });
});

describe("SEC-01 review routes bind authUserId from verified JWT", () => {
  it("rejects forged authUserId in body via strict schema", async () => {
    const createReview = vi.fn(async () => ({
      id: "rev-1",
      orderId: "order-1",
      orderNumber: "TP-1001",
      rating: 4,
      comment: null,
      status: "visible",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const app = buildApp({
      async listReviews() {
        return [];
      },
      createReview,
      async updateReview() {
        throw new Error("not used");
      },
    });

    const response = await request(app)
      .post("/api/v1/me/orders/TP-1001/review")
      .set("Authorization", "Bearer valid-token")
      .send({ rating: 4, authUserId: "spoofed-user" });

    expect(response.status).toBe(400);
    expect(createReview).not.toHaveBeenCalled();
  });

  it("passes JWT authUserId into createReview for valid body", async () => {
    const createReview = vi.fn(async () => ({
      id: "rev-1",
      orderId: "order-1",
      orderNumber: "TP-1001",
      rating: 4,
      comment: null,
      status: "visible",
      createdAt: "2026-07-19T00:00:00.000Z",
      updatedAt: "2026-07-19T00:00:00.000Z",
    }));

    const app = buildApp({
      async listReviews() {
        return [];
      },
      createReview,
      async updateReview() {
        throw new Error("not used");
      },
    });

    const response = await request(app)
      .post("/api/v1/me/orders/TP-1001/review")
      .set("Authorization", "Bearer valid-token")
      .send({ rating: 4 });

    expect(response.status).toBe(201);
    expect(createReview).toHaveBeenCalledWith("user-1", "TP-1001", { rating: 4 });
  });
});

describe("SEC-01 review service aligns with RLS expectations", () => {
  it("rejects review for non-completed owned order (REVIEW_NOT_ALLOWED)", async () => {
    const client = mockSupabaseClient({
      orders: {
        "TP-PENDING": {
          data: {
            id: "order-pending",
            order_number: "TP-PENDING",
            status: "preparing",
            auth_user_id: "user-1",
          },
          error: null,
        },
      },
    });
    const reviews = createCustomerReviewsDataSource(client);

    await expect(reviews.createReview("user-1", "TP-PENDING", { rating: 5 })).rejects.toMatchObject({
      statusCode: 409,
      code: "REVIEW_NOT_ALLOWED",
    });
  });

  it("rejects duplicate review (REVIEW_EXISTS)", async () => {
    const client = mockSupabaseClient({
      orders: {
        "TP-DONE": {
          data: {
            id: "order-done",
            order_number: "TP-DONE",
            status: "completed",
            auth_user_id: "user-1",
          },
          error: null,
        },
      },
      orderReviews: {
        selectExisting: { data: { id: "existing-review" }, error: null },
      },
    });
    const reviews = createCustomerReviewsDataSource(client);

    await expect(reviews.createReview("user-1", "TP-DONE", { rating: 5 })).rejects.toMatchObject({
      statusCode: 409,
      code: "REVIEW_EXISTS",
    });
  });

  it("rejects update after 24h edit window (REVIEW_LOCKED)", async () => {
    const oldCreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const reviewsTable = {
      select: vi.fn(() => reviewsTable),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: "rev-old",
              order_id: "order-done",
              rating: 4,
              comment: null,
              status: "visible",
              created_at: oldCreatedAt,
              updated_at: oldCreatedAt,
            },
            error: null,
          })),
        })),
      })),
    };
    const ordersTable = {
      select: vi.fn(() => ordersTable),
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: "order-done",
              order_number: "TP-DONE",
              status: "completed",
              auth_user_id: "user-1",
            },
            error: null,
          })),
        })),
      })),
    };
    const client = {
      from(table: string) {
        if (table === "orders") return ordersTable;
        if (table === "order_reviews") return reviewsTable;
        throw new Error(`unexpected table ${table}`);
      },
    };
    const reviews = createCustomerReviewsDataSource(client);

    await expect(
      reviews.updateReview("user-1", "TP-DONE", { rating: 3, comment: "late edit" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: "REVIEW_LOCKED",
    });
  });

  it("inserts auth_user_id from verified authUserId parameter", async () => {
    const insertPayloads: Record<string, unknown>[] = [];
    const reviewsTable = {
      select: vi.fn(() => reviewsTable),
      eq: vi.fn(() => reviewsTable),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      insert: vi.fn((payload: Record<string, unknown>) => {
        insertPayloads.push(payload);
        return {
          select: () => ({
            single: async () => ({
              data: {
                id: "rev-new",
                order_id: payload.order_id,
                rating: payload.rating,
                comment: payload.comment,
                status: "visible",
                created_at: "2026-07-19T00:00:00.000Z",
                updated_at: "2026-07-19T00:00:00.000Z",
              },
              error: null,
            }),
          }),
        };
      }),
    };
    const ordersTable = {
      select: vi.fn(() => ordersTable),
      eq: vi.fn(() => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "order-done",
              order_number: "TP-DONE",
              status: "completed",
              auth_user_id: "user-1",
            },
            error: null,
          }),
        }),
      })),
    };
    const client = {
      from(table: string) {
        if (table === "orders") return ordersTable;
        if (table === "order_reviews") return reviewsTable;
        throw new Error(`unexpected table ${table}`);
      },
    };

    const reviews = createCustomerReviewsDataSource(client);
    await reviews.createReview("user-1", "TP-DONE", { rating: 5, comment: "  nice  " });

    expect(insertPayloads).toEqual([
      {
        order_id: "order-done",
        auth_user_id: "user-1",
        rating: 5,
        comment: "nice",
        status: "visible",
      },
    ]);
  });

  it("maps unknown order to REVIEW_NOT_FOUND (404)", async () => {
    const client = mockSupabaseClient({
      orders: {
        "TP-MISSING": { data: null, error: null },
      },
    });
    const reviews = createCustomerReviewsDataSource(client);

    await expect(reviews.createReview("user-1", "TP-MISSING", { rating: 5 })).rejects.toMatchObject({
      statusCode: 404,
      code: "ORDER_NOT_FOUND",
    });
  });

  it("surfaces validation errors before DB access", async () => {
    const reviews = createCustomerReviewsDataSource({
      from() {
        throw new Error("should not reach database");
      },
    });

    await expect(reviews.createReview("user-1", "TP-1", { rating: 0 })).rejects.toBeInstanceOf(ApiError);
  });
});
