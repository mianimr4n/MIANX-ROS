# RC6-DASH-03 — Mode source audit

**Baseline (post-DASH-02):** `80cd2c4f6d554c805d4e72973c83311242c5a242`  
**Branch:** `feature/rc6-dash-03-daily-command-modes`

| Signal | Existing source | Trust | Branch scoped | Freshness | Mode | Safe for DASH-03 |
| --- | --- | --- | --- | --- | --- | --- |
| Business hours opens/closes | `fetchBranchProfile` | PARTIAL_LIVE | single branch | on branch change | suggest | Yes |
| Branch timezone | profile `timezone` (fallback Asia/Karachi) | PARTIAL_LIVE | single branch | on branch change | suggest | Yes |
| Active / pending orders | ops dashboard KPIs | PARTIAL_LIVE | yes | poll | Live/Closing | Yes |
| Kitchen queue / delays | ops + kitchen tickets + Exception Center | PARTIAL_LIVE | yes | poll | Live/Closing | Yes |
| Ready orders | statusCounts / KPIs | LIVE | yes | poll | Live | Yes |
| Delivery active/unassigned | assignments + EXC-DEL-UNASSIGNED | PARTIAL_LIVE | yes | poll | Live/Closing | Yes |
| Low stock | ops lowStockCount + EXC-STOCK-LOW | PARTIAL_LIVE | yes | poll | Pre-open/Live/Closing | Yes |
| Cash variance | finance attention (role-gated) | PARTIAL_LIVE | yes | poll | Closing/Exception | Yes when authorized |
| Exception Center | DASH-01 builder | — | yes | derived | All | Yes |
| Staff attendance / clock-out | HR attention only (weak) | FOUNDATION | — | — | — | **DEFERRED** |
| Printer / KDS device health | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
| Rider availability roster | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
| Opening checklist | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
| Z-report / register close | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
| EOD pack | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
| Payment channel readiness | — | NOT_AVAILABLE | — | — | — | **DEFERRED** |
