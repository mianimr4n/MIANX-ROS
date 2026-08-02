# RC6-UI-01 — label audit

**Baseline (post–DOC-01):** `8aa3aabcf80ab92894342a063cb27e8bc22be036`
**Branch:** `feature/rc6-ui-01-admin-label-honesty`

| Route/component | Current label (before) | Actual capability truth | Correct label | Classification | Change |
| --- | --- | --- | --- | --- | --- |
| `HRStatusBanner` | Payroll/shifts Phase 2 | Payroll + shifts + deactivate in repo | Partial LIVE | MISLEADING | Rewritten |
| `admin-hr` directory readiness | deactivate not in slice | Deactivate API + UI | Partial LIVE | STALE | Fixed |
| `admin-hr` shifts | Phase 2 / missing | Shift planner present | present | STALE | Fixed |
| `HRKPIs` upcoming shifts | No shift roster API | APIs exist | Partial detail | STALE | Fixed |
| `WorkforceInsights` footer | Payroll Phase 2 | Payroll LIVE in module | Performance/training Planned | MISLEADING | Fixed |
| `FinanceStatusBanner` | BS/CF/AR/Tax LIVE | PARTIAL_LIVE; BS/CF/AR/Tax UI unwired | Partial LIVE + Foundation | OVERLY_OPTIMISTIC | Rewritten |
| `LedgerPanel` BS/CF | LIVE | Unwired list | Foundation | OVERLY_OPTIMISTIC | Downgraded |
| `ReceivablePanel` / `TaxPanel` | LIVE foundation | Unwired | Foundation | OVERLY_OPTIMISTIC | Downgraded |
| `SalesOverview` footer | Ledger backend absent | CoA/journals exist | Partial LIVE note | STALE | Fixed |
| `OperationsModuleGrid` Finance/HR | arrives later | Partial LIVE | Partial LIVE copy | OVERLY_PESSIMISTIC | Fixed |
| `AdminBranchManager` Inventory/Staff | Basic / arrives later | Partial LIVE | Partial | OVERLY_PESSIMISTIC | Fixed |
| `LoyaltyProgramBanner` | ledger not available | Ledger module LIVE | Implemented | STALE | Fixed |
| `admin-settings` / Settings loyalty | ledger absent | Ledger in Loyalty module | Settings policy Planned | STALE | Fixed |
| `FinanceTaxSettings` | Finance not implemented | Finance Partial LIVE | Settings tax Planned | MISLEADING | Fixed |
| `AdminComingSoon` | Planned | PLANNED | Planned + a11y | ACCURATE | a11y only |
| WhatsApp conversation Phase 2 | Phase 2 | Accurate | Keep | ACCURATE | None |
| Inventory transfers/FIFO Phase 2 | Phase 2 | Accurate | Keep | ACCURATE | None |
| GRN receiving copy | LIVE via Purchasing | Repo GRN stock post | Keep | ACCURATE | None |

## Deliberately not changed

- Wiring Finance BS/CF/AR/Tax fetches → **RC6-FIN-01**
- Backend/API/schema
- Production verification claims
