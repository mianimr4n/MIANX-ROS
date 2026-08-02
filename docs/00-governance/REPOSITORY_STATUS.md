# Repository Status

**Status:** Living Document

**Last reconciled:** 2026-08-02 — **RC6-DASH-06** Profitability Truth in progress after DASH-05 merge `64d6557…`; Production website still `152ce40…`

---

## Purpose

This document records the current verified status of the Telepizza ROS repository.

Repository status is determined by repository evidence, acceptance verification, and release records.

Planning documents do not determine repository status.

---

## Status Principles

Repository status must always distinguish between:

- Planned
- Approved
- Implemented
- Verified
- Released

These states must never be treated as equivalent.

Repository tip, released tag commit, Production website tip, Production API tip, and migration tip must also be labeled separately when they differ.

---

## Release and tip anchors

| Concept | Canonical value | Notes |
| --- | --- | --- |
| Repository main | `64d655760fb9564ac841bff05cd797241b2a7743` | Post–RC6-DASH-05 (#186); DASH-06 implements Profitability Truth on a feature branch |
| Released baseline | `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824` | Annotated git tag; **no** GitHub Release object |
| Prior released tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | Unchanged |
| RC4 status | Certified + security-closeout complete + release complete | See `docs/releases/RC4_RELEASE_NOTES.md` |
| Production website | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Vercel `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` — `rc5-production-cutover/` |
| Production API (observed) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | `/healthz`/`/readyz` `gitSha`; RC5 website cutover did **not** intentionally trigger API deploy |
| Production database | Migrations through `20260801180000` | Distinct from tag commit; RC5 cutover migrations **NONE** |
| Prior website rollback target | `dpl_FriiC2PsK3bEYrXbXLVuNSXv3G3y` (`795efee…`) | Not executed |

## Current Repository Status

| Area | Status |
|------|--------|
| Repository Governance | Active |
| Architecture | Approved |
| Requirements | Active |
| Documentation | Active |
| Repository Evidence | Current |
| Acceptance Process | Active |
| Release Policy | Active |
| RC4 | Released (`v1.3.0`) |
| RC5 | **Released** (`v1.4.0`; certified + Production website verified) |
| RC6 | Honesty wave + DASH-00…05 merged; **RC6-DASH-06** Profitability Truth in progress (ops≠posted; not Production-verified) |

---

## Current Delivery

| Item | Status |
|------|--------|
| Current Delivery Slice | **RC6-DASH-06** — Profitability Truth (repository; **not** Production-verified; Operational Estimate ≠ Accounting Posted) |
| RC6 planning | … · DASH-04 #185 · DASH-05 #186 → `64d6557…` |
| Completed RC5 slices (on `main`) | OPS-01, A11Y-01, DOC-01, TEST-01, PERF-01, OBS-01, QA-01 |
| Next after DASH-06 (not started) | **RC6-DASH-07** |
| Production website smoke | **Complete** — `docs/testing/acceptance-evidence/rc5-production-cutover/` |
| RC5 release blockers | **None evidenced** |
| Released baseline | `v1.4.0` @ `96f1e80…` |
| Proposed next SemVer | Not selected — RC6 in progress |
| Northern Bypass | `coming-soon` (unchanged) |
| Royal Orchard target opening | **14 August 2026** — software readiness ≠ restaurant Production-ready |

Owner-facing summary remains in [`PROJECT_STATUS.md`](./PROJECT_STATUS.md).

Admin ERP core modules remain LIVE on `main` with documented gaps (tables below). RC5 is **released** as annotated `v1.4.0`. Finance truth for RC6 planning is **PARTIAL_LIVE** (see `docs/planning/RC6_CAPABILITY_TRUTH.md`). Admin capability-label honesty is **merged** as RC6-UI-01. Command Center depth: DASH-00…02 merged; **RC6-DASH-03** daily command modes (repo; not Prod-verified).

### Merged delivery through PR #133 (2026-07-30)

| PR | Delivery | Merge |
| --- | --- | --- |
| [#121](https://github.com/mianimr4n/telepizza/pull/121) | AI platform foundation tables and APIs | `a8a631a` |
| [#122](https://github.com/mianimr4n/telepizza/pull/122) | HR employee directory backend and API | `0c1003a` |
| [#123](https://github.com/mianimr4n/telepizza/pull/123) | Governance docs sync through PR #120 | `8bb9ea0` |
| [#124](https://github.com/mianimr4n/telepizza/pull/124) | Owner Executive Dashboard with honest live UI | `6081621` |
| [#125](https://github.com/mianimr4n/telepizza/pull/125) | Inventory backend with stock ledger and APIs | `a6947ce` |
| [#126](https://github.com/mianimr4n/telepizza/pull/126) | Supplier master and purchase order APIs | `4476c2e` |
| [#127](https://github.com/mianimr4n/telepizza/pull/127) | Inventory/purchasing upgrade and connection | `70b78c8` |
| [#128](https://github.com/mianimr4n/telepizza/pull/128) | Requisitions + GRN headers (tables, APIs, UI) | `66793ab` |
| [#129](https://github.com/mianimr4n/telepizza/pull/129) | Menu write APIs (prices, availability, categories) | `6a4e3ba` |
| [#130](https://github.com/mianimr4n/telepizza/pull/130) | Branch settings write APIs (hours, radius, fees) | `f96c7a1` |
| [#131](https://github.com/mianimr4n/telepizza/pull/131) | Sales analytics API + CSV export | `3acbc80` |
| [#132](https://github.com/mianimr4n/telepizza/pull/132) | POS Z-Report + dashboard low-stock alerts | `826f27f` |
| [#133](https://github.com/mianimr4n/telepizza/pull/133) | Procurement approval loop (PO approve/reject) | `e5c3910` |

Prior baseline still released: Opening Operations M1–M4 ([PR #113](https://github.com/mianimr4n/telepizza/pull/113)), CI gate ([PR #114](https://github.com/mianimr4n/telepizza/pull/114)), Admin ERP zero-fake-data audit ([PR #115](https://github.com/mianimr4n/telepizza/pull/115)), staff-assignment/settings fixes ([PR #116–#118](https://github.com/mianimr4n/telepizza/pull/118)), organization/branch/menu/delivery settings APIs ([PR #119](https://github.com/mianimr4n/telepizza/pull/119)–[#120](https://github.com/mianimr4n/telepizza/pull/120)).

### Admin ERP core — LIVE with documented gaps

| Module | Live capability | Documented gap / Coming Soon |
| --- | --- | --- |
| Owner Executive Dashboard | Live order KPIs + low-stock count | Acceptance remains PASS WITH LIMITATIONS from D1 |
| Inventory | Items, stock ledger, adjustments | Adjustment atomicity residual; GRN→stock posting exists in **repository** (atomic RPC) — **not** Production-verified |
| Purchasing | Suppliers, POs, requisitions, GRN (+ atomic stock post in repo), PO approve/reject | Invoice matching / payables depth; GRN stock post **Prod-unverified** |
| Menu | Write APIs for prices, availability, categories | — |
| Settings | Org/branch/delivery writes; hours/radius/fees | — |
| Finance | CoA / journals / TB / P&L / cash / AP (repo) | **PARTIAL_LIVE** — BS/CF/AR/Tax UI honesty → RC6-FIN-01 / RC6-UI-01 |
| Reports | Sales analytics + CSV export | — |
| POS | Cash checkout + Z-Report shift close | No starting float / counted cash variance |
| HR | Employee directory + deactivate API in repo | Broader update lifecycle / Prod verification incomplete; UI Phase-2 banners → RC6-UI-01 |
| AI platform | Foundation tables/APIs | No runtime execution / agent loop |

### Known risks (audit — do not overstate as complete)

1. **Inventory adjustment atomicity** — stock mutations may not be fully transactional across ledger + on-hand update paths; race/partial-write risk under concurrent adjust.
2. **GRN→stock posting** — repository implements `create_goods_receiving_with_stock_atomic` (tests present). **Not** claimed Production-verified. Residual: invoice matching / payables depth.
3. **Z-Report lacks float / counted cash** — expected drawer cash equals paid cash sales for the Asia/Karachi business day only; no opening float, counted cash, or variance capture.
4. **HR deactivate** — `POST /hr/employees/:id/deactivate` exists in repository. Do **not** claim full HR lifecycle or Production verification. Misleading HR Phase-2 banners → RC6-UI-01.
5. **AI foundation exists without runtime execution** — platform tables and APIs are present; no production agent runtime or autonomous execution path.

### Opening Operations (M1–M4) — verified baseline

| Milestone | Scope | Decision |
| --- | --- | --- |
| M1 | Branch staff, floors/tables, booking policy | COMPLETE |
| M2 | Payments, notifications, device verification | COMPLETE |
| M3 | SOPs, training, rehearsals, Founder GO/NO-GO, Owner handover | `OPENING_OPERATIONS_MILESTONE_3_COMPLETE` |
| M4 | Staff seeding + encrypted handover, live config, dry-run evidence | `OPENING_OPERATIONS_MILESTONE_4_COMPLETE` |

Honest non-claims from M4 evidence: no Production staff apply, no real customer notifications, no real card transactions, no Northern Bypass activation, no automatic branch status change.

### Executive Dashboard v1 (released baseline)

Executive Dashboard v1 remains **Released** to production as of merge commit `f685599` (2026-07-24). Acceptance remains **PASS WITH LIMITATIONS**. Subsequent PRs (#124, #132) extended Owner dashboard honesty (live APIs, low-stock) on the same governance contract — zero invented metrics.

### Production verification evidence (D1 post-deploy)

- Website Production deploy: success (`f685599`) → `https://telepizza-website.vercel.app`
- API Production deploy: success (`f685599`) → Render `telepizza-api` (`/healthz` 200)
- Production bundle markers confirmed: Active Orders, Kitchen Queue, Average Order Value, Active Deliveries, Mianx.ai Operations Insights, Loading insights, D1 operations grid copy
- `/admin/login` returns HTTP 200
- Authenticated live KPI browser session was not re-run in this post-deploy pass (gate remains login-protected)

### Accepted verification limitations (D1)

- Customer-session RBAC browser proof was unavailable (no local customer fixture).
- Live API error state was not induced during AV1 (code now prefers KPI `error` over stale payload; production induction still pending).
- Planned/disabled module cards are represented in Admin shell navigation rather than the D1 operations grid.

### Production migrations

**Current Production migration tip (RC4 cutover evidence):** `20260801180000`.

Historical note — ERP-wave alignment **2026-07-30** via `npx supabase migration list --linked` (superseded tip; retained as audit trail of that pass):

| Result | Detail |
| --- | --- |
| Pre-push gap | Local-only: `20260730193000` (reports.read), `20260730210000` (pos_z_report_events) |
| Action | `npx supabase db push --linked` applied both migrations to production |
| Post-push (that day) | Local and Remote aligned through `20260730210000` — **0 local-only**, **0 remote-only** |
| Later Production tip | Advanced through RC4 cutover to `20260801180000` (do not treat `20260730210000` as current) |

Key post-#120 migrations (ERP wave) — all present on Local and Remote after push:

| Version | File | Introduced by | Production |
| --- | --- | --- | --- |
| `20260730120000` | `ai_platform_foundation.sql` | PR #121 | Applied |
| `20260730130000` | `hr_workforce_backend.sql` | PR #122 | Applied |
| `20260730160000` | `inventory_backend.sql` | PR #125 | Applied |
| `20260730170000` | `purchasing_backend.sql` | PR #126/#127 | Applied |
| `20260730180000` | `fix_purchasing_missing_tables.sql` | PR #128 | Applied |
| `20260730190000` | `complete_procurement_loop.sql` | PR #133 | Applied |
| `20260730193000` | `reports_read_permission.sql` | PR #131 | Applied (this pass) |
| `20260730210000` | `pos_z_report_events.sql` | PR #132 | Applied (this pass) |

---

## Status Definitions

### Planned

Work has been identified but has not been authorized for implementation.

### Approved

Architecture or requirements have been approved.

Implementation may begin.

### Implemented

Repository evidence demonstrates implementation.

Acceptance may still be pending.

### Verified

Acceptance verification has completed successfully.

Known limitations remain documented where applicable.

### Released

Verified implementation has completed the release process.

---

## Repository Truth

Repository status is based on:

- Source code
- Tests
- Acceptance reports
- Repository evidence
- Release records

Repository status must never be derived from:

- Planning documents
- Roadmaps
- Mockups
- Discussions
- Assumptions

---

## Review

This document should be updated whenever:

- a delivery reaches a new lifecycle stage;
- acceptance status changes;
- release status changes;
- repository governance changes.

---

## Related Documents

- [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- [GOVERNANCE.md](./GOVERNANCE.md)
- [ACCEPTANCE_GATES.md](./ACCEPTANCE_GATES.md)
- [RELEASE_POLICY.md](./RELEASE_POLICY.md)
- [DECISION_LOG.md](./DECISION_LOG.md)

---

## Summary

Repository Status provides an honest view of the current verified state of the repository.

Admin ERP core modules are LIVE on `main` through PR #133 with documented gaps. RC5 is certified, Production-website-verified, and released as annotated `v1.4.0` @ `96f1e80…`. Current repository main is `80cd2c4…` (DASH-02 KPI drill-downs #183). Production website runtime remains `152ce40…` / `dpl_7xaV34uy…`. Migration tip remains `20260801180000`. GRN stock posting and HR deactivate are **repository-implemented**; Finance is **PARTIAL_LIVE**. UI label honesty is **merged** (RC6-UI-01). Command Center: DASH-00…02 merged; DASH-03 daily command modes are repository work (not Production-verified). Do not invent Production verification, AI runtime, or GitHub Releases.
