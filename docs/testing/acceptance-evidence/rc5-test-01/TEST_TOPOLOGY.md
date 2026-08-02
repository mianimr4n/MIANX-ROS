# RC5-TEST-01 Test Topology

## How the guard runs

| Layer | Command | Includes RC5-TEST-01 guard? |
| --- | --- | --- |
| Backend Vitest | `pnpm test:backend` / `pnpm --filter @telepizza/api test` | **Yes** — `analytics-order-items-schema.test.ts` |
| Static DB/intent | `pnpm test:db` | **Yes** — strengthened `rc4-analytics-bi.test.mjs` |
| Full local suite | `pnpm test` (`test:db` + `test:backend`) | **Yes** |
| GitHub CI | `.github/workflows/ci.yml` → `pnpm test` | **Yes** (no workflow change required) |
| `pnpm rc1:gate` | Broader local quality gate | Includes `pnpm test` path among blocking steps |

## Test layers used

| Layer | Used? | Notes |
| --- | --- | --- |
| Static SQL intent | Yes | Foundation migration asserts `product_name` |
| Runtime source-contract scan | Yes | All `services/analytics/*.ts` for `.from("order_items").select(...)` |
| Unit aggregation | Yes | `aggregateTopItemsByMenuItemId` |
| API integration | Existing | `analytics-api.test.ts` unchanged; remains green |
| Registry | Reviewed | No extension (metadata only) |
| Browser E2E | No | Out of scope |
| Live local DB | No | Not required |
| Production smoke | No | Not added; historical artifacts remain reference only |

## Helper

`backend/api/tests/helpers/analytics-order-items-schema-guard.ts` — column-aware parser distinguishing bare `name` from `product_name` / other `*_name` fields. Static `rc4-analytics-bi.test.mjs` mirrors the same select-list rules for `pnpm test:db`.
