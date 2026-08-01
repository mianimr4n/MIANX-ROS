# Attribution Rules

## Allowed sources only

`marketing_attribution_links.source_type` ∈:

- `coupon`
- `campaign`
- `reward_redemption`
- `provider_ref`

Never timing / proximity inference.

## APIs

- `POST /api/v1/admin/marketing/attribution`
- `GET /api/v1/admin/marketing/attribution/summary?campaignId=`

## Summary honesty

Counts from traceable links only. Conversion rate null when denominator zero. Note field explains limitations — no fabricated open/click attribution.
