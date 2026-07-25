import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * D3 — router RBAC gating for floor, reservations, waitlist, and table service.
 *
 * Proves each endpoint enforces the correct permission independently:
 *   - reservation.read  → reads (availability, lists, floor state)
 *   - reservation.manage → reservation/waitlist mutations
 *   - dinein.manage     → seating and live table-service actions
 *   - floor.manage      → floor/area/table/combination configuration
 *
 * Services are mocked; this suite asserts the authorization boundary only.
 */

const B1 = "11111111-1111-4111-8111-111111111111";
const RES_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TABLE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
  waiter: {
    authUserId: "auth-waiter",
    userId: "u-waiter",
    email: "waiter@example.com",
    userType: "staff",
    status: "active",
    roles: ["waiter"],
    // waiter can read + do table service, but NOT manage bookings or floor config
    permissions: ["reservation.read", "dinein.manage", "order.manage"],
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
    permissions: ["kitchen.read"],
    branchIds: [B1],
    isSuperAdmin: false,
  },
  admin: {
    authUserId: "auth-admin",
    userId: "u-admin",
    email: "admin@example.com",
    userType: "staff",
    status: "active",
    roles: ["admin"],
    permissions: ["floor.manage", "reservation.read", "reservation.manage", "dinein.manage"],
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

import { createAdminFloorRouter } from "../src/modules/admin/floor.js";
import {
  createAdminReservationsRouter,
  createAdminWaitlistRouter,
} from "../src/modules/admin/reservations.js";
import { createAdminTableSessionsRouter } from "../src/modules/admin/table-sessions.js";
import { ApiError } from "../src/common/http.js";

// ---- mocked services (only the methods the tested routes call) ---------------

const reservations = {
  searchAvailability: vi.fn().mockResolvedValue({ slots: [], policy: {} }),
  getDailyReport: vi.fn().mockResolvedValue({ totalReservations: 0 }),
  createReservation: vi.fn().mockResolvedValue({ id: RES_ID, reservationNumber: "R-1", status: "pending", idempotentReplay: false }),
  listReservations: vi.fn().mockResolvedValue({ reservations: [], total: 0 }),
  getReservation: vi.fn().mockResolvedValue({ id: RES_ID }),
  updateReservation: vi.fn().mockResolvedValue({ id: RES_ID }),
  transitionReservation: vi.fn().mockResolvedValue({ id: RES_ID }),
  assignTables: vi.fn().mockResolvedValue({ id: RES_ID }),
  seatReservation: vi.fn().mockResolvedValue({ sessionId: "s-1", sessionNumber: "S-1" }),
  addWaitlistEntry: vi.fn().mockResolvedValue({ id: "w-1" }),
  listWaitlist: vi.fn().mockResolvedValue({ entries: [], total: 0 }),
  updateWaitlistEntry: vi.fn().mockResolvedValue({ id: "w-1" }),
  transitionWaitlistEntry: vi.fn().mockResolvedValue({ id: "w-1" }),
  seatWaitlistEntry: vi.fn().mockResolvedValue({ sessionId: "s-1", sessionNumber: "S-1" }),
};

const floor = {
  getConfiguration: vi.fn().mockResolvedValue({ floors: [], areas: [], tables: [] }),
  createFloor: vi.fn().mockResolvedValue({ id: "f-1" }),
  updateFloor: vi.fn().mockResolvedValue({ id: "f-1" }),
  createArea: vi.fn().mockResolvedValue({ id: "a-1" }),
  updateArea: vi.fn().mockResolvedValue({ id: "a-1" }),
  updateTableLayout: vi.fn().mockResolvedValue({ id: TABLE_ID }),
  transitionTableStatus: vi.fn().mockResolvedValue({ id: TABLE_ID }),
  listCombinations: vi.fn().mockResolvedValue([]),
  createCombination: vi.fn().mockResolvedValue({ id: "c-1" }),
  updateCombination: vi.fn().mockResolvedValue({ id: "c-1" }),
};

const tableService = {
  getLiveFloorState: vi.fn().mockResolvedValue({ tables: [], waitlistCount: 0 }),
  seatWalkIn: vi.fn().mockResolvedValue({ sessionId: "s-1", sessionNumber: "S-1" }),
  listActiveSessions: vi.fn().mockResolvedValue([]),
  getSession: vi.fn().mockResolvedValue({ id: "s-1" }),
  transferTables: vi.fn().mockResolvedValue({ sessionId: "s-1", tableIds: [] }),
  assignServer: vi.fn().mockResolvedValue({ id: "s-1" }),
  requestBill: vi.fn().mockResolvedValue({ id: "s-1" }),
  closeSession: vi.fn().mockResolvedValue({ sessionId: "s-1", releasedTableIds: [] }),
  cancelSession: vi.fn().mockResolvedValue(undefined),
};

const stubDeps = {
  authTokenVerifier: { getUser: async () => ({ user: null }) } as never,
  authProfileRepository: { loadPrincipalByAuthUserId: async () => null } as never,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin/floor", createAdminFloorRouter({ ...stubDeps, floorConfiguration: floor as never }));
  app.use(
    "/api/v1/admin/reservations",
    createAdminReservationsRouter({ ...stubDeps, reservations: reservations as never }),
  );
  app.use(
    "/api/v1/admin/waitlist",
    createAdminWaitlistRouter({ ...stubDeps, reservations: reservations as never }),
  );
  app.use(
    "/api/v1/admin/table-service",
    createAdminTableSessionsRouter({ ...stubDeps, tableService: tableService as never }),
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

describe("D3 RBAC — reservation.read reads", () => {
  it("host can read availability", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations/availability?branchId=${B1}&date=2026-08-14&partySize=2`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(reservations.searchAvailability).toHaveBeenCalledOnce();
  });

  it("waiter can read the live floor state", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/table-service/floor-state?branchId=${B1}`)
      .set("Authorization", "Bearer waiter");
    expect(res.status).toBe(200);
    expect(tableService.getLiveFloorState).toHaveBeenCalledOnce();
  });

  it("kitchen cannot read reservations", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/reservations?branchId=${B1}`)
      .set("Authorization", "Bearer kitchen");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(reservations.listReservations).not.toHaveBeenCalled();
  });

  it("unauthenticated request is rejected", async () => {
    const res = await request(buildApp()).get(`/api/v1/admin/reservations?branchId=${B1}`);
    expect(res.status).toBe(401);
  });
});

describe("D3 RBAC — reservation.manage mutations", () => {
  it("host can create a reservation (with idempotency key)", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/reservations")
      .set("Authorization", "Bearer host")
      .set("Idempotency-Key", "idem-1")
      .send({ branchId: B1, guestName: "Guest", startAt: "2026-08-14T19:00:00+05:00", partySize: 2 });
    expect(res.status).toBe(201);
    expect(reservations.createReservation).toHaveBeenCalledOnce();
  });

  it("reservation create without Idempotency-Key is rejected", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/reservations")
      .set("Authorization", "Bearer host")
      .send({ branchId: B1, guestName: "Guest", startAt: "2026-08-14T19:00:00+05:00", partySize: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(reservations.createReservation).not.toHaveBeenCalled();
  });

  it("waiter cannot create a reservation (lacks reservation.manage)", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/reservations")
      .set("Authorization", "Bearer waiter")
      .set("Idempotency-Key", "idem-2")
      .send({ branchId: B1, guestName: "Guest", startAt: "2026-08-14T19:00:00+05:00", partySize: 2 });
    expect(res.status).toBe(403);
    expect(reservations.createReservation).not.toHaveBeenCalled();
  });

  it("waiter cannot add to the waitlist (lacks reservation.manage)", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/waitlist")
      .set("Authorization", "Bearer waiter")
      .send({ branchId: B1, guestName: "Guest", partySize: 2 });
    expect(res.status).toBe(403);
    expect(reservations.addWaitlistEntry).not.toHaveBeenCalled();
  });
});

describe("D3 RBAC — dinein.manage seating / table service", () => {
  it("waiter can seat a reservation", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/admin/reservations/${RES_ID}/seat`)
      .set("Authorization", "Bearer waiter")
      .send({ tableIds: [TABLE_ID] });
    expect(res.status).toBe(201);
    expect(reservations.seatReservation).toHaveBeenCalledOnce();
  });

  it("waiter can seat a walk-in", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/table-service/sessions/walk-in")
      .set("Authorization", "Bearer waiter")
      .send({ branchId: B1, tableIds: [TABLE_ID], partySize: 2, guestName: "Guest" });
    expect(res.status).toBe(201);
    expect(tableService.seatWalkIn).toHaveBeenCalledOnce();
  });

  it("kitchen cannot seat a walk-in", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/table-service/sessions/walk-in")
      .set("Authorization", "Bearer kitchen")
      .send({ branchId: B1, tableIds: [TABLE_ID], partySize: 2, guestName: "Guest" });
    expect(res.status).toBe(403);
    expect(tableService.seatWalkIn).not.toHaveBeenCalled();
  });
});

describe("D3 RBAC — floor.manage configuration", () => {
  it("admin can create a floor", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/floor/floors")
      .set("Authorization", "Bearer admin")
      .send({ branchId: B1, code: "ground", displayName: "Ground" });
    expect(res.status).toBe(201);
    expect(floor.createFloor).toHaveBeenCalledOnce();
  });

  it("host cannot configure floors (lacks floor.manage)", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/floor/floors")
      .set("Authorization", "Bearer host")
      .send({ branchId: B1, code: "ground", displayName: "Ground" });
    expect(res.status).toBe(403);
    expect(floor.createFloor).not.toHaveBeenCalled();
  });

  it("waiter cannot create a table combination", async () => {
    const res = await request(buildApp())
      .post("/api/v1/admin/floor/combinations")
      .set("Authorization", "Bearer waiter")
      .send({ branchId: B1, code: "fam", displayName: "Family", tableIds: [TABLE_ID, RES_ID] });
    expect(res.status).toBe(403);
    expect(floor.createCombination).not.toHaveBeenCalled();
  });

  it("host CAN read floor configuration (reservation.read)", async () => {
    const res = await request(buildApp())
      .get(`/api/v1/admin/floor/configuration?branchId=${B1}`)
      .set("Authorization", "Bearer host");
    expect(res.status).toBe(200);
    expect(floor.getConfiguration).toHaveBeenCalledOnce();
  });

  it("host can transition table housekeeping status (dinein.manage)", async () => {
    const res = await request(buildApp())
      .post(`/api/v1/admin/floor/tables/${TABLE_ID}/status`)
      .set("Authorization", "Bearer host")
      .send({ toStatus: "cleaning" });
    expect(res.status).toBe(200);
    expect(floor.transitionTableStatus).toHaveBeenCalledOnce();
  });
});
