# RC5 Roadmap

**Status:** Planning document — **repository slices complete** (2026-08-02 closeout)
**Date:** 2026-08-02
**Released baseline:** `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`
**Current repository main:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`
**Production website SHA:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24` (`dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r`)
**Production migration tip:** `20260801180000`
**Authority inputs:** `RC5_BASELINE.md`, `RC4_RELEASE_NOTES.md`, RC4 certification evidence, `AGENTS.md`, `rc5-final-closeout/`

> Historical slice definitions below remain as planning record. **Completion status** is tracked in `RC5_BASELINE.md` and `docs/testing/acceptance-evidence/rc5-final-closeout/`. This roadmap does not authorize new Production mutation by itself.

---

## Completion status (2026-08-02)

| Band | Status |
| --- | --- |
| Release blockers | **None evidenced** |
| High priority (OPS, A11Y, DOC, TEST) | **Merged** |
| Optional (PERF, OBS, QA) | **Merged** |
| Production website smoke | **Complete** |
| Deferred product ideas | Still deferred / Founder-gated |

---

## Priority bands

| Band | Meaning | Current contents |
| --- | --- | --- |
| Release blockers | Must close before claiming any RC5 release | **None evidenced** — RC4 released as `v1.3.0`; RC5 closeout complete |
| High priority | Strong ops/product value; recommend early | RC5-OPS-01, RC5-A11Y-01, RC5-DOC-01, RC5-TEST-01 — **complete** |
| Optional enhancements | Valuable when capacity allows | RC5-PERF-01, RC5-OBS-01, RC5-QA-01 — **complete** |
| Technical debt | Hygiene / correctness without new product surface | RC5-TD-* (see register) |
| Deferred ideas | Needs ADR + provider/commercial decision | Finance/payroll depth, loyalty provider send, PITR upgrade, Analytics worker |

Open GitHub issues at planning time: **none** (`gh issue list --state open` empty).  
TODO/FIXME comment debt in `apps/` + `backend/`: **none evidenced**.

---

## Recommended first implementation slice

**RC5-OPS-01 — Local schema privilege contract & AGENTS truth**

| Criterion | Fit |
| --- | --- |
| Lowest dependency risk | Yes — docs + static DB contract tests; optional additive migration only if empirical gap remains |
| Meaningful user value | Yes for engineers/operators (removes false `42501` defects and stale runbooks) |
| No unnecessary Production migration | Yes — first deliverable is verification + documentation; Production SQL only if Founder later authorizes a proven gap fix |
| Strong testability | Yes — `tests/database/*` assertions on grant migrations + optional local lifecycle check |
| Limited blast radius | Yes — no website/API behavior change unless a follow-on privilege migration is approved |

Rationale: `AGENTS.md` still claims migrations “never `GRANT`”, but repository migrations already include `20260714120000_grant_public_access.sql` and `20260718130000_p0_harden_grants_and_definer_execute.sql`. RC4 OPS-2 / TD-1 remain open as empirical local-start debt. Closing the **truth gap** first avoids inventing a Production migration before proving need.

---

## Proposed slices

### RC5-OPS-01 — Local schema privilege contract & AGENTS truth

| Field | Content |
| --- | --- |
| Identifier | `RC5-OPS-01` |
| Objective | Make local privilege behavior honest and testable; retire stale “never GRANT” guidance if false |
| User value | Faster local bring-up; fewer false Production defect reports |
| Exact scope | Audit grant/harden migrations vs fresh `supabase start`; update `AGENTS.md` runtime notes; add static DB tests that grant migrations exist and encode expected privilege intent; document residual gap if any |
| Out of scope | Production SQL; secret rotation; feature UI; blanket anon write grants |
| Affected packages/modules | `supabase/migrations` (read; write only if gap proven), `AGENTS.md`, `tests/database/*`, optionally `scripts/local-*` |
| Database impact | None unless follow-on additive privilege migration is authorized |
| Migration requirement | **Not required for first PR**; **possible** additive privilege-only migration later |
| Security impact | Positive if privilege surface is clarified; must not widen anon write beyond harden design |
| Performance impact | None |
| Dependencies | None |
| Acceptance criteria | See `RC5_ACCEPTANCE_CRITERIA.md` § RC5-OPS-01 |
| Required tests | `pnpm test:db` new assertions; `pnpm check`; optional local lifecycle smoke |
| Rollback strategy | Revert docs/tests PR; no Production change if none applied |
| Estimated complexity | **S** (docs+tests) / **M** if privilege migration needed |
| Recommended order | **1 (first)** |

### RC5-A11Y-01 — Public marketing home accessibility

| Field | Content |
| --- | --- |
| Identifier | `RC5-A11Y-01` |
| Objective | Clear evidenced public-home a11y debt (color-contrast / icon-link naming) |
| User value | More usable public website for customers and assistive tech |
| Exact scope | Website marketing home contrast + icon-link accessible names; axe coverage for public home |
| Out of scope | Full marketing redesign; admin routes (already axe-clean in RC4-7 evidence); Firefox/WebKit matrix |
| Affected packages/modules | `apps/website` |
| Database impact | None |
| Migration requirement | None |
| Security impact | None |
| Performance impact | Negligible CSS/markup only |
| Dependencies | None (can run parallel to OPS-01 after first lands if preferred) |
| Acceptance criteria | See acceptance doc |
| Required tests | axe on public home; existing website static suites; `pnpm check` |
| Rollback strategy | Revert website PR |
| Estimated complexity | **S–M** |
| Recommended order | **2** |

### RC5-DOC-01 — Release & status documentation sync

| Field | Content |
| --- | --- |
| Identifier | `RC5-DOC-01` |
| Objective | Align living docs with `v1.3.0` / `74b6b8e` facts |
| User value | Owner/operator trust in repository status |
| Exact scope | Refresh `docs/17-releases/RELEASE_HISTORY.md`, reconcile `docs/00-governance/REPOSITORY_STATUS.md` / `RC5_BASELINE.md` anchors to released tip; note `v1.3.0` created |
| Out of scope | GitHub Release UI; changelog automation; feature claims |
| Affected packages/modules | `docs/**` only |
| Database impact | None |
| Migration requirement | None |
| Security impact | None (must keep secrets out of docs) |
| Performance impact | None |
| Dependencies | None |
| Acceptance criteria | See acceptance doc |
| Required tests | `git diff --check`; doc honesty review |
| Rollback strategy | Revert docs PR |
| Estimated complexity | **S** |
| Recommended order | **3** (or parallel with A11Y) |

### RC5-TEST-01 — Analytics schema regression guards

| Field | Content |
| --- | --- |
| Identifier | `RC5-TEST-01` |
| Objective | Harden guards so `order_items.name` / similar drift cannot regress silently |
| User value | Protects Owner Analytics BI reliability proven in RC4 hotfix #163 |
| Exact scope | Extend/confirm backend + static tests for `product_name` + `menu_item_id` contracts; optional smoke fixture assertions |
| Out of scope | New Analytics modules; warehouse/worker |
| Affected packages/modules | `backend/api`, `tests/**` |
| Database impact | None |
| Migration requirement | None |
| Security impact | None |
| Performance impact | None |
| Dependencies | None |
| Acceptance criteria | See acceptance doc |
| Required tests | `pnpm test` / analytics schema tests green |
| Rollback strategy | Revert test PR |
| Estimated complexity | **S** |
| Recommended order | **4** |

### RC5-PERF-01 — Entry bundle residual reduction *(optional)*

| Field | Content |
| --- | --- |
| Identifier | `RC5-PERF-01` |
| Objective | Further reduce ~1.0 MB entry JS residual from RC4-7 |
| User value | Faster first load on customer/admin entry |
| Exact scope | Additional `manualChunks` / lazy boundaries with measured before/after |
| Out of scope | Production load-test certification; Lighthouse “pass” claims without evidence |
| Affected packages/modules | `apps/website` |
| Database impact | None |
| Migration requirement | None |
| Security impact | None |
| Performance impact | Intended improvement; risk of chunk waterfalls if poorly split |
| Dependencies | Prefer after A11Y if overlapping home/marketing files |
| Acceptance criteria | See acceptance doc |
| Required tests | Build size artifact; `pnpm build:website`; smoke critical routes |
| Rollback strategy | Revert chunking PR |
| Estimated complexity | **M** |
| Recommended order | **5 (optional)** |

### RC5-OBS-01 — Operator log export / alerting path *(optional)*

| Field | Content |
| --- | --- |
| Identifier | `RC5-OBS-01` |
| Objective | Address OPS-3: reduce reliance on ad-hoc smoke JSON for ops visibility |
| User value | Faster incident diagnosis for Owner/operators |
| Exact scope | Document + implement a credentialed runbook for Render/Supabase log access; optional alert hooks **without** committing secrets |
| Out of scope | Full APM platform; inventing Production incidents |
| Affected packages/modules | `docs/10-devops/**`, possibly `backend/api` observability helpers |
| Database impact | None |
| Migration requirement | None |
| Security impact | Must keep API keys out of Git; prefer operator-local env |
| Performance impact | None if docs/runbook-only |
| Dependencies | Operator credentials available outside Git |
| Acceptance criteria | See acceptance doc |
| Required tests | Doc review; no secret scan hits |
| Rollback strategy | Revert docs/code PR |
| Estimated complexity | **M** |
| Recommended order | **6 (optional)** |

### RC5-QA-01 — CI Playwright for Owner critical paths *(optional)*

| Field | Content |
| --- | --- |
| Identifier | `RC5-QA-01` |
| Objective | Move a minimal Owner smoke subset into CI (beyond non-blocking BM browser gate) |
| User value | Earlier detection of Owner regressions |
| Exact scope | One Chromium Playwright project on ephemeral/local stack or recorded contract; keep flaky Production E2E out of required CI |
| Out of scope | Full cross-browser matrix; Production credential use in CI |
| Affected packages/modules | `e2e/**`, `.github/workflows/ci.yml`, Playwright configs |
| Database impact | Local only |
| Migration requirement | None for Production |
| Security impact | No Production secrets in CI |
| Performance impact | Longer CI |
| Dependencies | Stable local seed story (related to OPS-01) |
| Acceptance criteria | See acceptance doc |
| Required tests | New CI job green on PR |
| Rollback strategy | Disable job / revert workflow |
| Estimated complexity | **M–L** |
| Recommended order | **7 (optional)** |

### Deferred product ideas *(not scheduled)*

| Idea | Why deferred | Evidence |
| --- | --- | --- |
| Finance / payroll operational hardening | Needs ADR + Founder priority beyond Phase 2 foundation | `RC5_BASELINE` P-FIN; RC4 finance/payroll KNOWN_LIMITATIONS |
| Loyalty/marketing provider send | Needs provider contract + ADR | `RC5_BASELINE` P-LOY; loyalty depth limitations |
| Analytics scheduled report worker | Explicitly deferred in Analytics pack | `rc4-analytics-bi/KNOWN_LIMITATIONS.md` |
| Documents virus scan / magic-byte sniff | Not implemented; security product decision | `rc4-documents/KNOWN_LIMITATIONS.md` |
| Supabase PITR / paid backup tier | Commercial plan change (OPS-1) | RC4 OPS-1 |
| Northern Bypass go-live | Requires separate Founder authorization | Release history / branch status |
| GitHub Release automation | Nice-to-have; tags already manual annotated | TD-4; only `ci.yml` |

---

## Suggested sequencing (proposed)

```text
RC5-OPS-01  →  RC5-A11Y-01  →  RC5-DOC-01  →  RC5-TEST-01
                                            ↘ optional: PERF / OBS / QA
```

Product depth streams (finance, loyalty send, Analytics worker) remain **Founder-gated** and are not ordered until authorized.

---

## Explicit non-claims

- This roadmap does **not** authorize Production mutation, migrations, SQL, secret rotation, or deploys.
- Package.json versions (`website` 1.0.0 / `api` 0.1.0) remaining divergent from `v1.3.0` is documented debt (TD-3), not a silent version bump in this plan.
- Assumptions: OPS-2 may still be empirically true even though grant SQL exists — **must verify** in RC5-OPS-01 before writing a Production privilege migration.
