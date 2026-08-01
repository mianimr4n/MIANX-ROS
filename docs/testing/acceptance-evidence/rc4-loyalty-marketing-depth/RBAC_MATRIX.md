# RBAC Matrix

| Surface | Permission | Cashier |
| --- | --- | --- |
| Loyalty accounts/ledger/rewards/tiers/liability | `loyalty.manage` or `admin.access` (read may allow `loyalty.read` where wired) | Denied manage / create reward |
| Marketing coupons/campaigns/segments/templates | `marketing.manage` or `admin.access` | Denied |
| Reward approve/activate | `loyalty.manage` | Denied |
| Campaign lifecycle / queue | `marketing.manage` | Denied |
| Branch-scoped campaigns | `assertBranchMembership` | N/A |

Playwright: cashier denial screenshot `loyalty-cashier-denial.png`.
