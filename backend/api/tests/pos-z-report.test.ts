import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { PosZReport, PosZReportCloseResult, PosZReportService } from "../src/services/pos/z-report.js";
import { ApiError } from "../src/common/http.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "super-secret-token-123",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const BRANCH_ID = "411dbfff-0db2-49b8-bbe9-08b0ffd76d3f";

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
    userId: "user-cashier",
    authUserId: "auth-cashier",
    email: "cashier@example.com",
    userType: "staff",
    status: "active",
    roles: ["cashier"],
    permissions: ["order.manage"],
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

function report(overrides: Partial<PosZReport> = {}): PosZReport {
  return {
    timezone: "Asia/Karachi",
    businessDate: "2026-07-30",
    dayStart: "2026-07-30T00:00:00+05:00",
    branchId: BRANCH_ID,
    totalOrders: 3,
    totalCashSales: 4500,
    expectedCashInDrawer: 4500,
    generatedAt: "2026-07-30T18:00:00.000Z",
    ...overrides,
  };
}

function mockZReport(): PosZReportService {
  return {
    async getReport(_actor, branchId) {
      if (branchId !== BRANCH_ID) {
        throw new ApiError(403, "ORDER_ACCESS_DENIED", "Branch access denied.");
      }
      return report();
    },
    async confirmClose(_actor, branchId) {
      if (branchId !== BRANCH_ID) {
        throw new ApiError(403, "ORDER_ACCESS_DENIED", "Branch access denied.");
      }
      return {
        ...report(),
        confirmed: true,
        confirmedAt: "2026-07-30T18:05:00.000Z",
        eventId: "evt-1",
      } satisfies PosZReportCloseResult;
    },
  };
}

describe("POS Z-Report API", () => {
  it("GET /admin/pos/z-report returns cash drawer totals", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(principal()),
      posZReport: mockZReport(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/pos/z-report?branchId=${BRANCH_ID}`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(200);
    expect(res.body.data.totalOrders).toBe(3);
    expect(res.body.data.expectedCashInDrawer).toBe(4500);
  });

  it("POST /admin/pos/z-report/close logs the shift close event", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(principal()),
      posZReport: mockZReport(),
    });

    const res = await request(app)
      .post("/api/v1/admin/pos/z-report/close")
      .set("Authorization", "Bearer tok")
      .send({ branchId: BRANCH_ID });
    expect(res.status).toBe(200);
    expect(res.body.data.confirmed).toBe(true);
    expect(res.body.data.eventId).toBe("evt-1");
  });

  it("rejects callers without order.manage / payment.manage / admin.access", async () => {
    const { app } = createApp(readyEnv, {
      authTokenVerifier: verifier("auth-kitchen", "kitchen@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["kitchen.read"],
          roles: ["kitchen"],
        }),
      ),
      posZReport: mockZReport(),
    });

    const res = await request(app)
      .get(`/api/v1/admin/pos/z-report?branchId=${BRANCH_ID}`)
      .set("Authorization", "Bearer tok");
    expect(res.status).toBe(403);
  });
});
