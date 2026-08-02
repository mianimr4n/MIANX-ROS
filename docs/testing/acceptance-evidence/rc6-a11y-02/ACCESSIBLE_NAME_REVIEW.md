# RC6-A11Y-02 — Accessible-name review

## Corrections

| Control | Before | After |
| --- | --- | --- |
| Favorite (signed-out) | `<Link aria-label>` wrapping unnamed `<Button>` | `Button asChild` → named `<Link>` (single control) |
| Favorite (signed-in) | Named button (OK) | Retained; `min-h-11 min-w-11` |
| Cart icon | `"Open cart"` / `"Cart, N items"` | `"Cart"` / `"Cart, N items"` (matches sheet) |
| Mobile sheet cart | `"Cart (N)"` | `"Cart, N items"` |
| Branch selector | `aria-label="Select branch"` only | `aria-label={`Branch: ${shortName}`}` + `aria-expanded` / `aria-haspopup` |
| Mobile menu | Open/Close labels | Retained + `aria-expanded` |
| Carousel arrows | sr-only Previous/Next | Retained; decorative arrows `aria-hidden` |
| Hero dots | Named | Retained; larger hit area |
| Size SKUs | Visible text only | `aria-label` includes size + price; `aria-pressed` |
| Product badge icons | Exposed | `aria-hidden` |

## Tests

- Static: `tests/website/rc6-a11y-02-accessibility.test.mjs`
- E2E: `e2e/rc6/a11y-02-public.spec.ts` (favorites link name; cart role name)
