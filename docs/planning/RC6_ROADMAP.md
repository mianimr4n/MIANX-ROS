# RC6 Roadmap

**Status:** Planning document — discovery complete; implementation not started
**Date:** 2026-08-02
**Baseline:** `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824`
**Production website runtime:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`
**Migration tip:** `20260801180000`

> This roadmap does **not** authorize Production mutation, migrations, deploys, tags, or GitHub Releases.

---

## Prioritization model

Each candidate scored **1–5**. Preference direction:

| Factor | Preference | Notes |
| --- | --- | --- |
| User value | Higher better | Operator/customer outcome |
| Operational value | Higher better | Reliability, honesty, ops |
| Evidence strength | Higher better | Clear repo gap |
| Dependency readiness | Higher better | Unblocked today |
| Automated testability | Higher better | Static/unit/browser |
| Migration safety | Higher better | Prefer NONE |
| Security risk | Lower better | High = more danger |
| Production blast radius | Lower better | Prefer docs/CI over runtime |
| Provider dependency | Lower better | Prefer none |
| Implementation size | Lower better | Prefer S for early waves |

**Order rule:**

1. Release/security blockers (honesty that misleads LIVE)
2. Misleading or broken LIVE workflows
3. High-value existing-schema depth
4. Provider-independent features
5. Small, strongly testable slices
6. Operational debt
7. Provider/Founder-gated work
8. Speculative features

---

## Candidate scores (discovery)

| ID | UV | OV | Ev | Dep | Test | Mig | Sec↓ | Blast↓ | Prov↓ | Size↓ | Rank notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RC6-DOC-01 | 4 | 5 | 5 | 5 | 5 | 5 | 1 | 1 | 1 | 1 | **First** — truth hygiene |
| RC6-UI-01 | 4 | 4 | 5 | 5 | 4 | 5 | 2 | 2 | 1 | 2 | Label/badge honesty in Admin UI |
| RC6-QA-02 | 3 | 4 | 5 | 5 | 5 | 5 | 2 | 2 | 1 | 3 | Expand Owner CI readonly paths |
| RC6-OPS-03 | 2 | 5 | 5 | 4 | 3 | 5 | 1 | 2 | 1 | 1 | Branch protection Founder |
| RC6-OPS-02 | 3 | 5 | 5 | 3 | 2 | 5 | 2 | 3 | 2 | 2 | Alerts enablement Founder |
| RC6-SEC-01 | 3 | 4 | 5 | 3 | 4 | 4 | 4 | 3 | 1 | 3 | Documents malware ADR |
| RC6-A11Y-02 | 3 | 2 | 4 | 5 | 4 | 5 | 1 | 2 | 1 | 2 | Moderate public a11y debt |
| RC6-SEC-02 | 2 | 4 | 4 | 3 | 3 | 5 | 3 | 2 | 1 | 3 | Supplier RLS matrix |
| RC6-INV-01 | 3 | 3 | 4 | 4 | 4 | 5 | 2 | 3 | 1 | 3 | Inventory adjust residual proof |
| RC6-CHK-01 | 4 | 2 | 4 | 4 | 4 | 5 | 2 | 3 | 1 | 3 | Customer checkout promo redeem |
| RC6-FIN-01 | 4 | 3 | 5 | 4 | 4 | 5 | 2 | 3 | 1 | 3 | Wire or downgrade BS/CF/AR/Tax UI |
| RC6-QA-03 | 2 | 3 | 4 | 5 | 5 | 5 | 1 | 1 | 1 | 2 | Live-DB privilege static→job residual |
| RC6-REL-01 | 1 | 3 | 5 | 5 | 3 | 5 | 1 | 1 | 1 | 1 | package.json SemVer hygiene |
| Defer providers | — | — | — | — | — | — | — | — | 5 | L | WhatsApp/loyalty send/APM/PITR/AI |

---

## Bands

### Release blockers

**None evidenced** for RC6 start.
Closest: **misleading LIVE/governance claims** (treated as high-priority honesty, not a Production outage).

### Committed / high priority

| ID | Title | Why |
| --- | --- | --- |
| **RC6-DOC-01** | Living status honesty sync (GRN/HR/`v1.4.0`/tip anchors) | Fixes stale governance vs repository evidence |
| **RC6-UI-01** | Admin status-label honesty (HR/Finance/Loyalty/grids) | Removes contradictory LIVE/Phase 2 badges |
| **RC6-QA-02** | Expand Owner Playwright CI (readonly; include `/admin/reports`) | Closes QA residual without Prod credentials |
| **RC6-FIN-01** | Finance BS/CF/AR/Tax UI honesty or wire-up (bounded) | Fixes overly optimistic LIVE badges |

### Normal priority

| ID | Title |
| --- | --- |
| RC6-A11Y-02 | Moderate public a11y advisories (accessible-name, touch targets, headings, menu contrast) |
| RC6-INV-01 | Inventory adjustment residual honesty/proof |
| RC6-CHK-01 | Customer checkout coupon redeem (existing marketing schema) |
| RC6-SEC-02 | Supplier portal RLS credentialed matrix |
| RC6-QA-03 | Live-DB privilege CI residual (if Founder wants) |

### Optional

| ID | Title |
| --- | --- |
| RC6-REL-01 | Align package.json SemVer narrative with `v*` tags (policy first) |
| RC6-OBS-02 | Bulk log export proof / APM adapter (provider) |

### Founder-gated / provider-dependent

| ID | Title | Gate |
| --- | --- | --- |
| RC6-OPS-02 | Enable Production alerts | Thresholds + destinations |
| RC6-OPS-03 | Require Owner Playwright in branch protection | GitHub admin |
| RC6-SEC-01 | Documents virus/magic-byte controls | Security ADR |
| RC6-PITR-01 | Supabase PITR | Commercial plan |
| RC6-WA-01 | WhatsApp conversation/provider webhooks | Provider ADR |
| RC6-LOY-01 | Loyalty/marketing provider send | Provider + Founder |
| RC6-AN-01 | Analytics scheduled worker | Product ADR |
| RC6-AI-01 | AI Command Center runtime | Product ADR |
| RC6-NB-01 | Northern Bypass go-live | Founder authorization |

### Explicitly deferred (unsuitable as early RC6)

- Speculative microservices / mobile apps
- Broad “finish finance” / “finish settings” megaslices
- Lighthouse/RUM certification as release gate
- GitHub Release UI automation (unless Founder changes tag-only convention)

---

## Recommended implementation order

```text
1. RC6-DOC-01          (first — docs only)
2. RC6-UI-01           (label honesty; may parallel after DOC-01)
3. RC6-FIN-01          (wire or downgrade finance badges — existing schema)
4. RC6-QA-02           (CI Owner path expansion)
5. RC6-A11Y-02         (moderate a11y)
6. RC6-CHK-01          (checkout promo — if marketing redeem is prioritized)
7. RC6-INV-01 / SEC-02 (hardening)
8. Founder-gated ops   (OPS-02/03, SEC-01, PITR, providers)
```

Parallelizable after DOC-01: UI-01 ∥ QA-02 ∥ A11Y-02 (low coupling).

---

## Slice briefs (high priority)

### RC6-DOC-01 — Living status honesty sync

| Field | Content |
| --- | --- |
| Verified problem | Living docs claim GRN does not post stock, HR lacks deactivate, `v1.4.0` not created, tip still `152ce40` |
| User value | Operators/engineers trust repository truth |
| Evidence | `REPOSITORY_STATUS.md` vs `grn-stock-posting-atomic.test.ts`, `hr.ts` deactivate, tag `v1.4.0` |
| Scope | Update living status/release/residual docs + optional static phrase guards |
| Out of scope | Runtime UI, migrations, Production, tag moves |
| DB impact | **NONE** |
| Migration | None |
| Security | None (no secrets) |
| Complexity | **S** |
| Priority | High (first) |
| Founder decision | Authorize honesty-only opener |

### RC6-UI-01 — Admin status-label honesty

| Field | Content |
| --- | --- |
| Verified problem | HR/Finance/Loyalty/Operations grids contradict APIs |
| Evidence | `HRStatusBanner.tsx`, `FinanceStatusBanner.tsx`, `LedgerPanel.tsx`, `admin-settings.ts` loyalty copy |
| Scope | Correct labels/banners only; no new product features |
| Out of scope | Wiring BS/CF data (that is FIN-01), providers |
| DB impact | **NONE** |
| Complexity | **S–M** |
| Priority | High |

### RC6-QA-02 — Owner Playwright CI expansion

| Field | Content |
| --- | --- |
| Verified problem | CI Owner smoke covers login/dashboard only; `/admin/reports` deferred |
| Evidence | `rc5-qa-01/`, `.github/workflows/ci.yml` |
| Scope | Readonly navigation assertions for approved Owner paths; keep mutation-free |
| Out of scope | Branch protection change; Prod credentials |
| DB impact | **NONE** |
| Complexity | **M** |
| Priority | High |

### RC6-FIN-01 — Finance panel honesty or bounded wire-up

| Field | Content |
| --- | --- |
| Verified problem | BS/CF/AR/Tax show LIVE without wired UI clients |
| Evidence | `LedgerPanel.tsx`, `ReceivablePanel.tsx`, `TaxPanel.tsx`, finance admin APIs |
| Scope | Either downgrade badges to FOUNDATION **or** wire read-only lists for one bounded panel set |
| Out of scope | Bank transfers, year-end close, VAT filing export |
| DB impact | **EXISTING_SCHEMA_ONLY** |
| Complexity | **M** |
| Priority | High |

---

## Selected first slice

**RC6-DOC-01 — Living status honesty sync**

See full implementation brief in § First-slice implementation brief below.

---

## First-slice implementation brief (RC6-DOC-01)

| Field | Content |
| --- | --- |
| ID / title | `RC6-DOC-01` — Living status honesty sync |
| Reason selected | Evidence-backed; high operational value; no migration; no provider; no secrets; tiny blast radius; strongly testable; fixes misleading LIVE/governance claims |
| Problem | Post-`v1.4.0` living docs retain superseded RC4/RC5 residual language |
| Current state | Code: GRN stock RPC + HR deactivate exist; Tag `v1.4.0` exists; Docs: still claim otherwise in places |
| Likely files | `docs/00-governance/REPOSITORY_STATUS.md`, `PROJECT_STATUS.md` (if stale), `docs/17-releases/RELEASE_HISTORY.md`, `docs/testing/acceptance-evidence/rc5-final-closeout/RESIDUAL_LIMITATIONS.md` (historical note vs current), optional `tests/website/*` static phrase guards |
| Scope | Reconcile anchors (tip vs Prod SHA), GRN/HR/payroll residual claims, tag existence; preserve PASS WITH LIMITATIONS where still true |
| Out of scope | Admin UI banner rewrites (RC6-UI-01); migrations; deploys; tags; Releases; Production SQL |
| Database impact | **NONE** |
| Security/privacy | No PII/secrets in diffs |
| Acceptance | Contradiction table closed; forbidden stale phrases fail static tests if added; universal gates PASS |
| Automated tests | Static doc/contract tests; `pnpm check`/`test`/`test:db`/`rc1:gate` |
| Manual tests | Diff review of living docs; verify no runtime file touched |
| Local verification | Same gates |
| Preview verification | N/A (docs-only) |
| Production verification | None required for docs PR |
| Rollback | Revert PR |
| Evidence files | `docs/testing/acceptance-evidence/rc6-doc-01/` (to create during implementation) |
| Unresolved questions | Whether residual pack should be amended in place or annotated “superseded by RC6-DOC-01” |
| Branch name | `docs/rc6-doc-01-living-status-honesty` |
| PR title | `RC6-DOC-01: sync living status docs with v1.4.0 and repository truth` |

---

## Release strategy (recommendation)

| Topic | Recommendation |
| --- | --- |
| Version bump class | Likely **minor** (`v1.5.0`) after multiple certified slices; patch only for tiny honesty/hotfix if Founder prefers |
| Incremental deploy | Yes for website/runtime slices; docs-only need no Production cutover |
| Migrations | Separate Founder-authorized cutovers; none expected for Wave 0–1 preferred slices |
| Certification | Per-slice acceptance packs + final closeout when Founder declares RC6 complete |
| Tag strategy | Annotated `v*` on closeout merge SHA (docs included), matching `v1.3.0`/`v1.4.0` |
| GitHub Releases | Remain **out of convention** unless Founder changes policy |
| Rollback | Vercel prior deployment for website; revert PR for docs; API separate |
| Production smoke | Required after each **runtime** Production cutover; docs-only merges do not require Prod smoke; final RC6 closeout repeats website smoke |

---

## Explicit non-actions of this planning PR

No implementation, workflow change, migration, Production operation, secret change, tag, or GitHub Release.
