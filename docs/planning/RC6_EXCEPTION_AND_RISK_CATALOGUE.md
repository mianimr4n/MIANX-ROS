# RC6 Exception and Risk Catalogue

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`

## Exception record contract

| Field | Required |
| --- | --- |
| exception ID | Stable ID (e.g. `EXC-CASH-VAR`) |
| domain | orders / kitchen / delivery / cash / inventory / hr / finance / security / system / config |
| trigger | Condition boolean/query |
| severity | critical / high / medium / low |
| source | API/table/job |
| branch scope | org | brand | branch |
| deduplication key | Prevent duplicate open rows |
| first-seen | Timestamp |
| age | Derived |
| acknowledgement | Actor + time (PROPOSED if no schema) |
| assignment | Actor |
| SLA | Target resolve time |
| escalation | Next role/time |
| snooze | Max duration + audit |
| resolution condition | Clear rule |
| audit events | Unified Event Model |
| drill-down | Route + filters |
| permitted actions | Action IDs |
| provider/dependency state | ok / degraded / down / n/a |

## Classes

operational · configuration · security · financial · staffing · customer · provider/system

---

## Initial catalogue

| ID | Domain | Trigger (summary) | Sev | Source (current) | Class | Truth | Drill-down | Actions | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EXC-CASH-VAR | cash | Variance above limit | high/crit | cash recon | financial | PARTIAL | Finance cash | ACT-CASH-VAR-APPROVE | Limit **PROPOSED** |
| EXC-KDS-DELAY | kitchen | Ticket age > SLA | high | kitchen tickets | operational | PARTIAL | kitchen-dashboard | DRILL | SLA **PROPOSED** |
| EXC-NO-RIDER | delivery | Ready order, no available rider | high | roster + queue | operational | FOUNDATION | delivery | ACT-DEL-ASSIGN | Capacity model weak |
| EXC-DEL-LATE | delivery | Active delivery past SLA | high | deliveries | operational | PARTIAL | delivery | DRILL / reassign **PROPOSED** | No GPS ETA |
| EXC-STOCK-NEG | inventory | Negative on-hand | crit | inventory | operational | IMPL_NOT_PROD | inventory | adjust / investigate | INV residual |
| EXC-STOCK-LOW | inventory | ≤ reorder | med | inventory | operational | IMPL_NOT_PROD | inventory | ACT-PO-CREATE | — |
| EXC-PAY-SPIKE | payments | Failure rate spike | high | payments/orders **PROPOSED** | financial/system | NOT_PRESENT | reports | investigate | Needs signals |
| EXC-SUP-OVERDUE | purchasing | Supplier invoice overdue | med | purchasing | financial | IMPL_NOT_PROD | purchasing | — | — |
| EXC-PAYROLL-APPR | hr | Payroll run awaiting approve | high | payroll | staffing/financial | IMPL_NOT_PROD | HR | approve SoD | — |
| EXC-COMPLAINT-ESC | crm | Complaint escalated | high | CRM weak | customer | PARTIAL | CRM/orders | ACT-COMPLAINT-OPEN | — |
| EXC-API-UNHEALTHY | system | `/readyz` fail | crit | health | system | PARTIAL | ops | — | — |
| EXC-PROVIDER-DOWN | system | Provider circuit open | high | integrations | provider | FOUNDATION | settings | — | No secrets |
| EXC-BRANCH-READY | config | Opening readiness incomplete | high | opening/settings | configuration | PARTIAL | branch/settings | — | — |
| EXC-POD-MISSING | delivery | Delivered without POD | high | — | operational/customer | NOT_PRESENT | delivery | ACT-POD-CAPTURE | Future DEL-03 |
| EXC-RIDER-CASH | cash | Rider COD unsettled | high | — | financial | NOT_PRESENT | cash | ACT-COD-SETTLE | Future CASH-01 |
| EXC-PROVIDER-CRED | security | Provider credential expired | crit | — | security | NOT_PRESENT | settings | rotate | Founder |
| EXC-TAX-MAP | finance | Invalid tax mapping | high | tax defs | financial/config | FOUNDATION | finance | FIN-01 | — |
| EXC-KDS-OFFLINE | kitchen | Printer/KDS offline | high | devices **PROPOSED** | system | PLANNED | settings | — | Printers PLANNED |
| EXC-PAYMENT-FAIL-ORDER | orders | Single order payment failed | med | orders | customer | PARTIAL | order detail | — | — |
| EXC-ATTEND-GAP | hr | Shift uncovered | med | HR shifts | staffing | IMPL_NOT_PROD | HR | — | — |

---

## Distinction: Analytics Exception Center

Repository table `analytics_exceptions` / module `exception_center` tracks **analytics/data-quality** exceptions. It is **not** this operational catalogue. Owner UI must not reuse that name without qualification.

---

## DASH-01 mapping

RC6-DASH-01 consumes a **read-only subset** of this catalogue using **existing** attention/ops sources only (no new migration if avoidable; no ack mutation unless safe existing schema).
