import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { LoyaltyService } from "../src/services/loyalty/management.js";
import type { MarketingService } from "../src/services/marketing/coupons.js";
import type { KitchenTicketsService } from "../src/services/kitchen/tickets.js";

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
    permissions: ["loyalty.manage", "marketing.manage", "order.manage"],
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

function unused(): never {
  throw new Error("unused");
}

const loyaltyStub = (overrides: Partial<LoyaltyService> = {}): LoyaltyService => ({
  async listAccounts() {
    return [];
  },
  async listTransactions() {
    return [];
  },
  async earnForOrder() {
    unused();
  },
  async burn() {
    unused();
  },
  async adjust() {
    unused();
  },
  async expire() {
    unused();
  },
  async reverse() {
    unused();
  },
  async getAttention() {
    return {
      state: "available",
      unavailableReason: null,
      accountsWithBalance: 0,
      earnTransactionsToday: 0,
      burnTransactionsToday: 0,
      pendingManualReviewAdjustments: 0,
      rewardsCatalogueConfigured: false,
      rewardsCatalogueMessage: "Rewards catalogue is not configured.",
    };
  },
  ...overrides,
});

const marketingStub = (overrides: Partial<MarketingService> = {}): MarketingService => ({
  async listCoupons() {
    return [];
  },
  async createCoupon() {
    unused();
  },
  async patchCoupon() {
    unused();
  },
  async validateCoupon() {
    return { valid: false, reason: "COUPON_NOT_FOUND" };
  },
  async recordRedemption() {
    unused();
  },
  async listRedemptions() {
    return [];
  },
  async listCampaigns() {
    return [];
  },
  async createCampaign() {
    unused();
  },
  async transitionCampaign() {
    unused();
  },
  async listSubmissions() {
    return [];
  },
  async queueCampaignSubmissions() {
    return { queued: 0, suppressed: 0 };
  },
  async listSuppressions() {
    return [];
  },
  async upsertSuppression() {
    unused();
  },
  async listConsent() {
    return [];
  },
  async setConsent() {
    unused();
  },
  async getAttention() {
    return {
      state: "available",
      unavailableReason: null,
      activeCoupons: 0,
      couponsExpiringSoon: 0,
      draftCampaigns: 0,
      campaignsAwaitingSend: 0,
      suppressedCustomers: 0,
      consentOptOuts: 0,
      providerConfigured: false,
      providerMessage: "Messaging provider is not configured.",
    };
  },
  ...overrides,
});

describe("Launch gap APIs — loyalty, marketing, kitchen stock", () => {
  it("GET /admin/loyalty/accounts lists balances", async () => {
    const loyalty = loyaltyStub({
      async listAccounts() {
        return [
          {
            id: "acc-1",
            customerId: "cust-1",
            customerName: "Ali",
            customerPhone: "+923001234567",
            pointsBalance: 12,
            tier: "member",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      },
    });

    const { app } = createApp(readyEnv, {
      loyalty,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });

    const res = await request(app)
      .get("/api/v1/admin/loyalty/accounts")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data[0].pointsBalance).toBe(12);
  });

  it("POST /admin/loyalty/earn awards points for completed orders", async () => {
    const earn = vi.fn(async () => ({
      orderId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      points: 15,
      pointsBalance: 15,
      idempotentReplay: false,
      transactionId: "txn-1",
    }));
    const loyalty = loyaltyStub({ earnForOrder: earn });

    const { app } = createApp(readyEnv, {
      loyalty,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });

    const res = await request(app)
      .post("/api/v1/admin/loyalty/earn")
      .set("Authorization", "Bearer token")
      .send({ orderId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8" });
    expect(res.status).toBe(201);
    expect(res.body.data.points).toBe(15);
    expect(earn).toHaveBeenCalled();
  });

  it("POST /admin/loyalty/burn is transaction-safe via service", async () => {
    const burn = vi.fn(async () => ({
      transactionId: "txn-burn",
      accountId: "acc-1",
      customerId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      points: 5,
      pointsBalance: 7,
      type: "burn" as const,
      idempotentReplay: false,
    }));
    const loyalty = loyaltyStub({ burn });
    const { app } = createApp(readyEnv, {
      loyalty,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .post("/api/v1/admin/loyalty/burn")
      .set("Authorization", "Bearer token")
      .send({ customerId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", points: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data.type).toBe("burn");
  });

  it("GET/POST /admin/marketing/coupons list and create", async () => {
    const marketing = marketingStub({
      async listCoupons() {
        return [
          {
            id: "c1",
            branchId: null,
            branchCode: null,
            code: "WELCOME10",
            discountType: "percent",
            discountValue: 10,
            minOrder: 0,
            expiryDate: null,
            status: "active",
            maxRedemptions: null,
            perCustomerLimit: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      },
      async createCoupon(_scope, input) {
        return {
          id: "c2",
          branchId: input.branchId ?? null,
          branchCode: null,
          code: input.code.toUpperCase(),
          discountType: input.discountType,
          discountValue: input.discountValue,
          minOrder: input.minOrder ?? 0,
          expiryDate: input.expiryDate ?? null,
          status: input.status ?? "active",
          maxRedemptions: input.maxRedemptions ?? null,
          perCustomerLimit: input.perCustomerLimit ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    });

    const { app } = createApp(readyEnv, {
      marketing,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });

    const list = await request(app)
      .get("/api/v1/admin/marketing/coupons")
      .set("Authorization", "Bearer token");
    expect(list.status).toBe(200);
    expect(list.body.data[0].code).toBe("WELCOME10");

    const created = await request(app)
      .post("/api/v1/admin/marketing/coupons")
      .set("Authorization", "Bearer token")
      .send({ code: "SAVE50", discountType: "fixed", discountValue: 50 });
    expect(created.status).toBe(201);
    expect(created.body.data.code).toBe("SAVE50");
  });

  it("GET /admin/marketing/attention never claims provider delivery", async () => {
    const marketing = marketingStub();
    const { app } = createApp(readyEnv, {
      marketing,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/marketing/attention")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data.providerConfigured).toBe(false);
  });

  it("kitchen preparing surfaces Insufficient stock for [Item]", async () => {
    const kitchenTickets: KitchenTicketsService = {
      async listTickets() {
        return { tickets: [], pagination: { limit: 20, offset: 0, total: 0, returned: 0 } };
      },
      async transitionTicket() {
        const { ApiError } = await import("../src/common/http.js");
        throw new ApiError(409, "INSUFFICIENT_STOCK", "Insufficient stock for Flour 25kg");
      },
    };

    const { app } = createApp(readyEnv, {
      kitchenTickets,
      authTokenVerifier: verifier("auth-kitchen", "kitchen@example.com"),
      authProfileRepository: authRepo(
        principal({
          roles: ["kitchen"],
          permissions: [],
        }),
      ),
    });

    const res = await request(app)
      .patch("/api/v1/kitchen/tickets/6ba7b810-9dad-11d1-80b4-00c04fd430c8/status")
      .set("Authorization", "Bearer token")
      .send({ status: "preparing" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/Insufficient stock for Flour 25kg/);
  });
});
