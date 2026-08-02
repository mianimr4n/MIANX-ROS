# RC6-DASH-05 — Coverage and confidence

## Coverage

- Evaluated weight / configured weight (permission-restricted weight removed from configured).
- Unavailable sources reduce coverage.
- Missing data is never treated as healthy.

## Minimum coverage

- `MIN_COVERAGE_PERCENT = 50`
- Below minimum → `score = null`, `scoreState = INSUFFICIENT_DATA`

## Confidence

| Level | Rule |
| --- | --- |
| HIGH | coverage ≥ 80% and no stale evaluated components |
| MEDIUM | coverage ≥ 50% (or stale present) |
| LOW | coverage < 50% or zero evaluated components |

## Failed sources

- Failed source → component `UNAVAILABLE`, excluded from weighted mean.
- Never forces overall score to 100 or 0 solely from failure.
