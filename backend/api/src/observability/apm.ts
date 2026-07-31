import type { ApmAdapter, LogLevel } from "./types.js";

/** Default no-op APM — swap for Sentry/OTel later without changing call sites. */
export class NoopApmAdapter implements ApmAdapter {
  readonly name = "noop";

  captureException(_error: unknown, _context?: Record<string, unknown>): void {
    // intentionally empty
  }

  captureMessage(_message: string, _level?: LogLevel, _context?: Record<string, unknown>): void {
    // intentionally empty
  }
}

let activeApm: ApmAdapter = new NoopApmAdapter();

export function getApm(): ApmAdapter {
  return activeApm;
}

export function setApm(adapter: ApmAdapter): void {
  activeApm = adapter;
}

export function createApmFromEnv(env: NodeJS.ProcessEnv = process.env): ApmAdapter {
  const provider = (env.TELEPIZZA_APM_PROVIDER || "noop").toLowerCase();
  // Future: sentry | otel. Until then always noop (no required vendor SDK).
  if (provider === "sentry" || provider === "otel" || provider === "opentelemetry") {
    // Adapter not wired in this slice — fall back to noop without failing boot.
    return new NoopApmAdapter();
  }
  return new NoopApmAdapter();
}
