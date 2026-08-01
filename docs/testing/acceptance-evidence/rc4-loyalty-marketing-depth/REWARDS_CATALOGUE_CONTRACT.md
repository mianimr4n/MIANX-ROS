# Rewards Catalogue Contract

## States

| Approval | Active | Redeemable |
| --- | --- | --- |
| draft | false | No |
| awaiting_approval | false | No |
| approved | false | No (must activate) |
| approved | true | Yes (within window/limits) |
| rejected | * | No |

## Types

`fixed_discount` · `percentage_discount` · `free_item` · `category_reward` · `delivery_fee_waiver`

Shape checks enforce monetary/product/category refs per type.

## APIs

- `GET /api/v1/admin/loyalty/rewards?includeInactive=1`
- `POST /api/v1/admin/loyalty/rewards` → draft
- `PATCH /api/v1/admin/loyalty/rewards/:id/approval` `{ approvalStatus, activate }`

## UI honesty

Empty catalogue shows “No rewards configured” — never sample invent. Unavailable API surfaces explicit error, not fake rows.
