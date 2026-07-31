/**
 * Observability types — no secrets, no PII beyond opaque IDs.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface StructuredLogFields {
  level: LogLevel;
  msg: string;
  timestamp: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  userId?: string | null;
  branchId?: string | null;
  supplierId?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  errorClass?: string;
  route?: string;
  [key: string]: unknown;
}

export interface ApmAdapter {
  readonly name: string;
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level?: LogLevel, context?: Record<string, unknown>): void;
}

export interface RuntimeBuildInfo {
  service: string;
  version: string;
  gitSha: string | null;
  nodeVersion: string;
  envClass: string;
  nodeEnv: string;
  uptimeSeconds: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  eventLoopDelayMs: number | null;
  startedAt: string;
}
