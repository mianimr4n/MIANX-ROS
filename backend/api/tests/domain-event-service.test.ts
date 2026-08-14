/**
 * Tests for domain event service (ADR-012).
 *
 * Verifies:
 *   - emitEvent validates event_type format
 *   - emitEvent validates domain enum
 *   - emitEvent calls RPC and returns id
 *   - listEvents applies filters correctly
 *   - listEvents respects branch scope
 *   - getEvent returns row or null
 *   - listEventsForEntity filters by domain+entityId
 *   - listEventsByCorrelation filters by correlation_id
 *
 * Authority: ADR-012 §1 (append-only), §4 (emit via RPC), §6 (branch-scoped)
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
  orFilters: string | null;
  isFilters: Record<string, unknown>;
  gteFilters: Record<string, unknown>;
  lteFilters: Record<string, unknown>;
  order: { column: string; opts?: unknown } | null;
  limitN: number | null;
  rangeFrom: number | null;
  rangeTo: number | null;
  countMode: string | null;
}

let tableBehavior: Record<
  string,
  {
    maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    selectAll?: (q: MockQuery) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
  }
> = {};

let rpcBehavior: Record<
  string,
  (args: unknown) => Promise<{ data: unknown; error: unknown }>
> = {};

function makeQueryChain(table: string) {
  const q: MockQuery = {
    table,
    filters: {},
    orFilters: null,
    isFilters: {},
    gteFilters: {},
    lteFilters: {},
    order: null,
    limitN: null,
    rangeFrom: null,
    rangeTo: null,
    countMode: null,
  };
  const chain = {
    select(cols?: string | { count: string }, opts?: { count?: string }) {
      calls.push({ table, method: "select", args: [cols, opts] });
      if (typeof opts === "object" && opts !== null && opts.count) q.countMode = opts.count;
      return chain;
    },
    eq(col: string, val: unknown) {
      calls.push({ table, method: "eq", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    is(col: string, val: unknown) {
      calls.push({ table, method: "is", args: [col, val] });
      q.isFilters[col] = val;
      return chain;
    },
    or(filter: string) {
      calls.push({ table, method: "or", args: [filter] });
      q.orFilters = filter;
      return chain;
    },
    gte(col: string, val: unknown) {
      calls.push({ table, method: "gte", args: [col, val] });
      q.gteFilters[col] = val;
      return chain;
    },
    lte(col: string, val: unknown) {
      calls.push({ table, method: "lte", args: [col, val] });
      q.lteFilters[col] = val;
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
    async then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      try {
        const handler = tableBehavior[table]?.selectAll;
        const result = handler ? await handler(q) : { data: [], error: null, count: 0 };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      } catch (err) {
        return Promise.reject(err).then(undefined, onRejected);
      }
    },
  };
  return chain;
}

const mockSupabaseClient = {
  from(table: string) {
    calls.push({ table, method: "from", args: [] });
    return makeQueryChain(table);
  },
  rpc(name: string, args: unknown) {
    calls.push({ table: "rpc", method: name, args: [args] });
    const handler = rpcBehavior[name];
    if (handler) return handler(args).then(
      (data) => data,
      (err) => Promise.reject(err),
    );
    return Promise.resolve({ data: null, error: null });
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { EnvironmentStatus } from "../src/config/env.js";
import { createDomainEventService } from "../src/services/audit/domain-event-service.js";

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

const BRANCH_ID = "branch-001";
const ENTITY_ID = "entity-001";
const ACTOR_USER_ID = "user-001";
const CORRELATION_ID = "corr-001";

const SAMPLE_EVENT = {
  id: 1,
  event_type: "order.created",
  domain: "orders",
  entity_id: ENTITY_ID,
  branch_id: BRANCH_ID,
  actor_user_id: ACTOR_USER_ID,
  actor_role: "customer",
  metadata: { total: 1500 },
  correlation_id: CORRELATION_ID,
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};

describe("ADR-012 — Domain Event Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      domain_events: {
        maybeSingle: async () => ({ data: SAMPLE_EVENT, error: null }),
        selectAll: async () => ({ data: [SAMPLE_EVENT], error: null, count: 1 }),
      },
    };
    rpcBehavior = {
      emit_domain_event: async () => ({ data: 42, error: null }),
    };
  });

  describe("emitEvent", () => {
    it("emits a valid event and returns the id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const id = await svc.emitEvent({
        eventType: "order.created",
        domain: "orders",
        entityId: ENTITY_ID,
        branchId: BRANCH_ID,
        actorUserId: ACTOR_USER_ID,
        actorRole: "customer",
        metadata: { total: 1500 },
        correlationId: CORRELATION_ID,
      });
      expect(id).toBe(42);
      expect(calls.some((c) => c.method === "emit_domain_event")).toBe(true);
    });

    it("rejects invalid event_type format (no dot)", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await expect(
        svc.emitEvent({ eventType: "invalid", domain: "orders" }),
      ).rejects.toMatchObject({ code: "INVALID_EVENT" });
    });

    it("rejects invalid event_type format (uppercase)", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await expect(
        svc.emitEvent({ eventType: "Order.Created", domain: "orders" }),
      ).rejects.toMatchObject({ code: "INVALID_EVENT" });
    });

    it("rejects invalid event_type format (starts with digit)", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await expect(
        svc.emitEvent({ eventType: "0order.created", domain: "orders" }),
      ).rejects.toMatchObject({ code: "INVALID_EVENT" });
    });

    it("rejects invalid domain", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await expect(
        svc.emitEvent({
          eventType: "valid.event",
          domain: "invalid_domain" as "orders",
        }),
      ).rejects.toMatchObject({ code: "INVALID_EVENT" });
    });

    it("rejects empty event_type", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await expect(
        svc.emitEvent({ eventType: "", domain: "orders" }),
      ).rejects.toMatchObject({ code: "INVALID_EVENT" });
    });
  });

  describe("listEvents", () => {
    it("returns events for super-admin (no branch filter)", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const result = await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: {},
      });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.rows[0].eventType).toBe("order.created");
    });

    it("applies branch scope for non-super-admin", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await svc.listEvents({
        actorBranchIds: [BRANCH_ID],
        isSuperAdmin: false,
        filters: {},
      });
      // Should call or() with branch filter
      expect(calls.some((c) => c.method === "or")).toBe(true);
    });

    it("filters by domain", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: { domain: "orders" },
      });
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "domain")).toBe(true);
    });

    it("filters by event_type", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: { eventType: "order.created" },
      });
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "event_type")).toBe(true);
    });

    it("filters by entity_id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: { entityId: ENTITY_ID },
      });
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "entity_id")).toBe(true);
    });

    it("filters by correlation_id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: { correlationId: CORRELATION_ID },
      });
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "correlation_id")).toBe(true);
    });

    it("filters by date range", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const fromTime = new Date(Date.now() - 86400000).toISOString();
      const toTime = new Date().toISOString();
      await svc.listEvents({
        actorBranchIds: [],
        isSuperAdmin: true,
        filters: { fromOccurredAt: fromTime, toOccurredAt: toTime },
      });
      expect(calls.some((c) => c.method === "gte" && c.args[0] === "occurred_at")).toBe(true);
      expect(calls.some((c) => c.method === "lte" && c.args[0] === "occurred_at")).toBe(true);
    });
  });

  describe("getEvent", () => {
    it("returns event by id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const row = await svc.getEvent({ eventId: 1 });
      expect(row).not.toBeNull();
      expect(row!.id).toBe(1);
    });

    it("returns null when event does not exist", async () => {
      const original = tableBehavior.domain_events!.maybeSingle!;
      tableBehavior.domain_events!.maybeSingle = async () => ({ data: null, error: null });
      const svc = createDomainEventService(makeEnvStatus());
      const row = await svc.getEvent({ eventId: 999 });
      expect(row).toBeNull();
      tableBehavior.domain_events!.maybeSingle = original;
    });
  });

  describe("listEventsForEntity", () => {
    it("filters by domain + entity_id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const rows = await svc.listEventsForEntity({
        domain: "orders",
        entityId: ENTITY_ID,
        actorBranchIds: [],
        isSuperAdmin: true,
      });
      expect(rows).toHaveLength(1);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "domain")).toBe(true);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "entity_id")).toBe(true);
    });
  });

  describe("listEventsByCorrelation", () => {
    it("filters by correlation_id", async () => {
      const svc = createDomainEventService(makeEnvStatus());
      const rows = await svc.listEventsByCorrelation({
        correlationId: CORRELATION_ID,
        actorBranchIds: [],
        isSuperAdmin: true,
      });
      expect(rows).toHaveLength(1);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "correlation_id")).toBe(true);
    });
  });
});
