/**
 * Shared list pagination clamp for D3 table-service list queries.
 * Backend Zod schemas accept limit in [1, 100] only.
 */
export const TABLE_SERVICE_LIST_LIMIT_MAX = 100;
export const TABLE_SERVICE_LIST_LIMIT_MIN = 1;

/**
 * Normalize a caller-provided list limit for reservations/waitlist GET queries.
 * - undefined → max (100)
 * - non-finite (NaN/±Infinity) → max (100)
 * - otherwise truncates toward zero, then clamps to [1, 100]
 */
export function clampListLimit(limit: number | undefined): number {
  const raw = limit ?? TABLE_SERVICE_LIST_LIMIT_MAX;
  if (!Number.isFinite(raw)) return TABLE_SERVICE_LIST_LIMIT_MAX;
  return Math.min(
    TABLE_SERVICE_LIST_LIMIT_MAX,
    Math.max(TABLE_SERVICE_LIST_LIMIT_MIN, Math.trunc(raw)),
  );
}
