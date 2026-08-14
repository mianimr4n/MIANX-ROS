/**
 * Tests for Cash on Delivery (COD) service (ADR-010).
 *
 * Verifies the service:
 *   - Records a COD collection at delivery time
 *   - Rejects duplicate COD (one per delivery UNIQUE)
 *   - Rejects COD when delivery is not picked-up/delivered
 *   - Rejects COD when rider is not the assigned rider
 *   - Lists collections with branch scope + filters
 *   - Reconciles a COD: equal amount → reconciled
 *   - Reconciles a COD: less amount → shortage
 *   - Reconciles a COD: more amount → overage
 *   - Idempotent reconciliation (already reconciled → no-op)
 *   - Resolves shortage/overage → reconciled
 *   - Authorization: branch-manager only for reconcile
 *
 * Authority: ADR-010 §1 (one COD per delivery), §3 (reconciliation states),
 *           §4 (GL posting trigger), §6 (branch-scoped access)
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
  rangeFrom: number | null;
  rangeTo: number | null;
}

let tableBehavior: Record<
  string,
  {
    maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    selectAll?: (q: MockQuery) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
    insertSingle?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
    updateSingle?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
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
    rangeFrom: null,
    rangeTo: null,
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
    in(col: string, val: unknown[]) {
      calls.push({ table, method: "in", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    gte(col: string, val: unknown) {
      calls.push({ table, method: "gte", args: [col, val] });
      return chain;
    },
    lte(col: string, val: unknown) {
      calls.push({ table, method: "lte", args: [col, val] });
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
    range(from: number, to: number) {
      calls.push({ table, method: "range", args: [from, to] });
      q.rangeFrom = from;
      q.rangeTo = to;
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
    update(payload: unknown) {
      calls.push({ table, method: "update", args: [payload] });
      return {
        eq(col: string, val: unknown) {
          calls.push({ table, method: "update.eq", args: [col, val] });
          return {
            select(cols?: string) {
              calls.push({ table, method: "update.select", args: [cols] });
              return {
                async single() {
                  const handler = tableBehavior[table]?.updateSingle;
                  if (handler) return handler(payload);
                  return { data: null, error: null };
                },
              };
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
import { createCodService } from "../src/services/deliveries/cod-service.js";

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
const COD_ID = "cod-001";

const VALID_COD_INPUT = {
  deliveryId: DELIVERY_ID,
  collectedByRiderId: RIDER_ID,
  amount: 1500,
};

describe("ADR-010 — COD Service", () => {
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
                status: "delivered",
                order_id: ORDER_ID,
              },
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
      cod_collections: {
        insertSingle: async (payload) => ({
          data: {
            id: COD_ID,
            ...payload as Record<string, unknown>,
            reconciliation_status: "pending",
            reconciled_amount: null,
            reconciled_at: null,
            reconciled_by: null,
            journal_entry_id: null,
            collected_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        maybeSingle: async (q) => {
          if (q.filters.id === COD_ID) {
            return {
              data: {
                id: COD_ID,
                delivery_id: DELIVERY_ID,
                branch_id: BRANCH_ID,
                order_id: ORDER_ID,
                amount: 1500,
                currency: "PKR",
                collected_by_rider_id: RIDER_ID,
                customer_received_by: "Ahmed",
                notes: null,
                reconciliation_status: "pending",
                reconciled_amount: null,
                reconciled_at: null,
                reconciled_by: null,
                journal_entry_id: null,
                metadata: {},
                collected_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        selectAll: async () => ({
          data: [
            {
              id: COD_ID,
              delivery_id: DELIVERY_ID,
              branch_id: BRANCH_ID,
              order_id: ORDER_ID,
              amount: 1500,
              currency: "PKR",
              collected_by_rider_id: RIDER_ID,
              customer_received_by: "Ahmed",
              notes: null,
              reconciliation_status: "pending",
              reconciled_amount: null,
              reconciled_at: null,
              reconciled_by: null,
              journal_entry_id: null,
              metadata: {},
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
          count: 1,
        }),
        updateSingle: async (payload) => ({
          data: {
            id: COD_ID,
            delivery_id: DELIVERY_ID,
            branch_id: BRANCH_ID,
            order_id: ORDER_ID,
            amount: 1500,
            currency: "PKR",
            collected_by_rider_id: RIDER_ID,
            customer_received_by: "Ahmed",
            notes: null,
            ...(payload as Record<string, unknown>),
            metadata: {},
            collected_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      },
    };
  });

  describe("recordCollection", () => {
    it("records a valid COD collection for a delivered order", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.recordCollection(VALID_COD_INPUT);
      expect(row.deliveryId).toBe(DELIVERY_ID);
      expect(row.amount).toBe(1500);
      expect(row.reconciliationStatus).toBe("pending");
      expect(calls.some((c) => c.table === "cod_collections" && c.method === "insert")).toBe(true);
    });

    it("rejects COD when delivery is in pending status", async () => {
      const original = tableBehavior.deliveries!.maybeSingle!;
      tableBehavior.deliveries!.maybeSingle = async (q) => {
        if (q.filters.id === DELIVERY_ID) {
          return {
            data: { id: DELIVERY_ID, rider_id: RIDER_ID, status: "pending", branch_id: BRANCH_ID, order_id: ORDER_ID },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createCodService(makeEnvStatus());
      await expect(svc.recordCollection(VALID_COD_INPUT)).rejects.toMatchObject({
        code: "DELIVERY_NOT_READY_FOR_COD",
      });
      tableBehavior.deliveries!.maybeSingle = original;
    });

    it("rejects COD when rider is not the assigned rider", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.recordCollection({
          ...VALID_COD_INPUT,
          collectedByRiderId: "different-rider",
        }),
      ).rejects.toMatchObject({ code: "DELIVERY_RIDER_MISMATCH" });
    });

    it("rejects COD with negative amount", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.recordCollection({
          ...VALID_COD_INPUT,
          amount: -100,
        }),
      ).rejects.toMatchObject({ code: "INVALID_COD" });
    });

    it("returns 409 when a COD already exists for the delivery", async () => {
      const original = tableBehavior.cod_collections!.insertSingle!;
      tableBehavior.cod_collections!.insertSingle = async () => ({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });
      const svc = createCodService(makeEnvStatus());
      await expect(svc.recordCollection(VALID_COD_INPUT)).rejects.toMatchObject({
        code: "COD_ALREADY_EXISTS",
      });
      tableBehavior.cod_collections!.insertSingle = original;
    });
  });

  describe("getCollection", () => {
    it("returns COD collection for branch staff in scope", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.getCollection({
        actorUserId: "branch-staff-user",
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        codCollectionId: COD_ID,
      });
      expect(row.id).toBe(COD_ID);
    });

    it("returns COD collection for super-admin", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.getCollection({
        actorUserId: "super-admin",
        actorBranchIds: [],
        isSuperAdmin: true,
        codCollectionId: COD_ID,
      });
      expect(row.id).toBe(COD_ID);
    });

    it("rejects when COD is outside branch scope and actor is not the rider", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.getCollection({
          actorUserId: "random-user",
          actorBranchIds: ["other-branch"],
          isSuperAdmin: false,
          codCollectionId: COD_ID,
        }),
      ).rejects.toMatchObject({ code: "BRANCH_ACCESS_DENIED" });
    });

    it("returns 404 when COD does not exist", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.getCollection({
          actorUserId: ACTOR_USER_ID,
          actorBranchIds: [],
          isSuperAdmin: false,
          codCollectionId: "nonexistent-cod",
        }),
      ).rejects.toMatchObject({ code: "COD_NOT_FOUND" });
    });
  });

  describe("listCollections", () => {
    it("lists COD collections for branch staff", async () => {
      const svc = createCodService(makeEnvStatus());
      const result = await svc.listCollections({
        actorUserId: "branch-staff-user",
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        filters: {},
      });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("allows super-admin to list all collections", async () => {
      const svc = createCodService(makeEnvStatus());
      const result = await svc.listCollections({
        actorUserId: "super-admin",
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: {},
      });
      expect(result.rows).toHaveLength(1);
    });

    it("rejects listing when non-super-admin has no branch scope", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.listCollections({
          actorUserId: "branch-staff-user",
          actorBranchIds: [],
          isSuperAdmin: false,
          filters: {},
        }),
      ).rejects.toMatchObject({ code: "BRANCH_SCOPE_REQUIRED" });
    });
  });

  describe("reconcile", () => {
    it("reconciles with equal amount → status = reconciled", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.reconcile({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        reconciledAmount: 1500,
      });
      expect(row.reconciliationStatus).toBe("reconciled");
    });

    it("reconciles with less amount → status = shortage", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.reconcile({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        reconciledAmount: 1400,
      });
      expect(row.reconciliationStatus).toBe("shortage");
    });

    it("reconciles with more amount → status = overage", async () => {
      const svc = createCodService(makeEnvStatus());
      const row = await svc.reconcile({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        reconciledAmount: 1600,
      });
      expect(row.reconciliationStatus).toBe("overage");
    });

    it("is idempotent when already reconciled", async () => {
      const original = tableBehavior.cod_collections!.maybeSingle!;
      tableBehavior.cod_collections!.maybeSingle = async (q) => {
        if (q.filters.id === COD_ID) {
          return {
            data: {
              id: COD_ID,
              delivery_id: DELIVERY_ID,
              branch_id: BRANCH_ID,
              order_id: ORDER_ID,
              amount: 1500,
              currency: "PKR",
              collected_by_rider_id: RIDER_ID,
              customer_received_by: null,
              notes: null,
              reconciliation_status: "reconciled",
              reconciled_amount: 1500,
              reconciled_at: new Date().toISOString(),
              reconciled_by: ACTOR_USER_ID,
              journal_entry_id: "je-001",
              metadata: {},
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createCodService(makeEnvStatus());
      const row = await svc.reconcile({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        reconciledAmount: 1500,
      });
      expect(row.reconciliationStatus).toBe("reconciled");
      // No update should be called (idempotent)
      expect(calls.some((c) => c.table === "cod_collections" && c.method === "update")).toBe(false);
      tableBehavior.cod_collections!.maybeSingle = original;
    });

    it("rejects reconciliation with negative amount", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.reconcile({
          codCollectionId: COD_ID,
          actorUserId: ACTOR_USER_ID,
          actorBranchIds: [BRANCH_ID],
          isSuperAdmin: false,
          reconciledAmount: -100,
        }),
      ).rejects.toMatchObject({ code: "INVALID_RECONCILIATION" });
    });

    it("rejects reconciliation when COD is outside branch scope", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.reconcile({
          codCollectionId: COD_ID,
          actorUserId: "random-user",
          actorBranchIds: ["other-branch"],
          isSuperAdmin: false,
          reconciledAmount: 1500,
        }),
      ).rejects.toMatchObject({ code: "BRANCH_ACCESS_DENIED" });
    });
  });

  describe("resolveShortageOrOverage", () => {
    it("resolves a shortage to reconciled", async () => {
      const original = tableBehavior.cod_collections!.maybeSingle!;
      tableBehavior.cod_collections!.maybeSingle = async (q) => {
        if (q.filters.id === COD_ID) {
          return {
            data: {
              id: COD_ID,
              delivery_id: DELIVERY_ID,
              branch_id: BRANCH_ID,
              order_id: ORDER_ID,
              amount: 1500,
              currency: "PKR",
              collected_by_rider_id: RIDER_ID,
              customer_received_by: null,
              notes: null,
              reconciliation_status: "shortage",
              reconciled_amount: 1400,
              reconciled_at: new Date().toISOString(),
              reconciled_by: ACTOR_USER_ID,
              journal_entry_id: null,
              metadata: {},
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createCodService(makeEnvStatus());
      const row = await svc.resolveShortageOrOverage({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
      });
      expect(row.reconciliationStatus).toBe("reconciled");
      tableBehavior.cod_collections!.maybeSingle = original;
    });

    it("rejects when status is still pending (not reconciled yet)", async () => {
      const svc = createCodService(makeEnvStatus());
      await expect(
        svc.resolveShortageOrOverage({
          codCollectionId: COD_ID,
          actorUserId: ACTOR_USER_ID,
          actorBranchIds: [BRANCH_ID],
          isSuperAdmin: false,
        }),
      ).rejects.toMatchObject({ code: "COD_NOT_RECONCILED_YET" });
    });

    it("is idempotent when already reconciled", async () => {
      const original = tableBehavior.cod_collections!.maybeSingle!;
      tableBehavior.cod_collections!.maybeSingle = async (q) => {
        if (q.filters.id === COD_ID) {
          return {
            data: {
              id: COD_ID,
              delivery_id: DELIVERY_ID,
              branch_id: BRANCH_ID,
              order_id: ORDER_ID,
              amount: 1500,
              currency: "PKR",
              collected_by_rider_id: RIDER_ID,
              customer_received_by: null,
              notes: null,
              reconciliation_status: "reconciled",
              reconciled_amount: 1500,
              reconciled_at: new Date().toISOString(),
              reconciled_by: ACTOR_USER_ID,
              journal_entry_id: "je-001",
              metadata: {},
              collected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          };
        }
        return { data: null, error: null };
      };
      const svc = createCodService(makeEnvStatus());
      const row = await svc.resolveShortageOrOverage({
        codCollectionId: COD_ID,
        actorUserId: ACTOR_USER_ID,
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
      });
      expect(row.reconciliationStatus).toBe("reconciled");
      tableBehavior.cod_collections!.maybeSingle = original;
    });
  });
});
