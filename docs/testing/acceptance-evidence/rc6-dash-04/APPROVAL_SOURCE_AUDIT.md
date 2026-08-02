# RC6-DASH-04 — Approval source audit

**Baseline:** `08ca0e413d8863f835cf21aa0c14736b61f39dc1`

| Approval type | Source | Pending state | Role | Branch | Destination | Safe | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Purchase orders | listPurchaseOrders / extras.procurement | draft/submitted | purchasing | yes | /admin/purchasing | Yes | VERIFIED_FOR_DASH04 |
| Cash closes | financeAttention.cashClosesAwaitingApproval | submitted | finance | yes | /admin/finance | Yes | VERIFIED_FOR_DASH04 |
| Expense claims | financeAttention.pendingExpenseApprovals | submitted | finance | yes | /admin/finance | Yes | VERIFIED_FOR_DASH04 |
| Leave requests | workforceAttention.leaveRequestsAwaitingApproval | PENDING | HR | yes | /admin/hr | Yes | VERIFIED_FOR_DASH04 |
| Cash variance | financeAttention / Exception Center | variance>0 | finance | yes | /admin/finance | DASH-01 | DEFERRED (inbox) |
| Attendance corrections | HR attention | pending | HR | yes | /admin/hr | later | DEFERRED |
| Payroll runs | HR attention | under_review… | HR | yes | /admin/hr | sensitive | DEFERRED |
| Loyalty rewards | loyalty attention | awaiting_approval | loyalty | weak | /admin/loyalty | not mapped | DEFERRED |
| Refunds / menu / roles / AI / waste approve | — | — | — | — | — | No | NOT_PRESENT / FOUNDATION_ONLY |
