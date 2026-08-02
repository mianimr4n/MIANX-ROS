# RC6 Acceptance Criteria

**Status:** Proposed planning document
**Date:** 2026-08-02
**Baseline:** `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824`

> Criteria apply to **proposed** slices in `RC6_ROADMAP.md`. Planning alone is not acceptance. Repository evidence wins.

---

## Universal gates (every RC6 implementation PR)

| # | Criterion |
| --- | --- |
| U-1 | `pnpm check` PASS |
| U-2 | `pnpm test` PASS |
| U-3 | `pnpm test:db` PASS |
| U-4 | `pnpm rc1:gate` PASS |
| U-5 | `git diff --check` PASS |
| U-6 | GitHub CI Typecheck and test SUCCESS on the PR |
| U-7 | No secrets, JWTs, passwords, dumps, or private env values in the diff |
| U-8 | Scope matches the slice exact scope; no silent architecture expansion |
| U-9 | Production claims only with evidence; no invented LIVE status |
| U-10 | Tip / Prod website SHA / API SHA / migration tip labeled separately |
| U-11 | If Production mutation involved: separate Founder authorization before execute |
| U-12 | Evidence pack under `docs/testing/acceptance-evidence/rc6-<slice>/` |

---

## Security criteria

| # | Criterion |
| --- | --- |
| S-1 | No widening of anon write grants beyond harden design |
| S-2 | PII (phone, payroll, documents) not logged or committed |
| S-3 | New webhook ingress requires signature validation design before LIVE claim |
| S-4 | Document upload changes address malware posture or explicitly retain deferred limitation |
| S-5 | Playwright artifacts must not be committed; failure uploads sanitized |

---

## Migration criteria

| # | Criterion |
| --- | --- |
| M-1 | Prefer NONE / EXISTING_SCHEMA_ONLY for early slices |
| M-2 | Additive migrations only when gap proven; timestamp after `20260801180000` |
| M-3 | No destructive DROP/TRUNCATE without separate ADR + Founder auth |
| M-4 | Production apply only via approved cutover; never ad hoc SQL |
| M-5 | Local grant/RLS intent covered by static tests when migrations touch privileges |

---

## Accessibility criteria

| # | Criterion |
| --- | --- |
| A-1 | Public surfaces touched by a slice: 0 critical / 0 serious axe (or listed residuals) |
| A-2 | Do not claim zero total findings |
| A-3 | Admin routes touched: spot-check or suite evidence |

---

## Performance criteria

| # | Criterion |
| --- | --- |
| P-1 | No unexplained entry-bundle regression beyond stated budget |
| P-2 | No Lighthouse/RUM/CWV certification claim without new evidence |
| P-3 | Keep HeroSlider deferred pattern unless intentionally changed with evidence |

---

## Production-verification criteria

| # | Criterion |
| --- | --- |
| V-1 | Docs-only PRs: no Production smoke required |
| V-2 | Website runtime Production cutovers: public smoke + relevant a11y/perf sanity + Owner smoke if auth/admin touched |
| V-3 | API-only cutovers: `/healthz`/`/readyz` + targeted API smoke; do not conflate with website deploy |
| V-4 | Migration cutovers: tip alignment evidence + rollback notes |
| V-5 | Final RC6 closeout: repeat website smoke on authorized SHA |

---

## Evidence requirements

| Artifact | Required |
| --- | --- |
| Contradiction / scope note | Yes |
| Gate command results | Yes (summarized; no secrets) |
| Acceptance matrix for slice criteria | Yes |
| Residual limitations update | If residuals change |
| Screenshots / raw logs / cookies | **Forbidden** |

---

## Slice-specific criteria

### RC6-DOC-01 — Living status honesty sync

| # | Criterion |
| --- | --- |
| D-01 | Living docs no longer claim GRN never posts stock as absolute gap |
| D-02 | Living docs no longer claim HR lacks deactivate when route exists |
| D-03 | Living docs record `v1.4.0` as released annotated tag @ `96f1e803` |
| D-04 | Tip vs Production website SHA vs migration tip distinguished |
| D-05 | Docs-only PR; no `apps/`, `backend/`, `supabase/migrations`, `.github/workflows` |
| D-06 | Optional static test fails if forbidden stale phrases reappear |

### RC6-UI-01 — Admin status-label honesty

| # | Criterion |
| --- | --- |
| L-01 | HR banner no longer marks payroll/shifts as Phase 2 if those UIs ship |
| L-02 | Finance BS/CF/AR/Tax badges match wire status (FOUNDATION or LIVE with data) |
| L-03 | Loyalty “ledger absent” copy removed or corrected |
| L-04 | Operations/BM grid labels reconciled with module truth |
| L-05 | No new product features; labels/honesty only unless paired FIN-01 |

### RC6-QA-02 — Owner Playwright CI expansion

| # | Criterion |
| --- | --- |
| Q-01 | Additional readonly Owner paths asserted in CI job |
| Q-02 | `/admin/reports` included **or** residual explicitly re-justified |
| Q-03 | Job fails on real Playwright failure (no `continue-on-error`) |
| Q-04 | Mutation workflows remain excluded |
| Q-05 | Branch protection change **out of scope** unless OPS-03 |

### RC6-QA-03 — Command Center integration certification

| # | Criterion |
| --- | --- |
| I-01 | DASH-01…08 load together in Owner Command Center with honest trust/degraded states |
| I-02 | Modes reorder emphasis only; source values/formulas unchanged |
| I-03 | Complete read-only Owner journey + 3-run repeatability on local ephemeral stack |
| I-04 | Axe spot-check 0 critical / 0 serious across Pre-open / Live / Closing (not full WCAG cert) |
| I-05 | No migration, Production deploy, provider, AI, or business mutation; **not** Production-verified |

### RC6-FIN-01 — Finance panel honesty or bounded wire-up

| # | Criterion |
| --- | --- |
| F-01 | Chosen strategy recorded: downgrade **or** wire |
| F-02 | If wire: read-only list for selected panels uses real APIs; empty/error honesty |
| F-03 | If downgrade: no LIVE badge without fetch |
| F-04 | Bank/year-end/VAT filing remain out of scope |
| F-05 | No migration |

### RC6-OPS-02 — Alert enablement

| # | Criterion |
| --- | --- |
| O-01 | Founder-approved signal list + destinations recorded |
| O-02 | Status moves only with proof (`ENABLED_AND_VERIFIED`) |
| O-03 | No secrets in Git |

### RC6-SEC-01 — Documents malware controls

| # | Criterion |
| --- | --- |
| X-01 | ADR decision recorded (block / scan / defer) |
| X-02 | Implementation matches ADR; limitations honest |
| X-03 | No claim of virus-free storage without control evidence |

### RC6-DASH-00 — Command Center contracts

| # | Criterion |
| --- | --- |
| C-01 | Architecture defines six zones + progressive levels + operating modes |
| C-02 | Widget, KPI trust, action, exception, event, delivery/rider, settings, role, NFR, and traceability contracts exist |
| C-03 | Every vision capability distinguishes current truth vs proposed |
| C-04 | Delivery/Rider and Settings are first-class domains with gap maps |
| C-05 | Roadmap/dependency updated; completed DOC/UI/QA/A11Y preserved |
| C-06 | Next runtime slice selected with bounded brief (DASH-01) |
| C-07 | Docs/planning/evidence only — no runtime/migration/Production |

### RC6-DASH-01 — Exception Center read-only foundation

| # | Criterion |
| --- | --- |
| E-01 | Needs Attention zone surfaces exceptions from existing trusted sources |
| E-02 | Severity, branch, age, freshness, trust/source labels present |
| E-03 | Empty / stale / error / denied states distinct; no fake zeros |
| E-04 | Drill-down to existing routes with preserved filters |
| E-05 | No AI; no new provider; prefer no migration; no ack mutation unless safe existing schema |
| E-06 | Acceptance evidence pack + gates PASS |

> DASH-01 repository implementation must still record **not Production-verified** until an authorized Production deploy + smoke.

### RC6-DASH-02 — Trusted Owner KPI drill-downs

| # | Criterion |
| --- | --- |
| D2-01 | Selected verified KPIs use a central drill-down registry at **DRILL_DOWN** maturity only |
| D2-02 | Destination routes exist; only repository-supported filters are propagated |
| D2-03 | Branch scope remains AdminBranchContext (not invented URL branchId authz) |
| D2-04 | Trust/freshness labels use approved terms; sales not labeled ACCOUNTING |
| D2-05 | Accessible names include KPI context; keyboard focus retained |
| D2-06 | Destinations initialize from query params; Clear filters where supported |
| D2-07 | No mutation, migration, provider, AI, or fake destination filters |
| D2-08 | Acceptance evidence pack + gates PASS; **not Production-verified** |

> Deferred KPIs (AOV depth, refunds, late GPS, cash variance card, PO/HR/complaints/health, Accounting Net Sales) remain out of scope until honest destinations exist.

### RC6-DASH-03 — Owner daily command modes

| # | Criterion |
| --- | --- |
| D3-01 | Three decision modes: Pre-open, Live Operations, Closing |
| D3-02 | Automatic suggestion is explainable, timezone-aware, and non-authoritative |
| D3-03 | Manual override via sanitized `commandMode` URL; Use suggested clears it |
| D3-04 | Exception Center remains visible in every mode; critical risk not suppressed |
| D3-05 | Unsupported readiness domains are explicit (no false ready-to-open/close) |
| D3-06 | No branch open/close, checklist, register, migration, provider, or AI |
| D3-07 | Acceptance evidence pack + gates PASS; **not Production-verified** |

### RC6-DASH-04 — Owner Approval Inbox foundation

| # | Criterion |
| --- | --- |
| A-01 | Central inbox surfaces selected verified approval/review sources only |
| A-02 | Priority ordering is deterministic and documented |
| A-03 | Filters and drill-downs are truthful; no invented destination filters |
| A-04 | No inline approve/reject; maturity remains DRILL_DOWN |
| A-05 | Source failure is never shown as all-clear zero |
| A-06 | Acceptance evidence pack + gates PASS; **not Production-verified** |

### RC6-DASH-05 — Explainable Branch Health Score

| # | Criterion |
| --- | --- |
| H-01 | Score is explainable with component breakdown, coverage, confidence, and limitations |
| H-02 | Only verified branch-scoped sources; missing/failed never become healthy 100 |
| H-03 | Weights/formulas documented; coverage-adjusted; INSUFFICIENT_DATA below minimum |
| H-04 | Command modes reorder emphasis only — same score for same data window |
| H-05 | Drill-downs reuse existing routes/filters; maturity remains INSIGHT_ONLY + DRILL_DOWN |
| H-06 | Peer ranking only when comparable; otherwise deferred with honest note |
| H-07 | Acceptance evidence pack + gates PASS; **not Production-verified** |

### RC6-DASH-06 — Profitability Truth

| # | Criterion |
| --- | --- |
| P-01 | Operational Estimate and Accounting Posted are separate labeled lanes |
| P-02 | Estimates are never described as posted; drafts never enter posted totals |
| P-03 | Only verified sources; missing costs do not become silent zeros or fake profit |
| P-04 | Reconciliation shown only when comparable; otherwise explicit incompatibility |
| P-05 | Finance permission-gated; drill-downs only; no journal/expense mutation |
| P-06 | Acceptance evidence pack + gates PASS; **not Production-verified** |

### RC6-DASH-07 — Automated EOD Pack foundation

| # | Criterion |
| --- | --- |
| E-01 | Read-only EOD Pack preview from verified sources with coverage and limitations |
| E-02 | Pack states exclude FINAL/CLOSED/POSTED/APPROVED; REVIEWABLE ≠ day closed |
| E-03 | Unresolved items aggregated with drill-downs; no in-pack resolution |
| E-04 | Exports limited to safe local print/CSV/JSON; no email/WhatsApp/providers |
| E-05 | No register close, Z-report, cash settlement, journal post, or finalize |
| E-06 | Acceptance evidence pack + gates PASS; **not Production-verified** |

### RC6-DASH-08 — What Changed and Operational Timeline foundation

| # | Criterion |
| --- | --- |
| C-01 | What Changed uses honest since-anchor (device review or business window — never fake last login) |
| C-02 | Timeline/events limited to verified derived/list sources; incomplete audit coverage disclosed |
| C-03 | Derived comparisons require matching branch + business window; failures ≠ “No changes” |
| C-04 | Browser-local storage holds only safe aggregates/timestamps; no PII/tokens |
| C-05 | Read-only: no acknowledge/assign/resolve/AI/providers/realtime; drill-downs only |
| C-06 | Acceptance evidence pack + gates PASS; **not Production-verified** |
