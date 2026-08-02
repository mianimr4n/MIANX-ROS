# RC6-DASH-05 — Branch comparison rules

## This slice

- Scores the **current Owner branch scope** only.
- `comparableForRanking = false` by default.
- Aggregate “all branches” scope is labeled as a single scope score — **not** a league table.
- Sales-only `branchPerformance` is **not** used for health ranking.

## When ranking would be allowed (future)

Same business window, same component set, coverage within 15 points, freshness not UNAVAILABLE, and each branch above minimum coverage. Insufficient-data branches must not be ranked as weakest.

## Owner copy

Panel shows an explicit comparison note that peer ranking is deferred.
