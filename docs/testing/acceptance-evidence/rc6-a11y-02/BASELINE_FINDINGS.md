# RC6-A11Y-02 — Baseline findings

**Baseline SHA (post-QA-02):** `443cd3c1fccca1e40368942e445f08f989bddd16`  
**Branch:** `fix/rc6-a11y-02-moderate-advisories`  
**Engine:** `@axe-core/playwright` tags `wcag2a` + `wcag2aa`  
**Target:** local `http://localhost:3000` only

## Pre-fix matrix (reproduced before edits)

| Route/state | Critical | Serious | Moderate | Minor | Rules |
| --- | --- | --- | --- | --- | --- |
| home desktop | 0 | 1 | 0 | 0 | `color-contrast` (6 nodes) |
| home mobile | 0 | 1 | 0 | 0 | `color-contrast` (3) |
| home mobile menu open | 0 | 1 | 0 | 0 | `color-contrast` (3) |
| menu desktop | 1 | 1 | 0 | 0 | `button-name` (125), `color-contrast` (25+) |
| menu mobile | 1 | 1 | 0 | 0 | `button-name` (125), `color-contrast` (27+) |
| admin login | 0 | 0 | 0 | 0 | — |

Note: Roadmap residual labeled these as “moderate advisories,” but local axe classified the active debt as **critical** (`button-name`) and **serious** (`color-contrast`). This slice remediates that debt without claiming zero total accessibility findings forever.

## Root causes (manual + axe)

| Area | Finding | Status before |
| --- | --- | --- |
| Accessible name | Favorite heart nested unnamed `<button>` inside named `<Link>` × catalog size | Critical |
| Accessible name | Cart empty label `"Open cart"` vs mobile `"Cart"` inconsistency | Advisory |
| Accessible name | Branch control `aria-label="Select branch"` hid visible short name | Advisory |
| Touch targets | Cart/menu/carousel/footer/dots below 44×44 | Manual / residual |
| Heading hierarchy | Hero deal titles as multiple `h1`; menu products as `h3` under `h1` | Manual / residual |
| Contrast | Transparent nav over imagery; brand-red on cream; staggered opacity animation washing text | Serious |
| Contrast | Light orange “New” badge white text | Serious |

Authenticated `/admin/dashboard` remains a **spot-check** (not full admin certification).
