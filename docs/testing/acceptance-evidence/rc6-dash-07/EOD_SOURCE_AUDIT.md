# EOD source audit — RC6-DASH-07
Baseline: `19fdb0a51f00b646130ca7ec12cc09fe51532366`

| Signal | Source | Trust | Branch | Business-day | Freshness | Class | Safe |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Gross sales / orders / AOV | Ops KPIs | ESTIMATED | Yes | Karachi day | Ops poll | VERIFIED_FOR_EOD | Yes |
| Status counts | Ops statusCounts | LIVE/DERIVED | Yes | Yes | Ops | VERIFIED_FOR_EOD | Yes |
| Open kitchen tickets | Kitchen tickets | LIVE | Yes | Live queue | List | VERIFIED_FOR_EOD | Yes |
| Active / waiting delivery | Delivery assignments | LIVE | Yes | Live queue | List | VERIFIED_FOR_EOD | Yes |
| Low stock | lowStockCount | DERIVED | Yes | Snapshot | Ops | VERIFIED_FOR_EOD | Yes |
| Cash variance / closes | Finance attention | DERIVED | Yes | Snapshot | Attention | VERIFIED_FOR_EOD | Finance-gated |
| Exceptions | DASH-01 | DERIVED | Yes | Live | Sources | VERIFIED_FOR_EOD | Yes |
| Approvals | DASH-04 | DERIVED | Yes | Live | Sources | VERIFIED_FOR_EOD | Yes |
| Branch Health | DASH-05 | DERIVED | Yes | Live | Multi | VERIFIED_FOR_EOD | Yes |
| Profitability states | DASH-06 | EST/ACCOUNTING | Branch | Mixed windows | Sources | VERIFIED_PARTIAL | Status only |
| Z-report / register close | POS | — | — | — | — | DEFERRED | No |
| COD / clock-out / waste / complaints | — | — | — | — | — | DEFERRED / NOT_PRESENT | No |
