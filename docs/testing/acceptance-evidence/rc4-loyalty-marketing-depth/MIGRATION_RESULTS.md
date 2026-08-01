# Migration Results

| File | Apply target |
| --- | --- |
| `supabase/migrations/20260801180000_rc4_loyalty_marketing_depth.sql` | Local / non-Production only |

## Objects

- Tables: `loyalty_rewards`, `loyalty_reward_redemptions`, `loyalty_tier_definitions`, `loyalty_tier_history`, `loyalty_expiry_policies`, `marketing_segments`, `marketing_templates`, `marketing_attribution_links`, `loyalty_marketing_audit_events`
- Alters: `marketing_campaigns` status check + depth columns
- Seeds: tier definitions + segment catalog
- RLS enabled on new tables

## Validation

Static assertions: `tests/database/rc4-loyalty-marketing-depth.test.mjs`

**Production migration/deployment: NOT performed.**
