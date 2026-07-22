# Phase 1 — AI-Powered 3D Customer Experience

**Status:** READY FOR FOUNDER REVIEW (not merged, not production-deployed)  
**Branch:** `feature/customer-ai-3d-experience-phase1`  
**Stack preserved:** React 19 + Vite 7 + Wouter + Tailwind v4 + Framer Motion + shadcn/Radix (`apps/website`)

---

## Design vision

**Telepizza AI Kitchen Experience** — Multan-first, food-forward, premium ordering with honest AI assistive UX.

Positioning:

> Telepizza Pakistan — Multan’s AI-powered pizza experience.

Visual system combines Telepizza red, pizza orange, cheese gold, cream surfaces, charcoal contrast, soft glass, and lightweight CSS 3D depth. AI elements support food ordering; they do not dominate it.

---

## Implemented components

| Area | Deliverable |
|---|---|
| Design tokens | Extended `index.css` + `BRAND` identity/poweredBy |
| Motion policy | `usePrefersReducedMotion`, CSS reduced-motion kill-switch |
| Header | Sticky nav, trust line, accessible mobile drawer, Order Now |
| Footer | Branches, WhatsApp, social, Mianx.ai statement |
| Homepage | `ExperienceHero`, `PizzaHeroScene`, `MultanLocalSection`, popular menu, deals, `AiJourneySection` |
| Assist | `MianxAssist` floating launcher (deterministic routing) |
| Menu | Smart discovery strip, richer search, mobile cart bar, `?q=` deep-links |
| Customizer | Visible step labels (size → customize → review → cart) |
| Checkout | Trust panel (secure / tracking / support) |
| Order success | Lightweight celebration particles (reduced-motion safe) |
| Tracking | Timeline current-step pulse |
| Auth | Split desktop shell, Multan identity copy |
| My Telepizza | Rewards preview (coming soon, no fabricated points) |
| A11y | Global skip link, focus rings, dialog semantics on Assist |

---

## 3D approach

- **Technique:** CSS `perspective`, layered transforms, soft glow, steam/float keyframes, desktop pointer parallax.
- **Engine:** None — no Three.js / R3F / WebGL.
- **Assets:** Existing product JPG as pizza layer; no blocking 3D asset downloads.
- **Fallbacks:** Reduced motion disables decorative animation; narrow/coarse pointers skip parallax; essential CTAs are text links.

---

## AI experience boundaries

### Supported now (deterministic)

- Open signature pizzas / deals / spicy search
- Track order page
- Contact / WhatsApp / My Telepizza
- Vegetarian search **only when** menu text metadata includes veg cues

### Explicitly unsupported

- Live LLM chat / AI API calls
- Fabricated recommendations beyond catalog text match
- Claiming an order was placed without checkout confirmation
- Autonomous kitchen / cooking claims
- Fabricated rewards balances

Intro copy:

> Hi, I’m Mianx Assist. I can help you explore the menu, find deals and reach support.

Disclaimer:

> Recommendations are based on available Telepizza menu information.

---

## Performance strategy

- No new heavy animation libraries or 3D engines
- Hero image uses existing catalog/product image with `fetchPriority="high"` only on the pizza layer
- Assist / journey sections are lightweight DOM + CSS
- Framer Motion used only where already common; gated with reduced-motion
- Product JPG compression / WebP conversion remains a follow-up (pre-existing asset weight)

---

## Accessibility strategy

- Skip link → `#main-content`
- Semantic landmarks / headings on new sections
- Assist dialog: `role="dialog"`, Escape closes, focus to close control
- Color is not the only status cue on timelines (labels + current step)
- `prefers-reduced-motion` disables decorative motion
- Touch targets kept ≥ ~44px on primary actions

---

## Responsive behavior

- Hero stacks text → visual on small screens
- Navbar trust line at `xl+`; drawer on mobile with safe-area padding
- Menu sticky category bar retained; bottom cart action on mobile
- Auth split layout from `lg+`

---

## Known limitations

1. Product images are still large JPGs (pre-existing); WebP/AVIF conversion not completed in this pass.
2. Mianx Assist is frontend routing only — no backend AI agent.
3. Hero deal carousel (`HeroSlider`) is retained in codebase but homepage now leads with `ExperienceHero`.
4. Screenshots for Founder review should be captured in local prod-like preview.
5. No database / API contract changes in this branch.

---

## Screenshots checklist

Capture in production-like local mode (`pnpm build:website` + preview or `pnpm dev:website`):

- [ ] Homepage desktop
- [ ] Homepage mobile
- [ ] Menu desktop
- [ ] Menu mobile
- [ ] Mianx Assist open
- [ ] My Telepizza home
- [ ] Addresses
- [ ] Account
- [ ] Order tracking timeline

---

## Validation results

Recorded at PR time (see PR body for exact command output):

- `pnpm install --frozen-lockfile`
- `pnpm check`
- `pnpm test:db`
- `pnpm test:backend -- --pool=threads --no-file-parallelism`
- `pnpm test`
- `pnpm build:website`
- `git diff --check`

---

## Deployment notes

- **Migrations:** none
- **Production data changes:** none
- **Rollback:** revert/merge-revert this branch; no schema rollback required
- **Do not merge** without Founder review
