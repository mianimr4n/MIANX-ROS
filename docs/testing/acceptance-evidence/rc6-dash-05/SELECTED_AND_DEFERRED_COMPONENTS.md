# RC6-DASH-05 — Selected and deferred components

## Selected (VERIFIED_SCORE_COMPONENT)

| ID | Label | Weight | Threshold provenance |
| --- | --- | --- | --- |
| BH-KITCHEN-DELAY | Kitchen prep delays | 25 | `PREP_TARGET_MINUTES` = 20 (`admin-kitchen.ts`) |
| BH-DELIVERY-LATE | Delivery late rate | 20 | `DELIVERY_LATE_MINUTES` = 45 (`admin-delivery.ts` / operational-truth) |
| BH-CONFIRM-DELAY | Order confirmation delays | 15 | Ops `PENDING_TOO_LONG` — backend “more than 15 minutes” |
| BH-DISPATCH-WAIT | Ready awaiting rider | 15 | `isDispatchWaitingForRider` (same as Exception Center) |
| BH-CASH-VARIANCE | Cash variance clear | 15 | Count-based binary; no invented currency threshold |
| BH-STOCK-PRESSURE | Stock pressure | 10 | Exception Center bands: 0 / 1–9 / ≥10 |

Weights sum to **100**.

## Deferred / excluded

- Customer complaints, rider GPS, device uptime, full attendance, opening/closing checklists
- Accounting profitability, provider health, AI scoring
- Configurable Owner weights (later Settings / governance)
- Approval backlog as a scored percentage (remains DASH-04 inbox signal)
- Peer league table from sales-only `branchPerformance`
