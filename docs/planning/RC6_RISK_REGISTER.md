# RC6 Risk Register

**Status:** Living risk register — Phase 1 **released** (`v1.5.0`); cutover risks closed or residual (see `rc6-phase1-closeout/RESIDUAL_LIMITATIONS.md`)
**Date:** 2026-08-02
**Baseline:** `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824`

> Likelihood/impact are engineering judgments from repository evidence — not measured Production incident rates.

Severity: **H** high · **M** medium · **L** low

---

## Active risks

| ID | Risk | Affected slice(s) | L | I | Mitigation | Owner / decision | Residual | Release blocker? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R6-01 | Living docs understate GRN/HR/`v1.4.0` → operator mistrust or double-adjust stock | RC6-DOC-01 | H | M | Honesty sync first | Eng + Founder authorize | Until DOC-01 merges | **No** (honesty debt) |
| R6-02 | Admin LIVE badges on unwired finance panels | RC6-UI-01, RC6-FIN-01 | H | M | Downgrade or wire | Eng | Until UI honesty | No |
| R6-03 | New migrations after `20260801180000` without cutover | Any schema slice | M | H | Tip checklist; Founder auth | Founder+Eng | Ongoing | Yes **if** unaligned tip claimed LIVE |
| R6-04 | Enabling alerts without thresholds → noise | RC6-OPS-02 | M | M | Founder thresholds; prove ENABLED_AND_VERIFIED | Founder | Until enabled carefully | No |
| R6-05 | Expanding Playwright without mutation guard | RC6-QA-02 | M | M | Readonly path list; no Prod creds | Eng | Residual | No |
| R6-06 | Documents malware upload path | RC6-SEC-01 | H | M | Security ADR before deeper storage | Founder+Sec | Virus scan deferred | No unless Founder elevates |
| R6-07 | Treating provider stubs as delivered send | LOY/WA deferred | H | H | Keep deliveryClaimed false | Eng | Provider absent | No |
| R6-08 | Supplier portal RLS matrix incomplete | RC6-SEC-02 | M | M | Credentialed matrix | Eng+Founder | OPS-5 carry-forward | No |
| R6-09 | Free-plan no PITR | RC6-PITR-01 | H | M | Commercial PITR only with approval | Founder | Continuity gap | No |
| R6-10 | Guest phone order lookup PII enumeration | Future auth hardening | L–M | M | Rate limit exists; review | Eng | Mitigated not eliminated | No |
| R6-11 | Conflating tip `96f1e803` with Prod website `152ce40` | All release docs | M | M | Anchor tables in every closeout | Eng | Until DOC-01 | No |
| R6-12 | Inventory adjust race residual | RC6-INV-01 | M | M | Prove RPC coverage; honest residual | Eng | Called out in status | No |
| R6-13 | Branch protection not requiring Owner Playwright | RC6-OPS-03 | L | M | Founder GitHub admin change | Founder | QA-01 limitation | No |
| R6-14 | package.json SemVer ≠ `v*` tags | RC6-REL-01 | H | L | Policy hygiene | Eng | TD-3 | No |
| R6-15 | Playwright failure artifacts may contain session material | QA | M | M | Sanitize artifact policy; no commit | Eng | Documented in QA-01 | No |
| R6-16 | Implementing Command Center without contracts → false LIVE / omitted capabilities | RC6-DASH-00+ | H | H | Contracts first; traceability | Eng+Founder | Until DASH-00 merges | No (process) |
| R6-17 | Treating delivery assign/status as full rider/POD/COD system | DEL/RIDER/CASH | H | H | Domain contract honesty | Eng | Until DEL slices | No |
| R6-18 | Treating Settings Foundation panels as versioned config | SET-* | H | M | Settings contract + SET-08 | Eng | Until versioning | No |
| R6-19 | Unified What Changed without event model → fabricated timeline | DASH-08 | M | M | Event contract first | Eng | Until DASH-08 | No |

---

## Carry-forward from RC5 (still open)

| Prior ID | Topic | RC6 handling |
| --- | --- | --- |
| R-01 | Local privilege gap residual | Optional RC6-QA-03 |
| R-06 | No PITR | RC6-PITR-01 Founder |
| R-07 | Log export / alerting | RC6-OPS-02 / OBS-02 |
| R-08 | Moderate a11y | **Closed in RC6-A11Y-02** (residuals: cart-drawer targets; full admin WCAG not claimed) |
| R-10 | Supplier RLS matrix | RC6-SEC-02 |
| R-11 | Documents virus scan | RC6-SEC-01 |
| R-14 | Branch protection | RC6-OPS-03 |
| R-15 | package.json vs tags | RC6-REL-01 |

---

## Closed / superseded at RC6 start

| Item | Note |
| --- | --- |
| RC5 roadmap incomplete | All RC5 slices + closeout + `v1.4.0` complete |
| “`v1.4.0` not created” residual | Tag exists — docs must catch up (R6-01) |
| “GRN never posts stock” as absolute | Superseded by atomic RPC evidence — docs must catch up |

---

## Migration-specific risks

| ID | Scenario | Control |
| --- | --- | --- |
| M6-01 | Privilege-only migration to Production without smoke | Founder auth; Owner smoke |
| M6-02 | Feature migration before tip alignment evidence | Keep tip checklist |
| M6-03 | Destructive year-end / irreversible finance transforms | Separate ADR; not early RC6 |

---

## Explicit non-claims

- No open Production incident is claimed.
- Residuals are not RC6 release blockers unless Founder redesignates them.
