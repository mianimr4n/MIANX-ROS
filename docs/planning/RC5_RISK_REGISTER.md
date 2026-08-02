# RC5 Risk Register

**Status:** Living risk register (updated at RC5 final closeout)
**Date:** 2026-08-02
**Baseline:** `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`
**Repository main:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`

> Risks are derived from repository evidence (RC4 certification, baseline, AGENTS runtime notes, RC5 evidence). Likelihood/impact are **engineering judgments** marked as such — not measured Production incidents.

Severity scale (judgment): **H** high · **M** medium · **L** low

---

## Active / residual risks

| ID | Risk | Band | Likelihood | Impact | Evidence | Mitigation / residual | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Local privilege gap after `supabase start` / reset | TD residual | L–M | M | OPS-01 closed truth gap | Residual: no live-DB privilege CI job | Eng |
| R-03 | New migrations after `20260801180000` without cutover | Release process | M | H | RC4 cutover; RC5 migrations NONE | Tip alignment before certify | Founder+Eng |
| R-04 | Analytics column naming regression | Mitigated | L | H | RC5-TEST-01 | Keep contract tests | Eng |
| R-05 | Secret refresh without coordinated API redeploy | Security/ops | L | H | RC4 closeout | Follow runbook | Founder+Ops |
| R-06 | Free-plan Supabase — no PITR | Deferred / OPS | H | M | OPS-1 | Commercial PITR only with Founder approval | Founder |
| R-07 | Log export / alerting gaps | Residual OPS-3 | L–M | M | RC5-OBS-01 | Runbook COMPLETE; access PROVEN; bulk export NOT_CLAIMED; alerts PROPOSED_NOT_ENABLED | Ops |
| R-08 | Public marketing a11y debt | Residual moderate | M | L–M | A11Y-01 + cutover | Critical/serious closed; moderate advisories remain | Eng |
| R-09 | Entry JS residual | Mitigated | M | L | PERF-01 | Entry gzip ~255 kB live; not Lighthouse-certified | Eng |
| R-10 | Supplier A/B RLS matrix incompletely proven | TD / OPS-5 | M | M | OPS-5 | Credentialed matrix when Founder provides coverage | Eng+Founder |
| R-11 | Documents upload lacks virus scan | Deferred | H | M | rc4-documents | Product/security ADR | Founder |
| R-13 | Merged feature branches / stashes clutter | TD-6 | H | L | RC4_RELEASE_NOTES hygiene | Owner-reviewed cleanup | Eng |
| R-14 | CI Playwright gap for Owner paths | Mitigated w/ limitation | L | M | QA-01 | Job exists; branch protection unchanged; `/admin/reports` deferred | Eng |
| R-15 | Package.json versions diverge from `v*` tags | TD-3 | H | L | website `1.0.0`, api `0.1.0` | Optional hygiene; `v1.4.0` tag now exists — package.json still diverges | Eng |

---

## Closed / accepted (context)

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| C-01 | RC4 security rotation | Closed | `SECURITY_CLOSEOUT_COMPLETE` |
| C-02 | Health-probe anon headers | Closed | PR #162 |
| C-03 | Analytics `order_items.name` Production failure | Closed | PR #163 |
| C-04 | Password recovery landing | Closed | PR #165 @ `e5c6daf` |
| C-05 | RC4 repository certification + tag | Closed | PR #164, #166, tag `v1.3.0` |
| C-06 | RC5-OPS-01 AGENTS/privilege truth | Closed | PR #168 |
| C-07 | RC5-A11Y-01 critical/serious public home | Closed | PR #169 |
| C-08 | RC5-DOC-01 living doc sync (initial) | Closed | PR #170 |
| C-09 | RC5-TEST-01 analytics schema guards | Closed | PR #171 |
| C-10 | RC5-PERF-01 entry residual | Closed | PR #172 |
| C-11 | RC5-OBS-01 operator log path | Closed | PR #173 |
| C-12 | RC5-QA-01 CI Owner Playwright | Closed w/ documented limitation | PR #174 |
| C-13 | RC5 Production website cutover | Closed | `rc5-production-cutover/` |
| R-02 | Stale AGENTS/runtime docs | Closed by OPS-01/DOC-01/closeout | Evidence packs |
| R-12 | Living status docs lag | Closed by DOC-01 + final closeout | `REPOSITORY_STATUS`, `RELEASE_HISTORY` |

---

## Migration-specific risks

| ID | Scenario | Why it matters | Control |
| --- | --- | --- | --- |
| M-01 | Privilege-only migration applied to Production without smoke | AuthZ regressions / over-grant | Founder auth; Owner smoke; prefer local proof first |
| M-02 | Feature migration before tip alignment evidence | Recurrence of cutover blockers | Keep migration tip checklist from RC4 cutover pack |
| M-03 | Assuming grants migrations obsolete OPS-2 without fresh-start proof | Wasted or harmful privilege churn | Empirical local verify before SQL |

---

## Security debt summary

| Item | Status |
| --- | --- |
| Credential/material in Git | Must remain absent (RC4/RC5 closeout PASS) |
| Rotation runbook drills | Proposed ongoing — not a release blocker |
| Documents malware scanning | Deferred — not claimed LIVE |
| Supplier RLS proof gaps | Non-blocking OPS-5 |

---

## Explicit non-claims

- No Production incident rate is claimed; severities are planning judgments.
- Residual RC5 limitations are **not** RC5 release blockers unless separately designated.
- No open GitHub issues existed at original planning time to cross-link.
