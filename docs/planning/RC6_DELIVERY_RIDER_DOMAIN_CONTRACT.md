# RC6 Delivery & Rider Domain Contract

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`
**Current capability truth:** Delivery = `PARTIAL_LIVE`

> Current assign/status foundation is **not** the complete delivery/rider system.

---

## 1. Target lifecycle

```text
PENDING_DISPATCH → READY_FOR_PICKUP → ASSIGNED → RIDER_ACCEPTED →
RIDER_ARRIVED_AT_BRANCH → PICKED_UP → EN_ROUTE → ARRIVED_AT_CUSTOMER →
DELIVERED
                                 ↘ DELIVERY_FAILED → RETURNING_TO_BRANCH → RETURNED
CANCELLED (terminal from eligible states)
```

### Current repository mapping

| Target state | Current | Gap |
| --- | --- | --- |
| PENDING_DISPATCH / pending | `pending` | Naming |
| ASSIGNED | `assigned` via `POST /deliveries/:id/assign` | OK foundation |
| PICKED_UP | `picked-up` via status API | OK |
| DELIVERED | `delivered` | OK |
| READY_FOR_PICKUP / ACCEPTED / ARRIVED_* / EN_ROUTE | — | **Missing** |
| DELIVERY_FAILED / RETURN* / CANCELLED | Schema may allow `failed`/`cancelled`; **status API excludes them** | **Missing transitions** |

Sources: `backend/api/src/modules/riders/routes.ts`, `services/deliveries/operations.ts`, foundation `deliveries`/`riders` migrations.

---

## 2. Exception reasons (target)

customer unreachable · invalid address · payment issue · rider delayed · vehicle issue · damaged/missing order · POD missing · cash mismatch · safety incident

---

## 3. Capability map

| Capability | Repo truth | Schema/API/UI | Missing | Security/PII | Migration likelihood | Prod proof | Slice |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dispatch queue UI | PARTIAL | AdminDelivery + DispatchQueue | Advanced map | Address mask | NONE early | Observed | DEL-01 |
| Assignment modes | PARTIAL | Manual assign API | Auto/smart | — | LATER | — | DEL-01 / DEL-05 |
| Rider roster/status | FOUNDATION | `GET /roster` | Rich lifecycle/shifts UI | Rider PII | EXISTING/ADD | — | RIDER-01 |
| Shifts/attendance link | HR PARTIAL | HR shifts exist | Delivery-specific shift board | Employee PII | EXISTING | — | RIDER-01 |
| Full lifecycle | PARTIAL | 3 statuses | Extended states | — | ADDITIVE likely | Required | DEL-02 |
| Exceptions workflow | NOT_PRESENT | — | Reasons + UI | — | ADDITIVE | Required | DEL-02 |
| POD | NOT_PRESENT | Docs only | Media + verification | Biometric/photo | ADDITIVE + storage | Required | DEL-03 |
| Failed delivery + return | NOT_PRESENT API | Schema hints | Transitions + custody | — | ADDITIVE | Required | DEL-03 |
| COD ledger/settlement | NOT_PRESENT product | Order COD semantics only | Rider cash ledger | Cash | ADDITIVE | Required SoD | CASH-01 |
| Reassignment/custody | PARTIAL | Re-assign possible | Custody audit | — | EXISTING/ADD | — | DEL-02 |
| Zones / SLA analytics | FOUNDATION | Fee/radius settings | Zone polygons, SLA reports | Geo | ADDITIVE | — | DEL-04 |
| Cost/profitability | PLANNED | — | Cost model | Financial | ADDITIVE | — | DEL-04 |
| Rider performance | FOUNDATION | Insights panels | Formal KPIs | Rider PII | EXISTING | — | DEL-04 |
| Incentives/payroll link | NOT_PRESENT | Payroll exists separately | Linkage rules | Payroll | ADDITIVE | SoD | RIDER / HR |
| Safety/fraud | NOT_PRESENT | — | Incident types | Sensitive | ADDITIVE | Sec review | RISK-01 |
| Device/app health | NOT_PRESENT | — | Rider app telemetry | Device ids | Provider | — | RIDER-02 |
| GPS privacy/retention | NOT_PRESENT | lat/long columns exist | Policy + purge | High PII | Policy+jobs | Required | DEL / RISK |
| Owner Dashboard integration | PARTIAL | Delivery widgets drill | Exception feeds | Mask | NONE | — | DASH-01/02 |
| AI dispatch recommendations | PLANNED | — | Draft-only | — | ADR | Founder | DEL-05 / AI-01 |
| Live map / Google Maps | FOUNDATION honesty | Map foundation no pins | Provider | Geo | Provider | — | Provider |
| Rider mobile app | NOT_PRESENT in monorepo | Archive requirements only | App | — | Separate | — | RIDER-02 |

---

## 4. Settings touchpoints

Delivery radius / min order / fee: **LIVE writes** via admin delivery settings (`PARTIAL_LIVE` settings domain). Advanced zone/SLA/POD policies: **PROPOSED** under SET-04.

---

## 5. Non-claims

- No claim that GPS, POD, COD settlement, or full lifecycle are implemented.
- No Production delivery mutation performed by DASH-00.
