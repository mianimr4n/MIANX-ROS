# POLISH-QA — Keyboard and focus results

## Covered journeys

| Journey | Evidence | Result |
| --- | --- | --- |
| Public nav / menu | POLISH-06 + a11y02 (named controls, headings) | PASS (prior + public axe) |
| Login / reset | polish-qa + a11y02 | PASS |
| Admin sidebar / module finder | POLISH-01/06 evidence + Owner smoke nav | PASS |
| Owner modes / drill-downs | Owner Command Center integration ×3 | PASS |
| Orders / KDS / Delivery | Owner readonly shells + polish-qa routes | PASS |
| Inventory…Settings | polish-qa route load + headed axe | PASS |
| Dialogs/drawers | POLISH-06 overlay evidence | PASS (retained) |
| Logout + protected route | Owner smoke E + polish-qa logout | PASS |

## Verified properties

- No keyboard trap observed in Owner/public suites
- Visible focus retained on shell controls (POLISH-06)
- Escape/focus restoration: POLISH-06 overlay results retained
- Protected data unavailable after logout (Owner + polish-qa)

Full exhaustive keystroke scripts for every CRM/HR cell are not claimed; residual manual depth accepted as P3 where not automated.
