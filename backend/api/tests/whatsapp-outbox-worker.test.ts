/**
 * Tests for WhatsApp outbound outbox worker (ADR-004 §5, §8).
 *
 * Verifies the worker correctly:
 *   - Claims pending outbound whatsapp_messages rows
 *   - Builds text vs template content per content_type
 *   - Calls the provider adapter with the conversation's contact_phone
 *   - Updates rows to delivery_status='sent' on success
 *   - Inserts 'message_sent' conversation_events audit rows
 *   - On adapter failure: bumps retry_count + schedules next_attempt_at
 *   - On MAX_RETRIES exceeded: marks 'permanently_failed'
 *   - Marks permanently_failed for unsupported content_type / missing fields
 *   - Lifecycle: returns null when mode=disabled, adapter=null, prod without flag
 *
 * Uses a fully mocked Supabase client via vi.mock — no real DB needed.
 *
 * Authority: ADR-004 §5 (outbound message immutability)
 *           ADR-004 §7 (status callback contract)
 *           ADR-004 §8 (provider adapter contract)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — every test gets a fresh mock client.
// ---------------------------------------------------------------------------

type CallRecord = { table: string; method: string; args: unknown[] };

const calls: CallRecord[] = [];

let tableBehavior: Record<
  string,
  {
    maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    selectAll?: (q: MockQuery) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
    update?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
    insert?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
  }
> = {};

interface MockQuery {
  table: string;
  selectCols: string | null;
  filters: Record<string, unknown>;
  isFilters: Record<string, unknown>;
  ltFilters: Record<string, unknown>;
  orFilters: string[];
  order: { column: string; opts?: unknown } | null;
  limitN: number | null;
  range: { from: number; to: number } | null;
}

function makeQueryChain(table: string) {
  const q: MockQuery = {
    table,
    selectCols: null,
    filters: {},
    isFilters: {},
    ltFilters: {},
    orFilters: [],
    order: null,
    limitN: null,
    range: null,
  };

  // Shared terminal handlers — for UPDATE/INSERT chains we resolve immediately
  // (the chain itself is thenable). For SELECT chains, `then` triggers the
  // selectAll handler.
  const resolveUpdate = () => {
    const handler = tableBehavior[table]?.update;
    return handler ? handler(q.filters) : Promise.resolve({ data: null, error: null });
  };
  const resolveInsert = () => {
    const handler = tableBehavior[table]?.insert;
    return handler ? handler(q) : Promise.resolve({ data: null, error: null });
  };

  const chain = {
    select(cols?: string | { count: string }) {
      calls.push({ table, method: "select", args: [cols] });
      if (typeof cols === "string" || cols === undefined) q.selectCols = cols ?? null;
      return chain;
    },
    eq(col: string, val: unknown) {
      calls.push({ table, method: "eq", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    ne(col: string, val: unknown) {
      calls.push({ table, method: "ne", args: [col, val] });
      q.filters[col] = val;
      return chain;
    },
    in(col: string, vals: unknown[]) {
      calls.push({ table, method: "in", args: [col, vals] });
      q.filters[col] = vals;
      return chain;
    },
    is(col: string, val: unknown) {
      calls.push({ table, method: "is", args: [col, val] });
      q.isFilters[col] = val;
      return chain;
    },
    lt(col: string, val: unknown) {
      calls.push({ table, method: "lt", args: [col, val] });
      q.ltFilters[col] = val;
      return chain;
    },
    or(expr: string) {
      calls.push({ table, method: "or", args: [expr] });
      q.orFilters.push(expr);
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
      q.range = { from, to };
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
    update(payload: unknown) {
      calls.push({ table, method: "update", args: [payload] });
      // Return a thenable that resolves to the handler result. Also re-exposes
      // chain methods (.eq, .in) so callers can chain filters after update().
      const thenable = {
        ...chain,
        then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
          return resolveUpdate().then(onFulfilled, onRejected);
        },
      };
      return thenable;
    },
    insert(payload: unknown) {
      calls.push({ table, method: "insert", args: [payload] });
      const thenable = {
        ...chain,
        then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
          return resolveInsert().then(onFulfilled, onRejected);
        },
      };
      return thenable;
    },
    // Terminal for SELECT without maybeSingle — `await supabase.from(t).select(...)`.
    then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      const handler = tableBehavior[table]?.selectAll;
      const result = handler ? handler(q) : Promise.resolve({ data: [], error: null, count: 0 });
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
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockSupabaseClient,
}));

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------

import type { EnvironmentStatus } from "../src/config/env.js";
import type { MessageProviderAdapter } from "../src/services/providers/adapter.js";
import {
  createWhatsAppOutboxWorker,
  startWhatsAppOutboxWorker,
} from "../src/services/whatsapp/outbox-worker.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function makeAdapter(overrides: Partial<MessageProviderAdapter> = {}): MessageProviderAdapter {
  return {
    name: "test-mock",
    sendMessage: vi.fn(async () => ({
      providerMessageId: "wamid.test.outbound",
      status: "sent" as const,
    })),
    verifyWebhookSignature: vi.fn(() => true),
    normalizeWebhookEvent: vi.fn(() => []),
    ...overrides,
  };
}

interface OutboxRowFixture {
  id: string;
  conversation_id: string;
  direction: "outbound";
  content: string | null;
  content_type: string;
  template_key: string | null;
  template_language: string | null;
  template_parameters: unknown;
  delivery_status: string;
  retry_count: number;
  conversation: {
    branch_id: string;
    contact_phone: string;
    provider_config_id: string;
  } | null;
}

function makeOutboxRow(overrides: Partial<OutboxRowFixture> = {}): OutboxRowFixture {
  return {
    id: "msg-1",
    conversation_id: "conv-1",
    direction: "outbound",
    content: "Hello, your order is ready!",
    content_type: "text",
    template_key: null,
    template_language: null,
    template_parameters: [],
    delivery_status: "pending",
    retry_count: 0,
    conversation: {
      branch_id: "branch-1",
      contact_phone: "+923000000001",
      provider_config_id: "pc-1",
    },
    ...overrides,
  };
}

function setOutboxRows(rows: OutboxRowFixture[]) {
  tableBehavior["whatsapp_messages"] = {
    selectAll: async () => ({ data: rows as unknown as Record<string, unknown>[], error: null, count: rows.length }),
    update: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
  };
  tableBehavior["whatsapp_conversation_events"] = {
    insert: async () => ({ data: null, error: null }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WhatsApp outbound outbox worker", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("lifecycle", () => {
    it("returns null when whatsappMode=disabled", () => {
      const env = makeEnvStatus({ whatsappMode: "disabled" });
      const handle = startWhatsAppOutboxWorker(env, null, 5_000);
      expect(handle).toBeNull();
    });

    it("returns null when adapter is null", () => {
      const env = makeEnvStatus({ whatsappMode: "mock" });
      const handle = startWhatsAppOutboxWorker(env, null, 5_000);
      expect(handle).toBeNull();
    });

    it("returns null in production without TELEPIZZA_WHATSAPP_WORKER=1", () => {
      const env = makeEnvStatus({ envClass: "production", whatsappMode: "mock" });
      const adapter = makeAdapter();
      const handle = startWhatsAppOutboxWorker(env, adapter, 5_000);
      expect(handle).toBeNull();
    });

    it("starts in production when TELEPIZZA_WHATSAPP_WORKER=1", () => {
      const env = makeEnvStatus({ envClass: "production", whatsappMode: "mock" });
      const adapter = makeAdapter();
      process.env.TELEPIZZA_WHATSAPP_WORKER = "1";
      try {
        const handle = startWhatsAppOutboxWorker(env, adapter, 60_000);
        expect(handle).not.toBeNull();
        handle?.stop();
      } finally {
        delete process.env.TELEPIZZA_WHATSAPP_WORKER;
      }
    });

    it("starts in test env without TELEPIZZA_WHATSAPP_WORKER flag", () => {
      const env = makeEnvStatus({ envClass: "test", whatsappMode: "mock" });
      const adapter = makeAdapter();
      const handle = startWhatsAppOutboxWorker(env, adapter, 60_000);
      expect(handle).not.toBeNull();
      handle?.stop();
    });

    it("stop() clears the interval cleanly", () => {
      const env = makeEnvStatus({ envClass: "test", whatsappMode: "mock" });
      const adapter = makeAdapter();
      const handle = startWhatsAppOutboxWorker(env, adapter, 60_000);
      expect(handle).not.toBeNull();
      expect(() => handle?.stop()).not.toThrow();
    });
  });

  describe("processOutboxBatch — text messages", () => {
    it("sends a text message and updates delivery_status to 'sent'", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow();
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.claimed).toBe(1);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.permanentlyFailed).toBe(0);

      // Adapter was called with the contact_phone + text content.
      expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
      const [to, content] = (adapter.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(to).toBe("+923000000001");
      expect(content).toEqual({ kind: "text", text: "Hello, your order is ready!" });

      // Row was updated to delivery_status='sent' with provider_message_id.
      const updateCalls = calls.filter(
        (c) => c.table === "whatsapp_messages" && c.method === "update",
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
      const sentUpdate = updateCalls.find((c) => {
        const payload = c.args[0] as Record<string, unknown>;
        return payload.delivery_status === "sent";
      });
      expect(sentUpdate).toBeDefined();
      const sentPayload = sentUpdate!.args[0] as Record<string, unknown>;
      expect(sentPayload.provider_message_id).toBe("wamid.test.outbound");
      expect(sentPayload.provider_timestamp).toBeTruthy();
      expect(sentPayload.failure_reason).toBeNull();
    });

    it("inserts a 'message_sent' conversation event", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow();
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      await worker.processOutboxBatch(10);

      const eventInserts = calls.filter(
        (c) => c.table === "whatsapp_conversation_events" && c.method === "insert",
      );
      expect(eventInserts.length).toBe(1);
      const eventPayload = eventInserts[0].args[0] as Record<string, unknown>;
      expect(eventPayload.event_type).toBe("message_sent");
      expect(eventPayload.conversation_id).toBe("conv-1");
    });

    it("marks permanently_failed for text row with null content", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow({ content: null, content_type: "text" });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(0);
      expect(result.permanentlyFailed).toBe(1);

      // Adapter should NOT have been called.
      expect(adapter.sendMessage).not.toHaveBeenCalled();

      const updateCalls = calls.filter(
        (c) => c.table === "whatsapp_messages" && c.method === "update",
      );
      const permFail = updateCalls.find((c) => {
        const p = c.args[0] as Record<string, unknown>;
        return p.delivery_status === "permanently_failed";
      });
      expect(permFail).toBeDefined();
    });
  });

  describe("processOutboxBatch — template messages", () => {
    it("sends a template message with coerced parameters", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow({
        content: null,
        content_type: "template",
        template_key: "order_confirmation",
        template_language: "en",
        template_parameters: [{ type: "text", text: "ORD-123" }],
      });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(1);

      const [, content] = (adapter.sendMessage as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(content).toEqual({
        kind: "template",
        templateKey: "order_confirmation",
        language: "en",
        parameters: [{ type: "text", text: "ORD-123" }],
      });
    });

    it("marks permanently_failed when template_key is missing", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow({
        content: null,
        content_type: "template",
        template_key: null,
      });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(0);
      expect(result.permanentlyFailed).toBe(1);
    });
  });

  describe("processOutboxBatch — failures", () => {
    it("bumps retry_count + sets provider_next_attempt_at on adapter failure", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter({
        sendMessage: vi.fn(async () => {
          throw new Error("network timeout");
        }),
      });
      const row = makeOutboxRow({ retry_count: 0 });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      const updateCalls = calls.filter(
        (c) => c.table === "whatsapp_messages" && c.method === "update",
      );
      const failUpdate = updateCalls.find((c) => {
        const p = c.args[0] as Record<string, unknown>;
        return p.delivery_status === "failed";
      });
      expect(failUpdate).toBeDefined();
      const payload = failUpdate!.args[0] as Record<string, unknown>;
      expect(payload.retry_count).toBe(1);
      expect(payload.failure_reason).toContain("network timeout");
      expect(payload.provider_next_attempt_at).toBeTruthy();
    });

    it("marks permanently_failed when retry_count reaches MAX_RETRIES", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter({
        sendMessage: vi.fn(async () => {
          throw new Error("provider 4xx");
        }),
      });
      const row = makeOutboxRow({ retry_count: 4 }); // MAX_RETRIES=5
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(0);
      expect(result.permanentlyFailed).toBe(1);

      const updateCalls = calls.filter(
        (c) => c.table === "whatsapp_messages" && c.method === "update",
      );
      const permFail = updateCalls.find((c) => {
        const p = c.args[0] as Record<string, unknown>;
        return p.delivery_status === "permanently_failed";
      });
      expect(permFail).toBeDefined();
      const payload = permFail!.args[0] as Record<string, unknown>;
      expect(payload.retry_count).toBe(5);
      expect(payload.provider_next_attempt_at).toBeNull();
    });

    it("inserts 'message_failed' event on permanent failure", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter({
        sendMessage: vi.fn(async () => {
          throw new Error("provider 4xx");
        }),
      });
      const row = makeOutboxRow({ retry_count: 4 });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      await worker.processOutboxBatch(10);

      const eventInserts = calls.filter(
        (c) => c.table === "whatsapp_conversation_events" && c.method === "insert",
      );
      const failEvent = eventInserts.find((c) => {
        const p = c.args[0] as Record<string, unknown>;
        return p.event_type === "message_failed";
      });
      expect(failEvent).toBeDefined();
    });
  });

  describe("processOutboxBatch — edge cases", () => {
    it("skips rows with missing conversation", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow({ conversation: null });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.claimed).toBe(1);
      expect(result.skipped).toBe(1);
      expect(adapter.sendMessage).not.toHaveBeenCalled();
    });

    it("marks permanently_failed for unsupported content_type", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      const row = makeOutboxRow({ content_type: "image_ref" });
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.permanentlyFailed).toBe(1);
      expect(adapter.sendMessage).not.toHaveBeenCalled();
    });

    it("handles adapter returning status='failed' as a thrown error", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter({
        sendMessage: vi.fn(async () => ({
          providerMessageId: "",
          status: "failed" as const,
          failureReason: "provider rejected",
        })),
      });
      const row = makeOutboxRow();
      setOutboxRows([row]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);

      const updateCalls = calls.filter(
        (c) => c.table === "whatsapp_messages" && c.method === "update",
      );
      const failUpdate = updateCalls.find((c) => {
        const p = c.args[0] as Record<string, unknown>;
        return p.delivery_status === "failed";
      });
      expect(failUpdate).toBeDefined();
      expect((failUpdate!.args[0] as Record<string, unknown>).failure_reason).toContain("provider rejected");
    });

    it("returns zero claimed when no rows exist", async () => {
      const env = makeEnvStatus();
      const adapter = makeAdapter();
      setOutboxRows([]);

      const worker = createWhatsAppOutboxWorker(env, adapter);
      const result = await worker.processOutboxBatch(10);

      expect(result.claimed).toBe(0);
      expect(result.sent).toBe(0);
      expect(adapter.sendMessage).not.toHaveBeenCalled();
    });
  });
});
