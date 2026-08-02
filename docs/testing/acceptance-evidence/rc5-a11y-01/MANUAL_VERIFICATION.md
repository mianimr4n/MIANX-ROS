# RC5-A11Y-01 Manual Verification

**Scope:** Focused spot-check of public marketing home — **not** a complete WCAG audit.  
**Environment:** Local website `http://localhost:3000/`  
**Branch:** `feature/rc5-a11y-01-public-home`  
**Baseline:** `e5963a659a961d8e856ddc9eb5e6a9addf807d4d`

## Checks performed

| Check | Desktop ~1440 | Mobile ~390 | Result |
| --- | --- | --- | --- |
| Home loads; hero + category sections visible | Yes | Yes | PASS |
| Keyboard: Tab reaches header controls (branch, cart, Order Now / menu) | Yes | Open menu via labeled button | PASS (spot) |
| Focus indicator visible on interactive chrome | Yes | Yes | PASS (spot) |
| Icon-only cart has accessible name | `Open cart` / `Cart, N items` | Same | PASS |
| Footer social links have descriptive names | Facebook / Instagram / etc. | Same | PASS |
| No empty “Order Now” / “My Telepizza” / “View Full Menu” links on mobile | N/A (visible) | Links hidden; sheet covers CTAs | PASS |
| Contrast on View All / footer muted / hero badge & CTA | Visually darker/gold accents | Same | PASS (axe-confirmed) |
| No obvious layout break / horizontal overflow | Yes | Yes | PASS |
| Console: no new errors introduced by this slice | Spot | Spot | PASS (no new a11y-related errors observed) |
| Broken links introduced by slice | No href changes beyond hide/show | Same | PASS |

## Admin regression spot-check

- Admin login page axe: 0 critical / 0 serious (automated).  
- No admin source files modified in this slice.

## Explicit non-claims

- Not a full keyboard audit of every home control.  
- Not a screen-reader certification (NVDA/VoiceOver not run).  
- Not a Production Lighthouse/a11y audit.
