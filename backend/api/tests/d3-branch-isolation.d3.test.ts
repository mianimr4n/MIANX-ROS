import { describe, expect, it } from "vitest";

import { createReservationsService } from "../src/services/reservations/management.js";
import { createFloorConfigurationService } from "../src/services/floor/configuration.js";
import { createTableServiceOperations } from "../src/services/dine-in/table-service.js";
import type { BranchActorScope } from "../src/services/tables/management.js";
import { ApiError } from "../src/common/http.js";
import type { EnvironmentStatus } from "../src/config/env.js";

/**
 * D3 — service-layer branch isolation (Journey K).
 *
 * The canonical branch guard is `assertBranchInScope` inside each D3 service.
 * It runs BEFORE any Supabase client is created, so these assertions prove
 * cross-branch reads/writes fail server-side without needing a live database.
 */

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";

const envStatus = {
  isReady: true,
  issues: [],
  config: {
    port: 4000,
    corsOrigin: "http://localhost:3000",
    jwtSecret: "x".repeat(20),
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon",
    supabaseServiceRoleKey: "service",
  },
} as unknown as EnvironmentStatus;

const branchAStaff: BranchActorScope = {
  userId: "u-a",
  isSuperAdmin: false,
  roles: ["host"],
  branchIds: [B1],
};

async function expect403(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toMatchObject({
    statusCode: 403,
    code,
  });
}

describe("D3 — reservations service branch isolation", () => {
  const service = createReservationsService(envStatus);

  it("availability search for another branch is denied", async () => {
    await expect403(
      service.searchAvailability(branchAStaff, { branchId: B2, date: "2026-08-14", partySize: 2 }),
      "RESERVATION_ACCESS_DENIED",
    );
  });

  it("creating a reservation for another branch is denied", async () => {
    await expect403(
      service.createReservation(branchAStaff, {
        branchId: B2,
        guestName: "Guest",
        startAt: "2026-08-14T19:00:00+05:00",
        partySize: 2,
        idempotencyKey: "k-1",
      } as never),
      "RESERVATION_ACCESS_DENIED",
    );
  });

  it("listing another branch's reservations is denied", async () => {
    await expect403(
      service.listReservations(branchAStaff, { branchId: B2, limit: 10, offset: 0 }),
      "RESERVATION_ACCESS_DENIED",
    );
  });

  it("adding a waitlist entry to another branch is denied", async () => {
    await expect403(
      service.addWaitlistEntry(branchAStaff, {
        branchId: B2,
        guestName: "Guest",
        partySize: 2,
      } as never),
      "RESERVATION_ACCESS_DENIED",
    );
  });

  it("reading another branch's daily report is denied", async () => {
    await expect403(
      service.getDailyReport(branchAStaff, B2, "2026-08-14"),
      "RESERVATION_ACCESS_DENIED",
    );
  });
});

describe("D3 — floor configuration service branch isolation", () => {
  const service = createFloorConfigurationService(envStatus);

  it("reading another branch's configuration is denied", async () => {
    await expect403(service.getConfiguration(branchAStaff, B2), "FLOOR_ACCESS_DENIED");
  });

  it("creating a floor in another branch is denied", async () => {
    await expect403(
      service.createFloor(branchAStaff, { branchId: B2, code: "g", displayName: "Ground" } as never),
      "FLOOR_ACCESS_DENIED",
    );
  });

  it("listing another branch's combinations is denied", async () => {
    await expect403(service.listCombinations(branchAStaff, B2), "FLOOR_ACCESS_DENIED");
  });
});

describe("D3 — table service operations branch isolation", () => {
  const service = createTableServiceOperations(envStatus);

  it("reading another branch's live floor state is denied", async () => {
    await expect403(service.getLiveFloorState(branchAStaff, B2), "SESSION_ACCESS_DENIED");
  });

  it("seating a walk-in in another branch is denied", async () => {
    await expect403(
      service.seatWalkIn(branchAStaff, {
        branchId: B2,
        tableIds: [B1],
        partySize: 2,
        guestName: "Guest",
      } as never),
      "SESSION_ACCESS_DENIED",
    );
  });

  it("listing another branch's active sessions is denied", async () => {
    await expect403(service.listActiveSessions(branchAStaff, B2), "SESSION_ACCESS_DENIED");
  });
});

describe("D3 — ApiError shape sanity", () => {
  it("access-denied errors are 403 ApiError instances", async () => {
    const service = createReservationsService(envStatus);
    try {
      await service.getDailyReport(branchAStaff, B2, "2026-08-14");
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(403);
    }
  });
});
