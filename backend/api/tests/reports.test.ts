import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { ReportsService, SalesReportResult } from "../src/services/reports/sales.js";

const readyEnv = {
  API_PORT: "4000",
  API_CORS_ORIGIN: "http://localhost:3000",
  API_JWT_SECRET: "test-only-not-a-real-secret-do-not-use-in-production-0123456789abcdef",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_ANON_KEY: "anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
};

const BRANCH_ID = "550e8400-e29b-41d4-a716-446655440000";

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
    permissions: ["reports.read"],
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

const sampleReport: SalesReportResult = {
  timezone: "Asia/Karachi",
  startDate: "2026-07-24",
  endDate: "2026-07-30",
  branchId: BRANCH_ID,
  days: [
    {
      date: "2026-07-24",
      totalOrders: 2,
      grossSales: 3000,
      averageOrderValue: 1500,
    },
    {
      date: "2026-07-25",
      totalOrders: 0,
      grossSales: 0,
      averageOrderValue: null,
    },
  ],
  totals: {
    totalOrders: 2,
    grossSales: 3000,
    averageOrderValue: 1500,
  },
};

const reports: ReportsService = {
  async getSalesReport() {
    return sampleReport;
  },
  async exportSalesCsv() {
    return "date,total_orders,gross_sales,average_order_value\n2026-07-24,2,3000.00,1500.00\n";
  },
  async exportOrdersCsv() {
    return "order_number,status,order_type,order_source,branch_code,payment_status,total_amount,contact_name,contact_phone,created_at\nTP-1,completed,delivery,whatsapp,royal-orchard,paid,1500.00,Ali,0300,2026-07-24T10:00:00Z\n";
  },
};

describe("Reports admin APIs", () => {
  it("GET /api/v1/admin/reports/sales requires auth", async () => {
    const { app } = createApp(readyEnv, { reports });
    const res = await request(app).get("/api/v1/admin/reports/sales");
    expect(res.status).toBe(401);
  });

  it("denies staff without reports.read / order.manage / admin.access", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(
        principal({
          permissions: ["pos.access"],
          roles: ["cashier"],
        }),
      ),
    });
    const res = await request(app)
      .get("/api/v1/admin/reports/sales")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });

  it("returns daily sales for authorized staff", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/reports/sales")
      .query({ startDate: "2026-07-24", endDate: "2026-07-30", branchId: BRANCH_ID })
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data.totals.totalOrders).toBe(2);
    expect(res.body.data.days).toHaveLength(2);
  });

  it("streams sales CSV export", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["order.manage"] })),
    });
    const res = await request(app)
      .get("/api/v1/admin/reports/sales/export")
      .query({ startDate: "2026-07-24", endDate: "2026-07-30" })
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("gross_sales");
  });

  it("streams orders CSV export", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["admin.access"] })),
    });
    const res = await request(app)
      .get("/api/v1/admin/reports/orders/export")
      .query({ startDate: "2026-07-24", endDate: "2026-07-30", status: "completed" })
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toContain("order_number");
  });
});
