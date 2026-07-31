# RC3 Loyalty + Marketing — Evidence Map

**Branch:** `feature/rc3-loyalty-marketing`  
**Base:** `origin/main` @ `8b0a23e` (Workforce PR #144 merged; CI Typecheck and test PASS)  
**Workforce:** not modified on this branch  

## REUSE
| Asset | Notes |
| --- | --- |
| `loyalty_accounts` / `loyalty_transactions` | types: earn, burn, adjust, expire (+ reverse via migration) |
| `loyalty_earn_for_order_atomic` | keep; extend with burn/adjust/expire/reverse RPCs |
| `coupons` | percent/fixed; active/inactive/expired |
| `customers.marketing_consent` | boolean SoT |
| perms | `loyalty.manage`, `marketing.manage` |

## NEW (verified gaps)
| Table / RPC | Why |
| --- | --- |
| `loyalty_*` RPCs for burn/adjust/expire/reverse | Schema types unused |
| `coupon_redemptions` | No redemption records |
| Checkout coupon apply | `discountAmount` always 0 today |
| `marketing_campaigns` + `marketing_campaign_submissions` | No campaign lifecycle |
| `marketing_suppressions` | Consent column alone insufficient |

## DO NOT CREATE
`loyalty_ledger_entries`, parallel coupon masters, fake provider delivery success.
