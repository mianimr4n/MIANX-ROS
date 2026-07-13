const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "/api/v1";

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
  const response = await fetch(resolveApiUrl(path), {
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
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
