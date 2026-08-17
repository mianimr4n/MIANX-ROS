/**
 * Tests for the Provider Proxy service (ADR-013 §1-7, ADR-015 §1).
 *
 * Verifies:
 *   PII redaction BEFORE forwarding:
 *   - Phone numbers redacted before HTTP call
 *   - Email addresses redacted before HTTP call
 *
 *   Per-call audit logging (ADR-013 §4, ADR-015 §1):
 *   - Success path inserts a row with success=true
 *   - Failure path (HTTP error) inserts a row with success=false and rethrows
 *   - Missing-API-key path inserts a row with success=false
 *
 *   aiMode integration:
 *   - "disabled" → throws 503 AI_DISABLED; NO log row written
 *   - "mock" → returns deterministic stub; NO HTTP call; log row written
 *   - "live" → real fetch call (mocked); log row written with tokens+cost
 *
 *   Provider routing:
 *   - Explicit provider="openai" routes to OpenAI Chat Completions URL
 *   - Explicit provider="anthropic" routes to Anthropic Messages URL
 *   - No provider specified → first active config wins (openai before anthropic)
 *   - Provider not in ai_provider_configs → 400 AI_PROVIDER_NOT_CONFIGURED
 *
 *   Rate limiting (ADR-013 §5):
 *   - 61st call in same 60s window for same user → 429 AI_RATE_LIMIT_USER
 *   - 121st call in same 60s window for same IP → 429 AI_RATE_LIMIT_IP
 *
 *   Response redaction (ADR-013 §7):
 *   - HTTP response text is run through redactPii before returning
 *
 * Authority: ADR-013 §1-7, ADR-015 §1 (no raw prompts ever stored)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — minimal chain builder
// ---------------------------------------------------------------------------

type CallRecord = { table: string; method: string; args: unknown[] };
const calls: CallRecord[] = [];

interface MockQuery {
  table: string;
  eqFilters: Record<string, unknown>[];
}

interface TableBehavior {
  maybeSingle?: (q: MockQuery) => Promise<{ data: unknown; error: unknown }>;
}

const tableBehavior: Record<string, TableBehavior> = {};

function makeQueryChain(table: string) {
  const q: MockQuery = { table, eqFilters: [] };
  const chain = {
    select() { calls.push({ table, method: "select", args: [] }); return chain; },
    eq(col: string, val: unknown) { calls.push({ table, method: "eq", args: [col, val] }); q.eqFilters.push({ [col]: val }); return chain; },
    async maybeSingle() {
      calls.push({ table, method: "maybeSingle", args: [] });
      const h = tableBehavior[table]?.maybeSingle;
      if (h) return h(q);
      return { data: null, error: null };
    },
    async single() {
      calls.push({ table, method: "single", args: [] });
      const h = tableBehavior[table]?.maybeSingle;
      if (h) return h(q);
      return { data: null, error: null };
    },
    async then(onFulfilled: (val: unknown) => unknown) {
      const h = tableBehavior[table]?.maybeSingle;
      const r = h ? await h(q) : { data: null, error: null, count: 0 };
      return Promise.resolve(r).then(onFulfilled);
    },
  };
  return chain;
}

const mockSupabaseClient = {
  from(table: string) { calls.push({ table, method: "from", args: [] }); return makeQueryChain(table); },
  rpc() { return Promise.resolve({ data: null, error: null }); },
};

vi.mock("@supabase/supabase-js", () => ({ createClient: () => mockSupabaseClient }));

// ---------------------------------------------------------------------------
// Mock fetch — captures the HTTP request and returns a synthetic response
// ---------------------------------------------------------------------------

interface FetchCapture {
  url: string;
  init?: RequestInit;
}

const fetchCaptures: FetchCapture[] = [];
let fetchImpl: ((url: string, init?: RequestInit) => Promise<{ ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<unknown> }>) | null = null;

const originalFetch = global.fetch;

beforeEach(() => {
  fetchCaptures.length = 0;
  fetchImpl = null;
  (globalThis as { fetch: typeof fetch }).fetch = ((url: string, init?: RequestInit) => {
    fetchCaptures.push({ url, init });
    if (fetchImpl) return fetchImpl(url, init);
    return Promise.resolve({
      ok: true, status: 200,
      text: () => Promise.resolve(""),
      json: () => Promise.resolve({}),
    });
  }) as typeof fetch;
});

afterEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
});

// ---------------------------------------------------------------------------
// Imports — must come AFTER vi.mock
// ---------------------------------------------------------------------------

import type { EnvironmentStatus } from "../src/config/env.js";
import { createProviderProxy, __testInternals } from "../src/services/ai/provider-proxy.js";
import type { AiPromptLogService } from "../src/services/ai/prompt-log-service.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvStatus(aiMode: "disabled" | "mock" | "sandbox" | "live" = "mock"): EnvironmentStatus {
  return {
    isReady: true, safetyBlockers: [], issues: [],
    config: {
      supabaseUrl: "https://test.supabase.co",
      supabaseServiceRoleKey: "test-service-role-key",
      envClass: "test", port: 3000, corsOrigin: "http://localhost:3000",
      aiMode,
    } as EnvironmentStatus["config"],
  } as EnvironmentStatus;
}

/** Stub prompt-log service — captures logCall() invocations without touching DB. */
function makeStubLogService(): AiPromptLogService & { logCalls: Array<Record<string, unknown>> } {
  const logCalls: Array<Record<string, unknown>> = [];
  return {
    logCalls,
    hashPrompt(redactedPrompt: string) { return redactedPrompt; /* not used */ },
    async logCall(input: Parameters<AiPromptLogService["logCall"]>[0]) {
      logCalls.push({ ...input });
      return logCalls.length;
    },
    async listCallLogs() { return { rows: [], total: 0 }; },
    async listPromptLogs() { return { rows: [], total: 0 }; },
  } as unknown as AiPromptLogService & { logCalls: Array<Record<string, unknown>> };
}

function setOpenAiConfig(baseUrl = "https://api.openai.com/v1") {
  tableBehavior.ai_provider_configs = {
    maybeSingle: async (q: MockQuery) => {
      const providerFilter = q.eqFilters.find((f) => "provider_code" in f) as { provider_code: string } | undefined;
      const code = providerFilter?.provider_code;
      if (code === "openai") {
        return {
          data: {
            provider_code: "openai",
            base_url: baseUrl,
            default_model: "gpt-4o-mini",
            max_tokens: 4096,
            temperature: 0.7,
          },
          error: null,
        };
      }
      if (code === "anthropic") {
        return {
          data: {
            provider_code: "anthropic",
            base_url: "https://api.anthropic.com",
            default_model: "claude-3-5-sonnet",
            max_tokens: 4096,
            temperature: 0.7,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    },
  };
}

const CONTEXT = { actorUserId: "user-1", branchId: null, ipHash: "ip-1" };

beforeEach(() => {
  calls.length = 0;
  __testInternals.__resetBuckets();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ADR-013 — Provider Proxy (Phase 13.0 foundational build)", () => {
  describe("aiMode=disabled", () => {
    it("refuses the call and writes NO log row", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("disabled"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      await expect(
        proxy.callLLM("hello", {}, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_DISABLED" });

      expect(log.logCalls).toHaveLength(0);
      expect(fetchCaptures).toHaveLength(0);
    });
  });

  describe("aiMode=mock (default for local/test)", () => {
    it("returns a deterministic stub WITHOUT making an HTTP call", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), {
        promptLogService: log,
      });

      const res = await proxy.callLLM("Summarize this order", {}, CONTEXT);

      expect(res.provider).toBe("openai");
      expect(res.model).toBe("gpt-4o-mini");
      expect(res.text).toContain("[MOCK openai/gpt-4o-mini]");
      expect(res.text).toContain("Summarize this order");
      expect(res.costUsd).toBe(0);
      expect(fetchCaptures).toHaveLength(0);
    });

    it("still writes a log row with success=true (ADR-013 §4)", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await proxy.callLLM("hello world", {}, CONTEXT);

      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({
        provider: "openai",
        model: "gpt-4o-mini",
        success: true,
        costUsd: 0,
      });
    });

    it("redacts PII in the prompt BEFORE building the mock echo", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      const res = await proxy.callLLM(
        "Customer phone is +923001234567 and email is ali@example.com",
        {},
        CONTEXT,
      );

      // Mock response text contains the redacted prompt (no raw PII).
      expect(res.text).not.toContain("+923001234567");
      expect(res.text).not.toContain("ali@example.com");
      expect(res.text).toContain("[PHONE]");
      expect(res.text).toContain("[EMAIL]");
    });
  });

  describe("aiMode=live", () => {
    it("routes to OpenAI Chat Completions when provider=openai", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({
          choices: [{ message: { content: "Hello there" } }],
          usage: { prompt_tokens: 5, completion_tokens: 2 },
        }),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      const res = await proxy.callLLM("Say hello", { provider: "openai" }, CONTEXT);

      expect(fetchCaptures).toHaveLength(1);
      expect(fetchCaptures[0].url).toBe("https://api.openai.com/v1/chat/completions");
      const init = fetchCaptures[0].init as Record<string, unknown>;
      const headers = init.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer sk-test");
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body.model).toBe("gpt-4o-mini");
      expect(body.messages).toEqual([{ role: "user", content: "Say hello" }]);

      expect(res.text).toBe("Hello there");
      expect(res.promptTokenCount).toBe(5);
      expect(res.completionTokenCount).toBe(2);
      // Cost estimate for gpt-4o-mini: 5 * 0.00015/1000 + 2 * 0.0006/1000 = 0.00000195
      expect(res.costUsd).toBeGreaterThan(0);
      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({ success: true });
    });

    it("routes to Anthropic Messages API when provider=anthropic", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({
          content: [{ type: "text", text: "Hi from Claude" }],
          usage: { input_tokens: 4, output_tokens: 3 },
        }),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { ANTHROPIC_API_KEY: "sk-ant-test" },
        promptLogService: log,
      });

      const res = await proxy.callLLM("Say hi", { provider: "anthropic" }, CONTEXT);

      expect(fetchCaptures).toHaveLength(1);
      expect(fetchCaptures[0].url).toBe("https://api.anthropic.com/v1/messages");
      const init = fetchCaptures[0].init as Record<string, unknown>;
      const headers = init.headers as Record<string, string>;
      expect(headers["x-api-key"]).toBe("sk-ant-test");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
      expect(res.text).toBe("Hi from Claude");
    });

    it("redacts PII in the prompt BEFORE forwarding (ADR-013 §2)", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({
          choices: [{ message: { content: "OK" } }],
          usage: { prompt_tokens: 5, completion_tokens: 1 },
        }),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      await proxy.callLLM("Call me at +923001234567", {}, CONTEXT);

      const body = JSON.parse(fetchCaptures[0].init!.body as string) as { messages: Array<{ content: string }> };
      // Provider should see the REDACTED prompt, not the raw one
      expect(body.messages[0].content).toBe("Call me at [PHONE]");
      expect(body.messages[0].content).not.toContain("+923001234567");
    });

    it("redacts PII in the response before returning (ADR-013 §7)", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({
          choices: [{ message: { content: "Echo back: +923001234567 and ali@example.com" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5 },
        }),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      const res = await proxy.callLLM("hello", {}, CONTEXT);

      expect(res.text).not.toContain("+923001234567");
      expect(res.text).not.toContain("ali@example.com");
      expect(res.text).toContain("[PHONE]");
      expect(res.text).toContain("[EMAIL]");
    });

    it("logs success=false and rethrows when provider returns HTTP 5xx", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: false, status: 503,
        text: () => Promise.resolve("Service Unavailable"),
        json: () => Promise.resolve({}),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      await expect(
        proxy.callLLM("hello", { provider: "openai" }, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_PROVIDER_HTTP_ERROR" });

      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({
        success: false,
        errorMessage: expect.stringContaining("OpenAI returned 503"),
      });
    });

    it("throws AI_API_KEY_MISSING when OPENAI_API_KEY env var is not set", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: {},  // no API key set
        promptLogService: log,
      });

      await expect(
        proxy.callLLM("hello", { provider: "openai" }, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_API_KEY_MISSING" });

      expect(fetchCaptures).toHaveLength(0);
      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({
        success: false,
        errorMessage: expect.stringContaining("OPENAI_API_KEY"),
      });
    });

    it("uses provider config's default_model when no model option is given", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      fetchImpl = () => Promise.resolve({
        ok: true, status: 200,
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({
          choices: [{ message: { content: "OK" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
      });
      const proxy = createProviderProxy(makeEnvStatus("live"), {
        envSource: { OPENAI_API_KEY: "sk-test" },
        promptLogService: log,
      });

      await proxy.callLLM("hi", { provider: "openai" }, CONTEXT);
      const body = JSON.parse(fetchCaptures[0].init!.body as string) as { model: string };
      expect(body.model).toBe("gpt-4o-mini");  // from ai_provider_configs.default_model
    });
  });

  describe("provider routing", () => {
    it("falls back to OpenAI when no provider is specified (pickProvider)", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      const res = await proxy.callLLM("hello", {}, CONTEXT);
      expect(res.provider).toBe("openai");
    });

    it("throws AI_PROVIDER_NOT_CONFIGURED when provider code has no active config row", async () => {
      tableBehavior.ai_provider_configs = {
        maybeSingle: async () => ({ data: null, error: null }),
      };
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM("hello", { provider: "openai" }, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });

      // log row IS still written (with provider="openai", success=false)
      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({
        provider: "openai",
        success: false,
      });
    });

    it("throws AI_NO_ACTIVE_PROVIDER when no provider is specified and none are configured", async () => {
      tableBehavior.ai_provider_configs = {
        maybeSingle: async () => ({ data: null, error: null }),
      };
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM("hello", {}, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_NO_ACTIVE_PROVIDER" });
    });
  });

  describe("rate limiting (ADR-013 §5)", () => {
    it("returns 429 AI_RATE_LIMIT_USER on the 61st call within 60s", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // 60 calls succeed
      for (let i = 0; i < 60; i++) {
        await proxy.callLLM(`prompt ${i}`, {}, CONTEXT);
      }
      // 61st call fails
      await expect(
        proxy.callLLM("one too many", {}, CONTEXT),
      ).rejects.toMatchObject({ code: "AI_RATE_LIMIT_USER" });
    });

    it("returns 429 AI_RATE_LIMIT_IP on the 121st call from the same IP", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // Use 60 different user ids all from the same IP (ipHash="shared-ip")
      // to bypass the per-user limit and hit the per-IP limit (120/min).
      for (let i = 0; i < 120; i++) {
        await proxy.callLLM(
          "prompt",
          {},
          { actorUserId: `user-${i}`, branchId: null, ipHash: "shared-ip" },
        );
      }
      // 121st call from the same IP should fail
      await expect(
        proxy.callLLM("one too many", {}, { actorUserId: "user-121", branchId: null, ipHash: "shared-ip" }),
      ).rejects.toMatchObject({ code: "AI_RATE_LIMIT_IP" });
    });
  });

  describe("input validation", () => {
    it("rejects an empty prompt with 400 INVALID_PROMPT", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM("", {}, CONTEXT),
      ).rejects.toMatchObject({ code: "INVALID_PROMPT" });
      expect(log.logCalls).toHaveLength(0);
    });

    it("rejects a non-string prompt", async () => {
      setOpenAiConfig();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM(null as unknown as string, {}, CONTEXT),
      ).rejects.toMatchObject({ code: "INVALID_PROMPT" });
    });
  });
});
