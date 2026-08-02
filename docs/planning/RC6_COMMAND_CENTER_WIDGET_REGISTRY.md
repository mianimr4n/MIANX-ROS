# RC6 Command Center Widget Registry

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`
**Truth enum:** see `RC6_CAPABILITY_TRUTH.md`

> Every widget is a contract. **Truth state** is repository evidence today — not aspiration.

Legend for **Truth state:** LIVE_VERIFIED · IMPLEMENTED_NOT_PRODUCTION_VERIFIED · PARTIAL_LIVE · FOUNDATION_READ_ONLY · PLANNED · NOT_PRESENT
Legend for **Action maturity:** None · Read · Draft · Approve · Execute (detail in Action Registry)

---

## Registry

| Widget ID | Zone | Title | Purpose | Roles | Scope | KPI/source IDs | Truth state | Freshness | Drill-down | Action maturity | Empty | Unavailable | Security/PII | A11y | Perf | Dependencies | Planned slice | Production proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-EXC-01 | 1 | Exception Center | Prioritized operational exceptions | Owner, BM | Org/branch | KPI-ATTENTION-* ; EXC-* | PARTIAL_LIVE (attention cards exist; unified center NOT_PRESENT) | ≤60s poll | Filtered exception list → domain route | Read / Draft ack (if schema) | No open exceptions | Source APIs down | Branch IDs; mask customer PII | Named severity; keyboard list | Lazy zone 1 | Ops/finance/HR/loyalty attention APIs | RC6-DASH-01 | Owner smoke + exception list Prod smoke |
| W-ALT-01 | 1 | Critical alerts | Highest severity only | Owner, BM | Org/branch | EXC-CRIT-* | PARTIAL_LIVE | ≤60s | Same as W-EXC-01 | Read | None critical | UNAVAILABLE | Same | Color+text severity | Shared poll | Same | RC6-DASH-01 | Same |
| W-APR-01 | 1 | Pending approvals | Queue of approval-gated actions | Owner, Finance, HR, BM | Org/branch | ACT-* APPROVAL | FOUNDATION_READ_ONLY / fragmented | ≤5m | Approval inbox | Approve | Empty inbox | Module offline | Financial/HR PII | Clear approve/deny names | Separate fetch | Payroll/PO/refund APIs | RC6-DASH-04 | Approval mutation Prod proof |
| W-CMP-01 | 1 | Open complaints | Customer risk | Owner, Support, BM | Branch | CRM-COMPLAINT | PARTIAL_LIVE / weak | ≤5m | CRM/orders | Draft open | None open | CRM limited | Customer PII | — | — | Orders-derived CRM | Later CRM slice | Prod with PII controls |
| W-SAL-01 | 2 | Net Sales | Revenue today/window | Owner, BM, Finance | Branch/org | KPI-NET-SALES | PARTIAL_LIVE (ops **gross** sales card; not ACCOUNTING) | ≤60s | Orders (DASH-02 drill; date filter limitation) | DRILL_DOWN | Zero valid only if proven empty | STALE/UNAVAILABLE | Currency | — | Cache+etag | Orders, finance | RC6-DASH-02 | Prod KPI reconcile sample |
| W-ORD-01 | 2 | Total Orders | Volume | Owner, BM | Branch/org | KPI-ORDERS | PARTIAL_LIVE | ≤60s | `/admin/orders` (DASH-02) | DRILL_DOWN | — | — | — | — | — | Orders | RC6-DASH-02 | Observed |
| W-AOV-01 | 2 | Average Order Value | Basket size | Owner, BM | Branch/org | KPI-AOV | PARTIAL_LIVE / DERIVED | ≤60s | Reports (deferred deeper filters) | None/read | — | — | — | — | — | Orders | Later | Formula audit |
| W-CXL-01 | 2 | Cancelled / refunded | Loss & abuse | Owner, BM, Finance | Branch | KPI-CANCEL-REFUND | PARTIAL_LIVE (cancelled DASH-02; refunds deferred) | ≤60s | Orders `?status=cancelled` | DRILL_DOWN | — | — | Payment PII | — | — | Orders/payments | RC6-DASH-02 / FIN | Refund SoD proof |
| W-PRF-01 | 2 | Profitability truth | Ops vs accounting | Owner, Finance | Org/branch | KPI-PROFIT-* | IMPLEMENTED_NOT_PRODUCTION_VERIFIED | ≤15m | Finance / orders / reports | DRILL_DOWN | Insufficient data | ESTIMATED vs ACCOUNTING | Financial | Trust badge required | Cached | Ops + posted P&L | RC6-DASH-06 | Accounting reconcile |
| W-FCT-01 | 2 | Forecast vs actual | Variance | Owner | Org/branch | KPI-FORECAST | PLANNED / ESTIMATED | Daily | Reports | None | — | — | — | — | — | Analytics | Later | — |
| W-KDS-01 | 3 | Kitchen queue & delays | Prep risk | Owner, Kitchen Mgr, BM | Branch | KPI-KDS-DELAY | PARTIAL_LIVE | ≤15s | `/admin/kitchen-dashboard` | Read | Empty board | KDS offline | — | Live region polite | Fast poll | Kitchen tickets | RC6-DASH-02 | Transition Prod proof |
| W-DEL-01 | 3 | Active / late deliveries | Delivery SLA | Owner, Delivery Mgr | Branch | KPI-DEL-LATE | PARTIAL_LIVE | ≤15s | `/admin/delivery` | Read / Draft assign | — | GPS/provider UNAVAILABLE | Address/phone masked | — | — | Deliveries | RC6-DEL-01+ | Dispatch Prod proof |
| W-RID-01 | 3 | Rider availability | Capacity | Owner, Delivery Mgr | Branch | KPI-RIDER-AVAIL | FOUNDATION_READ_ONLY | ≤30s | Rider roster | Read | No riders | Roster fail | Rider PII | — | — | Riders | RC6-RIDER-01 | — |
| W-CASH-01 | 3 | Expected cash / variance | Cash risk | Owner, BM, Finance, Cashier | Branch | KPI-CASH-VAR | PARTIAL_LIVE (cash recon) | ≤5m | Finance cash / POS Z | Approve variance | — | — | Cash amounts | — | — | Cash recon, Z-report | RC6-DASH-07 / CASH | Variance SoD |
| W-INV-01 | 3 | Low / out of stock | Stock-out risk | Owner, BM | Branch | KPI-STOCK | IMPLEMENTED_NOT_PRODUCTION_VERIFIED | ≤5m | Inventory | Draft mark unavailable | — | — | — | — | — | Inventory | INV-01 | Prod stock proof |
| W-PUR-01 | 1/3 | Purchase approvals | Supply continuity | Owner, Purchasing | Org | ACT-PO-APPROVE | IMPLEMENTED_NOT_PRODUCTION_VERIFIED | ≤5m | Purchasing | Approve | — | — | Supplier $ | — | — | PO APIs | DASH-04 | — |
| W-HR-01 | 1/3 | Staff attendance | Coverage | Owner, HR, BM | Branch | KPI-ATTEND | IMPLEMENTED_NOT_PRODUCTION_VERIFIED | ≤5m | HR | Read | — | — | Employee PII | — | — | HR | — | — |
| W-BR-01 | 5 | Branch comparison | Peer performance | Owner | Org | KPI-BRANCH-CMP | PARTIAL_LIVE | ≤5m | Branch dashboard | None | Single branch | — | — | — | — | Branches/orders | DASH-05 | Multi-branch Prod |
| W-BH-01 | 5 | Branch health score | Composite readiness | Owner, BM | Branch | KPI-BRANCH-HEALTH | IMPLEMENTED_NOT_PRODUCTION_VERIFIED / DERIVED | ≤15m | Component drill-downs | DRILL_DOWN | Insufficient data | Missing inputs | — | Explain composition | Cached | Multi-source | RC6-DASH-05 | Score audit |
| W-EOD-01 | 5/1 | EOD readiness | Close checklist | Owner, BM | Branch | KPI-EOD | IMPLEMENTED_NOT_PRODUCTION_VERIFIED (preview) | ≤5m | EOD pack drill-downs | DRILL_DOWN / export | Insufficient data | Provisional ops | Cash | Textual state | Cached | DASH-01…06 | RC6-DASH-07 | Close Prod |
| W-SYS-01 | 5 | System health | Platform risk | Owner | Org | KPI-HEALTH | PARTIAL_LIVE (/healthz/readyz) | ≤30s | Ops/observability | None | — | — | No secrets in UI | — | — | API health | OBS | Health PASS |
| W-CHG-01 | 6/1 | What Changed | Since last login | Owner | Org/branch | EVT-* | NOT_PRESENT | On login | Timeline | None | No changes | Event store gap | Redacted | — | — | Unified events | RC6-DASH-08 | — |
| W-TL-01 | 3/6 | Live timeline | Streaming ops events | Owner, BM | Branch | EVT-* | NOT_PRESENT / partial audit tables | ≤15s | Entity detail | None | — | — | Redacted | Live region | Stream/poll | Events | DASH-08 | — |
| W-RSK-01 | 1 | Risk center | Cross-domain risks | Owner | Org | EXC-RISK-* | PLANNED | ≤5m | Exception | Assign | — | — | — | — | — | Catalogue | RISK-01 | — |
| W-AI-01 | 6 | AI recommendations | Assisted next steps | Owner | Org/branch | AI-* | PLANNED / FOUNDATION_READ_ONLY | On demand | Draft panel | Draft only | — | Provider down | No secrets to model without ADR | — | Bounded | AI foundation | RC6-AI-01 | Founder ADR |

---

## Notes

- **W-EXC-01** is the selected next runtime foundation (`RC6-DASH-01`): read-only Needs Attention from existing trusted sources.
- Analytics module `exception_center` is a **different** data-quality product — do not conflate in UI copy.
- Widgets marked PLANNED/NOT_PRESENT must not show LIVE badges.
