# RC4 Production Cutover — Health Probe Fix Validation (local only)

**Branch tip:** `1c8894d81b7b738b2f125494c94794c383b300bb`
**Deploy:** **Do not deploy in this preparation slice**

## Implementation

`backend/api/src/observability/health.ts` — `probeSupabaseConnectivity`:

- Sends `apikey` header when `anonKey` provided
- Sends `Authorization: Bearer <anonKey>` when `anonKey` provided
- Never logs secret values (keys go through `redactForLogs` in tests)
- `response.ok` (200) → `"ok"`
- With `anonKey`: **401 → `"error"`** (not silently healthy)
- Without `anonKey`: 401/404 still treated as reachability `"ok"` (legacy)
- 5xx → `"error"`
- Network/abort → `"error"`
- Default timeout **2500ms** (bounded AbortController)

## Tests

`backend/api/tests/observability.test.ts` — `probeSupabaseConnectivity` cases cover headers, 401-with-key, 5xx, network failure.

Suite result in this session: backend Vitest **613 passed** (includes observability).

## Production note

Deployed API still at `1d64895` — probe fix not live until a separate authorized redeploy after (or with) schema cutover.
