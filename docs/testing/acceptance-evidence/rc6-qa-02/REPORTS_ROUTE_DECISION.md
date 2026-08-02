# RC6-QA-02 — `/admin/reports` decision

## Decision

**INCLUDE** `/admin/reports` in the authenticated Owner CI suite.

## Criteria check

| Criterion | Result |
| --- | --- |
| Route exists and is in QA-02 acceptance scope (Q-02) | Yes — include **or** re-justify residual |
| Works against local ephemeral stack | Yes — AdminShell title `Reports & Business Intelligence` |
| No Production / unavailable provider required for shell load | Yes — readonly shell assertion only |
| Selectors stable | Yes — heading role + Admin modules nav + `#admin-main` |
| Passes repeatedly without retry masking | Yes — part of three consecutive focused greens |
| CI runtime remains reasonable | Yes — full Owner suite ~28–35s locally |

## What is asserted

- Authenticated navigation succeeds
- No login redirect
- Stable heading `Reports & Business Intelligence`
- Non-empty `#admin-main`
- No fatal error / chunk-load copy
- No app/API/auth 5xx via network guard

## What is not asserted

- Chart series values, export downloads, BI worker jobs, or Production analytics data

## Residual closed

RC5-QA-01 deferred `/admin/reports` for flake/runtime risk. QA-02 re-evaluates and includes it under the same readonly shell contract as other ops paths.
