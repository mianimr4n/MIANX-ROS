/**
 * Tests for Proof of Delivery service (ADR-009).
 *
 * Verifies the service:
 *   - Captures a POD for a delivery in flight
 *   - Rejects POD when delivery is not assigned/picked-up
 *   - Rejects POD when capturing rider is not the assigned rider
 *   - Returns 409 when a POD already exists (UNIQUE)
 *   - Returns POD for branch staff / rider / customer
 *   - podExistsForDelivery returns correct boolean
 *
 * Authority: ADR-009 §2 (one POD per delivery), §3 (mandatory for delivered),
 *           §6 (server timestamps), §7 (immutability after delivered)
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
import { createDeliveryPodService } from "../src/services/deliveries/pod-service.js";

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
const BRANCH_ID = "branch-789";
const DELIVERY_ID = "delivery-abc";
const ORDER_ID = "order-xyz";

const VALID_POD_INPUT = {
  deliveryId: DELIVERY_ID,
  capturedByRiderId: RIDER_ID,
  photoStoragePath: "delivery-pod/abc/photo.jpg",
  photoUrl: "https://test.supabase.co/storage/v1/object/public/delivery-pod/abc/photo.jpg",
  recipientName: "Ahmed Khan",
  recipientRelationship: "self" as const,
  notes: "Left at door",
};

describe("ADR-009 — Proof of Delivery Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      deliveries: {
        maybeSingle: async (q) => {
          if (q.filters.id === DELIVERY_ID) {
            return {
              data: {
                id: DELIVERY_ID,
                rider_id: RIDER_ID,
                branch_id: BRANCH_ID,
                status: "picked-up",
                order_id: ORDER_ID,
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      },
      orders: {
        maybeSingle: async (q) => {
          if (q.filters.id === ORDER_ID) {
            return {
              data: { id: ORDER_ID, customer_id: ACTOR_USER_ID },
              error: null,
            };
          }
          return { data: null, error: null };
        },
      },
      riders: {
        maybeSingle: async (q) => {
          if (q.filters.user_id === ACTOR_USER_ID) {
            return { data: { id: RIDER_ID }, error: null };
          }
          return { data: null, error: null };
        },
      },
      delivery_pod: {
        insertSingle: async (payload) => ({
          data: {
            id: "pod-001",
            ...payload as Record<string, unknown>,
            captured_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        maybeSingle: async (q) => {
          if (q.filters.delivery_id === DELIVERY_ID) {
            return {
              data: {
                id: "pod-001",
                delivery_id: DELIVERY_ID,
                captured_by_rider_id: RIDER_ID,
                photo_storage_path: "delivery-pod/abc/photo.jpg",
                photo_url: "https://example.com/photo.jpg",
                signature_svg_path: null,
                signature_url: null,
                recipient_name: "Ahmed Khan",
                recipient_relationship: "self",
                notes: null,
                metadata: {},
                captured_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        selectAll: async (q) => {
          // For podExistsForDelivery (head+count)
          if (q.isHead) {
            return { data: null, error: null, count: q.filters.delivery_id === DELIVERY_ID ? 1 : 0 };
          }
          return { data: [], error: null, count: 0 };
        },
      },
    };
  });

  describe("capturePod", () => {
    it("captures a valid POD for a delivery in picked-up status", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      const row = await svc.capturePod(VALID_POD_INPUT);
      expect(row.deliveryId).toBe(DELIVERY_ID);
      expect(row.recipientName).toBe("Ahmed Khan");
      expect(calls.some((c) => c.table === "delivery_pod" && c.method === "insert")).toBe(true);
    });

    it("rejects POD when delivery is already delivered", async () => {
      const original = tableBehavior.deliveries!.maybeSingle!;
      tableBehavior.deliveries!.maybeSingle = async (q) => {
        if (q.filters.id === DELIVERY_ID) {
          return {
            data: { id: DELIVERY_ID, rider_id: RIDER_ID, status: "delivered", branch_id: BRANCH_ID, order_id: ORDER_ID },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(svc.capturePod(VALID_POD_INPUT)).rejects.toMatchObject({
        code: "DELIVERY_NOT_IN_FLIGHT",
      });
      tableBehavior.deliveries!.maybeSingle = original;
    });

    it("rejects POD when capturing rider is not the assigned rider", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(
        svc.capturePod({
          ...VALID_POD_INPUT,
          capturedByRiderId: "different-rider-id",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_RIDER_MISMATCH" });
    });

    it("rejects POD when delivery does not exist", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(
        svc.capturePod({
          ...VALID_POD_INPUT,
          deliveryId: "nonexistent-delivery",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_NOT_FOUND" });
    });

    it("rejects POD with missing recipientName", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(
        svc.capturePod({
          ...VALID_POD_INPUT,
          recipientName: "",
        }),
      ).rejects.toMatchObject({ code: "INVALID_POD" });
    });

    it("rejects POD with notes over 1000 characters", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(
        svc.capturePod({
          ...VALID_POD_INPUT,
          notes: "x".repeat(1001),
        }),
      ).rejects.toMatchObject({ code: "INVALID_POD" });
    });

    it("returns 409 when a POD already exists for the delivery", async () => {
      const original = tableBehavior.delivery_pod!.insertSingle!;
      tableBehavior.delivery_pod!.insertSingle = async () => ({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(svc.capturePod(VALID_POD_INPUT)).rejects.toMatchObject({
        code: "POD_ALREADY_EXISTS",
      });
      tableBehavior.delivery_pod!.insertSingle = original;
    });
  });

  describe("getPod", () => {
    it("returns POD for branch staff in scope", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      const row = await svc.getPod({
        actorUserId: "branch-staff-user",
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        deliveryId: DELIVERY_ID,
      });
      expect(row).not.toBeNull();
      expect(row!.deliveryId).toBe(DELIVERY_ID);
    });

    it("returns POD for super-admin", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      const row = await svc.getPod({
        actorUserId: "super-admin",
        actorBranchIds: [],
        isSuperAdmin: true,
        deliveryId: DELIVERY_ID,
      });
      expect(row).not.toBeNull();
    });

    it("returns POD for the order's customer", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      const row = await svc.getPod({
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [],
        isSuperAdmin: false,
        deliveryId: DELIVERY_ID,
      });
      expect(row).not.toBeNull();
    });

    it("rejects when actor is not branch staff, rider, or customer", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      await expect(
        svc.getPod({
          actorUserId: "random-user",
          actorBranchIds: ["other-branch"],
          isSuperAdmin: false,
          deliveryId: DELIVERY_ID,
        }),
      ).rejects.toMatchObject({ code: "BRANCH_ACCESS_DENIED" });
    });

    it("returns null when no POD exists for the delivery", async () => {
      const original = tableBehavior.delivery_pod!.maybeSingle!;
      tableBehavior.delivery_pod!.maybeSingle = async () => ({ data: null, error: null });
      const svc = createDeliveryPodService(makeEnvStatus());
      const row = await svc.getPod({
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [],
        isSuperAdmin: false,
        deliveryId: DELIVERY_ID,
      });
      expect(row).toBeNull();
      tableBehavior.delivery_pod!.maybeSingle = original;
    });
  });

  describe("podExistsForDelivery", () => {
    it("returns true when a POD exists", async () => {
      const svc = createDeliveryPodService(makeEnvStatus());
      const exists = await svc.podExistsForDelivery(DELIVERY_ID);
      expect(exists).toBe(true);
    });

    it("returns false when no POD exists", async () => {
      const original = tableBehavior.delivery_pod!.selectAll!;
      tableBehavior.delivery_pod!.selectAll = async () => ({
        data: null,
        error: null,
        count: 0,
      });
      const svc = createDeliveryPodService(makeEnvStatus());
      const exists = await svc.podExistsForDelivery(DELIVERY_ID);
      expect(exists).toBe(false);
      tableBehavior.delivery_pod!.selectAll = original;
    });
  });
});
