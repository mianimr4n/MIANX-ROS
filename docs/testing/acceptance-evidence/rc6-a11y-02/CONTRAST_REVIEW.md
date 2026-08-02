# RC6-A11Y-02 — Contrast review

## Corrections

| Surface | Fix |
| --- | --- |
| Navbar on `/` (over hero) | Opaque `bg-brand-charcoal` chrome (not transparent over imagery) |
| Navbar off-home | Opaque white chrome (`chromeOpaque`) for charcoal text |
| Active nav over dark chrome | `text-brand-gold` / white |
| Active nav over light chrome | `text-brand-red-dark` |
| Home heading accents | `text-brand-red-dark` |
| Category / section accents | `text-brand-red-dark` or gold on dark |
| Menu cards | Removed staggered `opacity` entrance animation (was washing computed colors mid-scan / mid-paint) |
| Menu Add / View / prices | `brand-red-dark` / charcoal |
| Product badges Hot/Popular | `#B5121B` + white |
| Product badge New | `#C2410C` + white (brand-orange too light for white text) |
| Signature / Best Value badges | Explicit gold `#F5B800` + charcoal `#1F1F1F` |
| Hero badge / price / CTA | Solid charcoal/gold/red-dark with rings for stable sampling |
| Footer muted copy/links | Raised to `/75`–`/80` |

## Brand constraint (retained)

Primary brand red `#E31E24` remains for decorative accents and hover. **Body / UI text / CTAs that must meet AA** use `brand-red-dark` (`#B5121B`) or charcoal/gold pairs documented above.

## Capability labels

No capability-status truth changes; admin capability badges untouched.
