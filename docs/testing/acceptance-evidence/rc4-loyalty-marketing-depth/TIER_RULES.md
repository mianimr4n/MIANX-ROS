# Tier Rules

## Codes

`member` · `silver` · `gold` · `platinum` (seeded in migration)

## Qualification

Default: `lifetime_earned_points` with thresholds 0 / 500 / 2000 / 5000.

Rolling rule requires `rolling_period_days`. Incomplete data never invents upgrades.

## APIs

- `GET /api/v1/admin/loyalty/tiers`
- `POST /api/v1/admin/loyalty/tiers/evaluate` `{ customerId }`
- `POST /api/v1/admin/loyalty/tiers/manual` `{ customerId, toTier, reason }` (audited)

## History

`loyalty_tier_history` records automatic and manual transitions with reason + actor.
