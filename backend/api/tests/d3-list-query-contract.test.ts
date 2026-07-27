import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D3 — reservations + waitlist list query contract.
 *
 * Production failure mode: frontend sent limit=200 while schemas cap at 100,
 * yielding VALIDATION_ERROR "Invalid list query." / "Invalid waitlist query."
 */

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

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

const host: Principal = {
  authUserId: "auth-host",
  userId: "u-host",
  email: "host@example.com",
  userType: "staff",
  status: "active",
  roles: ["host"],
  permissions: ["reservation.read", "reservation.manage"],
  branchIds: [B1],
  isSuperAdmin: false,
};

const superAdmin: Principal = {
  authUserId: "auth-sa",
  userId: "u-sa",
  email: "founder@example.com",
  userType: "staff",
  status: "active",
  roles: ["super-admin"],
  permissions: ["reservation.read", "reservation.manage", "dinein.manage"],
  branchIds: [],
  isSuperAdmin: true,
};

const principals: Record<string, Principal> = { host, superAdmin };

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

import {
  createAdminReservationsRouter,
  createAdminWaitlistRouter,
} from "../src/modules/admin/reservations.js";
import { ApiError } from "../src/common/http.js";

const reservations = {
  listReservations: vi.fn().mockResolvedValue({ reservations: [], total: 0 }),
  listWaitlist: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
  getDailyReport: vi.fn().mockResolvedValue({
    totalReservations: 0,
    covers: 0,
    seatedCovers: 0,
    noShows: 0,
    cancellations: 0,
    diningSessions: 0,
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
    "/api/v1/admin/reservations",
    createAdminReservationsRouter({ ...stubDeps, reservations: reservations as never }),
  );
  app.use(
    "/api/v1/admin/waitlist",
    createAdminWaitlistRouter({ ...stubDeps, reservations: reservations as never }),
  );
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      });
    }
    return res.status(500).json({ ok: false, error: { code: "INTERNAL", message: "error" } });
  });
  return app;
}

describe("D3 reservations list query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid date + branch + zero records returns success empty collection", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}&date=2026-07-27&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ total: 0 });
    expect(reservations.listReservations).toHaveBeenCalledWith(
      expect.objectContaining({ isSuperAdmin: false, branchIds: [B1] }),
      expect.objectContaining({ branchId: B1, date: "2026-07-27", limit: 100 }),
    );
  });

  it("rejects limit above 100 (Production failure mode)", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}&date=2026-07-27&limit=200`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Invalid list query.");
    expect(reservations.listReservations).not.toHaveBeenCalled();
  });

  it("rejects invalid date", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}&date=27-07-2026&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid list query.");
    expect(reservations.listReservations).not.toHaveBeenCalled();
  });

  it("rejects invalid status", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}&date=2026-07-27&status=bogus&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid list query.");
    expect(reservations.listReservations).not.toHaveBeenCalled();
  });

  it("super-admin Royal Orchard (branch UUID) access succeeds", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}&date=2026-07-27&limit=100`)
      .set("Authorization", "Bearer superAdmin");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(reservations.listReservations).toHaveBeenCalledWith(
      expect.objectContaining({ isSuperAdmin: true }),
      expect.objectContaining({ branchId: B1 }),
    );
  });
});

describe("D3 waitlist list query contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid branch + zero records returns success empty collection", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/waitlist?branchId=${B1}&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toEqual({ total: 0 });
    expect(reservations.listWaitlist).toHaveBeenCalledOnce();
  });

  it("rejects limit above 100 (Production failure mode)", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/waitlist?branchId=${B1}&limit=200`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Invalid waitlist query.");
    expect(reservations.listWaitlist).not.toHaveBeenCalled();
  });

  it("rejects invalid status", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/waitlist?branchId=${B1}&status=queued&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid waitlist query.");
    expect(reservations.listWaitlist).not.toHaveBeenCalled();
  });

  it("super-admin branch access succeeds", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/waitlist?branchId=${B1}&limit=100`)
      .set("Authorization", "Bearer superAdmin");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("rejects non-uuid branchId", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/waitlist?branchId=royal-orchard&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Invalid waitlist query.");
    expect(reservations.listWaitlist).not.toHaveBeenCalled();
  });
});

describe("D3 list query — unauthorized branch remains service-layer concern", () => {
  it("router still forwards foreign branchId to service for host (isolation at service)", async () => {
    // Router validates UUID shape only; assertBranchInScope runs in the service.
    // This proves the router does not invent cross-branch allowance.
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B2}&date=2026-07-27&limit=100`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(reservations.listReservations).toHaveBeenCalledWith(
      expect.objectContaining({ branchIds: [B1], isSuperAdmin: false }),
      expect.objectContaining({ branchId: B2 }),
    );
  });
});
