# RC6-QA-03 — Performance & network results

## Intended network model

| Behavior | Expectation |
| --- | --- |
| Initial dashboard load | Shared `useOperationalData` hooks in `AdminDashboard` |
| Command mode switch | Composition / emphasis only — **no dedicated refetch** for mode change |
| Branch change | Existing branch-scoped refetch (unchanged contract) |
| What Changed baseline | `localStorage` only — no network |
| EOD export | Client-side print/CSV/JSON — no provider upload |

## Certification checks

| Check | Evidence | Status |
| --- | --- | --- |
| Mode emphasis presentation-only | Static QA-03 #3 + mode-emphasis source comments | Contract PASS |
| No provider/AI network from OCC | Static QA-03 #8 | Contract PASS |
| Journey without unexpected 5xx | Playwright network guard on admin/api paths | Fill when runs complete |
| Bundle / Lighthouse / CWV | — | **Not claimed** this slice |

## Honest limits

- No new entry-bundle budget measurement in QA-03.
- No Production RUM / CWV certification.
- Mode-switch “no refetch” is an architectural/contract claim validated by shared hook ownership + static emphasis rules — not a HAR-certified Production proof.
- Mobile Test C asserts overflow smoke only, not FPS or TTI.
