import request from "supertest";
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import { createApp } from "../src/app.js";
import type { AuthTokenVerifier } from "../src/middleware/auth.js";
import type { AuthPrincipalRepository } from "../src/services/auth/supabase.js";
import type { AuthPrincipal } from "../src/services/auth/principal.js";
import type { AnalyticsService } from "../src/services/analytics/engine.js";
import type { ReportsService } from "../src/services/reports/sales.js";
import { FORMULA_REGISTRY, REGISTRY_VERSION } from "../src/services/analytics/registry.js";

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

const reports: ReportsService = {
  async getSalesReport() {
    return {
      timezone: "Asia/Karachi",
      startDate: "2026-07-24",
      endDate: "2026-07-30",
      branchId: BRANCH_ID,
      days: [],
      totals: { totalOrders: 0, grossSales: 0, averageOrderValue: null },
    };
  },
  async exportSalesCsv() {
    return "date,total_orders,gross_sales,average_order_value\n";
  },
  async exportOrdersCsv() {
    return "order_number\n";
  },
};

const analytics: AnalyticsService = {
  listModules() {
    return [{ moduleId: "sales", title: "Sales Analytics", metricCount: 1 }];
  },
  getRegistry() {
    return { version: REGISTRY_VERSION, contracts: FORMULA_REGISTRY };
  },
  async getOwnerWorkspace() {
    return {
      timezone: "Asia/Karachi",
      generatedAt: "2026-08-01T00:00:00Z",
      branchId: BRANCH_ID,
      periodStart: "2026-07-24",
      periodEnd: "2026-07-30",
      modules: [
        {
          moduleId: "sales",
          title: "Sales Analytics",
          status: "LIVE",
          reason: null,
          metrics: [
            {
              metricId: "sales.gross",
              name: "Gross sales",
              value: 1000,
              unit: "PKR",
              status: "LIVE",
              reason: null,
              asOf: "2026-08-01T00:00:00Z",
              periodStart: "2026-07-24",
              periodEnd: "2026-07-30",
              branchId: BRANCH_ID,
              contractRef: "sales.gross",
            },
          ],
        },
      ],
      registryVersion: REGISTRY_VERSION,
      dataQualitySummary: { pass: 1, warn: 0, fail: 0, unavailable: 0 },
      openExceptions: 0,
      scheduledReportsActive: 0,
      scheduledExecution: "DEFERRED",
    };
  },
  async getModuleSnapshot() {
    return {
      moduleId: "sales",
      title: "Sales Analytics",
      status: "LIVE",
      reason: null,
      metrics: [],
    };
  },
  async drillDown() {
    return { metricId: "sales.gross", rows: [], truncated: false, status: "LIVE", reason: null };
  },
  async export(_scope, format) {
    if (format === "pdf") {
      return { filename: "a.pdf", contentType: "application/pdf", body: Buffer.from("%PDF") };
    }
    if (format === "excel") {
      return { filename: "a.xls", contentType: "application/vnd.ms-excel", body: "<Workbook/>" };
    }
    return { filename: "a.csv", contentType: "text/csv; charset=utf-8", body: "metric_id\nsales.gross\n" };
  },
  async listScheduledReports() {
    return [];
  },
  async createScheduledReport() {
    return { id: "sched-1", execution_status: "deferred" };
  },
  async listExceptions() {
    return [];
  },
  async runDataQuality() {
    return { pass: 1, warn: 0, fail: 0, unavailable: 0, checks: [] };
  },
};

describe("RC4-2 Analytics admin APIs", () => {
  it("returns formula registry", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      analytics,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/analytics/registry")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(REGISTRY_VERSION);
    expect(res.body.data.contracts.length).toBeGreaterThan(10);
  });

  it("returns owner BI workspace envelopes", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      analytics,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    const res = await request(app)
      .get("/api/v1/admin/analytics/workspace")
      .query({ startDate: "2026-07-24", endDate: "2026-07-30", branchId: BRANCH_ID })
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(200);
    expect(res.body.data.scheduledExecution).toBe("DEFERRED");
    expect(res.body.data.modules[0].metrics[0].metricId).toBe("sales.gross");
  });

  it("exports csv excel and pdf", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      analytics,
      authTokenVerifier: verifier("auth-admin", "admin@example.com"),
      authProfileRepository: authRepo(principal()),
    });
    for (const format of ["csv", "excel", "pdf"] as const) {
      const res = await request(app)
        .get("/api/v1/admin/analytics/export")
        .query({ format, startDate: "2026-07-24", endDate: "2026-07-30" })
        .set("Authorization", "Bearer token");
      expect(res.status).toBe(200);
    }
  });

  it("denies analytics without reports permission", async () => {
    const { app } = createApp(readyEnv, {
      reports,
      analytics,
      authTokenVerifier: verifier("auth-cashier", "cashier@example.com"),
      authProfileRepository: authRepo(principal({ permissions: ["pos.access"], roles: ["cashier"] })),
    });
    const res = await request(app)
      .get("/api/v1/admin/analytics/modules")
      .set("Authorization", "Bearer token");
    expect(res.status).toBe(403);
  });
});
