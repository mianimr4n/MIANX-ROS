# RC6 Dependency Map

**Status:** Living dependency map
**Date:** 2026-08-02
**Baseline tip:** `da99875ddedbc25ae51e6db22a16de4a50d2ea16`
**Tag baseline:** `v1.4.0` @ `96f1e803`

---

## Prerequisite graph

```text
RC6-DOC-01 ✓
RC6-UI-01 ✓
RC6-QA-02 ✓
RC6-A11Y-02 ✓
        │
        ▼
RC6-DASH-00  (contracts — docs only)
        │
        ├──────────────► RC6-DASH-01 (Exception Center read-only)  [NEXT RUNTIME]
        │                      │
        │                      ├─► DASH-02 KPI drill-downs
        │                      ├─► DASH-03 modes
        │                      ├─► DASH-04 Approval Inbox
        │                      ├─► DASH-05 Branch health
        │                      ├─► DASH-06 Profitability ◄── soft ── RC6-FIN-01
        │                      ├─► DASH-07 EOD pack
        │                      └─► DASH-08 What Changed ◄── soft ── event schema later
        │
        ├──────────────► DEL-01 → RIDER-01 → DEL-02 → DEL-03 → CASH-01
        │                      └─► DEL-04 → RIDER-02 → DEL-05 / RISK-01
        │
        └──────────────► SET-01…SET-10 (after SET contracts in DASH-00)

RC6-FIN-01 ──parallelizable after honesty wave──► (pairs with DASH-06)
RC6-CHK-01 ──marketing coupon schema exists──►
RC6-INV-01 / SEC-02 ──hardening──►
RC6-QA-03 ──OPS-01 privilege contract──►

RC6-OPS-03 ──Owner Playwright job exists + Founder GitHub──►
RC6-OPS-02 ──Founder destinations──►
RC6-SEC-01 ──Security ADR──►
RC6-PITR-01 ──commercial plan──►
RC6-WA-01 / LOY-01 / AN-01 / AI-01 ──provider/product ADRs──►
RC6-NB-01 ──Founder go-live──►
```

---

## Provider dependencies

| Slice family | Provider |
| --- | --- |
| DOC/UI/QA/A11Y/DASH-00/DASH-01–05 (preferred) | **None** |
| DEL-05 / AI-01 / SET-10 | AI/product ADR |
| CASH-01 / refunds | None early; payment providers if extended |
| WA/LOY send | Messaging providers |
| Rider GPS maps | Maps provider (explicitly not claimed today) |
| OPS-02 / OBS-02 | Alert/APM vendors |
| PITR | Supabase paid |

---

## Migration dependencies

| Slice family | Migration class |
| --- | --- |
| DASH-00, DASH-01 (prefer), FIN-01 honesty path | **NONE** |
| DASH-02–05 | Prefer NONE / EXISTING_SCHEMA_ONLY |
| DASH-08, DEL-02+, CASH-01, SET-02/05/08, POD | **ADDITIVE_MIGRATION_LIKELY** after contracts |
| Destructive finance year-end | HIGH_RISK — not early RC6 |

**Current tip:** `20260801180000` aligned local ↔ Production.

---

## Recommended waves

| Wave | Slices | Parallel? |
| --- | --- | --- |
| 0 | DOC-01 → UI-01 / QA-02 / A11Y-02 | Done |
| 1 | **DASH-00** | Solo docs |
| 2 | **DASH-01** + FIN-01 | Yes (low coupling) |
| 3 | DASH-02…05; DEL-01; SET-01–03 | Partial |
| 4 | DEL-02/03; CASH-01; DASH-06/07; SET-04–08 | Careful SoD |
| 5 | DASH-08; RIDER-02; DEL-05; SET-09–10; Founder gates | ADR/provider |

---

## Parallelization notes

- Docs-only DASH-00 does not block FIN-01 drafting.
- DASH-01 must not invent providers or AI.
- Never parallelize two Production cutovers on the same service without Founder sequencing.
- Delivery mutations and cash settlement require SoD reviews before Prod claims.
