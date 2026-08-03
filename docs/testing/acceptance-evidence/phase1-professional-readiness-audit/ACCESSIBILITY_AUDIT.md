# Phase 1.1 — Accessibility audit

**Not a full WCAG certification.**

## Automated (Production public)

| Route family | Critical | Serious | Result |
| --- | --- | --- | --- |
| Home desktop/mobile | 0 | 0 | PASS |
| Menu desktop/mobile | 0 | 0 | PASS |
| Admin login | 0 | 0 | PASS |

## Owner Command Center (release evidence)

| Mode | Critical | Serious |
| --- | --- | --- |
| Pre-open / Live / Closing | 0 | 0 |

## Manual / residual risks

| ID | Severity | Issue |
| --- | --- | --- |
| P11-A11Y-01 | P2 | Disabled search/notifications may confuse SR users — remove or `aria-hidden` decorative |
| P11-A11Y-02 | P2 | Complex dashboard heading order / landmark density |
| P11-A11Y-03 | P2 | Table semantics on ops pages need POLISH-06 pass |
| P11-A11Y-04 | P3 | Moderate advisories may remain on ungated admin routes |

**Gate target for Phase 1.1 polish waves:** critical=0, serious=0 on touched routes.
