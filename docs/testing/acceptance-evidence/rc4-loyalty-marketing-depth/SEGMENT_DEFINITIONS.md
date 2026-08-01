# Segment Definitions

Seeded codes (documented formulas; not all previews LIVE):

| Code | Source |
| --- | --- |
| new_customers | orders |
| returning_customers | orders phone/customer |
| inactive_customers | orders + customers |
| loyalty_members | loyalty_accounts |
| tier_members | loyalty_accounts.tier |
| high_frequency | orders |
| high_spend | orders |
| coupon_users | coupon_redemptions |
| lapsed_customers | orders |
| consented_audiences | customers + suppressions |

## Preview honesty

- `loyalty_members` / `consented_audiences` may return `status: LIVE` with counts
- Others return `status: UNAVAILABLE` with reason — never fabricate member counts
