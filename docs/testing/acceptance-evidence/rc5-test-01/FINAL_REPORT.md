# RC5-TEST-01 Final Report

**Status:** Ready for PR review
**Slice:** Analytics schema regression guards
**Branch:** `feature/rc5-test-01-analytics-schema-guards`
**Baseline SHA:** `cb13f39170f6e3cb2b49938b073aff7fac39d83c`

## Acceptance

| # | Criterion | Result |
| --- | --- | --- |
| D-01 | Suite fails if Analytics selects `order_items.name` | **PASS** (mutation self-check + runtime scan) |
| D-02 | `product_name` selected; `menu_item_id` aggregation proven | **PASS** |
| D-03 | Broader Analytics runtime surface scanned (not one hard-coded line) | **PASS** (`services/analytics/*.ts`) |
| D-04 | No migration / Production DB change | **PASS** |

## Changes

| File | Change |
| --- | --- |
| `backend/api/tests/helpers/analytics-order-items-schema-guard.ts` | Column-aware source guard helper |
| `backend/api/tests/analytics-order-items-schema.test.ts` | Runtime scan + mutation proof + aggregation case |
| `tests/database/rc4-analytics-bi.test.mjs` | Align static intent with shared guard |
| `docs/testing/acceptance-evidence/rc5-test-01/*` | Evidence |

## Runtime behavior

No Analytics runtime source change. No defect found in committed code.

## Explicit non-claims

- No live database required
- No Production request made
- No migration added
- No CI secret added
- Static/source tests do **not** replace Production smoke during future releases

## Validation (local, recorded PASS)

```text
pnpm --filter @telepizza/api exec vitest run tests/analytics-order-items-schema.test.ts tests/analytics-api.test.ts tests/analytics-registry.test.ts  # 16 passed
node --test tests/database/rc4-analytics-bi.test.mjs  # 5 passed
pnpm check       # PASS
pnpm test        # PASS
pnpm test:db     # PASS
pnpm rc1:gate    # RESULT: PASS, BLOCKING FAILURES: 0
git diff --check # PASS
```

Mutation self-check: **ANALYTICS_SCHEMA_REGRESSION_GUARD_PROVEN**

## Known limitations

1. Source-contract tests cannot prove live PostgREST column existence by themselves.
2. Non-Analytics `order_items` callers (orders/kitchen) are outside this slice.
3. Registry metadata is not an executable query path.

## Rollback

Revert the PR. No Production state or migrations to reverse.

## Production

No Production mutation, SQL, deploy, or secrets.
