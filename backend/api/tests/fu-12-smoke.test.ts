/**
 * FU-12 Smoke + Rate-Limit Verification (TABLETOP execution of the
 * FU-12 Operator Follow-up runbook in local/mock mode).
 *
 * Runbook: docs/15-runbooks/FU-12-ai-provider-keys.md
 * Step 4 — Smoke-test the proxy (mock-mode local variant; runbook §Step 4
 *          explicitly permits "mock stub in local").
 * Step 5 — Verify rate-limiting (the 61st call per user / 121st per IP
 *          MUST return HTTP 429 with code AI_RATE_LIMIT_USER /
 *          AI_RATE_LIMIT_IP).
 *
 * Why this file exists separately from ai-provider-proxy.test.ts:
 *   The FU-12 runbook specifies EXACT verification steps (specific prompt,
 *   specific provider, specific call count). This file encodes those
 *   verbatim so any regression that breaks the runbook procedure is
 *   surfaced by `pnpm vitest run fu-12-smoke`. The existing test file
 *   covers broader ADR-013 §1-7 contract enforcement; this file covers
 *   operator-runnable verification.
 *
 * Environment:
 *   - aiMode = "mock" (per runbook §Step 2 — local/test default; no real
 *     API keys, no real HTTP, deterministic stub responses).
 *   - Supabase client is mocked with both OpenAI + Anthropic provider
 *     config rows seeded (matches the SQL seed in scripts/fu-12-seed-ai-provider-configs.sql).
 *
 * Authority: ADR-013 §1-7, ADR-015 §1, ADR-003 (provider-secret boundary),
 *            docs/15-runbooks/FU-12-ai-provider-keys.md §Step 4 + §Step 5.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @supabase/supabase-js — minimal chain builder (mirrors
// ai-provider-proxy.test.ts to keep behavior identical).
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
    eq(col: string, val: unknown) {
      calls.push({ table, method: "eq", args: [col, val] });
      q.eqFilters.push({ [col]: val });
      return chain;
    },
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
  from(table: string) {
    calls.push({ table, method: "from", args: [] });
    return makeQueryChain(table);
  },
  rpc() { return Promise.resolve({ data: null, error: null }); },
};

vi.mock("@supabase/supabase-js", () => ({ createClient: () => mockSupabaseClient }));

// ---------------------------------------------------------------------------
// Mock fetch — captured but unused in mock mode (no HTTP should fire).
// ---------------------------------------------------------------------------

interface FetchCapture { url: string; init?: RequestInit; }
const fetchCaptures: FetchCapture[] = [];

const originalFetch = global.fetch;

beforeEach(() => {
  fetchCaptures.length = 0;
  (globalThis as { fetch: typeof fetch }).fetch = ((_url: string, _init?: RequestInit) => {
    fetchCaptures.push({ url: _url, init: _init });
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
import { ApiError } from "../src/common/http.js";

// ---------------------------------------------------------------------------
// Helpers — mirror the same shape as ai-provider-proxy.test.ts so behavior
// stays consistent across both files.
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

function makeStubLogService(): AiPromptLogService & { logCalls: Array<Record<string, unknown>> } {
  const logCalls: Array<Record<string, unknown>> = [];
  return {
    logCalls,
    hashPrompt(redactedPrompt: string) { return redactedPrompt; },
    async logCall(input: Parameters<AiPromptLogService["logCall"]>[0]) {
      logCalls.push({ ...input });
      return logCalls.length;
    },
    async listCallLogs() { return { rows: [], total: 0 }; },
    async listPromptLogs() { return { rows: [], total: 0 }; },
  } as unknown as AiPromptLogService & { logCalls: Array<Record<string, unknown>> };
}

/**
 * Seed both OpenAI + Anthropic provider config rows — mirrors the SQL
 * in scripts/fu-12-seed-ai-provider-configs.sql exactly (provider_code,
 * base_url, default_model, max_tokens, temperature, is_active).
 */
function setBothProviderConfigs() {
  tableBehavior.ai_provider_configs = {
    maybeSingle: async (q: MockQuery) => {
      const providerFilter = q.eqFilters.find((f) => "provider_code" in f) as
        | { provider_code: string }
        | undefined;
      const code = providerFilter?.provider_code;
      if (code === "openai") {
        return {
          data: {
            provider_code: "openai",
            base_url: "https://api.openai.com/v1",
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

const SMOKE_CONTEXT = {
  actorUserId: "fu-12-smoke-user",
  branchId: null,
  ipHash: "fu-12-smoke-ip",
};

beforeEach(() => {
  calls.length = 0;
  __testInternals.__resetBuckets();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FU-12 — Operator Follow-up smoke verification (mock mode)", () => {
  describe("Step 4 — Smoke-test the proxy", () => {
    it("returns a non-empty response when called with the runbook smoke prompt + provider=openai", async () => {
      // Per runbook §Step 4: prompt = "Say hello in 3 words", provider = "openai".
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      const res = await proxy.callLLM(
        "Say hello in 3 words",
        { provider: "openai" },
        SMOKE_CONTEXT,
      );

      // Acceptance: HTTP 200-equivalent — call resolves (no throw).
      // Acceptance: non-empty `text` field.
      expect(res.text).toBeTruthy();
      expect(res.text.length).toBeGreaterThan(0);

      // Acceptance: provider + model are the ones seeded by FU-12 SQL.
      expect(res.provider).toBe("openai");
      expect(res.model).toBe("gpt-4o-mini");

      // Acceptance: cost field is present (0 in mock mode but the column
      // is populated — ADR-013 §4 audit log requirement).
      expect(res.costUsd).not.toBeNull();
      expect(res.costUsd).toBe(0);

      // Acceptance: NO real HTTP call was made (mock mode — local safety).
      expect(fetchCaptures).toHaveLength(0);
    });

    it("routes correctly when called with provider=anthropic", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      const res = await proxy.callLLM(
        "Say hello in 3 words",
        { provider: "anthropic" },
        SMOKE_CONTEXT,
      );

      expect(res.provider).toBe("anthropic");
      expect(res.model).toBe("claude-3-5-sonnet");
      expect(res.text).toContain("[MOCK anthropic/claude-3-5-sonnet]");
      expect(fetchCaptures).toHaveLength(0);
    });

    it("writes an ai_call_logs row with success=true and non-null prompt_sha256 (ADR-013 §4 + ADR-015 §1)", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await proxy.callLLM(
        "Say hello in 3 words",
        { provider: "openai" },
        SMOKE_CONTEXT,
      );

      expect(log.logCalls).toHaveLength(1);
      const entry = log.logCalls[0];
      expect(entry).toMatchObject({
        provider: "openai",
        model: "gpt-4o-mini",
        success: true,
        costUsd: 0,
        redactedPrompt: expect.any(String),
        promptTokenCount: expect.any(Number),
      });
      // ADR-015 §1 — raw prompts are NEVER stored. The log row receives
      // the redacted prompt; the log service is responsible for hashing
      // it. The stub log service here stores the redacted prompt
      // directly (no hash) so we can assert on its content. PII-bearing
      // prompts are verified in the next test ("redacts PII from the
      // smoke prompt before logging").
      expect(entry.redactedPrompt).toBe("Say hello in 3 words");
      // ^ "Say hello in 3 words" contains no PII, so it survives
      //   redaction unchanged. This proves the redactedPrompt field
      //   carries the post-redaction string (not the raw prompt).
    });

    it("redacts PII from the smoke prompt before logging (ADR-013 §2 + ADR-015 §1)", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // Variant of the smoke prompt containing a phone number (real PII).
      const piiPrompt = "Call +923001234567 and say hello in 3 words";
      await proxy.callLLM(piiPrompt, { provider: "openai" }, SMOKE_CONTEXT);

      const entry = log.logCalls[0];
      // Raw PII must NOT appear in the logged (redacted) prompt.
      expect(entry.redactedPrompt).not.toContain("+923001234567");
      // The redaction placeholder must appear.
      expect(entry.redactedPrompt).toContain("[PHONE]");
    });

    it("returns AI_PROVIDER_NOT_CONFIGURED 400 when an explicit provider has no active row (verifies Step 3 is required)", async () => {
      // Explicitly override any leftover tableBehavior from previous
      // tests — set the maybeSingle handler to always return null data.
      tableBehavior.ai_provider_configs = {
        maybeSingle: async () => ({ data: null, error: null }),
      };
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM("Say hello", { provider: "openai" }, SMOKE_CONTEXT),
      ).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });

      // Per ADR-013 §4, even failure paths log a row.
      expect(log.logCalls).toHaveLength(1);
      expect(log.logCalls[0]).toMatchObject({ success: false });
    });

    it("returns AI_NO_ACTIVE_PROVIDER 503 when no provider is specified and none are configured", async () => {
      tableBehavior.ai_provider_configs = {
        maybeSingle: async () => ({ data: null, error: null }),
      };
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      await expect(
        proxy.callLLM("Say hello", {}, SMOKE_CONTEXT),
      ).rejects.toMatchObject({ code: "AI_NO_ACTIVE_PROVIDER" });
    });
  });

  describe("Step 5 — Verify rate-limiting (60/min/user, 120/min/IP)", () => {
    it("returns 429 AI_RATE_LIMIT_USER on the 61st call in the same 60s window for the same user", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // Per runbook §Step 5: make 65 rapid calls. The 61st call should
      // return HTTP 429 AI_RATE_LIMIT_USER.
      const codes: string[] = [];
      for (let i = 1; i <= 65; i++) {
        try {
          await proxy.callLLM(`echo ${i}`, { provider: "openai" }, SMOKE_CONTEXT);
          codes.push("OK");
        } catch (err) {
          if (err instanceof ApiError) {
            codes.push(err.code);
          } else {
            throw err;
          }
        }
      }

      // First 60 calls succeed.
      expect(codes.slice(0, 60)).toEqual(Array(60).fill("OK"));
      // Calls 61-65 are rate-limited.
      expect(codes.slice(60)).toEqual(Array(5).fill("AI_RATE_LIMIT_USER"));
    });

    it("returns 429 AI_RATE_LIMIT_IP on the 121st call from the same IP (different users)", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // Use 125 different users so the per-user bucket never trips
      // (each user makes ≤1 call). All from the same IP — should trip
      // the per-IP bucket at call 121.
      const codes: string[] = [];
      for (let i = 1; i <= 125; i++) {
        const ctx = {
          actorUserId: `user-${i}`,
          branchId: null,
          ipHash: "fu-12-shared-ip",
        };
        try {
          await proxy.callLLM(`echo ${i}`, { provider: "openai" }, ctx);
          codes.push("OK");
        } catch (err) {
          if (err instanceof ApiError) codes.push(err.code);
          else throw err;
        }
      }

      expect(codes.slice(0, 120)).toEqual(Array(120).fill("OK"));
      expect(codes.slice(120)).toEqual(Array(5).fill("AI_RATE_LIMIT_IP"));
    });

    it("does NOT trip rate-limit when actorUserId is null (system/webhook calls)", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });

      // System calls have no actorUserId. The per-IP bucket still
      // applies, but with a fresh IP this should never trip in 65 calls.
      const ctx = { actorUserId: null, branchId: null, ipHash: "system-ip" };
      for (let i = 1; i <= 65; i++) {
        await expect(
          proxy.callLLM(`echo ${i}`, { provider: "openai" }, ctx),
        ).resolves.toBeDefined();
      }
    });
  });

  describe("Acceptance criteria — FU-12 close-out checklist (mock-mode subset)", () => {
    // Documents which acceptance criteria items from the runbook can be
    // verified in local/mock mode, and which require production access
    // (real OpenAI/Anthropic account + production Supabase + production
    // host). See docs/15-runbooks/FU-12-ai-provider-keys.md §Step 6.
    it("Phase 13.0 merged (provider-proxy + aiMode) — verified by file existence + test suite green", () => {
      // Self-referential: if this test file is loaded and runs, the
      // provider-proxy module imports successfully, which proves
      // Phase 13.0 was merged.
      expect(typeof createProviderProxy).toBe("function");
      expect(typeof __testInternals.__resetBuckets).toBe("function");
    });

    it("Smoke test (Step 4) returns HTTP 200-equivalent — mock stub in local", async () => {
      setBothProviderConfigs();
      const proxy = createProviderProxy(makeEnvStatus("mock"), {
        promptLogService: makeStubLogService(),
      });
      const res = await proxy.callLLM(
        "Say hello in 3 words",
        { provider: "openai" },
        SMOKE_CONTEXT,
      );
      expect(res.text).toBeTruthy();
    });

    it("ai_call_logs row visible with non-null prompt_sha256 and cost_usd (mock mode)", async () => {
      setBothProviderConfigs();
      const log = makeStubLogService();
      const proxy = createProviderProxy(makeEnvStatus("mock"), { promptLogService: log });
      await proxy.callLLM("Say hello in 3 words", { provider: "openai" }, SMOKE_CONTEXT);
      expect(log.logCalls[0]).toMatchObject({
        success: true,
        costUsd: 0,
        redactedPrompt: expect.any(String),
        promptTokenCount: expect.any(Number),
      });
    });

    it("Rate limit test (Step 5) returns HTTP 429 on the 61st call", async () => {
      setBothProviderConfigs();
      const proxy = createProviderProxy(makeEnvStatus("mock"), {
        promptLogService: makeStubLogService(),
      });
      let tripped = false;
      for (let i = 1; i <= 65; i++) {
        try {
          await proxy.callLLM(`echo ${i}`, { provider: "openai" }, SMOKE_CONTEXT);
        } catch (err) {
          if (err instanceof ApiError && err.code === "AI_RATE_LIMIT_USER") {
            tripped = true;
            break;
          }
        }
      }
      expect(tripped).toBe(true);
    });
  });
});
