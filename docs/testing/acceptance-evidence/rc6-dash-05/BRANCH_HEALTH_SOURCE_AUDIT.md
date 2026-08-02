# RC6-DASH-05 — Branch Health source audit

**Baseline:** `1c1fecd4dbfd8a605ddd9995f34fa6470bffd6eb` (post–PR #185 merge)

| Component candidate | Existing source | Metric / threshold | Denominator | Branch scoped | Freshness | Classification | Safe for DASH-05 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kitchen prep delays | Kitchen tickets API | elapsed ≥ `PREP_TARGET_MINUTES` (20) | Open tickets | Yes (AdminBranchContext) | Live list | VERIFIED_SCORE_COMPONENT | Yes |
| Delivery late rate | Delivery assignments | `classifyDeliveryLate` ≥ 45m | Classifiable assigned/picked-up | Yes | Live list | VERIFIED_SCORE_COMPONENT | Yes |
| Confirmation delays | Ops alerts `PENDING_TOO_LONG` | Backend 15m message | Pending status count | Yes | Ops poll | VERIFIED_SCORE_COMPONENT | Yes |
| Ready awaiting rider | Delivery + `isDispatchWaitingForRider` | Count waiting | Ready status count | Yes | Live list | VERIFIED_SCORE_COMPONENT | Yes |
| Cash variance clear | Finance attention `unresolvedCashVariance` | Count > 0 bad (no PKR threshold) | Binary clear | Yes when finance enabled | Attention API | VERIFIED_SCORE_COMPONENT | Yes (permission-gated) |
| Stock pressure | Ops `lowStockCount` | Exception Center bands 0 / 1–9 / ≥10 | No SKU denom — count bands | Yes | Ops KPI | VERIFIED_SCORE_COMPONENT | Yes (soft) |
| Approval backlog | DASH-04 inbox counts | Counts only | Not comparable % | Partial | Attention APIs | VERIFIED_SIGNAL_ONLY | No (signal via inbox) |
| Cash variance exception | Exception Center EXC-CASH-VAR | Same finance count | — | Yes | — | VERIFIED_SIGNAL_ONLY | Kept in Exception Center |
| Branch sales ranking | `branchPerformance` | Sales/orders only | Volume differs | Multi | Ops | IMPLEMENTED_NOT_COMPARABLE | No for health score |
| HR attendance rate | Workforce attention | Leave counts | No shift denom | Partial | — | FOUNDATION_ONLY | Deferred |
| Complaints / CX | CRM | Weak | — | — | — | DEFERRED | No |
| Rider GPS | — | — | — | — | — | NOT_PRESENT | No |
| Device uptime | — | — | — | — | — | NOT_PRESENT | No |
| Opening checklist | — | — | — | — | — | NOT_PRESENT | No |
| Accounting profit | Finance GL | — | — | — | — | DEFERRED | No |
| Provider health | — | — | — | — | — | NOT_PRESENT | No |
