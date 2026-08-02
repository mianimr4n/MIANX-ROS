# RC5-A11Y-01 Discovery

**Slice:** Public marketing home accessibility  
**Branch:** `feature/rc5-a11y-01-public-home`  
**Baseline SHA:** `e5963a659a961d8e856ddc9eb5e6a9addf807d4d`  
**Source debt:** `docs/testing/acceptance-evidence/rc4-performance-polish/ACCESSIBILITY.md` (public home color-contrast + icon-link naming)  
**Criteria:** RC5 B-01…B-05

## Method

- Read RC5 acceptance/roadmap and RC4 accessibility limitation notes  
- Inspect public home + shared Navbar/Footer under `apps/website`  
- Chromium axe (`wcag2a`/`wcag2aa`) against local `http://localhost:3000/` at 1440×900 and 390×844

## Pre-fix findings (local axe)

| # | Failing element / selector (approx.) | Issue | Rule | Source | Proposed minimal fix | Shared? | Regression risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Home “View All” / “View Full Menu” links using `text-brand-red` on cream | Insufficient contrast for normal text | `color-contrast` (WCAG 1.4.3) | `MenuSectionRow.tsx`, `CategoryStrip.tsx`, `Home.tsx` | Use `text-brand-red-dark` (light) / `text-brand-gold` (dark) | Home sections primarily; tokens shared | Low — darker red/gold still on-brand |
| 2 | Footer muted copy `text-white/40`, `/20`, `/30` on charcoal | Insufficient contrast | `color-contrast` | `Footer.tsx` | Raise opacity (`/70`–`/80`); accent icons to gold | Yes — all public routes with Footer | Low — slightly brighter muted text |
| 3 | Footer/nav decorative Lucide icons exposed | Noise / naming confusion | best practice; related to naming debt | `Footer.tsx`, `Navbar.tsx`, `HeroSlider.tsx` | `aria-hidden` on decorative icons | Yes for Footer/Navbar | Low |
| 4 | Mobile: `Link` wrapping `hidden sm/md` Buttons (Order Now, My Telepizza, View Full Menu) | Empty accessible name (`link-name`) | `link-name` (WCAG 4.1.2 / 2.4.4) | `Navbar.tsx`, `Home.tsx` | Hide entire `Link` with responsive class; keep Button visible text inside | Yes — Navbar on public chrome | Medium — ensure mobile sheet still exposes Order Now / account |
| 5 | Hero badge/CTA: white on `bg-brand-red` over hero image | Sampled contrast ~4.39:1 (bleed/blend) | `color-contrast` | `HeroSlider.tsx` | Solid charcoal badge; CTA `bg-brand-red-dark` + `isolate` | Home hero only | Low — slightly darker CTA |

## Out of scope (not expanded)

- Broad visual redesign  
- Admin application routes (spot-check only)  
- Database / migrations / Production  
- Disabling axe rules or global allowlists
