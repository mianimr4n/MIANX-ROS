# RC5 Risk Register

**Status:** Proposed planning document  
**Date:** 2026-08-02  
**Baseline:** `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b`

> Risks are derived from repository evidence (RC4 certification, baseline, AGENTS runtime notes). Likelihood/impact are **engineering judgments** marked as such — not measured Production incidents.

Severity scale (judgment): **H** high · **M** medium · **L** low

---

## Active risks

| ID | Risk | Band | Likelihood | Impact | Evidence | Mitigation (proposed) | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Local privilege gap after `supabase start` / reset causes `42501` and false product bugs | High priority / TD | M | M | OPS-2, TD-1, `AGENTS.md` manual GRANT note; grant migrations also exist | RC5-OPS-01 verify + correct docs; additive migration only if proven | Eng |
| R-02 | Stale AGENTS/runtime docs disagree with migrations → wrong operator actions | High priority | H | M | `AGENTS.md` “never GRANT” vs `20260714120000_grant_public_access.sql` | RC5-OPS-01 / RC5-DOC-01 | Eng |
| R-03 | New migrations after `20260801180000` without Production cutover recreate schema drift (`42703`/`42P01`) | Release process | M | H | RC4 cutover history; Analytics `order_items.name` incident | Tip alignment evidence before certify; RC5-TEST-01 guards | Founder+Eng |
| R-04 | Analytics column naming regression | High priority | L | H | PR #163 hotfix; `analytics-order-items-schema` tests | Keep/expand contract tests (RC5-TEST-01) | Eng |
| R-05 | Secret refresh without coordinated API redeploy breaks auth/DB probes | Security/ops | L | H | RC4 security closeout sequence | Follow closeout runbook; no ad-hoc key edits | Founder+Ops |
| R-06 | Free-plan Supabase — no PITR; restore limited to logical dumps | Deferred / OPS | H | M | OPS-1 | Document restore drills; commercial PITR only with Founder approval | Founder |
| R-07 | Render/Supabase log export unavailable in many sessions | Optional / OPS-3 | H | M | OPS-3; LOG_MONITORING; RC5-OBS-01 runbook | Runbook documented (`PRODUCTION_LOGS_AND_ALERTING.md`); operator credentialed correlation proof still required to close; keep smoke JSON as fallback | Ops |
| R-08 | Public marketing a11y debt (contrast / icon names) | High priority | H | M | RC4-7 ACCESSIBILITY / KNOWN_LIMITATIONS | RC5-A11Y-01 | Eng |
| R-09 | Entry JS ~1 MB residual | Optional / perf | H | L–M | RC4-7 BUNDLE_ANALYSIS | RC5-PERF-01 with measured artifacts | Eng |
| R-10 | Supplier A/B RLS matrix incompletely proven in Production credentials | TD / OPS-5 | M | M | OPS-5 | Credentialed matrix when Founder provides coverage; no inventing access | Eng+Founder |
| R-11 | Documents upload lacks virus scan / magic-byte sniff | Deferred | H | M | rc4-documents KNOWN_LIMITATIONS | Product/security ADR before build | Founder |
| R-12 | Living status docs lag (`RELEASE_HISTORY` verified 2026-07-28) | TD-5 | H | L | `docs/17-releases/RELEASE_HISTORY.md` | RC5-DOC-01 | Eng |
| R-13 | Merged feature branches / stashes clutter operator workspace | TD-6 | H | L | RC4_RELEASE_NOTES hygiene | Owner-reviewed cleanup; do not delete audit evidence | Eng |
| R-14 | CI Playwright gap — Owner regressions caught late | Optional | M | M | BM browser gate non-blocking; slice Playwright often local-only | RC5-QA-01 after local seed stability | Eng |
| R-15 | Package.json versions diverge from `v*` tags | TD-3 | H | L | website `1.0.0`, api `0.1.0` vs `v1.3.0` | Optional hygiene PR; do not pretend apps are unreleased | Eng |

---

## Closed / accepted (context)

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| C-01 | RC4 security rotation | Closed | `SECURITY_CLOSEOUT_COMPLETE` |
| C-02 | Health-probe anon headers | Closed | PR #162 |
| C-03 | Analytics `order_items.name` Production failure | Closed | PR #163 |
| C-04 | Password recovery landing | Closed | PR #165 @ `e5c6daf` |
| C-05 | RC4 repository certification + tag | Closed | PR #164, #166, tag `v1.3.0` |

---

## Migration-specific risks

| ID | Scenario | Why it matters | Control |
| --- | --- | --- | --- |
| M-01 | Privilege-only migration applied to Production without smoke | AuthZ regressions / over-grant | Founder auth; Owner smoke; prefer local proof first (RC5-OPS-01) |
| M-02 | Feature migration before tip alignment evidence | Recurrence of cutover blockers | Keep migration tip checklist from RC4 cutover pack |
| M-03 | Assuming grants migrations obsolete OPS-2 without fresh-start proof | Wasted or harmful privilege churn | Empirical local verify before SQL |

---

## Security debt summary

| Item | Status |
| --- | --- |
| Credential/material in Git | Must remain absent (RC4 closeout PASS) |
| Rotation runbook drills | Proposed ongoing (baseline P-SEC) — not a release blocker |
| Documents malware scanning | Deferred — not claimed LIVE |
| Supplier RLS proof gaps | Non-blocking OPS-5 |

---

## Explicit non-claims

- No Production incident rate is claimed; severities are planning judgments.
- No open GitHub issues existed at planning time to cross-link.
