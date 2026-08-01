/**
 * Shared list pagination bounds for admin/API list endpoints (RC4-7).
 * Does not weaken RLS — callers still enforce auth + branch scope.
 */

export const LIST_DEFAULT_LIMIT = 50;
export const LIST_MAX_LIMIT = 100;
export const LIST_STRICT_MAX = 200;

export type ListPaginationInput = {
  limit?: number;
  offset?: number;
};

export type ListPaginationMeta = {
  limit: number;
  offset: number;
  returned: number;
  total?: number;
};

export function normalizeListPagination(
  input: ListPaginationInput | undefined,
  options?: { defaultLimit?: number; maxLimit?: number },
): { limit: number; offset: number } {
  const defaultLimit = options?.defaultLimit ?? LIST_DEFAULT_LIMIT;
  const maxLimit = options?.maxLimit ?? LIST_MAX_LIMIT;
  const rawLimit = input?.limit ?? defaultLimit;
  const rawOffset = input?.offset ?? 0;
  const limit = Math.min(Math.max(Math.trunc(rawLimit), 1), maxLimit);
  const offset = Math.max(Math.trunc(rawOffset), 0);
  return { limit, offset };
}

export function listPaginationMeta(
  limit: number,
  offset: number,
  returned: number,
  total?: number,
): ListPaginationMeta {
  return {
    limit,
    offset,
    returned,
    ...(typeof total === "number" ? { total } : {}),
  };
}
