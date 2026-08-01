# RC4-11 Baseline

| Item | Value |
| --- | --- |
| Branch | `feature/rc4-loyalty-marketing-depth` |
| Starting SHA (origin/main tip) | `8967d4d8f595cd4ca742d364be01b590c1cd4d92` |
| Prior slice | RC4-2 Analytics & BI merged (#159) |
| RC3 foundations | Loyalty ledger + coupons + campaigns + consent (PR #146) |
| Production | No Production migration or deployment in this slice |

## Reused (do not duplicate)

- `loyalty_accounts` / `loyalty_transactions` + earn/burn/adjust/expire/reverse RPCs
- `coupons` / `coupon_redemptions` / validate path
- `marketing_campaigns` / submissions / suppressions
- `customers.marketing_consent`
- Permissions `loyalty.manage` / `marketing.manage`

## Added in this slice

- Migration `20260801180000_rc4_loyalty_marketing_depth.sql`
- Loyalty depth service + admin routes (rewards, tiers, experience, redeem, liability, expiry)
- Marketing depth service + admin routes (segments, templates, lifecycle, attribution, provider gate)
- Admin UI: RewardCatalogue LIVE, tiers/liability, segments/templates honesty
- Unit + DB static + Playwright evidence
