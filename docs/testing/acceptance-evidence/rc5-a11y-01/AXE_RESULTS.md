# RC5-A11Y-01 Axe Results

**Branch:** `feature/rc5-a11y-01-public-home`  
**Baseline SHA:** `e5963a659a961d8e856ddc9eb5e6a9addf807d4d`  
**Target:** `http://localhost:3000/` (local website)  
**Engine:** `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`  
**Rule suppressions:** none (no `color-contrast` disable; no component-wide exclude)

## Post-fix summary

| Viewport | Critical | Serious | Moderate | Minor | Total |
| --- | --- | --- | --- | --- | --- |
| Desktop 1440×900 | 0 | 0 | 0 | 0 | 0 |
| Mobile 390×844 | 0 | 0 | 0 | 0 | 0 |

Repeat discovery runs after hero contrast fix: both viewports **0 / 0 / 0 / 0** twice.

## Playwright focused suite

Config: `playwright.rc5-a11y-01.config.ts`  
Spec: `e2e/rc5/public-home-a11y.spec.ts`

| Run | Result |
| --- | --- |
| 1 | 2 passed (desktop + mobile) |
| 2 | 2 passed (desktop + mobile) |

Assertions include:

- Full-page axe: 0 critical / 0 serious  
- Explicit assert: no `color-contrast` or `link-name` violations  
- Named chrome (Order Now, My Telepizza, cart, footer socials)  
- Mobile menu open/operable  
- No horizontal overflow

JSON reporter: `docs/testing/acceptance-evidence/rc5-a11y-01/playwright-results.json`

## Admin spot-check (regression)

Admin login axe (Chromium, same axe tags): **0 critical / 0 serious** after public-home style changes (shared design tokens only; no admin component edits).

## Notes

- Automated axe ≠ full WCAG certification.  
- Remaining moderate/minor on public home after fix: **none observed** in the recorded runs.
