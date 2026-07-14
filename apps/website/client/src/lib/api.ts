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

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
  }
}

export async function fetchApiData<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers,
  });

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
      ? (payload as { error?: { message?: string } })
      : undefined;
    const message = apiPayload?.error?.message ?? "The API request failed.";

    throw new ApiRequestError(message, response.status);
  }

  return (payload as unknown as { data: T }).data;
}
