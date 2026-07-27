/**
 * Split staff/support home secondary nav without skipping indices.
 * Secondary takes [0, secondaryCount); More takes [secondaryCount, end).
 */
export function splitStaffHomeRestEntries<T>(
  restEntries: readonly T[],
  secondaryCount: number,
): { secondary: T[]; more: T[] } {
  const safeCount = Math.max(0, secondaryCount);
  return {
    secondary: restEntries.slice(0, safeCount),
    more: restEntries.slice(safeCount),
  };
}
