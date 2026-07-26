import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D4 — dashboard router RBAC for operations, table-service, system-health, opening-readiness.
 */

const B1 = "11111111-1111-4111-8111-111111111111";
const B_FORGED = "22222222-2222-4222-8222-222222222222";

type Principal = {
  authUserId: string;
  userId: string;
  email: string;
  userType: string;
  status: string;
  roles: string[];
  permissions: string[];
  branchIds: string[];
  isSuperAdmin: boolean;
};

const principals: Record<string, Principal> = {
  superAdmin: {
    authUserId: "auth-sa",
    userId: "u-sa",
    email: "sa@example.com",
    userType: "staff",
    status: "active",
    roles: ["super-admin"],
    permissions: ["order.manage", "reservation.read", "admin.access", "platform.health.read"],
    branchIds: [],
    isSuperAdmin: true,
  },
  healthReader: {
    authUserId: "auth-health",
    userId: "u-health",
    email: "health@example.com",
    userType: "staff",
    status: "active",
    roles: ["admin"],
    permissions: ["platform.health.read"],
    branchIds: [],
    isSuperAdmin: false,
  },
  host: {
    authUserId: "auth-host",
    userId: "u-host",
    email: "host@example.com",
    userType: "staff",
    status: "active",
    roles: ["host"],
    permissions: ["reservation.read", "reservation.manage", "dinein.manage"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  kitchen: {
    authUserId: "auth-kitchen",
    userId: "u-kitchen",
    email: "kitchen@example.com",
    userType: "staff",
    status: "active",
    roles: ["kitchen"],
    permissions: ["kitchen.read", "admin.access"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  cashier: {
    authUserId: "auth-cashier",
    userId: "u-cashier",
    email: "cashier@example.com",
    userType: "staff",
    status: "active",
    roles: ["cashier"],
    permissions: ["order.manage", "payment.manage", "reservation.read", "admin.access"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  branchManager: {
    authUserId: "auth-bm",
    userId: "u-bm",
    email: "bm@example.com",
    userType: "staff",
    status: "active",
    roles: ["branch-manager"],
    permissions: ["admin.access", "order.manage", "reservation.read"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  waiter: {
    authUserId: "auth-waiter",
    userId: "u-waiter",
    email: "waiter@example.com",
    userType: "staff",
    status: "active",
    roles: ["waiter"],
    permissions: ["admin.access", "dinein.manage"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  delivery: {
    authUserId: "auth-delivery",
    userId: "u-delivery",
    email: "delivery@example.com",
    userType: "staff",
    status: "active",
    roles: ["rider"],
    permissions: ["admin.access", "delivery.manage"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
};

vi.mock("../src/middleware/authorization.js", async () => {
  const actual = await vi.importActual<typeof import("../src/middleware/authorization.js")>(
    "../src/middleware/authorization.js",
  );
  return {
    ...actual,
    createRequireAuthenticatedUser:
      () => (req: express.Request, _res: express.Response, next: express.NextFunction) => {
        const auth = req.header("authorization") ?? "";
        const key = Object.keys(principals).find((k) => auth.includes(k));
        if (!key) {
          return next(
            Object.assign(new Error("Authentication required."), {
              statusCode: 401,
              code: "UNAUTHORIZED",
            }),
          );
        }
        (req as express.Request & { principal: unknown }).principal = principals[key];
        return next();
      },
  };
});

import { createAdminDashboardRouter } from "../src/modules/admin/dashboard.js";
import { ApiError } from "../src/common/http.js";

const branchOrderManagement = {
  getOperationsDashboard: vi.fn(async () => ({
    generatedAt: new Date().toISOString(),
    timezone: "Asia/Karachi" as const,
    dayStart: new Date().toISOString(),
    branchId: B1,
    kpis: {
      todayOrders: 0,
      todayGrossSales: 0,
      activeOrders: 0,
      averageOrderValue: null,
      kitchenWaiting: 0,
      activeDeliveries: 0,
    },
    statusCounts: {},
    sourceBreakdown: [],
    recentOrders: [],
    branchPerformance: null,
    alerts: [],
    insights: [],
  })),
};

const dashboardSummaries = {
  getTableServiceSummary: vi.fn(async (scope: Principal, branchId: string) => {
    if (!scope.isSuperAdmin && !scope.branchIds.includes(branchId)) {
      throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
    }
    return {
      generatedAt: new Date().toISOString(),
      branchId,
      branchCode: "royal-orchard",
      branchStatus: "operating",
      definitions: {},
      reservations: {
        todayTotal: 0,
        confirmed: 0,
        pending: 0,
        arrived: 0,
        noShows: 0,
        cancellations: 0,
        seatedCovers: 0,
        coversBooked: 0,
      },
      floor: {
        availableTables: 0,
        occupiedTables: 0,
        cleaningTables: 0,
        totalActiveTables: 0,
        seatedCovers: 0,
        billRequests: 0,
        paymentPending: 0,
        activeSessions: 0,
        waitlistCount: 0,
        seatingConflicts: 0,
        upcomingArrivals: 0,
      },
      averages: {
        averageWaitMinutes: null,
        averageTableTurnMinutes: null,
        note: "null until measured",
      },
      occupancyByBranch: null,
    };
  }),
  getSystemHealth: vi.fn(async (scope: Principal) => {
    const technical =
      scope.isSuperAdmin ||
      scope.roles.includes("super-admin") ||
      scope.permissions.includes("platform.health.read");
    if (!technical) {
      throw new ApiError(403, "DASHBOARD_ACCESS_DENIED", "System health is restricted.");
    }
    return {
      generatedAt: new Date().toISOString(),
      api: { status: "ok" as const, supabaseConfigured: true },
      database: { status: "ready" as const, note: "ok" },
      notifications: { emailMode: "log", workerReachable: true, pendingOutboxSample: 0 },
      configurationWarnings: [],
      correlationHint: "x",
    };
  }),
  getOpeningReadiness: vi.fn(async (scope: Principal, branchId: string) => {
    const allowed =
      scope.isSuperAdmin ||
      scope.permissions.includes("branch.manage") ||
      scope.permissions.includes("admin.access") ||
      scope.permissions.includes("reservation.manage");
    if (!allowed) {
      throw new ApiError(403, "DASHBOARD_ACCESS_DENIED", "Opening readiness denied.");
    }
    if (!scope.isSuperAdmin && !scope.branchIds.includes(branchId)) {
      throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
    }
    return {
      branchId,
      branchCode: "royal-orchard",
      name: "Royal Orchard",
      status: "operating",
      operationallyActive: true,
      readinessGrade: "READY_WITH_LIMITATIONS" as const,
      blockers: [],
      nextActions: [],
      checks: {},
    };
  }),
};

const stubDeps = {
  authTokenVerifier: { getUser: async () => ({ user: null }) } as never,
  authProfileRepository: { loadPrincipalByAuthUserId: async () => null } as never,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(
    "/admin/dashboard",
    createAdminDashboardRouter({
      ...stubDeps,
      branchOrderManagement: branchOrderManagement as never,
      dashboardSummaries: dashboardSummaries as never,
    }),
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    const anyErr = err as { statusCode?: number; code?: string; message?: string };
    return res
      .status(anyErr.statusCode ?? 500)
      .json({ ok: false, error: { code: anyErr.code ?? "INTERNAL", message: anyErr.message ?? "error" } });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("D4 dashboard authz", () => {
  const app = buildApp();

  it("super admin can load system health", async () => {
    const res = await request(app)
      .get("/admin/dashboard/system-health")
      .set("Authorization", "Bearer superAdmin");
    expect(res.status).toBe(200);
    expect(res.body.data.api.status).toBe("ok");
  });

  it("platform.health.read can load system health without isSuperAdmin", async () => {
    const res = await request(app)
      .get("/admin/dashboard/system-health")
      .set("Authorization", "Bearer healthReader");
    expect(res.status).toBe(200);
  });

  it.each([
    ["cashier", "cashier"],
    ["branch_manager", "branchManager"],
    ["host", "host"],
    ["waiter", "waiter"],
    ["kitchen", "kitchen"],
    ["delivery", "delivery"],
  ] as const)("%s without platform.health.read gets 403 for system-health", async (_label, key) => {
    const res = await request(app)
      .get("/admin/dashboard/system-health")
      .set("Authorization", `Bearer ${key}`);
    expect(res.status).toBe(403);
    expect(dashboardSummaries.getSystemHealth).not.toHaveBeenCalled();
  });

  it("host with reservation.read can load table-service zeros for assigned branch", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/table-service?branchId=${B1}`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(res.body.data.reservations.todayTotal).toBe(0);
  });

  it("kitchen without reservation.read cannot load table-service", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/table-service?branchId=${B1}`)
      .set("Authorization", "Bearer kitchen");
    expect(res.status).toBe(403);
  });

  it("forged branch UUID is denied on table-service", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/table-service?branchId=${B_FORGED}`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(403);
  });

  it("invalid branch UUID returns 400", async () => {
    const res = await request(app)
      .get("/admin/dashboard/table-service?branchId=not-a-uuid")
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
  });

  it("opening-readiness authorized for host with reservation.manage on assigned branch", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/opening-readiness?branchId=${B1}`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(res.body.data.branchId).toBe(B1);
  });

  it("opening-readiness forged branch denied", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/opening-readiness?branchId=${B_FORGED}`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(403);
  });

  it("cashier without branch.manage/admin.access/reservation.manage cannot read opening-readiness", async () => {
    // Strip admin.access from cashier for this case: router requireAnyPermission must deny.
    const original = principals.cashier.permissions;
    principals.cashier.permissions = ["order.manage", "payment.manage", "reservation.read"];
    try {
      const res = await request(app)
        .get(`/admin/dashboard/opening-readiness?branchId=${B1}`)
        .set("Authorization", "Bearer cashier");
      expect(res.status).toBe(403);
      expect(dashboardSummaries.getOpeningReadiness).not.toHaveBeenCalled();
    } finally {
      principals.cashier.permissions = original;
    }
  });

  it("operations requires order.manage", async () => {
    const res = await request(app)
      .get("/admin/dashboard/operations")
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(403);
  });

  it("cashier with order.manage can load operations with genuine zero", async () => {
    const res = await request(app)
      .get(`/admin/dashboard/operations?branchId=${B1}`)
      .set("Authorization", "Bearer cashier");
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.todayOrders).toBe(0);
  });
});
