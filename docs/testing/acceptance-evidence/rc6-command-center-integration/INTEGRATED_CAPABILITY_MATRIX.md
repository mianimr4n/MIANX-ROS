# RC6-QA-03 — Integrated capability matrix (DASH-01…08)

**Baseline (post–PR #189 / DASH-08 merge):** `9fed3b4392015db69ebdc652dd9a693811d335c8`  
**Certification branch:** `test/rc6-command-center-integration-certification`  
**Trust class (all rows):** repository-implemented; **not Production-verified** (website tip still `152ce40…`).

| Slice | Loads | Sources | Trust | Permission | Degraded | Drill-down | Mobile | A11y | Mutation boundary | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DASH-01 Exception Center | OCC zone; shared ops fetches | Ops attention / orders / kitchen / delivery / inventory signals | IMPLEMENTED_NOT_PRODUCTION_VERIFIED | Owner/admin session + existing perms | Partial/total failure + retry; no silent all-clear | Domain routes (orders, kitchen, delivery, inventory) | Smoke in QA-03 viewport | Single section heading; list keyboard via existing admin | Read-only — no ack/assign/resolve/snooze | Five verified types only; not full catalogue |
| DASH-02 KPI drill-downs | KPI strip on OCC | Ops dashboard metrics | Same | Same | Cards inherit ops degraded | Selected KPIs → `/admin/*` with filters; **no** URL `branchId` | Same | Existing KPI card pattern | DRILL_DOWN only | Date/AOV/refunds/accounting Net Sales deferred |
| DASH-03 Command modes | Mode selector + composition | Advisory composition registry | Same | Same | Mode switch does not invent readiness | Mode emphasis only; URLs `?commandMode=` | Same | Radios named Pre-open / Live / Closing | No open/close/register mutation | Checklist/register/EOD close deferred |
| DASH-04 Approval Inbox | OCC panel | Fragmented approval-shaped lists (PO, invoices, finance/HR attention) | Same | Same | Empty / unavailable honesty | DRILL_DOWN to domain routes | Same | `headingId=approval-inbox-heading` | No inline Approve/Reject | SoD engine / bulk execute deferred |
| DASH-05 Branch Health | OCC panel | Six verified components from ops aggregates | Same | Same | Coverage-adjusted; low coverage honesty | Component drill-downs | Same | `headingId=branch-health-heading` | Insight + DRILL_DOWN; no score override | Not a compliance score; AI none |
| DASH-06 Profitability Truth | OCC panel | Ops estimate + posted P&L when finance enabled | Same | `financeEnabled` / `canLoadFinance`; P&L needs branch | Finance disabled → posted omitted; ops estimate labeled | Existing finance/ops routes | Same | `headingId=profitability-truth-heading` | No journal posting | Ops ≠ Accounting Posted; BS/CF/AR/Tax out of scope |
| DASH-07 EOD Pack | OCC panel (Closing emphasis) | Composed DASH-01…06 + ops window | Same | Same | Incomplete sources → non-final pack honesty | Preview sections + local export | Same | `headingId` on pack title | Print/CSV/JSON only — **never** FINAL/CLOSED/finalize | No email/WhatsApp, register close, Z-report |
| DASH-08 What Changed + timeline | OCC panels | Device-local baseline + derived comparisons / list events | Same | Same; finance events omitted if finance off | Stale/missing sources labeled | Timeline → domain routes; mark/reset baseline local | Same | `headingId` on What Changed title | No event mutation; localStorage aggregates only | Never “last login”; not unified org event store |

## Shared integration notes

- All panels wired via `OwnerCommandCenter` + command-mode registry sections.
- Mode emphasis helpers are **presentation only** (formulas/source values unchanged).
- Public routes do not import OCC / what-changed / eod-pack.
