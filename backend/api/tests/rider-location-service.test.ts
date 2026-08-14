/**
 * Tests for rider location service (ADR-008).
 *
 * Verifies the service:
 *   - Ingests pings for riders with active deliveries
 *   - Rejects pings when delivery is not in flight
 *   - Rejects pings from a different rider
 *   - Validates lat/long bounds
 *   - Lists pings for a delivery (branch-scoped)
 *   - Returns latest ping for a rider (branch-scoped)
 *
 * Uses a fully mocked Supabase client via vi.mock — no real DB needed.
 *
 * Authority: ADR-008 §1 (storage scope), §3 (branch-scoped access)
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js
// ---------------------------------------------------------------------------

type CallRecord = { table: string; method: string; args: unknown[] };
const calls: CallRecord[] = [];

interface MockQuery {
  table: string;
  filters: Record<string, unknown>;
  order: { column: string; opts?: unknown } | null;
  limitN: number | null;
  selectCols: string | null;
  countMode: string | null;
  isHead: boolean;
}

let tableBehavior: Record<
  string,
  {
    maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    selectAll?: (q: MockQuery) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
    insertSingle?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
  }
> = {};

function makeQueryChain(table: string) {
  const q: MockQuery = {
    table,
    filters: {},
    order: null,
    limitN: null,
    selectCols: null,
    countMode: null,
    isHead: false,
  };
  const chain = {
    select(cols?: string | { count: string }, opts?: { count?: string; head?: boolean }) {
      calls.push({ table, method: "select", args: [cols, opts] });
      q.selectCols = typeof cols === "string" ? cols : null;
      if (typeof opts === "object" && opts !== null) {
        if (opts.count) q.countMode = opts.count;
        if (opts.head === true) q.isHead = true;
      }
      return chain;
    },
    eq(col: string, val: unknown) {
      calls.push({ table, method: "eq", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    order(column: string, opts?: unknown) {
      calls.push({ table, method: "order", args: [column, opts] });
      q.order = { column, opts };
      return chain;
    },
    limit(n: number) {
      calls.push({ table, method: "limit", args: [n] });
      q.limitN = n;
      return chain;
    },
    async maybeSingle() {
      calls.push({ table, method: "maybeSingle", args: [] });
      const handler = tableBehavior[table]?.maybeSingle;
      if (handler) return handler(q);
      return { data: null, error: null };
    },
    async single() {
      calls.push({ table, method: "single", args: [] });
      const handler = tableBehavior[table]?.maybeSingle;
      if (handler) return handler(q);
      return { data: null, error: null };
    },
    async then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      try {
        const handler = tableBehavior[table]?.selectAll;
        const result = handler
          ? await handler(q)
          : { data: [], error: null, count: 0 };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      } catch (err) {
        return Promise.reject(err).then(undefined, onRejected);
      }
    },
    insert(payload: unknown) {
      calls.push({ table, method: "insert", args: [payload] });
      return {
        select(cols?: string) {
          calls.push({ table, method: "insert.select", args: [cols] });
          return {
            async single() {
              const handler = tableBehavior[table]?.insertSingle;
              if (handler) return handler(payload);
              return { data: null, error: null };
            },
          };
        },
      };
    },
  };
  return chain;
}

const mockSupabaseClient = {
  from(table: string) {
    calls.push({ table, method: "from", args: [] });
    return makeQueryChain(table);
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { EnvironmentStatus } from "../src/config/env.js";
import { createRiderLocationService } from "../src/services/deliveries/rider-location-service.js";

function makeEnvStatus(): EnvironmentStatus {
  return {
    isReady: true,
    safetyBlockers: [],
    issues: [],
    config: {
      supabaseUrl: "https://test.supabase.co",
      supabaseServiceRoleKey: "test-service-role-key",
      envClass: "test",
      port: 3000,
      corsOrigin: "http://localhost:3000",
    } as EnvironmentStatus["config"],
  } as EnvironmentStatus;
}

const ACTOR_USER_ID = "user-123";
const RIDER_ID = "rider-456";
const RIDER_USER_ID = ACTOR_USER_ID;
const BRANCH_ID = "branch-789";
const DELIVERY_ID = "delivery-abc";

describe("ADR-008 — Rider Location Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      riders: {
        maybeSingle: async (q) => {
          if (q.filters.id === RIDER_ID) {
            return {
              data: { id: RIDER_ID, user_id: RIDER_USER_ID, branch_id: BRANCH_ID, status: "available" },
              error: null,
            };
          }
          // For actor lookup by user_id
          if (q.filters.user_id === ACTOR_USER_ID) {
            return { data: { id: RIDER_ID }, error: null };
          }
          return { data: null, error: null };
        },
      },
      deliveries: {
        maybeSingle: async (q) => {
          if (q.filters.id === DELIVERY_ID) {
            return {
              data: {
                id: DELIVERY_ID,
                rider_id: RIDER_ID,
                branch_id: BRANCH_ID,
                status: "assigned",
                order_id: "order-xyz",
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      },
      rider_locations: {
        insertSingle: async (payload) => {
          return {
            data: {
              id: 1,
              ...payload as Record<string, unknown>,
              created_at: new Date().toISOString(),
            },
            error: null,
          };
        },
        selectAll: async () => ({
          data: [
            {
              id: 1,
              rider_id: RIDER_ID,
              delivery_id: DELIVERY_ID,
              latitude: 31.5204,
              longitude: 74.3587,
              heading: 180,
              speed: 30,
              accuracy_m: 5,
              recorded_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
          count: 1,
        }),
        maybeSingle: async () => ({
          data: {
            id: 1,
            rider_id: RIDER_ID,
            delivery_id: DELIVERY_ID,
            latitude: 31.5204,
            longitude: 74.3587,
            heading: 180,
            speed: 30,
            accuracy_m: 5,
            recorded_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      },
    };
  });

  describe("ingestPing", () => {
    it("ingests a valid ping for a rider with an active delivery", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      const row = await svc.ingestPing({
        actorUserId: ACTOR_USER_ID,
        ping: {
          riderId: RIDER_ID,
          deliveryId: DELIVERY_ID,
          latitude: 31.5204,
          longitude: 74.3587,
          heading: 180,
          speed: 30,
          accuracyM: 5,
        },
      });
      expect(row.riderId).toBe(RIDER_ID);
      expect(row.latitude).toBeCloseTo(31.5204);
      // Verify insert was called on rider_locations
      expect(calls.some((c) => c.table === "rider_locations" && c.method === "insert")).toBe(true);
    });

    it("rejects ping when rider does not exist", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: "nonexistent-rider",
            latitude: 31.5204,
            longitude: 74.3587,
          },
        }),
      ).rejects.toMatchObject({ code: "RIDER_NOT_FOUND" });
    });

    it("rejects ping when delivery is not in flight (delivered)", async () => {
      const original = tableBehavior.deliveries!.maybeSingle!;
      tableBehavior.deliveries!.maybeSingle = async (q) => {
        if (q.filters.id === DELIVERY_ID) {
          return {
            data: { id: DELIVERY_ID, rider_id: RIDER_ID, status: "delivered", branch_id: BRANCH_ID },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            deliveryId: DELIVERY_ID,
            latitude: 31.5204,
            longitude: 74.3587,
          },
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_NOT_IN_FLIGHT" });
      tableBehavior.deliveries!.maybeSingle = original;
    });

    it("rejects ping when rider is not the assigned rider", async () => {
      const original = tableBehavior.deliveries!.maybeSingle!;
      tableBehavior.deliveries!.maybeSingle = async (q) => {
        if (q.filters.id === DELIVERY_ID) {
          return {
            data: { id: DELIVERY_ID, rider_id: "another-rider", status: "assigned", branch_id: BRANCH_ID },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            deliveryId: DELIVERY_ID,
            latitude: 31.5204,
            longitude: 74.3587,
          },
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_RIDER_MISMATCH" });
      tableBehavior.deliveries!.maybeSingle = original;
    });

    it("rejects ping with latitude out of bounds", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            latitude: 999,
            longitude: 74.3587,
          },
        }),
      ).rejects.toMatchObject({ code: "INVALID_PING" });
    });

    it("rejects ping with longitude out of bounds", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            latitude: 31.5204,
            longitude: 999,
          },
        }),
      ).rejects.toMatchObject({ code: "INVALID_PING" });
    });

    it("rejects ping with negative speed", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            latitude: 31.5204,
            longitude: 74.3587,
            speed: -10,
          },
        }),
      ).rejects.toMatchObject({ code: "INVALID_PING" });
    });

    it("rejects ping from a different user (not the rider)", async () => {
      const original = tableBehavior.riders!.maybeSingle!;
      tableBehavior.riders!.maybeSingle = async (q) => {
        if (q.filters.id === RIDER_ID) {
          return {
            data: { id: RIDER_ID, user_id: "different-user", branch_id: BRANCH_ID, status: "available" },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.ingestPing({
          actorUserId: ACTOR_USER_ID,
          ping: {
            riderId: RIDER_ID,
            latitude: 31.5204,
            longitude: 74.3587,
          },
        }),
      ).rejects.toMatchObject({ code: "RIDER_PING_FORBIDDEN" });
      tableBehavior.riders!.maybeSingle = original;
    });
  });

  describe("listForDelivery", () => {
    it("returns pings for a delivery the actor can access (branch staff)", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      const rows = await svc.listForDelivery({
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        deliveryId: DELIVERY_ID,
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].deliveryId).toBe(DELIVERY_ID);
    });

    it("rejects when delivery is outside branch scope", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.listForDelivery({
          actorUserId: "branch-staff-user-without-rider",
          actorBranchIds: ["other-branch"],
          isSuperAdmin: false,
          deliveryId: DELIVERY_ID,
        }),
      ).rejects.toMatchObject({ code: "BRANCH_ACCESS_DENIED" });
    });

    it("allows super-admin to access any delivery", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      const rows = await svc.listForDelivery({
        actorUserId: "super-admin-user",
        actorBranchIds: [],
        isSuperAdmin: true,
        deliveryId: DELIVERY_ID,
      });
      expect(rows).toHaveLength(1);
    });

    it("returns 404 when delivery does not exist", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.listForDelivery({
          actorUserId: ACTOR_USER_ID,
          actorBranchIds: [BRANCH_ID],
          isSuperAdmin: false,
          deliveryId: "nonexistent-delivery",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_NOT_FOUND" });
    });
  });

  describe("getLatestForRider", () => {
    it("returns the latest ping for a rider in the actor's branch", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      const row = await svc.getLatestForRider({
        actorUserId: "branch-staff-user",
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        riderId: RIDER_ID,
      });
      expect(row).not.toBeNull();
      expect(row!.riderId).toBe(RIDER_ID);
    });

    it("returns null when rider has no pings", async () => {
      const original = tableBehavior.rider_locations!.maybeSingle!;
      tableBehavior.rider_locations!.maybeSingle = async () => ({ data: null, error: null });
      const svc = createRiderLocationService(makeEnvStatus());
      const row = await svc.getLatestForRider({
        actorUserId: "branch-staff-user",
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        riderId: RIDER_ID,
      });
      expect(row).toBeNull();
      tableBehavior.rider_locations!.maybeSingle = original;
    });

    it("rejects when rider is outside branch scope", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      await expect(
        svc.getLatestForRider({
          actorUserId: "branch-staff-user",
          actorBranchIds: ["other-branch"],
          isSuperAdmin: false,
          riderId: RIDER_ID,
        }),
      ).rejects.toMatchObject({ code: "BRANCH_ACCESS_DENIED" });
    });

    it("allows the rider themselves to read their own latest ping", async () => {
      const svc = createRiderLocationService(makeEnvStatus());
      const row = await svc.getLatestForRider({
        actorUserId: RIDER_USER_ID,
        actorBranchIds: [],
        isSuperAdmin: false,
        riderId: RIDER_ID,
      });
      expect(row).not.toBeNull();
    });
  });
});
