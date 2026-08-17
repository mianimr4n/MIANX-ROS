/**
 * Tests for WhatsApp PII anonymization (ADR-004 §5, §9).
 *
 * Verifies the job:
 *   - Selects conversations older than retention window
 *   - Calls the whatsapp_anonymize_pii RPC with batched IDs
 *   - Returns summary counts
 *   - Surfaces clear error when RPC doesn't exist
 *   - Lifecycle: returns null in non-production or without TELEPIZZA_WHATSAPP_PII_JOB=1
 *
 * Uses a fully mocked Supabase client via vi.mock — no real DB needed.
 *
 * Authority: ADR-004 §5 (PII anonymization via app.bypass_message_immutability)
 *           ADR-004 §9 (24-month retention policy)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

type CallRecord = { table: string; method: string; args: unknown[] };

const calls: CallRecord[] = [];

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

interface MockQuery {
  table: string;
  filters: Record<string, unknown>;
  isFilters: Record<string, unknown>;
  notFilters: Record<string, unknown>;
  ltFilters: Record<string, unknown>;
  order: { column: string; opts?: unknown } | null;
  limitN: number | null;
  head: boolean;
  countMode: string | null;
}

function makeQueryChain(table: string) {
  const q: MockQuery = {
    table,
    filters: {},
    isFilters: {},
    notFilters: {},
    ltFilters: {},
    order: null,
    limitN: null,
    head: false,
    countMode: null,
  };
  const chain = {
    select(cols?: string | { count: string }, opts?: { count?: string; head?: boolean }) {
      calls.push({ table, method: "select", args: [cols, opts] });
      if (typeof opts === "object" && opts !== null) {
        if (opts.count) q.countMode = opts.count;
        if (opts.head === true) q.head = true;
      }
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
    not(col: string, op: string, val: unknown) {
      calls.push({ table, method: "not", args: [col, op, val] });
      q.notFilters[col] = val;
      return chain;
    },
    lt(col: string, val: unknown) {
      calls.push({ table, method: "lt", args: [col, val] });
      q.ltFilters[col] = val;
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
    // `then` is the terminal handler — invoked when the chain is awaited.
    then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      const handler = tableBehavior[table]?.selectAll;
      const result = handler
        ? handler(q)
        : Promise.resolve({ data: [], error: null, count: 0 });
      return result.then(onFulfilled, onRejected);
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
    calls.push({ table: "rpc", method: "rpc", args: [name, args] });
    const handler = rpcBehavior[name];
    if (handler) return handler(args);
    return Promise.resolve({ data: null, error: { message: `function public.${name} does not exist` } });
  },
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

import type { EnvironmentStatus } from "../src/config/env.js";
import {
  runWhatsAppPiiAnonymization,
  startWhatsAppPiiAnonymizationJob,
} from "../src/services/whatsapp/pii-anonymization.js";

function makeEnvStatus(overrides: Partial<EnvironmentStatus["config"]> = {}): EnvironmentStatus {
  return {
    isReady: true,
    config: {
      port: 10000,
      corsOrigin: "*",
      jwtSecret: "x".repeat(32),
      supabaseUrl: "http://127.0.0.1:54321",
      supabaseAnonKey: "anon",
      supabaseServiceRoleKey: "service-role",
      envClass: "test",
      emailMode: "mock",
      whatsappMode: "mock",
      paymentMode: "mock",
      webhookMode: "mock",
      aiMode: "mock",
      whatsapp: {
        apiVersion: "v21.0",
        phoneNumberId: "test",
        businessAccountId: "test",
        accessToken: "test",
        appSecret: "test",
        verifyToken: "test",
      },
      ...overrides,
    },
    issues: [],
    safetyBlockers: [],
  };
}

interface ConversationRow {
  id: string;
  branch_id: string;
  contact_phone: string;
  pii_anonymized_at: string | null;
  created_at: string;
}

function setConversationRows(rows: ConversationRow[]) {
  tableBehavior["whatsapp_conversations"] = {
    selectAll: async (q: MockQuery) => {
      // Distinguish between the "select candidates" query (no head, no count)
      // and the "count already anonymized" query (head=true).
      if (q.head) {
        return { data: null, error: null, count: 5 };
      }
      return { data: rows as unknown as Record<string, unknown>[], error: null, count: rows.length };
    },
  };
}

describe("WhatsApp PII anonymization", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {};
    rpcBehavior = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TELEPIZZA_WHATSAPP_PII_JOB;
  });

  describe("lifecycle (startWhatsAppPiiAnonymizationJob)", () => {
    it("returns null in non-production", () => {
      const env = makeEnvStatus({ envClass: "test" });
      const handle = startWhatsAppPiiAnonymizationJob(env);
      expect(handle).toBeNull();
    });

    it("returns null in production without TELEPIZZA_WHATSAPP_PII_JOB=1", () => {
      const env = makeEnvStatus({ envClass: "production" });
      const handle = startWhatsAppPiiAnonymizationJob(env);
      expect(handle).toBeNull();
    });

    it("starts in production with TELEPIZZA_WHATSAPP_PII_JOB=1", () => {
      const env = makeEnvStatus({ envClass: "production" });
      process.env.TELEPIZZA_WHATSAPP_PII_JOB = "1";
      const handle = startWhatsAppPiiAnonymizationJob(env, 60 * 60 * 1000);
      expect(handle).not.toBeNull();
      handle?.stop();
    });

    it("stop() clears the interval", () => {
      const env = makeEnvStatus({ envClass: "production" });
      process.env.TELEPIZZA_WHATSAPP_PII_JOB = "1";
      const handle = startWhatsAppPiiAnonymizationJob(env, 60 * 60 * 1000);
      expect(handle).not.toBeNull();
      expect(() => handle?.stop()).not.toThrow();
    });
  });

  describe("runWhatsAppPiiAnonymization", () => {
    it("selects conversations older than retention window and calls RPC", async () => {
      const env = makeEnvStatus();
      const oldDate = new Date();
      oldDate.setUTCMonth(oldDate.getUTCMonth() - 30); // 30 months ago
      setConversationRows([
        {
          id: "conv-1",
          branch_id: "branch-1",
          contact_phone: "+923000000001",
          pii_anonymized_at: null,
          created_at: oldDate.toISOString(),
        },
        {
          id: "conv-2",
          branch_id: "branch-1",
          contact_phone: "+923000000002",
          pii_anonymized_at: null,
          created_at: oldDate.toISOString(),
        },
      ]);
      rpcBehavior["whatsapp_anonymize_pii"] = async () => ({
        data: { anonymized_conversations: 2, anonymized_messages: 5 },
        error: null,
      });

      const result = await runWhatsAppPiiAnonymization(env, { retentionMonths: 24, batchSize: 10 });

      expect(result.scannedConversations).toBe(2);
      expect(result.anonymizedConversations).toBe(2);
      expect(result.anonymizedMessages).toBe(5);
      expect(result.skippedAlreadyAnonymized).toBe(5);
      expect(result.errors).toHaveLength(0);

      // Verify RPC was called with the conversation IDs.
      const rpcCalls = calls.filter((c) => c.method === "rpc");
      expect(rpcCalls.length).toBe(1);
      expect(rpcCalls[0].args[0]).toBe("whatsapp_anonymize_pii");
      const rpcArgs = rpcCalls[0].args[1] as { p_conversation_ids: string[] };
      expect(rpcArgs.p_conversation_ids).toContain("conv-1");
      expect(rpcArgs.p_conversation_ids).toContain("conv-2");
    });

    it("batches RPC calls when conversations > 25", async () => {
      const env = makeEnvStatus();
      const oldDate = new Date();
      oldDate.setUTCMonth(oldDate.getUTCMonth() - 30);
      const rows: ConversationRow[] = Array.from({ length: 60 }, (_, i) => ({
        id: `conv-${i}`,
        branch_id: "branch-1",
        contact_phone: "+923000000001",
        pii_anonymized_at: null,
        created_at: oldDate.toISOString(),
      }));
      setConversationRows(rows);
      rpcBehavior["whatsapp_anonymize_pii"] = async () => ({
        data: { anonymized_conversations: 25, anonymized_messages: 50 },
        error: null,
      });

      const result = await runWhatsAppPiiAnonymization(env, { retentionMonths: 24, batchSize: 60 });

      // 60 conversations / 25 per batch = 3 RPC calls.
      const rpcCalls = calls.filter((c) => c.method === "rpc");
      expect(rpcCalls.length).toBe(3);
      expect(result.anonymizedConversations).toBe(75); // 25 * 3
    });

    it("surfaces clear error when RPC doesn't exist", async () => {
      const env = makeEnvStatus();
      const oldDate = new Date();
      oldDate.setUTCMonth(oldDate.getUTCMonth() - 30);
      setConversationRows([
        {
          id: "conv-1",
          branch_id: "branch-1",
          contact_phone: "+923000000001",
          pii_anonymized_at: null,
          created_at: oldDate.toISOString(),
        },
      ]);
      // No rpcBehavior set — the default mock returns "function does not exist".

      const result = await runWhatsAppPiiAnonymization(env);

      expect(result.scannedConversations).toBe(1);
      expect(result.anonymizedConversations).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("whatsapp_anonymize_pii does not exist");
    });

    it("returns zero scanned when no candidates exist", async () => {
      const env = makeEnvStatus();
      setConversationRows([]);

      const result = await runWhatsAppPiiAnonymization(env);

      expect(result.scannedConversations).toBe(0);
      expect(result.anonymizedConversations).toBe(0);
      expect(result.anonymizedMessages).toBe(0);
      expect(result.errors).toHaveLength(0);
      // RPC should NOT have been called.
      const rpcCalls = calls.filter((c) => c.method === "rpc");
      // The skip-count query is also a SELECT, not RPC, so no RPC calls.
      // Actually wait — we only call RPC if conversations.length > 0.
      expect(rpcCalls.length).toBe(0);
    });

    it("respects custom retentionMonths", async () => {
      const env = makeEnvStatus();
      setConversationRows([]);
      await runWhatsAppPiiAnonymization(env, { retentionMonths: 12 });

      // Two queries use the cutoff: the candidate SELECT and the
      // count-already-anonymized SELECT. Both should use the same cutoff value.
      const selectCalls = calls.filter((c) => c.method === "lt" && c.args[0] === "created_at");
      expect(selectCalls.length).toBe(2);
      const cutoff = selectCalls[0].args[1] as string;
      const cutoffDate = new Date(cutoff);
      const now = new Date();
      const monthsDiff =
        (now.getUTCFullYear() - cutoffDate.getUTCFullYear()) * 12 +
        (now.getUTCMonth() - cutoffDate.getUTCMonth());
      expect(monthsDiff).toBeGreaterThanOrEqual(11);
      expect(monthsDiff).toBeLessThanOrEqual(13);
    });
  });
});
