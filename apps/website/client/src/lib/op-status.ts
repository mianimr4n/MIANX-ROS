/**
 * D2 — Canonical operational data-state model and reliability hook.
 *
 * Canonical states (must remain semantically distinct):
 * LOADING, LIVE, DERIVED, EMPTY, STALE, OFFLINE, ERROR, FOUNDATION, UNAVAILABLE.
 *
 * Semantic rules:
 * - `0` is only rendered when the request SUCCEEDED and the value is genuinely zero.
 * - A failed request must never present prior/default values as current LIVE data.
 * - A successful response with no records is EMPTY, not ERROR.
 * - Previously successful data may stay visible only when marked STALE with the
 *   last successful refresh time and a retry action.
 * - OFFLINE is reserved for connectivity loss, not server validation errors.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiRequestError } from "@/lib/api";

export type OperationalState =
  | "LOADING"
  | "LIVE"
  | "DERIVED"
  | "EMPTY"
  | "STALE"
  | "OFFLINE"
  | "ERROR"
  | "FOUNDATION"
  | "UNAVAILABLE";

export type ApiErrorCategory =
  | "auth"
  | "forbidden"
  | "validation"
  | "server"
  | "network"
  | "timeout"
  | "unknown";

/** Distinguish unauthorized vs forbidden vs server vs network/timeout failures. */
export function categorizeApiError(error: unknown): ApiErrorCategory {
  if (error instanceof ApiRequestError) {
    if (error.code === "TIMEOUT") return "timeout";
    if (error.statusCode === 0) return "network";
    if (error.statusCode === 401) return "auth";
    if (error.statusCode === 403) return "forbidden";
    if (error.statusCode === 400 || error.statusCode === 422) return "validation";
    if (error.statusCode >= 500) return "server";
    return "unknown";
  }
  if (error instanceof DOMException && error.name === "AbortError") return "timeout";
  if (error instanceof TypeError) return "network";
  return "unknown";
}

/** Business-language message per category; technical detail stays role-gated in UI. */
export function describeApiErrorCategory(category: ApiErrorCategory): string {
  switch (category) {
    case "auth":
      return "Your session is no longer valid. Sign in again.";
    case "forbidden":
      return "You do not have access to this branch or resource.";
    case "validation":
      return "The request was not valid.";
    case "server":
      return "The service had a problem. Try again.";
    case "network":
      return "Cannot reach the server. Check the connection.";
    case "timeout":
      return "The request took too long. Try again.";
    default:
      return "The data could not be loaded.";
  }
}

/** Retry only makes sense for transient failures on idempotent reads. */
export function isRetryableRead(category: ApiErrorCategory): boolean {
  return category === "network" || category === "timeout" || category === "server";
}

export type OperationalDataResult<T> = {
  /** Last successful payload. Kept while STALE; null before first success. */
  data: T | null;
  state: OperationalState;
  error: string | null;
  errorCategory: ApiErrorCategory | null;
  /** ISO timestamp of the last successful load. */
  lastSuccessAt: string | null;
  /** True while a refresh is in flight after a first success. */
  refreshing: boolean;
  /** Correlation id of the most recent request (for role-gated diagnostics). */
  correlationId: string | null;
  retry: () => void;
};

export type UseOperationalDataOptions<T> = {
  /** Skip loading entirely (for example, gate not ready). */
  enabled?: boolean;
  /** Successful payload that should render as EMPTY instead of LIVE. */
  isEmpty?: (data: T) => boolean;
  /** Bounded automatic retries for transient read failures. Default 1. */
  readRetries?: number;
  /** Delay before an automatic retry, in ms. Default 1500. */
  retryDelayMs?: number;
  /** Reload on an interval (ms). Failed polls keep last-good data as STALE. */
  pollMs?: number;
};

function newCorrelationId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Shared reliability hook for idempotent operational reads.
 *
 * - cancels obsolete in-flight requests when dependencies change or on unmount
 * - bounded automatic retry for transient failures (reads only)
 * - keeps last-good data visible only as STALE with lastSuccessAt
 * - never maps a failure to a zero/default value
 */
export function useOperationalData<T>(
  fetcher: (ctx: { signal: AbortSignal; correlationId: string }) => Promise<T>,
  deps: readonly unknown[],
  options?: UseOperationalDataOptions<T>,
): OperationalDataResult<T> {
  const enabled = options?.enabled ?? true;
  const readRetries = Math.max(0, options?.readRetries ?? 1);
  const retryDelayMs = options?.retryDelayMs ?? 1500;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<ApiErrorCategory | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    let cancelled = false;

    async function attempt(attemptsLeft: number): Promise<void> {
      const cid = newCorrelationId();
      if (!cancelled) setCorrelationId(cid);
      try {
        const next = await fetcherRef.current({ signal: controller.signal, correlationId: cid });
        if (cancelled || controller.signal.aborted) return;
        setData(next);
        setError(null);
        setErrorCategory(null);
        setLastSuccessAt(new Date().toISOString());
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        const category = categorizeApiError(err);
        if (attemptsLeft > 0 && isRetryableRead(category)) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          if (cancelled || controller.signal.aborted) return;
          return attempt(attemptsLeft - 1);
        }
        setErrorCategory(category);
        setError(
          err instanceof ApiRequestError && err.message
            ? err.message
            : describeApiErrorCategory(category),
        );
      }
    }

    setInFlight(true);
    void attempt(readRetries).finally(() => {
      if (!cancelled && !controller.signal.aborted) setInFlight(false);
    });

    const pollMs = optionsRef.current?.pollMs;
    let pollHandle: ReturnType<typeof setInterval> | undefined;

    function startPoller() {
      if (typeof pollMs !== "number" || pollMs <= 0) return;
      if (pollHandle !== undefined) return;
      pollHandle = setInterval(() => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        setReloadToken((t) => t + 1);
      }, pollMs);
    }

    function stopPoller() {
      if (pollHandle !== undefined) {
        clearInterval(pollHandle);
        pollHandle = undefined;
      }
    }

    function onVisibility() {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        stopPoller();
      } else {
        startPoller();
      }
    }

    startPoller();
    if (typeof document !== "undefined" && typeof pollMs === "number" && pollMs > 0) {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      controller.abort();
      stopPoller();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadToken, readRetries, retryDelayMs, ...deps]);

  const state: OperationalState = useMemo(() => {
    if (!enabled) return "UNAVAILABLE";
    if (data == null && inFlight) return "LOADING";
    if (error != null && data == null) {
      return errorCategory === "network" || errorCategory === "timeout" ? "OFFLINE" : "ERROR";
    }
    if (error != null && data != null) return "STALE";
    if (data == null) return "LOADING";
    const empty = optionsRef.current?.isEmpty?.(data) ?? false;
    return empty ? "EMPTY" : "LIVE";
  }, [data, enabled, error, errorCategory, inFlight]);

  return {
    data,
    state,
    error,
    errorCategory,
    lastSuccessAt,
    refreshing: inFlight && data != null,
    correlationId,
    retry,
  };
}

/** Format an ISO timestamp for "last successful refresh" labels. */
export function formatLastSuccess(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return null;
  }
}
