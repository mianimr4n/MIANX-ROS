# RC3 Loyalty + Marketing — Final Report

## Decision: LOYALTY_MARKETING_SLICE_COMPLETE

| Item | Value |
| --- | --- |
| Workforce PR | [#144](https://github.com/mianimr4n/telepizza/pull/144) merged after CI `Typecheck and test` PASS |
| origin/main after merge | `8b0a23e` |
| Branch | `feature/rc3-loyalty-marketing` |
| Base | `origin/main` @ `8b0a23e` |

### Implemented
1. Loyalty ledger completion — burn/adjust/expire/reverse RPCs + transaction list API (reuses `loyalty_transactions`)
2. Transaction-safe burn with row lock + idempotency key
3. Checkout coupon enforcement via `coupon_validate_discount` on quote/create; writes `coupon_redemptions`
4. Campaign lifecycle + honest submission states (queued/suppressed/submitted/provider_accepted/rejected/failed — no delivered)
5. Consent (`customers.marketing_consent`) + suppressions
6. Owner loyalty + marketing attention widgets

### Migrations (local apply only)
- `20260731090000_loyalty_ledger_complete.sql`
- `20260731100000_coupon_redemptions.sql`
- `20260731110000_marketing_campaigns_consent.sql`

### Confirmations
- No Production mutation/deploy
- Workforce/Finance/Kitchen not mixed into this branch beyond merged main
- No fake points, coupons, or provider delivery claims
