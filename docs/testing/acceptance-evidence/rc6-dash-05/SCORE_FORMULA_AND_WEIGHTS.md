# RC6-DASH-05 — Score formula and weights

## Overall score

```
overall = round( Σ(componentScore × weight) / Σ(evaluatedWeights) )
```

- Integer 0–100 via `Math.round` / clamp.
- Unavailable and permission-restricted components are **excluded** from the mean (not scored 0 or 100 by assumption).
- Permission-restricted weight is removed from the configured denominator so it does not look like failure.

## Coverage

```
coveragePercent = round( evaluatedWeight / configuredWeight × 100 )
configuredWeight = 100 − permissionRestrictedWeight
```

## Component formulas

| Component | Formula |
| --- | --- |
| Kitchen | `100 × (1 − delayedOpen / openTickets)`; empty open → 100 |
| Delivery late | `100 × (1 − late / classifiableInFlight)`; empty → 100 |
| Confirm | `100 × (1 − PENDING_TOO_LONG / max(pending, alerts))`; empty → 100 |
| Dispatch | `100 × (1 − waiting / max(ready, waiting))`; empty → 100 |
| Cash | `unresolvedCashVariance === 0 ? 100 : 0` |
| Stock | `0 → 100; 1–9 → 50; ≥10 → 0` |

## Status bands

| State | Score |
| --- | --- |
| HEALTHY | ≥ 85 |
| WATCH | ≥ 70 |
| AT_RISK | ≥ 50 |
| CRITICAL | < 50 |
| INSUFFICIENT_DATA | coverage < 50% (numeric score withheld) |

No hidden black-box penalties. No AI.
