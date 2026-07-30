import { ApiError } from "./http.js";

/** Map PostgREST/Postgres missing-relation errors to an actionable schema message. */
export function throwMappedDbError(
  fallbackCode: string,
  error: { message?: string; code?: string } | null | undefined,
): never {
  const message = error?.message?.trim() || "Database request failed.";
  if (
    /Could not find the table|relation .* does not exist|PGRST205|schema cache/i.test(message)
  ) {
    throw new ApiError(
      503,
      "SCHEMA_NOT_MIGRATED",
      `Required database table is missing or not exposed. Apply pending Supabase migrations (e.g. supabase db push) and refresh PostgREST. Detail: ${message}`,
    );
  }
  throw new ApiError(500, fallbackCode, message);
}
