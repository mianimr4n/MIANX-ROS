import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { errorHandler } from "../src/common/http.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import { createOrdersRouter } from "../src/modules/orders/routes.js";
import type { CreateOrderInput, OrdersDataSource } from "../src/services/orders/types.js";

function mockUser(id: string, email: string): User {
  return {
    id,
    email,
    app_metadata: { role: "super-admin" },
    user_metadata: { user_type: "admin", branch_id: "spoof-branch" },
    aud: "authenticated",
    created_at: new Date().toISOString(),
  } as User;
}

describe("Slice 2D order create auth_user_id attach", () => {
  it("passes verified Bearer authUserId into createOrder and ignores body/header spoofing", async () => {
    const createOrder = vi.fn(async (input: CreateOrderInput) => ({
      id: "order-1",
      orderNumber: "TP-AUTH-1",
      status: "pending",
      subtotal: 499,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 499,
      createdAt: new Date().toISOString(),
    }));

    const ordersDataSource = {
      async quoteOrder() {
        throw new Error("unused");
      },
      createOrder,
      async getOrder() {
        return null;
      },
      async getOrderTracking() {
        return null;
      },
      async cancelOrder() {
        throw new Error("unused");
      },
    } satisfies OrdersDataSource;

    const verifier: AuthTokenVerifier = {
      async getUser(accessToken) {
        if (accessToken !== "good-token") {
          return { user: null, errorMessage: "bad" };
        }
        return { user: mockUser("auth-user-abc", "customer@example.com") };
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api/v1/orders", createOrdersRouter(ordersDataSource, verifier));
    app.use(errorHandler);

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", "Bearer good-token")
      .set("Idempotency-Key", "slice2d-key-1")
      .set("x-telepizza-role", "super-admin")
      .set("x-telepizza-branch-id", "spoof-branch")
      .send({
        branchCode: "royal-orchard",
        orderType: "pickup",
        orderSource: "website",
        contactName: "Test Customer",
        contactPhone: "03001234567",
        authUserId: "spoofed-from-body",
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      });

    expect(response.status).toBe(201);
    expect(createOrder).toHaveBeenCalledTimes(1);
    const input = createOrder.mock.calls[0]?.[0] as CreateOrderInput;
    expect(input.authUserId).toBe("auth-user-abc");
    expect(input.authUserId).not.toBe("spoofed-from-body");
  });

  it("keeps guest create working without Authorization", async () => {
    const createOrder = vi.fn(async (_input: CreateOrderInput) => ({
      id: "order-2",
      orderNumber: "TP-GUEST-1",
      status: "pending",
      subtotal: 499,
      discountAmount: 0,
      taxAmount: 0,
      deliveryFee: 0,
      totalAmount: 499,
      createdAt: new Date().toISOString(),
    }));

    const ordersDataSource = {
      async quoteOrder() {
        throw new Error("unused");
      },
      createOrder,
      async getOrder() {
        return null;
      },
      async getOrderTracking() {
        return null;
      },
      async cancelOrder() {
        throw new Error("unused");
      },
    } satisfies OrdersDataSource;

    const verifier: AuthTokenVerifier = {
      async getUser() {
        return { user: null };
      },
    };

    const app = express();
    app.use(express.json());
    app.use("/api/v1/orders", createOrdersRouter(ordersDataSource, verifier));
    app.use(errorHandler);

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", "slice2d-guest-1")
      .send({
        branchCode: "royal-orchard",
        orderType: "pickup",
        orderSource: "website",
        contactName: "Guest Customer",
        contactPhone: "03007654321",
        items: [{ menuItemSlug: "tele-special", quantity: 1 }],
      });

    expect(response.status).toBe(201);
    const input = createOrder.mock.calls[0]?.[0] as CreateOrderInput;
    expect(input.authUserId).toBeUndefined();
  });
});
