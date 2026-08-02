# RC6-QA-03 — Defects and fixes

## DEF-QA03-01 — Duplicate accessible section headings

| Field | Detail |
| --- | --- |
| Severity | Serious a11y (duplicate `h2` / name collision risk for AT) |
| Symptoms | Panels used `AdminSectionTitle` (renders `<h2>`) **and** a sibling `<h2 className="sr-only">` with the same section name/id role |
| Affected | What Changed, EOD Pack, Profitability Truth, Branch Health, Approval Inbox |
| Root cause | Pattern copied sr-only heading for `aria-labelledby` while title component already emitted an `h2` |
| Fix | Add optional `headingId?: string` to `AdminSectionTitle`; pass `id` on the single visible `h2`; remove duplicate sr-only `h2` from the five panels |
| Files | `AdminKpiCard.tsx` (`AdminSectionTitle`); `WhatChangedPanel.tsx`; `EodPackPanel.tsx`; `ProfitabilityTruthPanel.tsx`; `BranchHealthPanel.tsx`; `ApprovalInboxPanel.tsx` |
| Verification | Static test #7 asserts `headingId=` present and no `<h2 id=… className="sr-only">` in those panels; Playwright axe Test B targets 0 critical/serious |

## Other defects

None opened for QA-03 beyond DEF-QA03-01 at evidence authoring.

## Out of scope / not defects

- Production cutover pending (historical tip `152ce40…`) — environment gap, not a code defect.
- Unified approval SoD / org event store — deferred product scope from DASH packs.
