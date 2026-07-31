const SECRET_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|api[_-]?key|service[_-]?role|refresh|jwt|cookie|credential)/i;

const REDACTED = "[REDACTED]";

/** Deep-ish redact of known secret keys; never returns original secret strings for matched keys. */
export function redactForLogs(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[TRUNCATED]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 32)}…[truncated]`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactForLogs(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY_PATTERN.test(k)) {
      out[k] = REDACTED;
    } else {
      out[k] = redactForLogs(v, depth + 1);
    }
  }
  return out;
}

export function safeErrorMessage(error: unknown, exposeInternal: boolean): string {
  if (!exposeInternal) {
    return "An unexpected error occurred.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "Unexpected server error.";
}
