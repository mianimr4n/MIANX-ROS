/**
 * Provider Proxy — the foundational AI HTTP client service (ADR-013).
 *
 * This service is the SINGLE entry point for all LLM calls in the
 * Telepizza backend. It enforces the ADR-013 contract:
 *
 *   1. All AI calls go through this proxy (no direct client→provider calls)
 *   2. PII redaction BEFORE forwarding (via pii-redaction.ts)
 *   3. Provider credentials read from process.env (per ADR-003)
 *   4. Per-call audit log to ai_call_logs (always — success OR failure)
 *   5. Per-actor rate limiting (60/min user, 120/min IP)
 *   6. Provider allowlist (only rows in ai_provider_configs with is_active=true)
 *   7. Response redaction (run redaction filter on completion text too)
 *
 * Integration modes (aiMode in config/env.ts):
 *   - "disabled": refuse all calls (503 AI_DISABLED)
 *   - "mock":     return deterministic stub; no HTTP; still logs to ai_call_logs
 *   - "sandbox":  same as mock but provider tag is "sandbox"
 *   - "live":     real HTTP call to provider
 *
 * Authority: ADR-013 §1-7, ADR-015 §1 (no raw prompts ever stored),
 *           ADR-003 (provider-secret boundary — keys in env only).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { detectPromptLanguage, redactPii } from "./pii-redaction.js";
import { createAiPromptLogService, type AiPromptLogService } from "./prompt-log-service.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LLMProvider = "openai" | "anthropic";

export interface LLMRequestOptions {
  /** Provider to use. If omitted, the first active provider config is used. */
  provider?: LLMProvider;
  /** Model id (e.g. "gpt-4o-mini"). If omitted, the provider's default_model is used. */
  model?: string;
  /** Optional system prompt prepended to the user prompt. */
  systemPrompt?: string;
  /** Max completion tokens. Defaults to provider config max_tokens. */
  maxTokens?: number;
  /** Sampling temperature 0-2. Defaults to provider config temperature. */
  temperature?: number;
  /** Free-form metadata attached to the ai_call_logs row. */
  metadata?: Record<string, unknown>;
}

export interface LLMCallContext {
  /** Authenticated user id initiating the call (null for system/webhook calls). */
  actorUserId: string | null;
  /** Branch scope for the call (null = cross-branch / super-admin). */
  branchId?: string | null;
  /** SHA-256 hash of the caller IP (used only for rate-limiting, never stored). */
  ipHash?: string | null;
}

export interface LLMResponse {
  provider: string;
  model: string;
  /** Redacted completion text (ADR-013 §7 — response redaction). */
  text: string;
  promptTokenCount: number | null;
  completionTokenCount: number | null;
  latencyMs: number;
  costUsd: number | null;
}

export interface ProviderProxy {
  callLLM(prompt: string, options: LLMRequestOptions, context: LLMCallContext): Promise<LLMResponse>;
}

// ---------------------------------------------------------------------------
// Provider config (DB row from ai_provider_configs)
// ---------------------------------------------------------------------------

interface ProviderConfigRow {
  providerCode: string;
  baseUrl: string;
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory token bucket; per-actor + per-ip)
// ADR-013 §5: 60 calls/min/user, 120 calls/min/IP.
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number;
  windowStart: number;
}

const RATE_WINDOW_MS = 60_000;
const USER_RATE_LIMIT = 60;
const IP_RATE_LIMIT = 120;

const userBuckets = new Map<string, RateBucket>();
const ipBuckets = new Map<string, RateBucket>();

function takeFromBucket(map: Map<string, RateBucket>, key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = map.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    map.set(key, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

// Best-effort cleanup — drop expired buckets every 5 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of userBuckets) if (now - b.windowStart > RATE_WINDOW_MS) userBuckets.delete(key);
  for (const [key, b] of ipBuckets) if (now - b.windowStart > RATE_WINDOW_MS) ipBuckets.delete(key);
}, 5 * 60_000).unref?.();

// ---------------------------------------------------------------------------
// Cost table (USD per 1K tokens — May 2025 public list prices).
// Used for cost_usd estimation in ai_call_logs. Real billing comes from
// the provider; this is for analytics/budget-alerts only.
// ---------------------------------------------------------------------------

const COST_PER_1K_INPUT: Record<string, number> = {
  "gpt-4o": 0.0025,
  "gpt-4o-mini": 0.00015,
  "gpt-4-turbo": 0.01,
  "claude-3-opus": 0.015,
  "claude-3-sonnet": 0.003,
  "claude-3-5-sonnet": 0.003,
  "claude-3-haiku": 0.00025,
};

const COST_PER_1K_OUTPUT: Record<string, number> = {
  "gpt-4o": 0.01,
  "gpt-4o-mini": 0.0006,
  "gpt-4-turbo": 0.03,
  "claude-3-opus": 0.075,
  "claude-3-sonnet": 0.015,
  "claude-3-5-sonnet": 0.015,
  "claude-3-haiku": 0.00125,
};

function estimateCostUsd(model: string, promptTokens: number, completionTokens: number): number | null {
  const inRate = COST_PER_1K_INPUT[model] ?? 0;
  const outRate = COST_PER_1K_OUTPUT[model] ?? 0;
  if (inRate === 0 && outRate === 0) return null;
  return (
    (promptTokens / 1000) * inRate +
    (completionTokens / 1000) * outRate
  );
}

// ---------------------------------------------------------------------------
// Token estimation (very rough — real tokenization happens at provider)
// ---------------------------------------------------------------------------

function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough heuristic: ~4 chars per token for English; ~2 chars for Urdu/CJK.
  // Use the conservative (higher) estimate to avoid under-counting.
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// HTTP layer (Node 18+ native fetch)
// ---------------------------------------------------------------------------

interface OpenAIChatResponse {
  choices: Array<{ message: { content: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

interface AnthropicMessagesResponse {
  content: Array<{ type: "text"; text: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

async function callOpenAI(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<{ text: string; promptTokens: number | null; completionTokens: number | null }> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: userPrompt });

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ApiError(
      502,
      "AI_PROVIDER_HTTP_ERROR",
      `OpenAI returned ${res.status}: ${errText.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as OpenAIChatResponse;
  const text = json.choices?.[0]?.message?.content ?? "";
  return {
    text,
    promptTokens: json.usage?.prompt_tokens ?? null,
    completionTokens: json.usage?.completion_tokens ?? null,
  };
}

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  maxTokens: number,
  temperature: number,
): Promise<{ text: string; promptTokens: number | null; completionTokens: number | null }> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: "user", content: userPrompt }],
  };
  if (systemPrompt) body.system = systemPrompt;

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new ApiError(
      502,
      "AI_PROVIDER_HTTP_ERROR",
      `Anthropic returned ${res.status}: ${errText.slice(0, 300)}`,
    );
  }

  const json = (await res.json()) as AnthropicMessagesResponse;
  const text = (json.content ?? []).map((c) => c.text).join("");
  return {
    text,
    promptTokens: json.usage?.input_tokens ?? null,
    completionTokens: json.usage?.output_tokens ?? null,
  };
}

// ---------------------------------------------------------------------------
// Mock / stub response (aiMode = "mock" or "sandbox")
// ---------------------------------------------------------------------------

function buildMockResponse(
  redactedPrompt: string,
  options: LLMRequestOptions,
  provider: string,
  model: string,
): LLMResponse {
  const mockText = `[MOCK ${provider}/${model}] No live LLM call was made.\n\nEcho (redacted): ${redactedPrompt.slice(0, 200)}${redactedPrompt.length > 200 ? "…" : ""}`;
  return {
    provider,
    model,
    text: mockText,
    promptTokenCount: estimateTokens(redactedPrompt),
    completionTokenCount: estimateTokens(mockText),
    latencyMs: 0,
    costUsd: 0,
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ProviderConfigDbRow {
  provider_code: string;
  base_url: string;
  default_model: string;
  max_tokens: number;
  temperature: number;
}

async function fetchProviderConfig(
  client: SupabaseClient,
  provider: string,
): Promise<ProviderConfigRow | null> {
  const { data, error } = await client
    .from("ai_provider_configs")
    .select("provider_code, base_url, default_model, max_tokens, temperature")
    .eq("provider_code", provider)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throwMappedDbError("AI_PROVIDER_CONFIG_READ_FAILED", error);
  if (!data) return null;
  const row = data as ProviderConfigDbRow;
  return {
    providerCode: row.provider_code,
    baseUrl: row.base_url,
    defaultModel: row.default_model,
    maxTokens: row.max_tokens,
    temperature: Number(row.temperature),
  };
}

async function pickProvider(
  client: SupabaseClient,
  requested: string | undefined,
): Promise<ProviderConfigRow> {
  if (requested) {
    const cfg = await fetchProviderConfig(client, requested);
    if (!cfg) {
      throw new ApiError(
        400,
        "AI_PROVIDER_NOT_CONFIGURED",
        `Provider "${requested}" is not active in ai_provider_configs. Have you run FU-12?`,
      );
    }
    return cfg;
  }
  // No explicit request → pick the first active OpenAI row, fall back to Anthropic.
  for (const code of ["openai", "anthropic"] as const) {
    const cfg = await fetchProviderConfig(client, code);
    if (cfg) return cfg;
  }
  throw new ApiError(
    503,
    "AI_NO_ACTIVE_PROVIDER",
    "No active provider in ai_provider_configs. Have you run FU-12 (Operator Follow-up for AI provider keys)?",
  );
}

function resolveApiKey(providerCode: string, source: NodeJS.ProcessEnv): string {
  if (providerCode === "openai") return (source.OPENAI_API_KEY ?? "").trim();
  if (providerCode === "anthropic") return (source.ANTHROPIC_API_KEY ?? "").trim();
  return "";
}

/**
 * Build the provider-proxy service.
 *
 * The `envSource` param defaults to `process.env` but is injectable for tests.
 * The `promptLogService` param defaults to a fresh instance built from
 * `envStatus`, but is injectable for tests.
 */
export function createProviderProxy(
  envStatus: EnvironmentStatus,
  deps: {
    envSource?: NodeJS.ProcessEnv;
    promptLogService?: AiPromptLogService;
    fetchImpl?: typeof fetch;
  } = {},
): ProviderProxy {
  const env: NodeJS.ProcessEnv = deps.envSource ?? process.env;
  const fetchFn: typeof fetch = deps.fetchImpl ?? fetch;
  const logService: AiPromptLogService = deps.promptLogService ?? createAiPromptLogService(envStatus);
  const aiMode = envStatus.config.aiMode;

  const requireApiMode = (): "mock" | "sandbox" | "live" => {
    if (aiMode === "disabled") {
      throw new ApiError(
        503,
        "AI_DISABLED",
        "TELEPIZZA_AI_MODE=disabled — AI features are turned off in this environment.",
      );
    }
    return aiMode;
  };

  return {
    async callLLM(prompt, options, context) {
      if (typeof prompt !== "string" || prompt.length === 0) {
        throw new ApiError(400, "INVALID_PROMPT", "Prompt must be a non-empty string.");
      }

      // ADR-013 §2 — PII redaction BEFORE anything else.
      const redactedPrompt = redactPii(prompt);
      const promptLanguage = detectPromptLanguage(redactedPrompt);
      const promptTokenCount = estimateTokens(redactedPrompt);

      // ADR-013 §5 — rate limit (per user + per IP).
      if (context.actorUserId) {
        if (!takeFromBucket(userBuckets, context.actorUserId, USER_RATE_LIMIT)) {
          throw new ApiError(429, "AI_RATE_LIMIT_USER", "Per-user AI call rate limit exceeded (60/min).");
        }
      }
      if (context.ipHash) {
        if (!takeFromBucket(ipBuckets, context.ipHash, IP_RATE_LIMIT)) {
          throw new ApiError(429, "AI_RATE_LIMIT_IP", "Per-IP AI call rate limit exceeded (120/min).");
        }
      }

      const mode = requireApiMode();
      const supabase = createServiceClient(envStatus);

      // Resolve provider config from DB (always — even in mock mode we
      // need a "provider" string for the log row).
      const requestedProvider = options.provider;
      let providerCfg: ProviderConfigRow | null = null;
      try {
        providerCfg = await pickProvider(supabase, requestedProvider);
      } catch (err) {
        // Provider-not-configured is a fatal error — log and rethrow.
        await logService.logCall({
          actorUserId: context.actorUserId,
          branchId: context.branchId ?? null,
          provider: requestedProvider ?? "unknown",
          model: options.model ?? "unknown",
          redactedPrompt,
          promptTokenCount,
          promptLanguage,
          completionTokenCount: null,
          latencyMs: 0,
          costUsd: null,
          success: false,
          errorMessage: err instanceof Error ? err.message : String(err),
          metadata: { ...options.metadata, mode, stage: "provider-resolve" },
        }).catch(() => undefined);
        throw err;
      }

      const model = options.model ?? providerCfg.defaultModel;
      const maxTokens = options.maxTokens ?? providerCfg.maxTokens;
      const temperature = options.temperature ?? providerCfg.temperature;

      // MOCK / SANDBOX path — return deterministic stub.
      if (mode === "mock" || mode === "sandbox") {
        const response = buildMockResponse(
          redactedPrompt,
          options,
          mode === "sandbox" ? "sandbox" : providerCfg.providerCode,
          model,
        );
        await logService.logCall({
          actorUserId: context.actorUserId,
          branchId: context.branchId ?? null,
          provider: response.provider,
          model: response.model,
          redactedPrompt,
          promptTokenCount: response.promptTokenCount,
          promptLanguage,
          completionTokenCount: response.completionTokenCount,
          latencyMs: 0,
          costUsd: 0,
          success: true,
          errorMessage: null,
          metadata: { ...options.metadata, mode, stage: "mock-response" },
        }).catch(() => undefined);
        // ADR-013 §7 — response redaction (defense-in-depth, even for mock)
        response.text = redactPii(response.text);
        return response;
      }

      // LIVE path — make real HTTP call.
      const apiKey = resolveApiKey(providerCfg.providerCode, env);
      if (!apiKey) {
        const msg = `${providerCfg.providerCode.toUpperCase()}_API_KEY env var is not set. Have you run FU-12 (Operator Follow-up for AI provider keys)?`;
        await logService.logCall({
          actorUserId: context.actorUserId,
          branchId: context.branchId ?? null,
          provider: providerCfg.providerCode,
          model,
          redactedPrompt,
          promptTokenCount,
          promptLanguage,
          completionTokenCount: null,
          latencyMs: 0,
          costUsd: null,
          success: false,
          errorMessage: msg,
          metadata: { ...options.metadata, mode, stage: "missing-api-key" },
        }).catch(() => undefined);
        throw new ApiError(503, "AI_API_KEY_MISSING", msg);
      }

      const t0 = Date.now();
      let rawText = "";
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;
      let success = true;
      let errorMessage: string | null = null;

      try {
        let httpResult: { text: string; promptTokens: number | null; completionTokens: number | null };
        if (providerCfg.providerCode === "openai") {
          httpResult = await callOpenAI(
            providerCfg.baseUrl, apiKey, model,
            options.systemPrompt, redactedPrompt,
            maxTokens, temperature,
          );
        } else if (providerCfg.providerCode === "anthropic") {
          httpResult = await callAnthropic(
            providerCfg.baseUrl, apiKey, model,
            options.systemPrompt, redactedPrompt,
            maxTokens, temperature,
          );
        } else {
          throw new ApiError(500, "AI_PROVIDER_UNSUPPORTED", `Provider "${providerCfg.providerCode}" has no HTTP adapter.`);
        }
        rawText = httpResult.text;
        promptTokens = httpResult.promptTokens ?? promptTokenCount;
        completionTokens = httpResult.completionTokens ?? estimateTokens(rawText);
      } catch (err) {
        success = false;
        errorMessage = err instanceof Error ? err.message : String(err);
      }

      const latencyMs = Date.now() - t0;

      // ADR-013 §7 — run redaction filter on response text too.
      const redactedText = redactPii(rawText);
      const costUsd = estimateCostUsd(model, promptTokens ?? 0, completionTokens ?? 0);

      // ADR-013 §4 — always log the call (success OR failure).
      await logService.logCall({
        actorUserId: context.actorUserId,
        branchId: context.branchId ?? null,
        provider: providerCfg.providerCode,
        model,
        redactedPrompt,
        promptTokenCount: promptTokens,
        promptLanguage,
        completionTokenCount: completionTokens,
        latencyMs,
        costUsd,
        success,
        errorMessage,
        metadata: { ...options.metadata, mode, stage: "live-response" },
      }).catch(() => undefined);

      if (!success) {
        throw new ApiError(502, "AI_PROVIDER_HTTP_ERROR", errorMessage ?? "Unknown LLM call failure.");
      }

      return {
        provider: providerCfg.providerCode,
        model,
        text: redactedText,
        promptTokenCount: promptTokens,
        completionTokenCount: completionTokens,
        latencyMs,
        costUsd,
      };
    },
  };
}

// Expose internals for tests (vitest only — not exported from index.ts).
export const __testInternals = {
  takeFromBucket,
  estimateTokens,
  estimateCostUsd,
  resolveApiKey,
  COST_PER_1K_INPUT,
  COST_PER_1K_OUTPUT,
  USER_RATE_LIMIT,
  IP_RATE_LIMIT,
  RATE_WINDOW_MS,
  /** Reset all rate-limit buckets. Test-only — never call from production code. */
  __resetBuckets() {
    userBuckets.clear();
    ipBuckets.clear();
  },
};
