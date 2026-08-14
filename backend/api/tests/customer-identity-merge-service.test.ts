/**
 * Tests for customer identity service + merge service (ADR-005/006).
 *
 * Verifies:
 *   - resolveCustomer by phone/email/auth_user_id
 *   - normalizePhone handles Pakistani formats
 *   - searchCustomers by phone/email/name
 *   - addIdentity rejects duplicates (UNIQUE constraint)
 *   - mergeCustomers calls RPC and returns structured result
 *   - mergeCustomers rejects same source/target
 *   - mergeCustomers rejects missing reason
 *   - mergeCustomers maps known RPC errors to 4xx
 *   - reverseMerge calls RPC and returns result
 *   - reverseMerge rejects missing reason
 *   - reverseMerge maps MERGE_WINDOW_EXPIRED to 409
 *   - listMergeLog with filters
 *
 * Uses a fully mocked Supabase client via vi.mock — no real DB needed.
 *
 * Authority: ADR-005 §1, §7 (canonical identity + lookup RPC)
 *           ADR-006 §1, §3, §5 (super-admin only, atomic FK transfer, 30-day reversal)
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
    or(filter: string) {
      calls.push({ table, method: "or", args: [filter] });
      q.orFilters = filter;
      return chain;
    },
    is(col: string, val: unknown) {
      calls.push({ table, method: "is", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    in(col: string, val: unknown[]) {
      calls.push({ table, method: "in", args: [col, val] });
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
        const result = handler ? await handler(q) : { data: [], error: null, count: 0 };
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
import { createCustomerIdentityService } from "../src/services/customers/identity-service.js";
import { createCustomerMergeService } from "../src/services/customers/merge-service.js";

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

const CUSTOMER_ID = "cust-001";
const SOURCE_CUSTOMER_ID = "cust-source";
const TARGET_CUSTOMER_ID = "cust-target";
const ACTOR_USER_ID = "user-admin";
const MERGE_LOG_ID = "merge-log-001";

describe("ADR-005 — Customer Identity Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      customers: {
        maybeSingle: async () => ({
          data: {
            id: CUSTOMER_ID,
            user_id: ACTOR_USER_ID,
            full_name: "Ahmed Khan",
            phone: "+923001234567",
            email: "ahmed@example.com",
            status: "active",
            merged_into_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        selectAll: async () => ({
          data: [
            {
              id: CUSTOMER_ID,
              user_id: ACTOR_USER_ID,
              full_name: "Ahmed Khan",
              phone: "+923001234567",
              email: "ahmed@example.com",
              status: "active",
              merged_into_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
          count: 1,
        }),
      },
      customer_identities: {
        maybeSingle: async () => ({ data: null, error: null }),
        selectAll: async () => ({
          data: [
            {
              id: "id-001",
              customer_id: CUSTOMER_ID,
              identity_type: "phone_e164",
              value: "+923001234567",
              verified_at: null,
              verified_by: null,
              metadata: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          error: null,
          count: 1,
        }),
        insertSingle: async (payload) => ({
          data: {
            id: "id-new",
            ...(payload as Record<string, unknown>),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      },
    };
    rpcBehavior = {
      resolve_customer_by_identity: async (args) => {
        const a = args as { p_identity_type: string; p_value: string };
        if (a.p_value === "+923001234567" || a.p_value === "ahmed@example.com") {
          return { data: CUSTOMER_ID, error: null };
        }
        return { data: null, error: null };
      },
      normalize_phone_e164: async (args) => {
        const a = args as { p_input: string };
        if (a.p_input === "03001234567" || a.p_input === "+923001234567") {
          return { data: "+923001234567", error: null };
        }
        return { data: null, error: null };
      },
    };
  });

  describe("resolveCustomer", () => {
    it("returns customer ID for known phone", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const id = await svc.resolveCustomer({
        identityType: "phone_e164",
        value: "+923001234567",
      });
      expect(id).toBe(CUSTOMER_ID);
    });

    it("returns null for unknown phone", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const id = await svc.resolveCustomer({
        identityType: "phone_e164",
        value: "+923000000000",
      });
      expect(id).toBeNull();
    });

    it("returns null for empty inputs", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const id = await svc.resolveCustomer({
        identityType: "phone_e164",
        value: "",
      });
      expect(id).toBeNull();
    });

    it("returns customer ID for known email", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const id = await svc.resolveCustomer({
        identityType: "email",
        value: "ahmed@example.com",
      });
      expect(id).toBe(CUSTOMER_ID);
    });
  });

  describe("normalizePhone", () => {
    it("normalizes Pakistani mobile format 03001234567", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const normalized = await svc.normalizePhone("03001234567");
      expect(normalized).toBe("+923001234567");
    });

    it("passes through already-normalized E.164", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const normalized = await svc.normalizePhone("+923001234567");
      expect(normalized).toBe("+923001234567");
    });

    it("returns null for unnormalizable input", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const normalized = await svc.normalizePhone("not-a-phone");
      expect(normalized).toBeNull();
    });

    it("returns null for empty input", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const normalized = await svc.normalizePhone("");
      expect(normalized).toBeNull();
    });
  });

  describe("getCustomer", () => {
    it("returns customer summary with identities", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const c = await svc.getCustomer({ customerId: CUSTOMER_ID });
      expect(c).not.toBeNull();
      expect(c!.id).toBe(CUSTOMER_ID);
      expect(c!.fullName).toBe("Ahmed Khan");
      expect(c!.identities).toHaveLength(1);
      expect(c!.identities[0].identityType).toBe("phone_e164");
    });

    it("returns null when customer does not exist", async () => {
      const original = tableBehavior.customers!.maybeSingle!;
      tableBehavior.customers!.maybeSingle = async () => ({ data: null, error: null });
      const svc = createCustomerIdentityService(makeEnvStatus());
      const c = await svc.getCustomer({ customerId: "nonexistent" });
      expect(c).toBeNull();
      tableBehavior.customers!.maybeSingle = original;
    });
  });

  describe("listIdentities", () => {
    it("returns identities for a customer", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const identities = await svc.listIdentities({ customerId: CUSTOMER_ID });
      expect(identities).toHaveLength(1);
      expect(identities[0].customerId).toBe(CUSTOMER_ID);
    });
  });

  describe("addIdentity", () => {
    it("adds a new identity to a customer", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const row = await svc.addIdentity({
        customerId: CUSTOMER_ID,
        identityType: "email",
        value: "new@example.com",
      });
      expect(row.identityType).toBe("email");
      expect(row.value).toBe("new@example.com");
    });

    it("rejects identity with invalid identityType", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      await expect(
        svc.addIdentity({
          customerId: CUSTOMER_ID,
          identityType: "invalid_type" as "phone_e164",
          value: "x",
        }),
      ).rejects.toMatchObject({ code: "INVALID_IDENTITY" });
    });

    it("rejects identity with empty value", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      await expect(
        svc.addIdentity({
          customerId: CUSTOMER_ID,
          identityType: "email",
          value: "",
        }),
      ).rejects.toMatchObject({ code: "INVALID_IDENTITY" });
    });

    it("returns 409 when identity already linked to another customer", async () => {
      const original = tableBehavior.customer_identities!.insertSingle!;
      tableBehavior.customer_identities!.insertSingle = async () => ({
        data: null,
        error: { code: "23505", message: "duplicate key value" },
      });
      const svc = createCustomerIdentityService(makeEnvStatus());
      await expect(
        svc.addIdentity({
          customerId: CUSTOMER_ID,
          identityType: "phone_e164",
          value: "+923001234567",
        }),
      ).rejects.toMatchObject({ code: "IDENTITY_ALREADY_LINKED" });
      tableBehavior.customer_identities!.insertSingle = original;
    });

    it("normalizes email to lowercase on insert", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const row = await svc.addIdentity({
        customerId: CUSTOMER_ID,
        identityType: "email",
        value: "UPPER@Example.COM",
      });
      expect(row.value).toBe("upper@example.com");
    });
  });

  describe("searchCustomers", () => {
    it("returns matching customers by phone", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const results = await svc.searchCustomers({
        query: "03001234567",
      });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].phone).toContain("923001234567");
    });

    it("returns empty for empty query", async () => {
      const svc = createCustomerIdentityService(makeEnvStatus());
      const results = await svc.searchCustomers({ query: "" });
      expect(results).toEqual([]);
    });
  });
});

describe("ADR-006 — Customer Merge Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      customer_merge_log: {
        selectAll: async () => ({
          data: [
            {
              id: MERGE_LOG_ID,
              source_customer_id: SOURCE_CUSTOMER_ID,
              target_customer_id: TARGET_CUSTOMER_ID,
              actor_user_id: ACTOR_USER_ID,
              reason: "duplicate cleanup",
              metadata: { transferred: { orders: 5 } },
              merge_window_expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
              reversed_at: null,
              reversed_by: null,
              reversal_reason: null,
              created_at: new Date().toISOString(),
            },
          ],
          error: null,
          count: 1,
        }),
        maybeSingle: async () => ({
          data: {
            id: MERGE_LOG_ID,
            source_customer_id: SOURCE_CUSTOMER_ID,
            target_customer_id: TARGET_CUSTOMER_ID,
            actor_user_id: ACTOR_USER_ID,
            reason: "duplicate cleanup",
            metadata: {},
            merge_window_expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
            reversed_at: null,
            reversed_by: null,
            reversal_reason: null,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      },
    };
    rpcBehavior = {
      merge_customers_atomic: async () => ({
        data: {
          ok: true,
          idempotent: false,
          merge_log_id: MERGE_LOG_ID,
          source_customer_id: SOURCE_CUSTOMER_ID,
          target_customer_id: TARGET_CUSTOMER_ID,
          transferred: { orders: 5, customer_identities: 2 },
          conflicts: [{ identity_type: "phone_e164", value: "+923001234567" }],
        },
        error: null,
      }),
      reverse_customer_merge: async () => ({
        data: {
          ok: true,
          merge_log_id: MERGE_LOG_ID,
          reversed: { orders: 5 },
        },
        error: null,
      }),
    };
  });

  describe("mergeCustomers", () => {
    it("calls RPC and returns structured result", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      const result = await svc.mergeCustomers({
        sourceCustomerId: SOURCE_CUSTOMER_ID,
        targetCustomerId: TARGET_CUSTOMER_ID,
        actorUserId: ACTOR_USER_ID,
        reason: "duplicate cleanup",
      });
      expect(result.ok).toBe(true);
      expect(result.idempotent).toBe(false);
      expect(result.mergeLogId).toBe(MERGE_LOG_ID);
      expect(result.transferred.orders).toBe(5);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].identityType).toBe("phone_e164");
    });

    it("rejects same source/target", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: CUSTOMER_ID,
          targetCustomerId: CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "INVALID_MERGE" });
    });

    it("rejects empty reason", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: SOURCE_CUSTOMER_ID,
          targetCustomerId: TARGET_CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "",
        }),
      ).rejects.toMatchObject({ code: "INVALID_MERGE" });
    });

    it("rejects reason over 1000 chars", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: SOURCE_CUSTOMER_ID,
          targetCustomerId: TARGET_CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "x".repeat(1001),
        }),
      ).rejects.toMatchObject({ code: "INVALID_MERGE" });
    });

    it("maps SOURCE_ALREADY_MERGED error to 409", async () => {
      const original = rpcBehavior.merge_customers_atomic;
      rpcBehavior.merge_customers_atomic = async () => ({
        data: null,
        error: { message: "SOURCE_ALREADY_MERGED: source is merged into a different target (other-target)" },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: SOURCE_CUSTOMER_ID,
          targetCustomerId: TARGET_CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "SOURCE_ALREADY_MERGED", statusCode: 409 });
      rpcBehavior.merge_customers_atomic = original;
    });

    it("maps TARGET_IS_MERGED error to 409", async () => {
      const original = rpcBehavior.merge_customers_atomic;
      rpcBehavior.merge_customers_atomic = async () => ({
        data: null,
        error: { message: "TARGET_IS_MERGED: cannot merge INTO a customer that is itself merged." },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: SOURCE_CUSTOMER_ID,
          targetCustomerId: TARGET_CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "TARGET_IS_MERGED", statusCode: 409 });
      rpcBehavior.merge_customers_atomic = original;
    });

    it("maps SOURCE_NOT_FOUND error to 404", async () => {
      const original = rpcBehavior.merge_customers_atomic;
      rpcBehavior.merge_customers_atomic = async () => ({
        data: null,
        error: { message: "SOURCE_NOT_FOUND" },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.mergeCustomers({
          sourceCustomerId: "nonexistent",
          targetCustomerId: TARGET_CUSTOMER_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "SOURCE_NOT_FOUND", statusCode: 404 });
      rpcBehavior.merge_customers_atomic = original;
    });

    it("passes through idempotent re-merge", async () => {
      const original = rpcBehavior.merge_customers_atomic;
      rpcBehavior.merge_customers_atomic = async () => ({
        data: {
          ok: true,
          idempotent: true,
          merge_log_id: MERGE_LOG_ID,
          message: "Source already merged into this target.",
        },
        error: null,
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      const result = await svc.mergeCustomers({
        sourceCustomerId: SOURCE_CUSTOMER_ID,
        targetCustomerId: TARGET_CUSTOMER_ID,
        actorUserId: ACTOR_USER_ID,
        reason: "test",
      });
      expect(result.idempotent).toBe(true);
      rpcBehavior.merge_customers_atomic = original;
    });
  });

  describe("reverseMerge", () => {
    it("calls RPC and returns result", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      const result = await svc.reverseMerge({
        mergeLogId: MERGE_LOG_ID,
        actorUserId: ACTOR_USER_ID,
        reason: "wrong direction",
      });
      expect(result.ok).toBe(true);
      expect(result.mergeLogId).toBe(MERGE_LOG_ID);
      expect(result.reversed.orders).toBe(5);
    });

    it("rejects empty reason", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.reverseMerge({
          mergeLogId: MERGE_LOG_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "",
        }),
      ).rejects.toMatchObject({ code: "INVALID_REVERSAL" });
    });

    it("maps MERGE_WINDOW_EXPIRED to 409", async () => {
      const original = rpcBehavior.reverse_customer_merge;
      rpcBehavior.reverse_customer_merge = async () => ({
        data: null,
        error: { message: "MERGE_WINDOW_EXPIRED: cannot reverse merge after 30-day window." },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.reverseMerge({
          mergeLogId: MERGE_LOG_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "MERGE_WINDOW_EXPIRED", statusCode: 409 });
      rpcBehavior.reverse_customer_merge = original;
    });

    it("maps MERGE_ALREADY_REVERSED to 409", async () => {
      const original = rpcBehavior.reverse_customer_merge;
      rpcBehavior.reverse_customer_merge = async () => ({
        data: null,
        error: { message: "MERGE_ALREADY_REVERSED" },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.reverseMerge({
          mergeLogId: MERGE_LOG_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "MERGE_ALREADY_REVERSED", statusCode: 409 });
      rpcBehavior.reverse_customer_merge = original;
    });

    it("maps MERGE_LOG_NOT_FOUND to 404", async () => {
      const original = rpcBehavior.reverse_customer_merge;
      rpcBehavior.reverse_customer_merge = async () => ({
        data: null,
        error: { message: "MERGE_LOG_NOT_FOUND" },
      });
      const svc = createCustomerMergeService(makeEnvStatus());
      await expect(
        svc.reverseMerge({
          mergeLogId: "nonexistent",
          actorUserId: ACTOR_USER_ID,
          reason: "test",
        }),
      ).rejects.toMatchObject({ code: "MERGE_LOG_NOT_FOUND", statusCode: 404 });
      rpcBehavior.reverse_customer_merge = original;
    });
  });

  describe("listMergeLog", () => {
    it("returns merge log entries", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      const result = await svc.listMergeLog({});
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.rows[0].id).toBe(MERGE_LOG_ID);
    });

    it("filters by sourceCustomerId", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await svc.listMergeLog({ sourceCustomerId: SOURCE_CUSTOMER_ID });
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "source_customer_id")).toBe(true);
    });

    it("filters by unreversedOnly=true", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      await svc.listMergeLog({ unreversedOnly: true });
      expect(calls.some((c) => c.method === "is" && c.args[0] === "reversed_at")).toBe(true);
    });
  });

  describe("getMergeLogEntry", () => {
    it("returns a single merge log entry", async () => {
      const svc = createCustomerMergeService(makeEnvStatus());
      const row = await svc.getMergeLogEntry({ mergeLogId: MERGE_LOG_ID });
      expect(row).not.toBeNull();
      expect(row!.id).toBe(MERGE_LOG_ID);
    });

    it("returns null when not found", async () => {
      const original = tableBehavior.customer_merge_log!.maybeSingle!;
      tableBehavior.customer_merge_log!.maybeSingle = async () => ({ data: null, error: null });
      const svc = createCustomerMergeService(makeEnvStatus());
      const row = await svc.getMergeLogEntry({ mergeLogId: "nonexistent" });
      expect(row).toBeNull();
      tableBehavior.customer_merge_log!.maybeSingle = original;
    });
  });
});
