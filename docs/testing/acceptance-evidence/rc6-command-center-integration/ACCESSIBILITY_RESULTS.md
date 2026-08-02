# RC6-QA-03 — Accessibility results

## Defect fixed in certification branch

Several OCC panels rendered **duplicate accessible `h2` headings**: visible `AdminSectionTitle` plus a separate `sr-only` `<h2>`.

**Fix:** optional `headingId` on `AdminSectionTitle` (single visible `h2` with `id`); removed duplicate `sr-only` h2 from:

- `WhatChangedPanel`
- `EodPackPanel`
- `ProfitabilityTruthPanel`
- `BranchHealthPanel`
- `ApprovalInboxPanel`

Static assertion: `tests/website/rc6-qa-03-command-center-integration.test.mjs` #7.

## Playwright axe target

| Check | Scope | Result |
| --- | --- | --- |
| Test B | `/admin/dashboard?commandMode=` × PRE_OPEN / LIVE / CLOSING | **PASS** — 0 critical / 0 serious (`wcag2a`, `wcag2aa`) across three consecutive suite runs |
| Public A11Y-02 | home/menu desktop+mobile + admin login | **PASS** (`pnpm test:e2e:a11y02`, 5/5) |

## What this is not

- Not a full WCAG 2.x certification.
- Does not claim zero total axe findings (moderate/minor may exist).
- Does not cover public marketing surfaces in this pack.
- Not Production-verified (website tip still `152ce40…`).

## Related

Prior admin a11y evidence: `docs/testing/acceptance-evidence/rc5-a11y-01/` (separate scope).
