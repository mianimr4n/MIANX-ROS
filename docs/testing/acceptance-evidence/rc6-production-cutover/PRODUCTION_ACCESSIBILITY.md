# RC6 Phase 1 — Production accessibility

**Target:** `https://telepizza-website.vercel.app`  
**UTC:** `2026-08-03T00:44:05Z`  
**Tool:** axe-core via Playwright  
**Gate:** critical = 0, serious = 0  
**Full admin WCAG certification:** not claimed

## Public routes

| Route/state | Critical | Serious | Moderate | Minor | Result |
| --- | --- | --- | --- | --- | --- |
| home desktop | 0 | 0 | 0 | 0 | PASS |
| home mobile | 0 | 0 | 0 | 0 | PASS |
| menu desktop | 0 | 0 | 0 | 0 | PASS |
| menu mobile | 0 | 0 | 0 | 0 | PASS |
| admin login | 0 | 0 | 0 | 0 | PASS |

## Owner Command Center (authenticated)

| Route/state | Critical | Serious | Result |
| --- | --- | --- | --- |
| Owner dashboard Pre-open | 0 | 0 | PASS |
| Owner dashboard Live Operations | 0 | 0 | PASS |
| Owner dashboard Closing | 0 | 0 | PASS |

**Public gate:** PASS (0/0 critical/serious).  
**Owner dashboard gate:** PASS (0/0 critical/serious across all modes).

**Limitation:** Moderate/minor advisories may exist elsewhere in admin; full admin WCAG audit not performed.
