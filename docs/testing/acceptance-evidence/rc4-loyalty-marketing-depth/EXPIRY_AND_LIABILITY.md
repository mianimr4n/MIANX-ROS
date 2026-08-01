# Expiry and Liability

## Expiry policies

Table `loyalty_expiry_policies`:

- `expire_after_days` required
- `valuation_rule`: `none` | `configured_rate` | null
- PKR conversion only when `valuation_rule=configured_rate` and `points_to_pkr_rate > 0`

## Liability snapshot

`GET /api/v1/admin/loyalty/liability`:

- Outstanding / earned / redeemed / expired from ledger aggregates
- `liabilityPkr` null when valuation not configured
- `liabilityMessage` explains honesty (no invented PKR)

## Admin UI

Liability card shows “—” for PKR unless `valuationConfigured`.
