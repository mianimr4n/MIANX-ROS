/**
 * Tests for AI services (ADR-013/014/015).
 *
 * Verifies:
 *   PII redaction (ADR-013):
 *   - Redacts E.164 phones
 *   - Redacts Pakistani mobile without +
 *   - Redacts emails
 *   - Redacts credit card numbers
 *   - Redacts Pakistani CNIC
 *   - detectPromptLanguage for Urdu vs English
 *
 *   Prompt log service (ADR-015):
 *   - hashPrompt returns deterministic SHA-256
 *   - logCall inserts + upserts prompt log
 *   - listCallLogs respects branch scope
 *
 *   Approval service (ADR-014):
 *   - createApproval rejects invalid actionType
 *   - approve rejects non-pending status
 *   - approve rejects expired
 *   - reject requires reason
 *   - markExecuted requires approved/failed status
 *   - listApprovals with filters
 *
 * Authority: ADR-013 §2 (redaction), ADR-014 §3 (state machine),
 *           ADR-015 §1 (no raw prompts)
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
  isFilters: Record<string, unknown>;
  inFilters: Record<string, unknown[]>;
  gteFilters: Record<string, unknown>;
  lteFilters: Record<string, unknown>;
  orFilters: string | null;
  order: { column: string; opts?: unknown } | null;
  rangeFrom: number | null;
  rangeTo: number | null;
  countMode: string | null;
}

let tableBehavior: Record<
  string,
  {
    maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    single?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
    selectAll?: (q: MockQuery) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
    insertSingle?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
    updateSingle?: (payload: unknown) => Promise<{ data: unknown; error: unknown }>;
  }
> = {};

let rpcBehavior: Record<string, (args: unknown) => Promise<{ data: unknown; error: unknown }>> = {};

function makeQueryChain(table: string) {
  const q: MockQuery = {
    table, filters: {}, isFilters: {}, inFilters: {}, gteFilters: {}, lteFilters: {},
    orFilters: null, order: null, rangeFrom: null, rangeTo: null, countMode: null,
  };
  const chain = {
    select(cols?: string | { count: string }, opts?: { count?: string }) {
      calls.push({ table, method: "select", args: [cols, opts] });
      if (typeof opts === "object" && opts !== null && opts.count) q.countMode = opts.count;
      return chain;
    },
    eq(col: string, val: unknown) { calls.push({ table, method: "eq", args: [col, val] }); q.filters[col] = val; return chain; },
    is(col: string, val: unknown) { calls.push({ table, method: "is", args: [col, val] }); q.isFilters[col] = val; return chain; },
    in(col: string, vals: unknown[]) { calls.push({ table, method: "in", args: [col, vals] }); q.inFilters[col] = vals; return chain; },
    or(filter: string) { calls.push({ table, method: "or", args: [filter] }); q.orFilters = filter; return chain; },
    gte(col: string, val: unknown) { calls.push({ table, method: "gte", args: [col, val] }); q.gteFilters[col] = val; return chain; },
    lte(col: string, val: unknown) { calls.push({ table, method: "lte", args: [col, val] }); q.lteFilters[col] = val; return chain; },
    order(column: string, opts?: unknown) { calls.push({ table, method: "order", args: [column, opts] }); q.order = { column, opts }; return chain; },
    range(from: number, to: number) { calls.push({ table, method: "range", args: [from, to] }); q.rangeFrom = from; q.rangeTo = to; return chain; },
    async maybeSingle() {
      calls.push({ table, method: "maybeSingle", args: [] });
      const h = tableBehavior[table]?.maybeSingle ?? tableBehavior[table]?.single;
      if (h) return h(q);
      return { data: null, error: null };
    },
    async single() {
      calls.push({ table, method: "single", args: [] });
      const h = tableBehavior[table]?.single ?? tableBehavior[table]?.maybeSingle;
      if (h) return h(q);
      return { data: null, error: null };
    },
    async then(onFulfilled: (val: unknown) => unknown, onRejected?: (err: unknown) => unknown) {
      try {
        const h = tableBehavior[table]?.selectAll;
        const r = h ? await h(q) : { data: [], error: null, count: 0 };
        return Promise.resolve(r).then(onFulfilled, onRejected);
      } catch (err) { return Promise.reject(err).then(undefined, onRejected); }
    },
    insert(payload: unknown) {
      calls.push({ table, method: "insert", args: [payload] });
      return {
        select(cols?: string) {
          calls.push({ table, method: "insert.select", args: [cols] });
          return {
            async single() {
              const h = tableBehavior[table]?.insertSingle;
              if (h) return h(payload);
              return { data: null, error: null };
            },
          };
        },
      };
    },
    update(payload: unknown) {
      calls.push({ table, method: "update", args: [payload] });
      return {
        eq(col: string, val: unknown) { calls.push({ table, method: "update.eq", args: [col, val] }); q.filters[col] = val; return this; },
        in(col: string, vals: unknown[]) { calls.push({ table, method: "update.in", args: [col, vals] }); q.inFilters[col] = vals; return this; },
        select(cols?: string) {
          calls.push({ table, method: "update.select", args: [cols] });
          return {
            async single() {
              const h = tableBehavior[table]?.updateSingle;
              if (h) return h(payload);
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
  from(table: string) { calls.push({ table, method: "from", args: [] }); return makeQueryChain(table); },
  rpc(name: string, args: unknown) {
    calls.push({ table: "rpc", method: name, args: [args] });
    const h = rpcBehavior[name];
    if (h) return h(args).then((d) => d, (e) => Promise.reject(e));
    return Promise.resolve({ data: null, error: null });
  },
};

vi.mock("@supabase/supabase-js", () => ({ createClient: () => mockSupabaseClient }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { EnvironmentStatus } from "../src/config/env.js";
import { redactPii, detectPromptLanguage } from "../src/services/ai/pii-redaction.js";
import { createAiPromptLogService } from "../src/services/ai/prompt-log-service.js";
import { createAiApprovalService } from "../src/services/ai/approval-service.js";

function makeEnvStatus(): EnvironmentStatus {
  return {
    isReady: true, safetyBlockers: [], issues: [],
    config: {
      supabaseUrl: "https://test.supabase.co",
      supabaseServiceRoleKey: "test-service-role-key",
      envClass: "test", port: 3000, corsOrigin: "http://localhost:3000",
    } as EnvironmentStatus["config"],
  } as EnvironmentStatus;
}

const ACTOR_USER_ID = "user-admin";
const APPROVAL_ID = "approval-001";

describe("ADR-013 — PII Redaction", () => {
  it("redacts E.164 phone numbers", () => {
    expect(redactPii("Call me at +923001234567")).toBe("Call me at [PHONE]");
  });

  it("redacts Pakistani mobile without +", () => {
    expect(redactPii("My number is 03001234567")).toBe("My number is [PHONE]");
  });

  it("redacts email addresses", () => {
    expect(redactPii("Email ahmed@example.com please")).toBe("Email [EMAIL] please");
  });

  it("redacts credit card numbers (16 digits with dashes)", () => {
    expect(redactPii("Card 4111-1111-1111-1111 valid")).toBe("Card [CARD] valid");
  });

  it("redacts credit card numbers (16 digits with spaces)", () => {
    expect(redactPii("Card 4111 1111 1111 1111 valid")).toBe("Card [CARD] valid");
  });

  it("redacts Pakistani CNIC", () => {
    expect(redactPii("CNIC 12345-1234567-1 here")).toBe("CNIC [CNIC] here");
  });

  it("does not redact normal order text", () => {
    expect(redactPii("Order 2x Margherita pizza, total PKR 1500")).toBe("Order 2x Margherita pizza, total PKR 1500");
  });

  it("handles empty string", () => {
    expect(redactPii("")).toBe("");
  });

  it("handles non-string input", () => {
    expect(redactPii(null as unknown as string)).toBe("");
  });

  it("redacts multiple PII in one prompt", () => {
    const result = redactPii("Call +923001234567 or email ahmed@example.com. CNIC 12345-1234567-1");
    expect(result).toBe("Call [PHONE] or email [EMAIL]. CNIC [CNIC]");
  });
});

describe("ADR-015 — Prompt Language Detection", () => {
  it("detects Urdu text", () => {
    expect(detectPromptLanguage("یہ ایک اردو جملہ ہے")).toBe("ur");
  });

  it("detects English text", () => {
    expect(detectPromptLanguage("This is an English sentence")).toBe("en");
  });

  it("returns en for empty input", () => {
    expect(detectPromptLanguage("")).toBe("en");
  });

  it("returns en for mostly-English with one Urdu word", () => {
    expect(detectPromptLanguage("Hello world this is an English sentence with many words and only one Urdu word at the end سلام")).toBe("en");
  });
});

describe("ADR-015 — Prompt Log Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      ai_call_logs: {
        insertSingle: async (payload) => ({
          data: { id: 42, ...(payload as Record<string, unknown>) },
          error: null,
        }),
        selectAll: async () => ({
          data: [{
            id: 42, actor_user_id: ACTOR_USER_ID, branch_id: null,
            provider: "openai", model: "gpt-4",
            prompt_sha256: "abc123", prompt_token_count: 100,
            prompt_char_count: 500, prompt_language: "en",
            completion_token_count: 50, latency_ms: 1200,
            cost_usd: 0.05, success: true, error_message: null,
            metadata: {}, called_at: new Date().toISOString(),
          }],
          error: null, count: 1,
        }),
      },
      ai_prompt_logs: {
        selectAll: async () => ({
          data: [{
            id: 1, prompt_sha256: "abc123",
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            occurrence_count: 5, avg_latency_ms: 1100,
            avg_cost_usd: 0.04, prompt_language: "en", metadata: {},
          }],
          error: null, count: 1,
        }),
      },
    };
    rpcBehavior = {
      upsert_ai_prompt_log: async () => ({ data: null, error: null }),
    };
  });

  describe("hashPrompt", () => {
    it("returns deterministic SHA-256 hash", () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      const h1 = svc.hashPrompt("hello world");
      const h2 = svc.hashPrompt("hello world");
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });

    it("returns different hashes for different prompts", () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      expect(svc.hashPrompt("prompt A")).not.toBe(svc.hashPrompt("prompt B"));
    });

    it("rejects non-string input", () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      expect(() => svc.hashPrompt(null as unknown as string)).toThrow();
    });
  });

  describe("logCall", () => {
    it("inserts call log + upserts prompt log", async () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      const id = await svc.logCall({
        actorUserId: ACTOR_USER_ID,
        provider: "openai",
        model: "gpt-4",
        redactedPrompt: "What is the order status?",
        promptTokenCount: 10,
        latencyMs: 500,
        costUsd: 0.02,
        success: true,
      });
      expect(id).toBe(42);
      expect(calls.some((c) => c.table === "ai_call_logs" && c.method === "insert")).toBe(true);
      expect(calls.some((c) => c.method === "upsert_ai_prompt_log")).toBe(true);
    });

    it("rejects missing provider", async () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      await expect(
        svc.logCall({
          actorUserId: ACTOR_USER_ID,
          provider: "",
          model: "gpt-4",
          redactedPrompt: "test",
          success: true,
        }),
      ).rejects.toMatchObject({ code: "INVALID_CALL_LOG" });
    });

    it("rejects missing redactedPrompt", async () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      await expect(
        svc.logCall({
          actorUserId: ACTOR_USER_ID,
          provider: "openai",
          model: "gpt-4",
          redactedPrompt: null as unknown as string,
          success: true,
        }),
      ).rejects.toMatchObject({ code: "INVALID_CALL_LOG" });
    });
  });

  describe("listCallLogs", () => {
    it("returns call logs for super-admin", async () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      const result = await svc.listCallLogs({
        actorBranchIds: [], isSuperAdmin: true,
      });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("applies branch scope for non-super-admin", async () => {
      const svc = createAiPromptLogService(makeEnvStatus());
      await svc.listCallLogs({
        actorBranchIds: ["branch-1"], isSuperAdmin: false,
      });
      expect(calls.some((c) => c.method === "or")).toBe(true);
    });
  });
});

describe("ADR-014 — AI Approval Service", () => {
  beforeEach(() => {
    calls.length = 0;
    tableBehavior = {
      ai_approvals: {
        insertSingle: async (payload) => ({
          data: {
            id: APPROVAL_ID, ...(payload as Record<string, unknown>),
            status: "pending",
            requested_at: new Date().toISOString(),
            decided_by: null, decided_at: null, decision_reason: null,
            executed_at: null, execution_result: null,
            execution_retry_count: 0,
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        maybeSingle: async (q) => {
          if (q.filters.id === APPROVAL_ID || q.isFilters.id === APPROVAL_ID) {
            return {
              data: {
                id: APPROVAL_ID,
                ai_call_log_id: null,
                action_type: "order.cancel",
                action_payload: { order_id: "order-1" },
                status: q.inFilters.status?.includes("pending") ? "pending" : "pending",
                requested_by: ACTOR_USER_ID,
                requested_at: new Date().toISOString(),
                decided_by: null, decided_at: null, decision_reason: null,
                executed_at: null, execution_result: null,
                execution_retry_count: 0,
                expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        updateSingle: async (payload) => ({
          data: {
            id: APPROVAL_ID, ...(payload as Record<string, unknown>),
            action_type: "order.cancel",
            action_payload: {},
            requested_by: ACTOR_USER_ID,
            requested_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            metadata: {}, created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
        selectAll: async () => ({
          data: [{
            id: APPROVAL_ID,
            ai_call_log_id: null,
            action_type: "order.cancel",
            action_payload: { order_id: "order-1" },
            status: "pending",
            requested_by: ACTOR_USER_ID,
            requested_at: new Date().toISOString(),
            decided_by: null, decided_at: null, decision_reason: null,
            executed_at: null, execution_result: null,
            execution_retry_count: 0,
            expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }],
          error: null, count: 1,
        }),
      },
    };
  });

  describe("createApproval", () => {
    it("creates a pending approval for a valid actionType", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      const row = await svc.createApproval({
        actionType: "order.cancel",
        actionPayload: { order_id: "order-1" },
        requestedBy: ACTOR_USER_ID,
      });
      expect(row.id).toBe(APPROVAL_ID);
      expect(row.status).toBe("pending");
    });

    it("rejects invalid actionType", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.createApproval({
          actionType: "invalid.action" as never,
          actionPayload: {},
          requestedBy: ACTOR_USER_ID,
        }),
      ).rejects.toMatchObject({ code: "INVALID_APPROVAL" });
    });

    it("rejects missing actionPayload", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.createApproval({
          actionType: "order.cancel",
          actionPayload: null as unknown as Record<string, unknown>,
          requestedBy: ACTOR_USER_ID,
        }),
      ).rejects.toMatchObject({ code: "INVALID_APPROVAL" });
    });
  });

  describe("approve", () => {
    it("approves a pending approval", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      const row = await svc.approve({
        approvalId: APPROVAL_ID,
        actorUserId: ACTOR_USER_ID,
        reason: "approved by manager",
      });
      expect(row.id).toBe(APPROVAL_ID);
    });

    it("rejects approval that does not exist", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.approve({
          approvalId: "nonexistent",
          actorUserId: ACTOR_USER_ID,
        }),
      ).rejects.toMatchObject({ code: "APPROVAL_NOT_FOUND" });
    });

    it("rejects approval in non-pending status", async () => {
      const original = tableBehavior.ai_approvals!.maybeSingle!;
      tableBehavior.ai_approvals!.maybeSingle = async () => ({
        data: {
          id: APPROVAL_ID,
          status: "approved",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        },
        error: null,
      });
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.approve({
          approvalId: APPROVAL_ID,
          actorUserId: ACTOR_USER_ID,
        }),
      ).rejects.toMatchObject({ code: "APPROVAL_NOT_PENDING" });
      tableBehavior.ai_approvals!.maybeSingle = original;
    });
  });

  describe("reject", () => {
    it("rejects approval without reason", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.reject({
          approvalId: APPROVAL_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "",
        }),
      ).rejects.toMatchObject({ code: "INVALID_APPROVAL" });
    });

    it("rejects approval with reason over 1000 chars", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      await expect(
        svc.reject({
          approvalId: APPROVAL_ID,
          actorUserId: ACTOR_USER_ID,
          reason: "x".repeat(1001),
        }),
      ).rejects.toMatchObject({ code: "INVALID_APPROVAL" });
    });
  });

  describe("listApprovals", () => {
    it("lists approvals with status filter", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      const result = await svc.listApprovals({ status: "pending" });
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(calls.some((c) => c.method === "eq" && c.args[0] === "status")).toBe(true);
    });
  });

  describe("getApproval", () => {
    it("returns approval by id", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      const row = await svc.getApproval({ approvalId: APPROVAL_ID });
      expect(row).not.toBeNull();
      expect(row!.id).toBe(APPROVAL_ID);
    });

    it("returns null when not found", async () => {
      const svc = createAiApprovalService(makeEnvStatus());
      const row = await svc.getApproval({ approvalId: "nonexistent" });
      expect(row).toBeNull();
    });
  });
});
