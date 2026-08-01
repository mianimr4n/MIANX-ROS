import type { EnvironmentStatus } from "../config/env.js";
import { getRuntimeBuildInfo } from "./runtime-info.js";

export type DbConnectivity = "ok" | "error" | "skipped" | "not_configured";

export interface HealthDiagnostics {
  ok: true;
  service: string;
  version: string;
  gitSha: string | null;
  uptimeSeconds: number;
  nodeVersion: string;
  environment: {
    envClass: string;
    nodeEnv: string;
  };
  memory: ReturnType<typeof getRuntimeBuildInfo>["memory"];
  eventLoopDelayMs: number | null;
  startedAt: string;
  database: {
    configured: boolean;
    connectivity: DbConnectivity;
  };
  migrations: {
    status: "unavailable";
    note: string;
  };
}

export interface VersionPayload {
  ok: true;
  service: string;
  version: string;
  gitSha: string | null;
  envClass: string;
  nodeVersion: string;
  uptimeSeconds: number;
  startedAt: string;
}

export type ProbeSupabaseOptions = {
  /** Supabase anon/publishable key — sent as apikey + Bearer; never logged. */
  anonKey?: string;
  timeoutMs?: number;
};

/**
 * Lightweight Supabase reachability probe.
 * Uses `/auth/v1/health` with required gateway headers when anonKey is provided
 * so Production health checks do not generate repeated unauthenticated 401 noise.
 */
export async function probeSupabaseConnectivity(
  supabaseUrl: string | undefined,
  options: ProbeSupabaseOptions = {},
): Promise<DbConnectivity> {
  if (!supabaseUrl) return "not_configured";
  // Keep unit/CI tests fast and offline-friendly unless explicitly forced.
  if (process.env.NODE_ENV === "test" && process.env.TELEPIZZA_FORCE_DB_PROBE !== "1") {
    return "skipped";
  }
  const timeoutMs = options.timeoutMs ?? 2500;
  try {
    const base = supabaseUrl.replace(/\/$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const headers: Record<string, string> = { Accept: "application/json" };
    const anonKey = options.anonKey?.trim();
    if (anonKey) {
      headers.apikey = anonKey;
      headers.Authorization = `Bearer ${anonKey}`;
    }
    const response = await fetch(`${base}/auth/v1/health`, {
      method: "GET",
      signal: controller.signal,
      headers,
    });
    clearTimeout(timer);
    // With apikey: expect 200. Without: gateway often returns 401 (reachability only).
    if (response.ok) return "ok";
    if (!anonKey && (response.status === 401 || response.status === 404)) return "ok";
    return "error";
  } catch {
    return "error";
  }
}

export function buildHealthDiagnostics(
  envStatus: EnvironmentStatus,
  options: { dbConnectivity?: DbConnectivity; env?: NodeJS.ProcessEnv } = {},
): HealthDiagnostics {
  const runtime = getRuntimeBuildInfo(envStatus.config.envClass, options.env ?? process.env);
  const configured = Boolean(envStatus.config.supabaseUrl) && envStatus.issues.every((i) => i.key !== "SUPABASE_URL");

  return {
    ok: true,
    service: runtime.service,
    version: runtime.version,
    gitSha: runtime.gitSha,
    uptimeSeconds: runtime.uptimeSeconds,
    nodeVersion: runtime.nodeVersion,
    environment: {
      envClass: runtime.envClass,
      nodeEnv: runtime.nodeEnv,
    },
    memory: runtime.memory,
    eventLoopDelayMs: runtime.eventLoopDelayMs,
    startedAt: runtime.startedAt,
    database: {
      configured,
      connectivity: options.dbConnectivity ?? "skipped",
    },
    migrations: {
      status: "unavailable",
      note: "Migration tip is verified via Supabase CLI / ops runbooks, not the API process.",
    },
  };
}

export function buildVersionPayload(
  envStatus: EnvironmentStatus,
  env: NodeJS.ProcessEnv = process.env,
): VersionPayload {
  const runtime = getRuntimeBuildInfo(envStatus.config.envClass, env);
  return {
    ok: true,
    service: runtime.service,
    version: runtime.version,
    gitSha: runtime.gitSha,
    envClass: runtime.envClass,
    nodeVersion: runtime.nodeVersion,
    uptimeSeconds: runtime.uptimeSeconds,
    startedAt: runtime.startedAt,
  };
}
