# RC6 Command Center Traceability

**Status:** Living planning contract (updated RC6-DASH-01)
**Baseline tip:** `cc09e239…` (post-DASH-00)

Complete means: implementation + tests + docs + security review (if required) + Production verification (if required).

| Vision capability | Contract | Current truth | Gap | Planned slice | Tests | Security | Migration | Preview | Production | Release |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Six-zone Command Center | Architecture | Owner CC LIVE shell | Zones not formalized in UI | DASH-00→08 | Dashboard + e2e | — | NONE early | — | Owner smoke | — |
| Exception Center | Catalogue + W-EXC-01 | **DASH-01 repo foundation** (5 types; read-only) | Ack/full catalogue/Prod | DASH-01 done (repo); later expand | Static + Owner smoke | PII mask | NONE | Preview UI | **Not Prod-verified** | — |
| KPI drill-downs | KPI + Widget registries | **DASH-02 repo** (selected; DRILL_DOWN) | Date filters / AOV depth / accounting | DASH-02 done (repo); later expand | Static + Owner smoke | — | NONE | Preview UI | **Not Prod-verified** | — |
| Opening/live/closing modes | Architecture §4 | **DASH-03 merged** (advisory) | Checklist/register/EOD still deferred | DASH-03 done (repo) | Mode unit + static | — | NONE | Preview UI | **Not Prod-verified** | — |
| Approval Inbox | Action registry | **DASH-04 repo** (selected; DRILL_DOWN) | Inline execution / bulk / SoD engine | DASH-04 done (repo); later execute | Static + Owner smoke | — | NONE | Preview UI | **Not Prod-verified** | — |
| Approval Inbox | Actions + W-APR-01 | Fragmented approvals | Unified inbox | DASH-04 | Mutation tests | SoD | EXISTING | — | SoD Prod | — |
| Branch health score | KPI-BRANCH-HEALTH | PLANNED | Formula + UI | DASH-05 | Formula tests | — | NONE | — | Audit | — |
| Profitability truth | KPI-PROFIT + FIN | PARTIAL/FOUNDATION | EST vs ACCOUNTING | DASH-06 / FIN-01 | Finance tests | Financial | EXISTING | — | Reconcile | — |
| EOD pack | W-EOD-01 | Cash/Z fragmented | Pack product | DASH-07 | Pack tests | Cash | ADD possible | — | Close proof | — |
| What Changed / timeline | Event model | NOT_PRESENT unified | Event store | DASH-08 | Event tests | Redaction | ADD likely | — | — | — |
| Dispatch queue & assign | Delivery contract | PARTIAL_LIVE | UX depth | DEL-01 | Delivery tests | Address | NONE | — | Assign proof | — |
| Rider profiles/shifts | Delivery contract | FOUNDATION | Lifecycle UI | RIDER-01 | Rider tests | PII | EXISTING/ADD | — | — | — |
| Full delivery lifecycle | Delivery contract | 3 statuses | Extended states | DEL-02 | Transition matrix | — | ADD | — | Prod transitions | — |
| POD / failed delivery | Delivery contract | NOT_PRESENT | Media + flow | DEL-03 | POD tests | Biometric/photo | ADD+storage | — | Required | — |
| Rider COD settlement | Delivery + Actions | NOT_PRESENT | Ledger | CASH-01 | Cash SoD tests | Cash SoD | ADD | — | Required | — |
| SLA/zone analytics | Delivery contract | FOUNDATION | Zones | DEL-04 | Analytics tests | Geo | ADD | — | — | — |
| Rider app / offline | Delivery contract | NOT_PRESENT | App | RIDER-02 | App suites | Device | Separate | — | — | — |
| Smart dispatch AI | Delivery + AI | PLANNED | ADR | DEL-05 / AI-01 | Draft-only tests | ADR | ADR | — | Founder | — |
| Safety/fraud | Catalogue RISK | NOT_PRESENT | Controls | RISK-01 | Sec tests | High | ADD | — | Sec review | — |
| Settings inheritance | Settings contract | PARTIAL writes | Hierarchy engine | SET-00→02 | Resolution tests | — | ADD | — | — | — |
| Org/brand/branch settings | Settings | PARTIAL LIVE | Completeness | SET-01 | Settings tests | — | EXISTING | — | — | — |
| Hours / service modes | Settings | PARTIAL | Modes | SET-03 | — | — | EXISTING | — | — | — |
| Delivery/order/payment policies | Settings | PARTIAL delivery fee | Policies | SET-04 | — | Payments | EXISTING/ADD | — | — | — |
| Roles/approvals config | Settings | READ-ONLY matrix | Admin writes | SET-05 | Authz | High | ADD | — | SoD | — |
| POS/KDS/device | Settings | PLANNED printers | Devices | SET-06 | — | — | ADD | — | — | — |
| Finance/tax/inventory policies | Settings/Finance | FOUNDATION tax UI | Wire/honesty | SET-07 / FIN-01 | Finance | Financial | EXISTING | — | — | — |
| Versioning/rollback | Settings | NOT_PRESENT | Versions | SET-08 | Version tests | Re-auth | ADD | — | Prod activate | — |
| Readiness/drift | Settings | Opening PARTIAL | Scores | SET-09 | — | — | EXISTING | — | — | — |
| AI config assistant | Settings + AI | PLANNED | Draft only | SET-10 / AI-01 | — | ADR | — | — | Founder | — |
| Living doc honesty | RC6 planning | Done DOC-01 | — | DOC-01 | Phrase guards | — | NONE | — | — | Merged |
| Admin label honesty | UI-01 | Done | — | UI-01 | Label tests | — | NONE | — | — | Merged |
| Owner CI paths | QA-02 | Done | — | QA-02 | Playwright | — | NONE | — | — | Merged |
| Public a11y advisories | A11Y-02 | Done | residuals documented | A11Y-02 | axe suites | — | NONE | — | — | Merged |
| Finance BS/CF/AR/Tax honesty | FIN-01 | Open | Wire or downgrade | FIN-01 | Finance tests | — | NONE/EXISTING | — | — | Open |
| Checkout promo | CHK-01 | Open | Redeem UX | CHK-01 | Checkout tests | — | EXISTING | — | — | Open |
| Inventory residual | INV-01 | Open | Proof/honesty | INV-01 | Inventory | — | EXISTING | — | — | Open |
| Supplier RLS matrix | SEC-02 | Open | Credential matrix | SEC-02 | RLS tests | High | EXISTING | — | — | Open |

---

## Selected next runtime slice

**RC6-DASH-05 — Branch Health Score** (after DASH-04 merges)

DASH-04 Approval Inbox: implemented in repository for selected verified sources at **DRILL_DOWN** maturity — **not** Production-verified; no inline approve/reject.
