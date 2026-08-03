/**
 * Share identical in-flight read promises so concurrent callers coalesce.
 * Distinct keys (branch/date/filter) are never shared.
 * Failed promises are not retained.
 */

const inflight = new Map<string, Promise<unknown>>();

export function shareIdenticalRead<T>(key: string, factory: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const pending = factory().finally(() => {
    if (inflight.get(key) === pending) inflight.delete(key);
  });

  inflight.set(key, pending);
  return pending;
}

/** Test / logout helper — drops any retained inflight map entries. */
export function clearInflightReads(): void {
  inflight.clear();
}

export function inflightReadCount(): number {
  return inflight.size;
}
