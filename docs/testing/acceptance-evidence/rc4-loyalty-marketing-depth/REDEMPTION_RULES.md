# Redemption Rules

## Preconditions (pure basics)

1. Reward `approvalStatus=approved` and `isActive=true`
2. Within `validFrom`/`validTo` (Asia/Karachi calendar date)
3. Branch match when reward is branch-scoped
4. Customer points balance ≥ `pointsCost`
5. Order subtotal ≥ `minOrderAmount` when provided
6. Per-customer and global redemption limits (DB counts)

## Mechanics

- `POST /api/v1/admin/loyalty/rewards/:id/redeem` with `idempotencyKey`
- Burns via existing `loyalty_burn_atomic` / ledger path
- Writes `loyalty_reward_redemptions` linked to burn transaction
- Unique idempotency per account prevents double redemption

## Customer experience

`GET /api/v1/admin/loyalty/customers/:customerId/experience` returns eligibility without inventing rewards.
