# RC6-QA-02 — Accessibility spot-check

## Retained (existing infrastructure)

| Check | Suite / command | Local result (2026-08-02) |
| --- | --- | --- |
| Public-home desktop + mobile | `playwright.rc5-a11y-01.config.ts` | PASS (2/2), exit 0 |
| `/admin/login` axe spot-check | `playwright.rc5-perf-01.config.ts` grep `admin/login` | PASS (matched login tests), exit 0 |

## New authenticated spot-check

| Check | Location | Scope |
| --- | --- | --- |
| Authenticated `/admin/dashboard` | Owner smoke test F | axe tags `wcag2a` + `wcag2aa`; fail on **critical** and **serious** only |

### Results (local, three Owner suite runs)

Authenticated dashboard axe: **0 critical / 0 serious** on each of the three consecutive Owner suite passes.

Moderate / minor advisories are not treated as CI failures and are not claimed as a full admin accessibility certification.

## Honesty boundary

A single authenticated route spot-check does **not** certify the full Admin ERP for WCAG. Broader admin a11y remains RC6-A11Y-02 / future slices.
