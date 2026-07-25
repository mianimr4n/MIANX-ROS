const CONFIGURED_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

/**
 * The live API is optional: the site ships with a complete bundled menu and
 * branch list. Network calls are attempted only when a backend URL has been
 * explicitly configured, so a missing backend can never surface errors to
 * customers.
 */
export const isApiConfigured = Boolean(CONFIGURED_API_BASE_URL);

const DEFAULT_API_BASE_URL = CONFIGURED_API_BASE_URL || "/api/v1";

function resolveApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${DEFAULT_API_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}

export class ApiRequestError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** Shared Authorization header builder for authenticated staff/admin requests. */
export function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export type ApiRequestOptions = RequestInit & {
  /** Bounded request timeout in milliseconds. No timeout when omitted. */
  timeoutMs?: number;
  /** Client-generated correlation id, sent as `X-Client-Request-Id`. */
  correlationId?: string;
};

export async function fetchApiData<T>(path: string, init?: ApiRequestOptions): Promise<T> {
  const envelope = await fetchApiEnvelope<T>(path, init);
  return envelope.data;
}

export async function fetchApiEnvelope<T>(
  path: string,
  init?: ApiRequestOptions,
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { timeoutMs, correlationId, ...requestInit } = init ?? {};

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(requestInit.headers as Record<string, string> | undefined),
  };

  if (requestInit.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (correlationId) {
    headers["X-Client-Request-Id"] = correlationId;
  }

  // Compose the caller's cancellation signal with an optional bounded timeout.
  const callerSignal = requestInit.signal ?? null;
  let signal = callerSignal ?? undefined;
  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  if (typeof timeoutMs === "number" && timeoutMs > 0) {
    const controller = new AbortController();
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort();
      else callerSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), {
      ...requestInit,
      headers,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      if (timedOut) {
        throw new ApiRequestError("The API request timed out.", 0, "TIMEOUT");
      }
      // Deliberate cancellation by the caller: propagate untouched.
      throw error;
    }
    throw new ApiRequestError("The API could not be reached.", 0, "NETWORK");
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError("The API returned an invalid JSON response.", response.status);
  }

  const isApiPayload =
    typeof payload === "object" &&
    payload !== null &&
    "ok" in payload;

  if (
    !response.ok ||
    !isApiPayload ||
    !(payload as { ok: boolean }).ok
  ) {
    const apiPayload = isApiPayload
      ? (payload as { error?: { message?: string; code?: string } })
      : undefined;
    const message = apiPayload?.error?.message ?? "The API request failed.";
    const code = apiPayload?.error?.code;

    throw new ApiRequestError(message, response.status, code);
  }

  const body = payload as { data: T; meta?: Record<string, unknown> };
  return { data: body.data, meta: body.meta };
}
