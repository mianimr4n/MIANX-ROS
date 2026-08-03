# Phase 1.1 — Owner / Executive dashboard audit

**Route:** `/admin/dashboard`  
**Release proof:** Owner smoke `failCount: 0` including modes, EOD export, a11y, logout  
**Source:** `AdminDashboard.tsx` + Command Center panels (DASH-01…08)

## 30-second Owner questions

| Question | Current support | Gap |
| --- | --- | --- |
| What needs attention? | Exception Center / Needs Attention | Density; competing cards above fold |
| Is the branch healthy? | Branch Health panel | Multi-branch vs single clarity |
| What changed? | What Changed (device-local) | Not org event store — honesty ok; prominence vs actionability |
| What is happening now? | Live Operations mode | KPI drill-downs dense |
| What should be reviewed? | Approval Inbox | Empty-state quality varies |
| Estimated vs accounting posted? | Profitability Truth | Label education still required |
| Unresolved before closing? | Closing mode + EOD Pack | Long page fatigue |

## Professional (not merely correct) findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-OWN-01 | P2 | Long vertical stack → below-fold fatigue; prioritize Needs Attention + Branch Health |
| P11-OWN-02 | P2 | Trust/Source/Freshness labels compete with actions visually |
| P11-OWN-03 | P2 | Duplicate metrics possible across KPI strip and panels |
| P11-OWN-04 | P2 | Mode switch UX ok; ensure progressive disclosure for Closing |
| P11-OWN-05 | P3 | Print/CSV/JSON EOD — filenames only in smoke; confirm operator copy |

## Assessment

Technically **LIVE_VERIFIED** for Phase 1. Professionally **needs POLISH-02** for hierarchy, density, and above-the-fold clarity. No P0 dashboard defects in this audit.
